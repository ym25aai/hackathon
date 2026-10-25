import { useEffect, useMemo, useState } from "react";
import { localeText } from "./i18n";
import { engineLocale } from "./engine-locales";

type Mode = "sandbox" | "rules" | "probability" | "interaction";
type Category = "self" | "education" | "career" | "relationships" | "finance" | "ethics" | "health" | "crisis";
type EngineProps = { profileId: number; nickname: string; onBack: () => void };
type DomainPack = { id: Category; title: string; description: string; state_variables: string[]; actions: string[]; constraints: string[]; evaluation_criteria: string[] };
type RunResult = { run_id: string; score: number; status: "promising" | "mixed" | "high-risk"; summary: string; state: Record<string, number>; metrics: Record<string, number>; next_actions: string[]; log: Array<{ step: number; action: string; outcome: string; state: Record<string, number> }> };
const modeIds: Mode[] = ["sandbox", "rules", "probability", "interaction"];
const categoryIds: Category[] = ["self", "education", "career", "relationships", "finance", "ethics", "health", "crisis"];
const api = (path: string, init?: RequestInit) => fetch(`/api${path}`, init);
const copy = (language: string) => ({
  title: language === "繁體中文" ? "探索你的人類引擎。" : language === "简体中文" ? "探索你的人类引擎。" : "Explore your human engine.",
  subtitle: language === "繁體中文" ? "把抽象決定變成可檢驗的下一步。" : language === "简体中文" ? "把抽象决定变成可检验的下一步。" : "Turn an abstract decision into a testable next move.",
  configure: language === "繁體中文" ? "配置情境" : language === "简体中文" ? "配置情境" : "Configure scenario",
  run: language === "繁體中文" ? "執行模擬" : language === "简体中文" ? "运行模拟" : "Run simulation",
  result: language === "繁體中文" ? "模擬結果" : language === "简体中文" ? "模拟结果" : "Simulation result",
  titleLabel: language === "繁體中文" ? "情境名稱" : language === "简体中文" ? "情境名称" : "Scenario title",
  context: language === "繁體中文" ? "目前情況" : language === "简体中文" ? "当前情况" : "Current context",
  action: language === "繁體中文" ? "選擇第一步" : language === "简体中文" ? "选择第一步" : "Choose a first move",
  loading: language === "繁體中文" ? "載入中…" : language === "简体中文" ? "加载中…" : "Loading…",
  validate: language === "繁體中文" ? "檢查並繼續" : language === "简体中文" ? "检查并继续" : "Validate and continue",
  back: language === "繁體中文" ? "返回" : language === "简体中文" ? "返回" : "Back",
  reset: language === "繁體中文" ? "重新開始" : language === "简体中文" ? "重新开始" : "Start over",
});

