import { useEffect, useState } from "react";
import { applyLocaleToDocument, localeText } from "./i18n";
import { ProfileExportActions } from "./profile-export";

type Answers = Record<string, string>;
type Props = { profile: { id: number; nickname: string }; answers: Answers; config?: { provider: string; model: string; configured?: boolean }; setConfig: (value: { provider: string; model: string; configured?: boolean }) => void; setup: any; onBack: () => void; onDelete: () => Promise<void> };
type Question = { id: string; title: string; options: string[]; multi?: boolean };
const basic: Question[] = [
  { id: "focus", title: "Which areas of your life are you most interested in improving?", options: ["Finances & spending", "Energy & home", "Health & daily routine", "Family & relationships", "Work & learning", "Environment & lifestyle"], multi: true },
  { id: "desired_change", title: "What change would matter most in those areas?", options: ["Reduce unnecessary spending", "Improve comfort at home", "Improve sleep or recovery", "Improve communication", "Protect focus time", "Reduce waste"], multi: true },
  { id: "constraints", title: "Which conditions shape what is realistic for you?", options: ["Limited budget", "Unpredictable schedule", "Family responsibilities", "Physical or emotional health", "Housing or equipment limits", "No major constraint"], multi: true },
  { id: "resources", title: "What is already working or available to support you?", options: ["Existing devices or household items", "A budget I can use", "Friends or family support", "Relevant knowledge or skills", "A stable space or routine", "I am still figuring this out"], multi: true },
  { id: "style", title: "What kind of guidance feels most useful?", options: ["Small experiments", "A clear step-by-step plan", "Data and evidence", "Reminders and encouragement", "Freedom to explore"] },
  { id: "success", title: "What would make a change worth continuing?", options: ["Less everyday stress", "Saving time or money", "More stable health or mood", "Visible progress", "Positive impact on people or environment"], multi: true },
];
const mbti: Question[] = [
  { id: "mbti_ie", title: "What restores you after a demanding week?", options: ["Time with people and active exchange · E", "Quiet time alone to reset · I"] },
  { id: "mbti_sn", title: "What do you trust first when learning something new?", options: ["Concrete facts and examples · S", "Patterns and possibilities · N"] },
  { id: "mbti_tf", title: "What leads when you make a difficult decision?", options: ["Logic and consistent trade-offs · T", "Values, empathy and human impact · F"] },
  { id: "mbti_jp", title: "How do you approach an important plan?", options: ["Clear structure and decided steps · J", "Flexibility and room to adapt · P"] },
];
const providers: Record<string, string[]> = { deepseek: ["Auto (DeepSeek)", "deepseek-v4-flash", "deepseek-chat", "deepseek-reasoner"], gemini: ["Auto (Gemini)", "gemini-2.5-flash", "gemini-2.5-flash-lite"], "openai-compatible": ["gpt-5-mini", "gpt-4.1-mini", "gpt-4o-mini"], anthropic: ["claude-sonnet-4", "claude-3-7-sonnet-latest"], custom: [] };
const split = (value = "") => value.split("||").filter(Boolean);
const mbtiType = (answers: Answers) => ["mbti_ie", "mbti_sn", "mbti_tf", "mbti_jp"].map(id => (answers[id] || "").slice(-1)).join("");

