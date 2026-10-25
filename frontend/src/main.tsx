import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./profile.css";
import "./survey.css";
import "./choice.css";
import "./wizard.css";
import "./theme.css";
import "./settings.css";
import "./settings-choice.css";
import "./reset-preferences.css";
import "./polish.css";
import "./industrial.css";
import "./engine.css";
import "./survey-layout.css";
import "./sidebar-industrial.css";
import "./layout-fixes.css";
import "./vector-ui.css";
import "./profile-modal.css";
import "./flow-industrial.css";
import { applyLocaleToDocument, localeText } from "./i18n";
import { StructuredPreferenceFlow } from "./structured-preference";
import { SettingsPanelV2 } from "./settings-panel-v2";
import { EngineLab } from "./engine";

type Profile = { id: number; nickname: string; timezone: string; currency: string; pin_configured: boolean };
type Answers = Record<string, string>;
type AIConfig = { provider: string; model: string; configured?: boolean };
type Setup = { nickname: string; birthday: string; pin: string; language: string; font: string; color: string; provider: string; model: string; token: string };

function VectorPlusIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>; }
function VectorProfileIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M5.8 19c.8-3.3 2.9-5 6.2-5s5.4 1.7 6.2 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function VectorMenuIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" /></svg>; }

const demo: Profile = { id: 0, nickname: "My Space", timezone: "America/New_York", currency: "USD", pin_configured: true };
const focus = ["Finances & spending", "Energy & home", "Health & daily routine", "Family & relationships", "Work & learning", "Environment & lifestyle"];
const baseQuestions = [
  { id: "focus", title: "Which areas of your life are you most interested in improving?", options: focus, multi: true },
  { id: "desired_change", title: "What would matter most within those areas?", options: ["Reduce unnecessary spending", "Improve comfort at home", "Improve sleep or recovery", "Improve communication", "Protect focus time", "Reduce waste"], multi: true },
  { id: "constraints", title: "Which conditions shape what is realistic for you?", options: ["Limited budget", "Unpredictable schedule", "Family responsibilities", "Physical or emotional health", "Housing or equipment limits", "No major constraint"], multi: true },
  { id: "resources", title: "What is already working or available to support you?", options: ["Existing devices or household items", "A budget I can use", "Friends or family support", "Relevant knowledge or skills", "A stable space or routine", "I am still figuring this out"], multi: true },
  { id: "style", title: "What kind of guidance feels most useful?", options: ["Small experiments", "A clear step-by-step plan", "Data and evidence", "Reminders and encouragement", "Freedom to explore"], multi: false },
  { id: "success", title: "What would make a change worth continuing?", options: ["Less everyday stress", "Saving time or money", "More stable health or mood", "Visible progress", "Positive impact on people or environment"], multi: true },
];
const localizedBaseQuestions = (language: string) => {
  const packs: Record<string, Record<string, { title: string; options: string[] }>> = {
    "简体中文": {
      focus: { title: "你最想改善生活中的哪些领域？", options: ["财务与消费", "能源与居家", "健康与日常作息", "家庭与关系", "工作与学习", "环境与生活方式"] },
      desired_change: { title: "在这些领域中，你最希望看到什么改变？", options: ["减少不必要的支出", "提升居家舒适度", "改善睡眠或恢复", "改善沟通", "保护专注时间", "减少浪费"] },
      constraints: { title: "哪些条件会影响什么方案对你来说是现实的？", options: ["预算有限", "时间安排不稳定", "家庭责任", "身体或情绪健康", "住房或设备限制", "没有主要限制"] },
      resources: { title: "目前有哪些资源或做法已经在支持你？", options: ["已有设备或家居用品", "可以使用的预算", "朋友或家人的支持", "相关知识或技能", "稳定的空间或习惯", "我还在了解"] },
      style: { title: "什么样的指导对你最有帮助？", options: ["小规模尝试", "清晰的步骤计划", "数据和证据", "提醒与鼓励", "自由探索"] },
      success: { title: "什么结果会让你愿意持续改变？", options: ["减少日常压力", "节省时间或金钱", "更稳定的健康或情绪", "看得见的进展", "对他人或环境产生积极影响"] }
    },
    "繁體中文": {
      focus: { title: "你最想改善生活中的哪些領域？", options: ["財務與消費", "能源與居家", "健康與日常作息", "家庭與關係", "工作與學習", "環境與生活方式"] },
      desired_change: { title: "在這些領域中，你最希望看到什麼改變？", options: ["減少不必要的支出", "提升居家舒適度", "改善睡眠或恢復", "改善溝通", "保護專注時間", "減少浪費"] },
      constraints: { title: "哪些條件會影響什麼方案對你來說是現實的？", options: ["預算有限", "時間安排不穩定", "家庭責任", "身體或情緒健康", "住房或設備限制", "沒有主要限制"] },
      resources: { title: "目前有哪些資源或做法已經在支持你？", options: ["已有設備或家居用品", "可以使用的預算", "朋友或家人的支持", "相關知識或技能", "穩定的空間或習慣", "我還在了解"] },
      style: { title: "什麼樣的指導對你最有幫助？", options: ["小規模嘗試", "清晰的步驟計劃", "數據與證據", "提醒與鼓勵", "自由探索"] },
      success: { title: "什麼結果會讓你願意持續改變？", options: ["減少日常壓力", "節省時間或金錢", "更穩定的健康或情緒", "看得見的進展", "對他人或環境產生積極影響"] }
    },
    "Español": {
      focus: { title: "¿Qué áreas de tu vida te interesa mejorar más?", options: ["Finanzas y gastos", "Energía y hogar", "Salud y rutina diaria", "Familia y relaciones", "Trabajo y aprendizaje", "Entorno y estilo de vida"] },
      desired_change: { title: "¿Qué cambio sería más importante en esas áreas?", options: ["Reducir gastos innecesarios", "Mejorar la comodidad del hogar", "Mejorar el sueño o la recuperación", "Mejorar la comunicación", "Proteger el tiempo de concentración", "Reducir residuos"] },
      constraints: { title: "¿Qué condiciones determinan lo que es realista para ti?", options: ["Presupuesto limitado", "Horario impredecible", "Responsabilidades familiares", "Salud física o emocional", "Limitaciones de vivienda o equipo", "Sin limitaciones principales"] },
      resources: { title: "¿Qué recursos o hábitos ya te están ayudando?", options: ["Dispositivos u objetos del hogar existentes", "Un presupuesto disponible", "Apoyo de amigos o familia", "Conocimientos o habilidades relevantes", "Un espacio o rutina estable", "Todavía lo estoy descubriendo"] },
      style: { title: "¿Qué tipo de orientación te resulta más útil?", options: ["Pequeños experimentos", "Un plan claro paso a paso", "Datos y pruebas", "Recordatorios y ánimo", "Libertad para explorar"] },
      success: { title: "¿Qué resultado haría que mantuvieras un cambio?", options: ["Menos estrés diario", "Ahorrar tiempo o dinero", "Salud o ánimo más estable", "Progreso visible", "Impacto positivo en personas o entorno"] }
    },
    "日本語": {
      focus: { title: "生活のどの分野を最も改善したいですか？", options: ["お金と支出", "エネルギーと住まい", "健康と日課", "家族と人間関係", "仕事と学習", "環境とライフスタイル"] },
      desired_change: { title: "その分野で最も重要な変化は何ですか？", options: ["不要な支出を減らす", "家の快適さを高める", "睡眠や回復を改善する", "コミュニケーションを改善する", "集中時間を守る", "無駄を減らす"] },
      constraints: { title: "現実的な選択肢を決める条件は何ですか？", options: ["限られた予算", "不規則な予定", "家族の責任", "身体または心の健康", "住居や設備の制限", "大きな制約はない"] },
      resources: { title: "すでに役立っている資源や習慣は何ですか？", options: ["既存の機器や家用品", "使える予算", "友人や家族の支援", "関連する知識やスキル", "安定した空間や習慣", "まだ模索中"] },
      style: { title: "どのようなガイダンスが最も役立ちますか？", options: ["小さな実験", "明確な手順", "データと根拠", "リマインダーと励まし", "自由な探索"] },
      success: { title: "どんな結果なら変化を続けたいと思いますか？", options: ["日常のストレスが減る", "時間やお金を節約できる", "健康や気分が安定する", "目に見える進歩", "人や環境への良い影響"] }
    }
  };
  const pack = packs[language];
  return baseQuestions.map(question => pack?.[question.id] ? { ...question, ...pack[question.id] } : question);
};
const subjective = [
  { id: "context", title: "What is happening in your life right now?" },
  { id: "tried", title: "What have you already tried?" },
  { id: "motivation", title: "Why does this matter to you now?" },
];
const multi = (value = "") => value ? value.split("||").filter(Boolean) : [];
const providerModels: Record<string, string[]> = { gemini: ["Auto (Gemini)", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"], deepseek: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"], "openai-compatible": ["gpt-5.1", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"], anthropic: ["claude-opus-4-1", "claude-sonnet-4", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"], custom: [] };
const providerDefaults: Record<string, string> = Object.fromEntries(Object.entries(providerModels).map(([provider, models]) => [provider, models[0] || "Enter model name"]));
const toggle = (value: string, option: string) => multi(value).includes(option) ? multi(value).filter(x => x !== option).join("||") : [...multi(value), option].join("||");
const exclusiveOptions: Record<string, string> = { constraints: "No major constraint", resources: "I am still figuring this out" };
const toggleQuestion = (questionId: string, value: string, option: string) => { const selected = multi(value); const exclusive = exclusiveOptions[questionId]; if (selected.includes(option)) return selected.filter(item => item !== option).join("||"); if (exclusive === option) return option; return [...selected.filter(item => item !== exclusive), option].join("||"); };
const missingBaseQuestions = (answers: Answers) => baseQuestions.filter(question => !answers[question.id] || (question.multi && !multi(answers[question.id]).length)).map(question => question.id);
const api = (path: string, init?: RequestInit) => fetch(`/api${path}`, init);
const json = (body: unknown) => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const profileLanguage = (id?: number) => { if (!id) return "English"; try { return JSON.parse(localStorage.getItem(`careplus-setup-${id}`) || "{}").language || "English"; } catch { return "English"; } };

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]), [id, setId] = useState<number | null>(null), [unlocked, setUnlocked] = useState<Set<number>>(new Set());
  const [online, setOnline] = useState(true), [pin, setPin] = useState(""), [pinError, setPinError] = useState(""), [setupOpen, setSetupOpen] = useState(false), [profileChooserOpen, setProfileChooserOpen] = useState(false), [pinTarget, setPinTarget] = useState<Profile | null>(null), [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("he-sidebar-collapsed") === "1");
  const toggleSidebar = () => setSidebarCollapsed(value => { const next = !value; localStorage.setItem("he-sidebar-collapsed", next ? "1" : "0"); return next; });
  useEffect(() => { api("/profiles").then(r => r.ok ? r.json() : Promise.reject()).then((items: Profile[]) => { const value = items.length ? items : [demo]; setProfiles(value); setId(value[0].id); }).catch(() => { setOnline(false); setProfiles([demo]); setId(demo.id); }); }, []);
  const profile = useMemo(() => profiles.find(p => p.id === id) || profiles[0], [profiles, id]); const appText = localeText(profileLanguage(profile?.id));
  async function unlock(event: React.FormEvent) { event.preventDefault(); if (!/^[0-9]{4,6}$/.test(pin)) { setPinError("Enter a 4–6 digit PIN"); return; } try { const r = await api(`/profiles/${profile.id}/unlock`, { method: "POST", ...json({ pin }) }); const data = await r.json(); if (!r.ok || !data.unlocked) throw Error(); setUnlocked(value => new Set(value).add(profile.id)); setPin(""); } catch { setPinError(online ? "That PIN is not correct." : "Preview mode PIN: 1234"); if (!online && pin === "1234") setUnlocked(value => new Set(value).add(profile.id)); } }
  async function create(setup: Setup) { let created: Profile; try { const r = await api("/profiles", { method: "POST", ...json({ nickname: setup.nickname, pin: setup.pin, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, currency: "USD" }) }); if (!r.ok) throw Error(); created = await r.json(); await api(`/profiles/${created.id}/ai-config`, { method: "PUT", ...json({ provider: setup.provider, model: setup.model, token: setup.token || "preview" }) }); } catch { created = { ...demo, id: Date.now(), nickname: setup.nickname }; setOnline(false); } setProfiles(value => [...value, created]); setId(created.id); setUnlocked(value => new Set(value).add(created.id)); localStorage.setItem(`careplus-setup-${created.id}`, JSON.stringify({ birthday: setup.birthday, language: setup.language, font: setup.font, color: setup.color })); localStorage.removeItem(`careplus-onboarding-${created.id}`); setSetupOpen(false); }
  async function unlockChooserProfile(event: React.FormEvent) { event.preventDefault(); if (!pinTarget) return; if (!/^\d{4,6}$/.test(pin)) { setPinError("Enter a 4–6 digit PIN"); return; } try { const response = await api(`/profiles/${pinTarget.id}/unlock`, { method: "POST", ...json({ pin }) }); const data = await response.json(); if (!response.ok || !data.unlocked) throw Error(); setId(pinTarget.id); setUnlocked(value => new Set(value).add(pinTarget.id)); setPin(""); setPinError(""); setPinTarget(null); } catch { setPinError(online ? "That PIN is not correct." : "Preview mode PIN: 1234"); if (!online && pin === "1234") { setId(pinTarget.id); setUnlocked(value => new Set(value).add(pinTarget.id)); setPin(""); setPinTarget(null); } } }
  async function deleteProfile(profileId: number) { if (profileId > 0) { const response = await api(`/profiles/${profileId}`, { method: "DELETE" }); if (!response.ok) { let detail = "Profile could not be deleted."; try { const body = await response.json(); if (body?.detail) detail = body.detail; } catch { /* ignore non-JSON error */ } throw Error(detail); } } ["careplus-setup-", "careplus-survey-", "careplus-onboarding-", "careplus-mbti-questions-", "careplus-report-cache-"].forEach(prefix => localStorage.removeItem(`${prefix}${profileId}`)); setUnlocked(value => { const next = new Set(value); next.delete(profileId); return next; }); setProfiles(current => { const remaining = current.filter(item => item.id !== profileId); setId(remaining[0]?.id ?? null); if (!remaining.length) setSetupOpen(true); return remaining; }); }
  return <div className="app-shell"><aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}><div className="brand"><span className="brand-mark"><VectorPlusIcon /></span><span>Human Engine</span></div><div className="side-label">{appText.yourSpace}</div><nav className="nav-list">{[["⌂", appText.home, "home"], ["◌", "Analysis", "analysis"], ["⚙", "Setting", "setting"], ["⚒", "Engine Lab", "engine"]].map(([icon, label, target]) => <button className="nav-item" key={target} onClick={() => target === "analysis" ? window.dispatchEvent(new Event("careplus:analysis")) : target === "setting" ? window.dispatchEvent(new Event("careplus:setting")) : target === "engine" ? window.dispatchEvent(new Event("careplus:engine")) : window.dispatchEvent(new Event("careplus:home"))}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-bottom"><div className="connection"><span className={`status-dot ${online ? "" : "offline"}`}></span><span>{online ? appText.localApi : appText.preview}</span></div></div></aside><main className="content"><header className="topbar"><div className="breadcrumb"><span>H·E</span><b>/</b><strong>{profile?.nickname || "Profile"}</strong></div><div className="profile-picker"><button className="topbar-sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}><VectorMenuIcon /></button><button className="avatar avatar-button" onClick={() => setProfileChooserOpen(true)} aria-label="Choose profile"><VectorProfileIcon /></button><span className="profile-name">{profile?.nickname || "Profile"}</span><span className="slot-count">{profiles.length}/5</span><button className="icon-button" onClick={() => setSetupOpen(true)} disabled={profiles.length >= 5} aria-label="Create profile"><VectorPlusIcon /></button></div></header>{profile && !unlocked.has(profile.id) ? <Gate profile={profile} pin={pin} setPin={setPin} error={pinError} onSubmit={unlock} onCreate={() => setSetupOpen(true)} /> : <ProfileShell profile={profile} onLock={() => setUnlocked(value => { const next = new Set(value); next.delete(profile.id); return next; })} onDelete={() => deleteProfile(profile.id)} />}</main>{profileChooserOpen && <ProfileChooser profiles={profiles} currentId={id} onChoose={profileId => { const chosen = profiles.find(item => item.id === profileId); if (chosen) { setPinTarget(chosen); setPin(""); setPinError(""); } setProfileChooserOpen(false); }} onClose={() => setProfileChooserOpen(false)} />}{pinTarget && <ProfilePinModal profile={pinTarget} pin={pin} setPin={setPin} error={pinError} onSubmit={unlockChooserProfile} onCancel={() => { setPinTarget(null); setPin(""); setPinError(""); }} />}{setupOpen && <SetupV2 onCancel={() => setSetupOpen(false)} onComplete={create} />}</div>;
}

