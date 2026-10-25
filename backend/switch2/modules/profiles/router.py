from fastapi import APIRouter
from .schemas import AIPolishRequest, AIPolishResponse, AIConfigRead, AIConfigWrite, AIQuestionsRequest, AIQuestionsResponse, AIReportRequest, AIReportResponse, PinPayload, PreferenceState, PreferenceStateWrite, Profile, ProfileCreate, SandboxAnalysisRequest, SandboxAnalysisResponse, UnlockResponse
from .service import create_profile, delete_profile, generate_ai_questions, generate_ai_report, generate_sandbox_analysis, get_ai_config, get_preferences, list_profiles, polish_answer, save_ai_config, save_preferences, set_profile_pin, unlock_profile

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("", response_model=list[Profile])
def get_profiles() -> list[Profile]:
    return list_profiles()


@router.post("", response_model=Profile, status_code=201)
def post_profile(payload: ProfileCreate) -> Profile:
    return create_profile(payload)


@router.post("/{profile_id}/unlock", response_model=UnlockResponse)
def post_unlock(profile_id: int, payload: PinPayload) -> UnlockResponse:
    return UnlockResponse(unlocked=unlock_profile(profile_id, payload))


@router.put("/{profile_id}/pin", response_model=Profile)
def put_pin(profile_id: int, payload: PinPayload) -> Profile:
    return set_profile_pin(profile_id, payload)


@router.delete("/{profile_id}", status_code=204)
def remove_profile(profile_id: int) -> None:
    delete_profile(profile_id)


@router.get("/{profile_id}/ai-config", response_model=AIConfigRead)
def get_profile_ai_config(profile_id: int) -> AIConfigRead:
    return get_ai_config(profile_id)


@router.put("/{profile_id}/ai-config", response_model=AIConfigRead)
def put_profile_ai_config(profile_id: int, payload: AIConfigWrite) -> AIConfigRead:
    return save_ai_config(profile_id, payload)


@router.post("/{profile_id}/ai-questions", response_model=AIQuestionsResponse)
def post_profile_ai_questions(profile_id: int, payload: AIQuestionsRequest) -> AIQuestionsResponse:
    return generate_ai_questions(profile_id, payload)


@router.post("/{profile_id}/ai-report", response_model=AIReportResponse)
def post_profile_ai_report(profile_id: int, payload: AIReportRequest) -> AIReportResponse:
    return generate_ai_report(profile_id, payload)


@router.post("/{profile_id}/sandbox-analysis", response_model=SandboxAnalysisResponse)
def post_sandbox_analysis(profile_id: int, payload: SandboxAnalysisRequest) -> SandboxAnalysisResponse:
    return generate_sandbox_analysis(profile_id, payload)


@router.post("/{profile_id}/ai-polish", response_model=AIPolishResponse)
def post_profile_ai_polish(profile_id: int, payload: AIPolishRequest) -> AIPolishResponse:
    return polish_answer(profile_id, payload)


@router.get("/{profile_id}/preferences", response_model=PreferenceState)
def get_profile_preferences(profile_id: int) -> PreferenceState:
    return PreferenceState(**get_preferences(profile_id))


@router.put("/{profile_id}/preferences", response_model=PreferenceState)
def put_profile_preferences(profile_id: int, payload: PreferenceStateWrite) -> PreferenceState:
    return PreferenceState(**save_preferences(profile_id, payload.answers, payload.ai_questions, payload.mbti_ai_questions))