export function EngineLab({ profileId, nickname, onBack }: EngineProps) {
  const language = useMemo(() => { try { return JSON.parse(localStorage.getItem(`careplus-setup-${profileId}`) || "{}").language || "English"; } catch { return "English"; } }, [profileId]);
  const text = localeText(language); const t = engineLocale(language); const ui = copy(language);
  const [mode, setMode] = useState<Mode | null>(null); const [category, setCategory] = useState<Category | null>(null);
  const [stage, setStage] = useState<"mode" | "category" | "config" | "run" | "result">("mode");
  const [pack, setPack] = useState<DomainPack | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [scenarioTitle, setScenarioTitle] = useState(""); const [context, setContext] = useState(""); const [state, setState] = useState<Record<string, number>>({});
  const [action, setAction] = useState(""); const [result, setResult] = useState<RunResult | null>(null);
  const storageKey = `careplus-engine-selection-${profileId}`;

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null"); if (saved?.mode) setMode(saved.mode); if (saved?.category) { setCategory(saved.category); setStage("config"); } if (saved?.scenarioTitle) setScenarioTitle(saved.scenarioTitle); if (saved?.context) setContext(saved.context); if (saved?.state) setState(saved.state); if (saved?.action) setAction(saved.action); } catch { /* ignore malformed local state */ } }, [storageKey]);
  useEffect(() => {
    if (!category) return;
    setLoading(true); setError("");
    api(`/simulations/domain-packs/${category}`).then(response => response.ok ? response.json() : Promise.reject(new Error("Could not load domain pack"))).then((value: DomainPack) => { setPack(value); setAction(current => current || value.actions[0] || ""); setState(current => Object.keys(current).length ? current : Object.fromEntries(value.state_variables.map(variable => [variable, 50]))); }).catch(reason => setError(reason instanceof Error ? reason.message : "Could not load domain pack")).finally(() => setLoading(false));
  }, [category]);
  const chooseMode = (value: Mode) => { setMode(value); setStage("category"); setError(""); };
  const chooseCategory = (value: Category) => { setCategory(value); setStage("config"); setError(""); setResult(null); };
  const saveSelection = () => { if (!mode || !category || !pack || !scenarioTitle.trim()) { setError("Add a title before continuing."); return; } localStorage.setItem(storageKey, JSON.stringify({ mode, category, scenarioTitle, context, state })); setStage("run"); };
  const run = async () => {
    if (!mode || !category || !pack || !action) return;
    setLoading(true); setError("");
    const payload = { simulation_mode: mode, primary_category: category, scenario: { id: `${category}-${Date.now()}`, title: scenarioTitle.trim(), context }, initial_state: state, objectives: pack.evaluation_criteria.map(item => ({ id: item, title: item })), constraints: pack.constraints.map(item => ({ id: item, title: item })), actions: pack.actions.map(item => ({ id: item, title: item })), evaluation: { criteria: pack.evaluation_criteria } };
    try { const validation = await api("/simulations/scenario/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); if (!validation.ok) throw new Error("Scenario validation failed"); const response = await api("/simulations/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: payload, action, seed: profileId }) }); const value = await response.json(); if (!response.ok) throw new Error(value.detail || "Simulation failed"); setResult(value); localStorage.setItem(storageKey, JSON.stringify({ mode, category, scenarioTitle, context, state, action })); setStage("result"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Simulation failed"); } finally { setLoading(false); }
  };
  const setVariable = (variable: string, value: number) => setState(current => ({ ...current, [variable]: value }));
  const stepClass = (name: typeof stage) => stage === name ? "active" : "";
  return <section className="engine-page">
    <header className="engine-header"><div><p className="kicker">{t.kicker} · {nickname}</p><h1>{ui.title}</h1><p className="engine-subtitle">{ui.subtitle}</p></div><button className="wizard-secondary" onClick={onBack}>← {text.settings}</button></header>
    <div className="engine-flow-crumbs"><button className={stepClass("mode")} onClick={() => setStage("mode")}>01 · {t.mode}</button><button className={stepClass("category")} disabled={!mode} onClick={() => setStage("category")}>02 · {t.category}</button><button className={stepClass("config")} disabled={!category} onClick={() => setStage("config")}>03 · {t.scenario}</button><button className={stepClass("run")} disabled={!pack} onClick={() => setStage("run")}>04 · {ui.action}</button><button className={stepClass("result")} disabled={!result} onClick={() => setStage("result")}>05 · {ui.result}</button></div>
    {error && <div className="engine-error" role="alert">{error}</div>}
    {stage === "mode" && <div className="engine-card"><p className="kicker">{t.modeKicker}</p><h2>{t.modeTitle}</h2><p>{t.modeSubtitle}</p><div className="engine-selection-grid">{modeIds.map(id => <button className={`engine-select-card ${mode === id ? "selected" : ""}`} key={id} onClick={() => chooseMode(id)}><span>{id.toUpperCase()}</span><strong>{t.modes[id].title}</strong><small>{t.modes[id].description}</small></button>)}</div></div>}
    {stage === "category" && <div className="engine-card"><p className="kicker">{t.categoryKicker}</p><h2>{t.categoryTitle}</h2><p>{t.categorySubtitle}</p><div className="engine-selection-grid category-grid">{categoryIds.map(id => <button className={`engine-select-card ${category === id ? "selected" : ""}`} key={id} onClick={() => chooseCategory(id)}><span>{id.toUpperCase()}</span><strong>{t.categories[id].title}</strong><small>{t.categories[id].description}</small></button>)}</div><button className="wizard-secondary" onClick={() => setStage("mode")}>{ui.back}</button></div>}
    {stage === "config" && <div className="engine-card"><p className="kicker">{t.configKicker}</p><h2>{t.scenario}</h2><p>{pack?.description || ui.loading}</p>{loading && <p className="engine-loading">{ui.loading}</p>}{!loading && pack && <p className="engine-pack-ready">{pack.title} domain pack ready · {pack.actions.length} possible actions</p>}<div className="engine-form-grid"><label><span>{ui.titleLabel}</span><input value={scenarioTitle} onChange={event => setScenarioTitle(event.target.value)} placeholder="e.g. Decide whether to change jobs" /></label><label><span>{ui.context}</span><textarea rows={4} value={context} onChange={event => setContext(event.target.value)} placeholder="Describe the situation you are facing…" /></label></div><div className="engine-pack-grid"><div><span className="engine-label">STATE VARIABLES</span>{pack?.state_variables.map(variable => <label className="engine-range" key={variable}><span>{variable.replace(/_/g, " ")} <b>{state[variable] ?? 50}</b></span><input type="range" min="0" max="100" value={state[variable] ?? 50} onChange={event => setVariable(variable, Number(event.target.value))} /></label>)}</div><div><span className="engine-label">CONSTRAINTS</span>{pack?.constraints.length ? <ul>{pack.constraints.map(item => <li key={item}>{item.replace(/_/g, " ")}</li>)}</ul> : <p className="engine-muted">No fixed constraints.</p>}<span className="engine-label">EVALUATION</span><div className="engine-tags">{pack?.evaluation_criteria.map(item => <span key={item}>{item}</span>)}</div></div></div><div className="engine-actions"><button className="wizard-secondary" onClick={() => setStage("category")}>{ui.back}</button><button className="primary-button" onClick={saveSelection} disabled={loading || !pack}>{ui.validate} →</button></div></div>}
    {stage === "run" && <div className="engine-card"><p className="kicker">{t.configKicker}</p><h2>{ui.run}</h2><p>{scenarioTitle || "Untitled scenario"}</p><div className="scenario-prompt"><strong>{context || "No additional context provided."}</strong><small>{pack?.description}</small></div><div className="engine-action-list"><span className="engine-label">{ui.action}</span>{pack?.actions.map(item => <button className={action === item ? "selected" : ""} key={item} onClick={() => setAction(item)}><strong>{item.replace(/_/g, " ")}</strong><small>Apply this move and observe the next three steps.</small></button>)}</div><div className="engine-actions"><button className="wizard-secondary" onClick={() => setStage("config")}>{ui.back}</button><button className="primary-button" onClick={run} disabled={loading || !action}>{loading ? ui.loading : ui.run} →</button></div></div>}
    {stage === "result" && result && <div className="engine-card"><p className="kicker">{t.kicker} · RUN {result.run_id}</p><h2>{ui.result}</h2><div className={`engine-result-banner ${result.status}`}><span>{result.status.replace("-", " ")}</span><strong>{result.score}<small>/100</small></strong><p>{result.summary}</p></div><div className="report-grid">{Object.entries(result.metrics).map(([key, value]) => <div key={key}><span>{key.replace(/_/g, " ")}</span><strong>{value}</strong></div>)}</div><h3>State after three steps</h3><div className="engine-state-grid">{Object.entries(result.state).map(([key, value]) => <div key={key}><span>{key.replace(/_/g, " ")}</span><b>{value}</b><i style={{ width: `${value}%` }} /></div>)}</div><div className="engine-log">{result.log.map(entry => <article key={entry.step}><span>0{entry.step}</span><div><strong>{entry.action.replace(/_/g, " ")}</strong><p>{entry.outcome}</p></div></article>)}</div><div className="engine-actions"><button className="wizard-secondary" onClick={() => setStage("run")}>{ui.back}</button><button className="primary-button" onClick={() => { setResult(null); setStage("mode"); }}>{ui.reset}</button></div></div>}
  </section>;
}