function ProfileChooser({ profiles, currentId, onChoose, onClose }: { profiles: Profile[]; currentId: number | null; onChoose: (profileId: number) => void; onClose: () => void }) { return <div className="profile-chooser-backdrop" onClick={onClose}><section className="profile-chooser" onClick={event => event.stopPropagation()}><button className="profile-chooser-close" onClick={onClose}>×</button><p className="kicker">H·E · PROFILES</p><h2>Who is using Human Engine?</h2><div className="profile-chooser-grid">{profiles.map(profile => <button className={`profile-chooser-card ${profile.id === currentId ? "selected" : ""}`} key={profile.id} onClick={() => onChoose(profile.id)}><span className="profile-chooser-avatar"><VectorProfileIcon /></span><strong>{profile.nickname}</strong><small>{profile.id === currentId ? "Current profile" : "Enter profile"}</small></button>)}</div></section></div>; }

function ProfilePinModal({ profile, pin, setPin, error, onSubmit, onCancel }: { profile: Profile; pin: string; setPin: (value: string) => void; error: string; onSubmit: (event: React.FormEvent) => void; onCancel: () => void }) { return <div className="profile-pin-backdrop"><form className="profile-pin-modal" onSubmit={onSubmit}><button type="button" className="profile-chooser-close" onClick={onCancel}>×</button><span className="profile-chooser-avatar"><VectorProfileIcon /></span><p className="kicker">H·E · PROFILE LOCK</p><h2>{profile.nickname}</h2><p>Enter your PIN to continue.</p><input autoFocus type="password" inputMode="numeric" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ""))} placeholder="PIN" /><button className="primary-button" type="submit">Unlock profile</button>{error && <small className="profile-pin-error">{error}</small>}</form></div>; }

