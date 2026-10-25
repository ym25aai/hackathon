import hashlib
import hmac
import json
import secrets
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException
from cryptography.fernet import Fernet, InvalidToken

from .schemas import AIPolishRequest, AIPolishResponse, AIConfigRead, AIConfigWrite, AIQuestionsRequest, AIQuestionsResponse, AIReportRequest, AIReportResponse, PinPayload, Profile, ProfileCreate
from ...config import settings
from ...database import connection
from ...profile_store import initialize_profile_database, profile_connection, profile_database_path, read_preference, write_preference

_GEMINI_MODEL_CACHE: dict[str, tuple[float, str]] = {}


def _to_profile(row) -> Profile:
    data = dict(row)
    data["pin_configured"] = bool(data.get("pin_hash"))
    data["pin"] = None
    return Profile.model_validate(data)


def _hash_pin(pin: str, salt: bytes | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, 180_000)
    return salt.hex(), digest.hex()


def _verify_pin(pin: str, salt_hex: str | None, digest_hex: str | None) -> bool:
    if not salt_hex or not digest_hex:
        return False
    _, candidate = _hash_pin(pin, bytes.fromhex(salt_hex))
    return hmac.compare_digest(candidate, digest_hex)


def list_profiles() -> list[Profile]:
    with connection() as database:
        rows = database.execute("SELECT * FROM profiles ORDER BY id").fetchall()
    return [_to_profile(row) for row in rows]


def create_profile(payload: ProfileCreate) -> Profile:
    with connection() as database:
        count = database.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
        if count >= 5:
            raise HTTPException(status_code=409, detail="A maximum of 5 profiles is allowed")
        pin_salt, pin_hash = _hash_pin(payload.pin)
        cursor = database.execute(
            "INSERT INTO profiles (nickname, timezone, budget_cents, currency, pin_salt, pin_hash) VALUES (?, ?, ?, ?, ?, ?)",
            (payload.nickname, payload.timezone, payload.budget_cents, payload.currency.upper(), pin_salt, pin_hash),
        )
        row = database.execute("SELECT * FROM profiles WHERE id = ?", (cursor.lastrowid,)).fetchone()
    initialize_profile_database(cursor.lastrowid)
    return _to_profile(row)