export function SettingsPanelV2({ profile, answers: initial, config, setConfig, setup, onBack, onDelete }: Props) {
  const [module, setModule] = useState<"preferences" | "configuration">("preferences");
  const [view, setView] = useState<"basic" | "mbti">("basic");
  const [answers, setAnswers] = useState<Answers>(initial);
  const [aiQuestions, setAIQuestions] = useState<string[]>([]);
  const [mbtiAIQuestions, setMbtiAIQuestions] = useState<Question[]>(mbti);
  const [mbtiLocked, setMbtiLocked] = useState(false);
  const [language, setLanguage] = useState(setup?.language || "English");
  const [font, setFont] = useState(setup?.font || "DM Sans");
  const [color, setColor] = useState(setup?.color || "sage");
  const [provider, setProvider] = useState(config?.provider || "deepseek");
  const [model, setModel] = useState(config?.model || providers[config?.provider || "deepseek"]?.[0] || "");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetReviewIndex, setResetReviewIndex] = useState<number | null>(null);
  const text = localeText(language);
  const deleteCurrentProfile = async () => { if (!window.confirm(`Delete ${profile.nickname}? This removes this profile, its AI token, preferences and reports permanently.`)) return; try { await onDelete(); } catch (error) { setMessage(error instanceof Error ? error.message : "Profile could not be deleted."); } };
  useEffect(() => { applyLocaleToDocument(language); }, [language]);
  useEffect(() => { document.querySelectorAll<HTMLElement>(".ai-info-icon").forEach(element => { element.textContent = "!"; }); document.querySelectorAll<HTMLElement>(".ai-review-requirement strong").forEach(element => { element.textContent = language === "繁體中文" ? "必填：" : language === "简体中文" ? "必填：" : language === "日本語" ? "必須:" : language === "Español" ? "Obligatorio:" : "Required:"; }); }, [language, aiQuestions, answers]);
  useEffect(() => { const cards = document.querySelectorAll<HTMLElement>(".ai-review-dialog"); cards.forEach((card, index) => { if (card.querySelector(".ai-review-delete")) return; const button = document.createElement("button"); button.type = "button"; button.className = "ai-review-delete"; button.textContent = language === "简体中文" ? "删除" : language === "繁體中文" ? "刪除" : language === "日本語" ? "削除" : language === "Español" ? "Eliminar" : "Delete"; button.setAttribute("aria-label", button.textContent); button.onclick = () => { const remaining = aiQuestions.filter((_, itemIndex) => itemIndex !== index); const next = { ...answers }; delete next[`ai_${index}`]; const shifted: Answers = {}; remaining.forEach((_, itemIndex) => { const oldKey = `ai_${itemIndex >= index ? itemIndex + 1 : itemIndex}`; if (next[oldKey]) shifted[`ai_${itemIndex}`] = next[oldKey]; }); Object.keys(next).filter(key => key.startsWith("ai_")).forEach(key => delete next[key]); setAIQuestions(remaining); save({ ...next, ...shifted }, remaining); }; card.appendChild(button); }); }, [aiQuestions, answers, language]);
  useEffect(() => { try { const stored = JSON.parse(localStorage.getItem(`careplus-mbti-questions-${profile.id}`) || "[]"); if (Array.isArray(stored) && stored.length) { setMbtiAIQuestions([...mbti, ...stored]); setMbtiLocked(true); } } catch { /* ignore invalid local cache */ } }, [profile.id]);
  useEffect(() => { fetch(`/api/profiles/${profile.id}/preferences`).then(response => response.ok ? response.json() : null).then(state => { if (state?.answers) setAnswers(state.answers); if (state?.ai_questions) setAIQuestions(state.ai_questions); if (Array.isArray(state?.mbti_ai_questions) && state.mbti_ai_questions.length) { setMbtiAIQuestions([...mbti, ...state.mbti_ai_questions]); setMbtiLocked(true); localStorage.setItem(`careplus-mbti-questions-${profile.id}`, JSON.stringify(state.mbti_ai_questions)); } }).catch(() => undefined); }, [profile.id]);
  const save = (next: Answers, questions = aiQuestions, mbtiQuestions = mbtiAIQuestions.slice(mbti.length)) => { setAnswers(next); localStorage.setItem(`careplus-survey-${profile.id}`, JSON.stringify(next)); fetch(`/api/profiles/${profile.id}/preferences`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: next, ai_questions: questions, mbti_ai_questions: mbtiQuestions }) }).catch(() => undefined); };
  const select = (question: Question, option: string) => { if (!question.multi) return save({ ...answers, [question.id]: option, ...(question.id.startsWith("mbti_") ? { mbti_type: mbtiType({ ...answers, [question.id]: option }) } : {}) }); const current = split(answers[question.id]); const exclusive = question.id === "constraints" ? "No major constraint" : question.id === "resources" ? "I am still figuring this out" : ""; const next = current.includes(option) ? current.filter(item => item !== option) : exclusive === option ? [option] : [...current.filter(item => item !== exclusive), option]; save({ ...answers, [question.id]: next.join("||") }); };
  const generateMbti = async () => { if (mbtiLocked) { setMbtiLocked(false); setMessage("MBTI AI questions unlocked. Generate again to replace the current set."); return; } setLoading(true); setMessage(""); try { const response = await fetch(`/api/profiles/${profile.id}/ai-questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, count: 7, purpose: "mbti", language }) }); const data = await response.json(); if (!response.ok) throw Error(data.detail || "Could not generate MBTI questions"); const generated = (data.questions || []).map((item: string, index: number) => { try { const parsed = JSON.parse(item); return { id: `mbti_ai_${Date.now()}_${index}`, title: parsed.question, options: parsed.options, multi: false }; } catch { return null; } }).filter(Boolean) as Question[]; if (generated.length !== 7) throw Error("The AI did not return exactly 7 MBTI questions."); setMbtiAIQuestions([...mbti, ...generated]); setMbtiLocked(true); localStorage.setItem(`careplus-mbti-questions-${profile.id}`, JSON.stringify(generated)); save(answers, aiQuestions, generated); setMessage("7 MBTI questions generated and saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not generate MBTI questions"); } finally { setLoading(false); } };
  const generate = async () => { if (aiQuestions.length && !answers[`ai_${aiQuestions.length - 1}`]?.trim()) { setMessage("Complete the previous AI Review answer first."); return; } const missing = basic.some(question => !split(answers[question.id]).length) || mbti.some(question => !answers[question.id]); if (missing) { setMessage("Complete Basic Questions and MBTI before AI Review."); return; } setLoading(true); try { const response = await fetch(`/api/profiles/${profile.id}/ai-questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: { ...answers, mbti_type: mbtiType(answers) }, count: 1, language, purpose: "review" }) }); const data = await response.json(); if (!response.ok) throw Error(data.detail || "AI review failed"); const generated = data.questions || []; const questions = aiQuestions.length ? [...aiQuestions, ...generated] : generated; setAIQuestions(questions); save(answers, questions); } catch (error) { setMessage(error instanceof Error ? error.message : "AI review failed"); } finally { setLoading(false); } };
  const resetPreferences = () => { const next = { ...answers }; basic.forEach(question => delete next[question.id]); mbti.forEach(question => delete next[question.id]); setMbtiAIQuestions(mbti); setMbtiLocked(false); localStorage.removeItem(`careplus-mbti-questions-${profile.id}`); save(next, aiQuestions, []); if (aiQuestions.length) setResetReviewIndex(0); else setMessage("Basic, MBTI and generated MBTI questions reset."); };
  const finishReviewReset = (messageText: string) => { setResetReviewIndex(null); setMessage(messageText); };
  const skipThisReview = () => { if (resetReviewIndex === null) return; if (resetReviewIndex >= aiQuestions.length - 1) return finishReviewReset("Basic and MBTI answers reset. AI Review questions kept."); setResetReviewIndex(resetReviewIndex + 1); };
  const deleteThisReview = () => { if (resetReviewIndex === null) return; const removed = resetReviewIndex; const remaining = aiQuestions.filter((_, index) => index !== removed); const next = { ...answers }; delete next[`ai_${removed}`]; const shifted: Answers = {}; remaining.forEach((_, index) => { const oldKey = `ai_${index >= removed ? index + 1 : index}`; if (next[oldKey]) shifted[`ai_${index}`] = next[oldKey]; }); Object.keys(next).filter(key => key.startsWith("ai_")).forEach(key => delete next[key]); const merged = { ...next, ...shifted }; setAIQuestions(remaining); save(merged, remaining); if (removed >= remaining.length) finishReviewReset("Basic, MBTI and selected AI questions reset."); else setResetReviewIndex(removed); };
  const saveConfig = async () => { localStorage.setItem(`careplus-setup-${profile.id}`, JSON.stringify({ ...(setup || {}), language, font, color })); document.documentElement.dataset.careColor = color; document.documentElement.dataset.careFont = font; if (!token) { setMessage("Configuration saved."); return; } const response = await fetch(`/api/profiles/${profile.id}/ai-config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model, token }) }); if (response.ok) { setConfig({ provider, model, configured: true }); setToken(""); setMessage("Configuration saved."); } else setMessage("Configuration could not be saved."); };
  const resetDialog = resetReviewIndex === null ? null : <div className="reset-review-modal"><div className="reset-review-dialog"><p className="kicker">RESET AI REVIEW</p><h3>Delete this AI review question?</h3><p>{aiQuestions[resetReviewIndex ?? 0]}</p><div className="reset-review-actions"><button className="wizard-secondary" onClick={() => finishReviewReset("Basic and MBTI answers reset. AI Review questions kept.")}>Skip all</button><button className="wizard-secondary" onClick={skipThisReview}>Skip this</button><button className="reset-preferences-button" onClick={deleteThisReview}>Delete</button></div></div></div>;
  return <section className="settings-page"><div className="settings-header"><div><p className="kicker">H·E · SETTINGS</p><h1>{module === "preferences" ? text.preferences : text.configuration}<br /><em>{profile.nickname}</em></h1></div><button className="wizard-secondary" onClick={onBack}>← {text.home}</button></div><div className="settings-module-nav"><button className={module === "preferences" ? "active" : ""} onClick={() => setModule("preferences")}>{text.preferences}<span>Basic · Optional · AI</span></button><button className={module === "configuration" ? "active" : ""} onClick={() => setModule("configuration")}>{text.configuration}<span>Language · Theme · AI</span></button></div>{module === "preferences" ? <><div className="settings-block"><div className="settings-block-head preference-switch-head"><button type="button" className={`preference-switch-arrow ${view === "basic" ? "arrow-left" : "arrow-right"}`} onClick={() => setView(view === "basic" ? "mbti" : "basic")} aria-label="Switch Basic and MBTI">{view === "basic" ? "←" : "→"}</button><div><p className="settings-section-label">{view === "basic" ? "Basic questions" : "MBTI preference"}</p></div><span>{view === "basic" ? "6 QUESTIONS" : "4 DIMENSIONS"}</span></div><div className="answer-list">{(view === "basic" ? basic : mbtiAIQuestions).map((question, index) => <div className="answer-row" key={question.id}><b>{view === "basic" ? `0${index + 1}` : `M${index + 1}`}</b><div><strong>{question.title}</strong><div className="settings-choice-list">{question.options.map(option => <label className="settings-choice" key={option}><input type={question.multi ? "checkbox" : "radio"} name={question.id} checked={question.multi ? split(answers[question.id]).includes(option) : answers[question.id] === option} onChange={() => select(question, option)} />{option}</label>)}</div></div></div>)}</div><div className="settings-actions"><button className="primary-button" onClick={() => { save(answers); setMessage("Preferences saved."); }}>{text.savePreferences}</button><button className="reset-preferences-button" onClick={resetPreferences}>Reset preference</button>{view === "mbti" && <button className="secondary-action-button" onClick={generateMbti} disabled={loading}>{loading ? "Generating…" : "Generate 7 MBTI questions"}</button>}<span>{message}</span></div></div><div className="settings-block"><div className="settings-block-head"><div><p className="settings-section-label">Optional questions</p></div><span>3 QUESTIONS</span></div>{["What is happening in your life right now?", "What have you already tried?", "Why does this matter to you now?"].map((question, index) => <label className="optional-form-item" key={question}><span>{question}</span><textarea rows={3} value={answers[`personal_${index}`] || ""} onChange={event => save({ ...answers, [`personal_${index}`]: event.target.value })} /></label>)}</div><div className="settings-block ai-review-section"><p className="ai-review-requirement"><span className="ai-info-icon">ⓘ</span><strong>Required:</strong> Basic + MBTI base. <span>Extra: AI MBTI choices + Optional answers.</span></p><div className="settings-block-head"><div><p className="settings-section-label">AI review</p></div><span>{aiQuestions.length} QUESTIONS</span></div>{aiQuestions.map((question, index) => <label className="optional-form-item ai-review-dialog" key={`${question}-${index}`}><span>{question}</span><textarea rows={3} value={answers[`ai_${index}`] || ""} onChange={event => save({ ...answers, [`ai_${index}`]: event.target.value })} /></label>)}{!aiQuestions.length && <p className="settings-empty">Complete Basic and MBTI to generate AI Review questions.</p>}<div className="settings-actions"><button className="secondary-action-button" onClick={generate} disabled={loading || (aiQuestions.length > 0 && !answers[`ai_${aiQuestions.length - 1}`]?.trim())}>{loading ? "Generating…" : aiQuestions.length ? "＋ Add review" : text.startAI}</button><span>{message}</span></div></div></> : <div className="settings-block"><div className="settings-block-head"><div><p className="kicker">CONFIGURATION</p><h2>Language, theme and AI</h2></div></div><div className="settings-grid"><label>{text.language}<select className="styled-select" value={language} onChange={event => setLanguage(event.target.value)}><option>English</option><option>简体中文</option><option>繁體中文</option><option>日本語</option><option>Español</option></select></label><label>{text.font}<select className="styled-select" value={font} onChange={event => setFont(event.target.value)}><option>DM Sans</option><option>Inter</option><option>Georgia</option><option>System UI</option></select></label><label>{text.theme}<select className="styled-select" value={color} onChange={event => setColor(event.target.value)}><option value="sage">Sage</option><option value="ocean">Ocean</option><option value="coral">Coral</option><option value="plum">Plum</option><option value="sun">Sun</option></select></label><label>{text.provider}<select className="styled-select" value={provider} onChange={event => { setProvider(event.target.value); setModel(providers[event.target.value]?.[0] || ""); }}><option value="deepseek">DeepSeek</option><option value="gemini">Gemini</option><option value="openai-compatible">OpenAI-compatible</option><option value="anthropic">Anthropic</option><option value="custom">Custom provider</option></select></label><label>{text.model}<select className="styled-select" value={model} onChange={event => setModel(event.target.value)}>{(providers[provider] || []).map(option => <option key={option}>{option}</option>)}</select></label><label>{text.token}<input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder={config?.configured ? "Token already stored" : "Paste token"} /></label></div><div className="settings-actions"><span>{message}</span><button className="primary-button" onClick={saveConfig}>{text.saveConfiguration}</button><button className="delete-profile-button" onClick={deleteCurrentProfile}>Delete profile</button></div><ProfileExportActions profile={profile} answers={answers} aiQuestions={aiQuestions} configuration={{ language, font, color, provider, model }} onImported={payload => { const next = payload.answers || {}; const questions = Array.isArray(payload.ai_questions) ? payload.ai_questions : []; setAIQuestions(questions); save(next, questions); if (payload.configuration?.language) setLanguage(payload.configuration.language); if (payload.configuration?.font) setFont(payload.configuration.font); if (payload.configuration?.color) setColor(payload.configuration.color); }} /></div>}{resetDialog}</section>;
}













































