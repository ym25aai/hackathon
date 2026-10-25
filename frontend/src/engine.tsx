import { useMemo, useState } from "react";
import { localeText } from "./i18n";
import { engineLocale } from "./engine-locales";

type Mode = "sandbox" | "rules" | "probability" | "interaction";
type Category = "self" | "education" | "career" | "relationships" | "finance" | "ethics" | "health" | "crisis";
type EngineProps = { profileId: number; nickname: string; onBack: () => void };
const modeIds: Mode[] = ["sandbox", "rules", "probability", "interaction"];
const categoryIds: Category[] = ["self", "education", "career", "relationships", "finance", "ethics", "health", "crisis"];

export function EngineLab({ profileId, nickname, onBack }: EngineProps) {
  const language = useMemo(() => { try { return JSON.parse(localStorage.getItem(`careplus-setup-${profileId}`) || "{}").language || "English"; } catch { return "English"; } }, [profileId]);
  const text = localeText(language);
  const t = engineLocale(language);
  const [mode, setMode] = useState<Mode | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [stage, setStage] = useState<"mode" | "category" | "config">("mode");
  const save = () => localStorage.setItem(`careplus-engine-selection-${profileId}`, JSON.stringify({ mode, category }));
  return <section className="engine-page">
    <header className="engine-header"><div><p className="kicker">{t.kicker} · {nickname}</p><h1>{t.title}</h1><p className="engine-subtitle">{t.subtitle}</p></div><button className="wizard-secondary" onClick={onBack}>← {text.settings}</button></header>
    <div className="engine-flow-crumbs"><button className={stage === "mode" ? "active" : ""} onClick={() => setStage("mode")}>01 · {t.mode}</button><button className={stage === "category" ? "active" : ""} disabled={!mode} onClick={() => setStage("category")}>02 · {t.category}</button><button className={stage === "config" ? "active" : ""} disabled={!category} onClick={() => setStage("config")}>03 · {t.scenario}</button></div>
    {stage === "mode" && <div className="engine-card"><p className="kicker">{t.modeKicker}</p><h2>{t.modeTitle}</h2><p>{t.modeSubtitle}</p><div className="engine-selection-grid">{modeIds.map(id => <button className={`engine-select-card ${mode === id ? "selected" : ""}`} key={id} onClick={() => { setMode(id); setStage("category"); }}><span>{id.toUpperCase()}</span><strong>{t.modes[id].title}</strong><small>{t.modes[id].description}</small></button>)}</div></div>}
    {stage === "category" && <div className="engine-card"><p className="kicker">{t.categoryKicker}</p><h2>{t.categoryTitle}</h2><p>{t.categorySubtitle}</p><div className="engine-selection-grid category-grid">{categoryIds.map(id => <button className={`engine-select-card ${category === id ? "selected" : ""}`} key={id} onClick={() => { setCategory(id); setStage("config"); }}><span>{id.toUpperCase()}</span><strong>{t.categories[id].title}</strong><small>{t.categories[id].description}</small></button>)}</div><button className="wizard-secondary" onClick={() => setStage("mode")}>{t.backMode}</button></div>}
    {stage === "config" && <div className="engine-card"><p className="kicker">{t.configKicker}</p><h2>{t.configTitle}</h2><p>{t.configSubtitle}</p><div className="engine-config-summary"><div><span>{t.mode}</span><strong>{mode?.toUpperCase()}</strong></div><div><span>{t.category}</span><strong>{category?.toUpperCase()}</strong></div></div><button className="primary-button" onClick={save}>{t.save}</button><button className="wizard-secondary" onClick={() => setStage("category")}>{t.backCategory}</button></div>}
  </section>;
}