function Gate({ profile, pin, setPin, error, onSubmit, onCreate }: { profile: Profile; pin: string; setPin: (v: string) => void; error: string; onSubmit: (e: React.FormEvent) => void; onCreate: () => void }) { const text = localeText(profileLanguage(profile.id)); return <section className="profile-home gate"><p className="kicker">H·E · {text.privateSpace}</p><h1>{text.welcomeBack}<br /><em>{profile.nickname}.</em></h1><p>{text.enterDashboard}</p><form onSubmit={onSubmit}><input autoFocus type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder={text.pin || "PIN"} /><button className="primary-button" type="submit">{text.enterDashboard}</button></form>{error && <p className="gate-error">{error}</p>}<button className="wizard-secondary" onClick={onCreate}>{text.createProfile}</button></section>; }

function Setup({ onCancel, onComplete }: { onCancel: () => void; onComplete: (setup: Setup) => void }) { const [setup, setSetup] = useState<Setup>({ nickname: "", birthday: "", pin: "", language: "English", font: "DM Sans", color: "sage", provider: "deepseek", model: "Auto (DeepSeek)", token: "" }); const text = localeText(setup.language); const [confirm, setConfirm] = useState(""), [step, setStep] = useState(0), [error, setError] = useState(""); const update = (key: keyof Setup, value: string) => setSetup(current => ({ ...current, [key]: value })); const next = () => { if (step === 0 && (!setup.nickname || !setup.birthday || !/^[0-9]{4,6}$/.test(setup.pin) || setup.pin !== confirm)) { setError("Enter nickname, birthday, matching PIN, and confirmation."); return; } setError(""); step === 3 ? onComplete(setup) : setStep(value => value + 1); }; return <div className="wizard-backdrop"><div className="wizard"><header className="wizard-header"><div><p className="kicker">H·E · NEW PROFILE</p><h2>Set up your space</h2></div><button className="wizard-close" onClick={onCancel}>×</button></header><div className="wizard-progress">{["Basics", "Appearance", "AI provider", "Review"].map((label, i) => <span className={i <= step ? "done" : ""} key={label}><i>{i + 1}</i>{label}</span>)}</div><div className="wizard-stage"><div className="wizard-step" key={step}>{step === 0 && <><p className="kicker">STEP 1 · BASICS</p><h1>Let’s start with<br /><em>you.</em></h1><div className="wizard-form"><label>{text.nickname}<input autoFocus value={setup.nickname} onChange={e => update("nickname", e.target.value)} /></label><label>{text.birthday}<input type="date" value={setup.birthday} onChange={e => update("birthday", e.target.value)} /></label><div className="wizard-two"><label>PIN<input type="password" value={setup.pin} onChange={e => update("pin", e.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label>{text.confirmPin}<input type="password" value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label></div></div></>}{step === 1 && <><p className="kicker">STEP 2 · APPEARANCE</p><h1>Make it feel<br /><em>like yours.</em></h1><div className="wizard-form"><label>{text.language}<select className="styled-select" value={setup.language} onChange={e => update("language", e.target.value)}><option>English</option><option>简体中文</option><option>繁體中文</option><option>日本語</option><option>Español</option></select></label><label>{text.font}<select className="styled-select" value={setup.font} onChange={e => update("font", e.target.value)}><option>DM Sans</option><option>Inter</option><option>Georgia</option><option>System UI</option></select></label><label>{text.theme}<select className="styled-select" value={setup.color} onChange={e => update("color", e.target.value)}><option value="sage">Sage</option><option value="ocean">Ocean</option><option value="coral">Coral</option><option value="plum">Plum</option><option value="sun">Sun</option></select></label></div></>}{step === 2 && <><p className="kicker">STEP 3 · AI PROVIDER</p><h1>Choose your<br /><em>AI provider.</em></h1><div className="wizard-form"><label>{text.provider}<select className="styled-select" value={setup.provider} onChange={e => { update("provider", e.target.value); update("model", providerDefaults[e.target.value] || "Enter model name"); }}><option value="gemini">Gemini · default</option><option value="deepseek">DeepSeek</option><option value="openai-compatible">OpenAI-compatible</option><option value="anthropic">Anthropic</option><option value="custom">Custom provider</option></select></label><label>{text.model}<input value={setup.model} onChange={e => update("model", e.target.value)} placeholder="Auto-detect available model" /></label><label>{text.apiToken}<input type="password" value={setup.token} onChange={e => update("token", e.target.value)} placeholder="Paste your token" /></label><p className="security-note">Auto selects a provider-compatible model. You can edit it before saving.</p></div></>}{step === 3 && <><p className="kicker">STEP 4 · REVIEW</p><h1>Your space is<br /><em>ready to begin.</em></h1><div className="review-list"><div><span>Profile</span><strong>{setup.nickname}</strong></div><div><span>Theme</span><strong>{setup.language} · {setup.font} · {setup.color}</strong></div><div><span>AI</span><strong>{setup.provider} · {setup.model}</strong></div></div></>}</div></div>{error && <p className="wizard-error">{error}</p>}<footer className="wizard-footer"><button className="wizard-secondary" onClick={step ? () => setStep(value => value - 1) : onCancel}>{step ? "Back" : "Cancel"}</button><span>Step {step + 1} of 4</span><button className="primary-button wizard-next" onClick={next}>{step === 3 ? "Create space →" : "Continue →"}</button></footer></div></div>; }

function ProfileShell({ profile, onLock, onDelete }: { profile?: Profile; onLock: () => void; onDelete: () => Promise<void> }) { const [section, setSection] = useState<"home" | "analysis" | "setting" | "engine">("home"); const [done, setDone] = useState(Boolean(profile?.id && localStorage.getItem(`careplus-onboarding-${profile.id}`))); const [answers, setAnswers] = useState<Answers>({}); const [config, setConfig] = useState<AIConfig>(); const setup = useMemo(() => { if (!profile?.id) return null; try { return JSON.parse(localStorage.getItem(`careplus-setup-${profile.id}`) || "null"); } catch { return null; } }, [profile?.id]); useEffect(() => { if (!profile?.id) return; try { setAnswers(JSON.parse(localStorage.getItem(`careplus-survey-${profile.id}`) || "{}")); } catch { setAnswers({}); } fetch(`/api/profiles/${profile.id}/preferences`).then(r => r.ok ? r.json() : null).then(state => { if (state?.answers) { setAnswers(state.answers); localStorage.setItem(`careplus-survey-${profile.id}`, JSON.stringify(state.answers)); } }).catch(() => null); api(`/profiles/${profile.id}/ai-config`).then(r => r.ok ? r.json() : null).then(setConfig).catch(() => null); document.documentElement.dataset.careColor = setup?.color || "sage"; document.documentElement.dataset.careFont = setup?.font || "DM Sans"; document.documentElement.lang = setup?.language === "简体中文" ? "zh-CN" : setup?.language === "繁體中文" ? "zh-TW" : setup?.language === "日本語" ? "ja" : setup?.language === "Español" ? "es" : "en"; applyLocaleToDocument(setup?.language || "English"); }, [profile?.id, setup]); useEffect(() => { const openAnalysis = () => setSection("analysis"); const openSetting = () => setSection("setting"); const openEngine = () => setSection("engine"); const openHome = () => setSection("home"); window.addEventListener("careplus:analysis", openAnalysis); window.addEventListener("careplus:setting", openSetting); window.addEventListener("careplus:engine", openEngine); window.addEventListener("careplus:home", openHome); return () => { window.removeEventListener("careplus:analysis", openAnalysis); window.removeEventListener("careplus:setting", openSetting); window.removeEventListener("careplus:engine", openEngine); window.removeEventListener("careplus:home", openHome); }; }, []); const finish = (value: Answers) => { setAnswers(value); localStorage.setItem(`careplus-survey-${profile?.id}`, JSON.stringify(value)); localStorage.setItem(`careplus-onboarding-${profile?.id}`, "done"); setDone(true); setSection("home"); }; if (!profile) return <section className="profile-home"><p>Loading Profile…</p></section>; if (!done) return <StructuredPreferenceFlow profile={profile} config={config} initial={answers} onDone={finish} />; return section === "home" ? <Home profile={profile} config={config} onSettings={() => setSection("setting")} onLock={onLock} /> : section === "engine" ? <EngineLab profileId={profile.id} nickname={profile.nickname} onBack={() => setSection("home")} /> : <SettingsPanelV2 profile={profile} answers={answers} config={config} setConfig={setConfig} setup={setup} initialModule={section === "analysis" ? "analysis" : "setting"} onBack={() => setSection("home")} onDelete={onDelete} />; }

function Home({ profile, onLock }: { profile?: Profile; onLock: () => void; config?: AIConfig; onSettings?: () => void }) { const text = localeText(profileLanguage(profile?.id)); return <section className="profile-home"><p className="kicker">H·E · {profile?.nickname} · HOME</p><h1>{text.welcomeBack}<br /><em>{profile?.nickname}.</em></h1><p>{text.homeDescription}</p><div className="dashboard-placeholder"><span>HOME / DASHBOARD</span><strong>{text.dashboardReady}</strong></div><button className="wizard-secondary lock-button" onClick={onLock}>Lock Profile</button></section>; }

function SetupV2({ onCancel, onComplete }: { onCancel: () => void; onComplete: (setup: Setup) => void }) {
  const [setup, setSetup] = useState<Setup>({ nickname: "", birthday: "", pin: "", language: "English", font: "DM Sans", color: "sage", provider: "deepseek", model: "Auto (DeepSeek)", token: "" });
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const text = localeText(setup.language);
  useEffect(() => { applyLocaleToDocument(setup.language); }, [setup.language, step]);
  const update = (key: keyof Setup, value: string) => setSetup(current => ({ ...current, [key]: value }));
  const next = () => {
    if (step === 0 && (!setup.nickname || !setup.birthday || !/^\d{4,6}$/.test(setup.pin) || setup.pin !== confirm)) { setError("Enter nickname, birthday, matching PIN, and confirmation."); return; }
    setError("");
    if (step === 3) onComplete(setup); else setStep(current => current + 1);
  };
  const back = () => { setError(""); if (step === 0) onCancel(); else setStep(current => current - 1); };
  const steps = [text.basics, text.appearance, text.aiProvider, text.review];
  return <div className="wizard-backdrop"><div className="wizard">
    <header className="wizard-header"><div><p className="kicker">H·E · NEW PROFILE</p><h2>{text.createProfile}</h2></div><button className="wizard-close" onClick={onCancel}>×</button></header>
    <div className="wizard-progress">{steps.map((label, index) => <span className={index <= step ? "done" : ""} key={label}><i>{index + 1}</i>{label}</span>)}</div>
    <div className="wizard-stage"><div className="wizard-step" key={step}>
      {step === 0 && <><p className="kicker">STEP 1 · {text.basics}</p><h1>{text.nickname}<br /><em>{text.yourSpace}.</em></h1><div className="wizard-form"><label>{text.nickname}<input autoFocus value={setup.nickname} onChange={event => update("nickname", event.target.value)} /></label><label>{text.birthday}<input type="date" value={setup.birthday} onChange={event => update("birthday", event.target.value)} /></label><div className="wizard-two"><label>{text.pin}<input type="password" value={setup.pin} onChange={event => update("pin", event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label>{text.confirmPin}<input type="password" value={confirm} onChange={event => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label></div></div></>}
      {step === 1 && <><p className="kicker">STEP 2 · {text.appearance}</p><h1>{text.appearance}<br /><em>{text.configuration}.</em></h1><div className="wizard-form"><label>{text.language}<select className="styled-select" value={setup.language} onChange={event => update("language", event.target.value)}><option>English</option><option>简体中文</option><option>繁體中文</option><option>日本語</option><option>Español</option></select></label><label>{text.theme}<select className="styled-select" value={setup.color} onChange={event => update("color", event.target.value)}><option value="sage">Sage</option><option value="ocean">Ocean</option><option value="coral">Coral</option><option value="plum">Plum</option><option value="sun">Sun</option></select></label></div></>}
      {step === 2 && <><p className="kicker">STEP 3 · {text.aiProvider}</p><h1>{text.chooseAI}</h1><div className="wizard-form"><label>{text.provider}<select className="styled-select" value={setup.provider} onChange={event => { update("provider", event.target.value); update("model", providerDefaults[event.target.value] || "Enter model name"); }}><option value="deepseek">DeepSeek</option><option value="gemini">Gemini</option><option value="openai-compatible">OpenAI-compatible</option><option value="anthropic">Anthropic</option><option value="custom">Custom provider</option></select></label><label>{text.model}<input value={setup.model} onChange={event => update("model", event.target.value)} placeholder={text.autoModel} /></label><label>{text.apiToken}<input type="password" value={setup.token} onChange={event => update("token", event.target.value)} placeholder={text.apiToken} /></label></div></>}
      {step === 3 && <><p className="kicker">STEP 4 · {text.review}</p><h1>{text.reviewReady}</h1><div className="review-list"><div><span>{text.nickname}</span><strong>{setup.nickname}</strong></div><div><span>{text.theme}</span><strong>{setup.language} · {setup.color}</strong></div><div><span>AI</span><strong>{setup.provider} · {setup.model}</strong></div></div></>}
    </div></div>
    {error && <p className="wizard-error">{error}</p>}
    <footer className="wizard-footer"><button className="wizard-secondary" onClick={back}>{step === 0 ? text.cancel : text.back}</button><span>{text.step} {step + 1} / 4</span><button className="primary-button wizard-next" onClick={next}>{step === 3 ? text.createProfile : text.continue}</button></footer>
  </div></div>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);