def unlock_profile(profile_id: int, payload: PinPayload) -> bool:
    with connection() as database:
        row = database.execute("SELECT pin_salt, pin_hash FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _verify_pin(payload.pin, row["pin_salt"], row["pin_hash"])


def set_profile_pin(profile_id: int, payload: PinPayload) -> Profile:
    salt, digest = _hash_pin(payload.pin)
    with connection() as database:
        cursor = database.execute("UPDATE profiles SET pin_salt = ?, pin_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (salt, digest, profile_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        row = database.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    return _to_profile(row)


def delete_profile(profile_id: int) -> None:
    with connection() as database:
        cursor = database.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
    profile_database_path(profile_id).unlink(missing_ok=True)


def get_ai_config(profile_id: int) -> AIConfigRead:
    with connection() as database:
        profile = database.execute("SELECT id, ai_provider, ai_model, ai_token_ciphertext FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    with profile_connection(profile_id) as database:
        row = database.execute("SELECT provider, model, token_ciphertext FROM ai_config WHERE id = 1").fetchone()
    if row is None and profile["ai_token_ciphertext"]:
        with profile_connection(profile_id) as database:
            database.execute("INSERT OR REPLACE INTO ai_config (id, provider, model, token_ciphertext) VALUES (1, ?, ?, ?)", (profile["ai_provider"] or "deepseek", profile["ai_model"] or "Auto (DeepSeek)", profile["ai_token_ciphertext"]))
        with connection() as database:
            database.execute("UPDATE profiles SET ai_provider = NULL, ai_model = NULL, ai_token_ciphertext = NULL WHERE id = ?", (profile_id,))
        row = {"provider": profile["ai_provider"], "model": profile["ai_model"], "token_ciphertext": profile["ai_token_ciphertext"]}
    return AIConfigRead(provider=(row["provider"] if row else "deepseek") or "deepseek", model=(row["model"] if row else "Auto (DeepSeek)") or "Auto (DeepSeek)", configured=bool(row and row["token_ciphertext"]))


def save_ai_config(profile_id: int, payload: AIConfigWrite) -> AIConfigRead:
    ciphertext = Fernet(settings.token_key).encrypt(payload.token.encode("utf-8")).decode("ascii")
    with connection() as database:
        if database.execute("SELECT 1 FROM profiles WHERE id = ?", (profile_id,)).fetchone() is None:
            raise HTTPException(status_code=404, detail="Profile not found")
    with profile_connection(profile_id) as database:
        database.execute("INSERT OR REPLACE INTO ai_config (id, provider, model, token_ciphertext, updated_at) VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)", (payload.provider, payload.model, ciphertext))
    return AIConfigRead(provider=payload.provider, model=payload.model, configured=True)


def _load_ai_secret(profile_id: int) -> tuple[str, str, str]:
    with connection() as database:
        if database.execute("SELECT 1 FROM profiles WHERE id = ?", (profile_id,)).fetchone() is None:
            raise HTTPException(status_code=404, detail="Profile not found")
    with profile_connection(profile_id) as database:
        row = database.execute("SELECT provider, model, token_ciphertext FROM ai_config WHERE id = 1").fetchone()
    if row is None or not row["token_ciphertext"]:
        raise HTTPException(status_code=409, detail="AI is not configured for this Profile")
    try:
        token = Fernet(settings.token_key).decrypt(row["token_ciphertext"].encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise HTTPException(status_code=500, detail="Stored AI configuration cannot be decrypted") from exc
    return row["provider"] or "deepseek", row["model"] or "Auto (DeepSeek)", token


def get_preferences(profile_id: int) -> dict:
    with connection() as database:
        if database.execute("SELECT 1 FROM profiles WHERE id = ?", (profile_id,)).fetchone() is None:
            raise HTTPException(status_code=404, detail="Profile not found")
    return {"answers": read_preference(profile_id, "answers", {}), "ai_questions": read_preference(profile_id, "ai_questions", []), "mbti_ai_questions": read_preference(profile_id, "mbti_ai_questions", [])}


def save_preferences(profile_id: int, answers: dict[str, str], ai_questions: list[str], mbti_ai_questions: list[dict] | None = None) -> dict:
    with connection() as database:
        if database.execute("SELECT 1 FROM profiles WHERE id = ?", (profile_id,)).fetchone() is None:
            raise HTTPException(status_code=404, detail="Profile not found")
    write_preference(profile_id, "answers", answers)
    write_preference(profile_id, "ai_questions", ai_questions)
    if mbti_ai_questions is not None:
        write_preference(profile_id, "mbti_ai_questions", mbti_ai_questions)
    return {"answers": answers, "ai_questions": ai_questions, "mbti_ai_questions": read_preference(profile_id, "mbti_ai_questions", [])}


def _gemini_model(token: str, requested: str) -> str:
    if requested not in {"", "Gemini", "Gemini Flash", "Auto (Gemini)"}:
        return requested
    cache_key = hashlib.sha256(token.encode("utf-8")).hexdigest()
    cached = _GEMINI_MODEL_CACHE.get(cache_key)
    if cached and time.time() - cached[0] < 900:
        return cached[1]
    request = Request(f"https://generativelanguage.googleapis.com/v1beta/models?key={token}", headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not discover Gemini models: {exc}") from exc
    available = {item.get("name", "").removeprefix("models/") for item in data.get("models", []) if "generateContent" in item.get("supportedGenerationMethods", [])}
    for candidate in ("gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"):
        if candidate in available:
            _GEMINI_MODEL_CACHE[cache_key] = (time.time(), candidate)
            return candidate
    if available:
        selected = sorted(available)[0]
        _GEMINI_MODEL_CACHE[cache_key] = (time.time(), selected)
        return selected
    raise HTTPException(status_code=502, detail="No Gemini model supporting generateContent is available for this Token")


def _deepseek_questions(model: str, token: str, answers: dict[str, str], count: int, purpose: str, language: str) -> AIQuestionsResponse:
    selected_model = "deepseek-v4-flash" if model in {"", "DeepSeek", "Auto (DeepSeek)", "deepseek-flash"} else model
    if purpose == "mbti":
        prompt = "Return exactly a JSON array with exactly " + str(count) + " objects. Each object must have `question` and an `options` array containing exactly 4 realistic scenario choices. Write everything in " + language + ". Make the questions explore MBTI-like preferences through concrete situations, without naming or diagnosing MBTI. No markdown. Context: " + json.dumps(answers, ensure_ascii=False)
    else:
        prompt = "Return exactly a JSON object with a `questions` array containing exactly " + str(count) + " strings and no markdown. Ask concise, non-repeating, optional follow-up questions for a life-planning assistant. Write in " + language + ". Do not diagnose or infer sensitive traits. Context: " + json.dumps(answers, ensure_ascii=False)
    request_body = {"model": selected_model, "messages": [{"role": "system", "content": "You produce safe, concise, personalized follow-up questions. Always return valid JSON."}, {"role": "user", "content": prompt}], "stream": False}
    if purpose != "mbti":
        request_body["response_format"] = {"type": "json_object"}
    body = json.dumps(request_body).encode("utf-8")
    request = Request("https://api.deepseek.com/chat/completions", data=body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
    try:
        with urlopen(request, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        cleaned = content.removeprefix("```json").removesuffix("```").strip()
        parsed = json.loads(cleaned)
        if purpose == "mbti":
            if isinstance(parsed, dict):
                parsed = parsed.get("questions", [])
            questions = [json.dumps(item, ensure_ascii=False) for item in parsed if isinstance(item, dict) and isinstance(item.get("question"), str) and isinstance(item.get("options"), list)]
        else:
            questions = parsed.get("questions", [])
        if not isinstance(questions, list) or len(questions) != count or not all(isinstance(item, str) for item in questions):
            raise ValueError("DeepSeek returned an invalid question format")
        return AIQuestionsResponse(questions=questions, model=selected_model)
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=detail) from exc
    except (URLError, TimeoutError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def generate_ai_questions(profile_id: int, payload: AIQuestionsRequest) -> AIQuestionsResponse:
    provider, requested_model, token = _load_ai_secret(profile_id)
    if provider == "deepseek":
        return _deepseek_questions(requested_model, token, payload.answers, payload.count, payload.purpose, payload.language)
    if provider != "gemini":
        raise HTTPException(status_code=501, detail=f"Provider '{provider}' is not implemented yet")
    model = _gemini_model(token, requested_model)
    if payload.purpose == "mbti":
        prompt = "Return exactly a JSON array with exactly " + str(payload.count) + " objects. Each object must have `question` and an `options` array containing exactly 4 realistic scenario choices. Write everything in " + payload.language + ". Explore MBTI-like preferences through concrete situations without naming or diagnosing MBTI. No markdown. Context: " + json.dumps(payload.answers, ensure_ascii=False)
    else:
        prompt = "Return exactly a JSON array with exactly " + str(payload.count) + " strings and no markdown. Ask concise, non-repeating optional follow-up questions. Write in " + payload.language + ". Do not diagnose or infer sensitive traits. Context: " + json.dumps(payload.answers, ensure_ascii=False)
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    request = Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={token}", data=body, headers={"Content-Type": "application/json"}, method="POST")
    last_error = "AI service unavailable"
    for attempt in range(2):
        try:
            with urlopen(request, timeout=25) as response:
                data = json.loads(response.read().decode("utf-8"))
            text = "".join(part.get("text", "") for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", []))
            parsed = json.loads(text.removeprefix("```json").removesuffix("```").strip())
            questions = [json.dumps(item, ensure_ascii=False) for item in parsed if isinstance(item, dict) and isinstance(item.get("question"), str) and isinstance(item.get("options"), list)] if payload.purpose == "mbti" else parsed
            if not isinstance(questions, list) or len(questions) != payload.count or not all(isinstance(item, str) for item in questions):
                raise ValueError("AI returned an invalid question format")
            return AIQuestionsResponse(questions=questions, model=model)
        except HTTPError as exc:
            last_error = exc.read().decode("utf-8", errors="replace")
            if exc.code not in {429, 500, 502, 503}:
                raise HTTPException(status_code=502, detail=last_error) from exc
        except (URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            last_error = str(exc)
        if attempt < 1:
            time.sleep(0.5)
    raise HTTPException(status_code=503, detail=last_error)


def generate_ai_report(profile_id: int, payload: AIReportRequest) -> AIReportResponse:
    provider, requested_model, token = _load_ai_secret(profile_id)
    template = """You are preparing an official CARE+ self-assessment report. Use only the supplied self-reported data. Do not diagnose, certify personality, or invent facts. Write in {language}. The report must clearly state that it is self-reported and not a clinical or official psychological certification. Include: Profile summary, Basic preferences, MBTI preference context (describe as a preference signal only), Optional context, AI Review questions and answers, and a closing limitations note. Use a clean professional tone. Requested output format: {format}. Data: {data}""".format(language=payload.language, format="AI-readable Markdown" if payload.format == "markdown" else "human-readable official report", data=json.dumps({"answers": payload.answers, "ai_questions": payload.ai_questions}, ensure_ascii=False))
    if provider == "deepseek":
        model = "deepseek-v4-flash" if requested_model in {"", "DeepSeek", "Auto (DeepSeek)", "deepseek-flash"} else requested_model
        body = json.dumps({"model": model, "messages": [{"role": "system", "content": "You create careful, non-clinical personal reports."}, {"role": "user", "content": template}], "stream": False}).encode("utf-8")
        request = Request("https://api.deepseek.com/chat/completions", data=body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
        try:
            with urlopen(request, timeout=35) as response:
                data = json.loads(response.read().decode("utf-8"))
            return AIReportResponse(content=data["choices"][0]["message"]["content"].strip(), model=model)
        except HTTPError as exc:
            raise HTTPException(status_code=502, detail=exc.read().decode("utf-8", errors="replace")) from exc
        except (URLError, TimeoutError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    if provider != "gemini":
        raise HTTPException(status_code=501, detail=f"Provider '{provider}' is not implemented yet")
    model = _gemini_model(token, requested_model)
    body = json.dumps({"contents": [{"parts": [{"text": template}]}]}).encode("utf-8")
    request = Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={token}", data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(request, timeout=35) as response:
            data = json.loads(response.read().decode("utf-8"))
        content = "".join(part.get("text", "") for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", [])).strip()
        if not content:
            raise ValueError("Gemini returned an empty report")
        return AIReportResponse(content=content, model=model)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=exc.read().decode("utf-8", errors="replace")) from exc
    except (URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


def polish_answer(profile_id: int, payload: AIPolishRequest) -> AIPolishResponse:
    provider, requested_model, token = _load_ai_secret(profile_id)
    instruction = "Rewrite the user's answer in clear, natural language while preserving their meaning, tone, and uncertainty. Do not add facts, diagnose, or exaggerate. Return only the rewritten answer. Question: " + payload.question + " Answer: " + payload.answer + " Profile context: " + json.dumps(payload.context, ensure_ascii=False)
    if provider == "deepseek":
        model = "deepseek-v4-flash" if requested_model in {"", "DeepSeek", "Auto (DeepSeek)", "deepseek-flash"} else requested_model
        body = json.dumps({"model": model, "messages": [{"role": "system", "content": "You polish personal answers safely and faithfully."}, {"role": "user", "content": instruction}], "stream": False}).encode("utf-8")
        request = Request("https://api.deepseek.com/chat/completions", data=body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, method="POST")
        try:
            with urlopen(request, timeout=25) as response:
                data = json.loads(response.read().decode("utf-8"))
            return AIPolishResponse(text=data["choices"][0]["message"]["content"].strip(), model=model)
        except HTTPError as exc:
            raise HTTPException(status_code=502, detail=exc.read().decode("utf-8", errors="replace")) from exc
        except (URLError, TimeoutError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    if provider != "gemini":
        raise HTTPException(status_code=501, detail=f"Provider '{provider}' is not implemented yet")
    model = _gemini_model(token, requested_model)
    body = json.dumps({"contents": [{"parts": [{"text": instruction}]}]}).encode("utf-8")
    request = Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={token}", data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(request, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
        text = "".join(part.get("text", "") for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", [])).strip()
        if not text:
            raise ValueError("Gemini returned an empty response")
        return AIPolishResponse(text=text, model=model)
    except HTTPError as exc:
        raise HTTPException(status_code=502, detail=exc.read().decode("utf-8", errors="replace")) from exc
    except (URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
