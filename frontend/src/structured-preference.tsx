import { useEffect, useMemo, useState } from "react";
import { applyLocaleToDocument, localeText } from "./i18n";

type Answers = Record<string, string>;
type Profile = { id: number; nickname: string };
type Config = { configured?: boolean };
type Props = { profile: Profile; config?: Config; initial: Answers; onDone: (answers: Answers) => void };
type ChoiceQuestion = { id: string; title: string; options: string[]; multi?: boolean };

const basicQuestions: ChoiceQuestion[] = [
  { id: "focus", title: "Which areas of your life are you most interested in improving?", options: ["Finances & spending", "Energy & home", "Health & daily routine", "Family & relationships", "Work & learning", "Environment & lifestyle"], multi: true },
  { id: "desired_change", title: "What change would matter most in those areas?", options: ["Reduce unnecessary spending", "Improve comfort at home", "Improve sleep or recovery", "Improve communication", "Protect focus time", "Reduce waste"], multi: true },
  { id: "constraints", title: "Which conditions shape what is realistic for you?", options: ["Limited budget", "Unpredictable schedule", "Family responsibilities", "Physical or emotional health", "Housing or equipment limits", "No major constraint"], multi: true },
  { id: "resources", title: "What is already working or available to support you?", options: ["Existing devices or household items", "A budget I can use", "Friends or family support", "Relevant knowledge or skills", "A stable space or routine", "I am still figuring this out"], multi: true },
  { id: "style", title: "What kind of guidance feels most useful?", options: ["Small experiments", "A clear step-by-step plan", "Data and evidence", "Reminders and encouragement", "Freedom to explore"] },
  { id: "success", title: "What would make a change worth continuing?", options: ["Less everyday stress", "Saving time or money", "More stable health or mood", "Visible progress", "Positive impact on people or environment"], multi: true },
];
const mbtiQuestions: ChoiceQuestion[] = [
  { id: "mbti_ie", title: "What restores you after a demanding week?", options: ["Time with people and active exchange · E", "Quiet time alone to reset · I"] },
  { id: "mbti_sn", title: "What do you trust first when learning something new?", options: ["Concrete facts and examples · S", "Patterns and possibilities · N"] },
  { id: "mbti_tf", title: "What leads when you make a difficult decision?", options: ["Logic and consistent trade-offs · T", "Values, empathy and human impact · F"] },
  { id: "mbti_jp", title: "How do you approach an important plan?", options: ["Clear structure and decided steps · J", "Flexibility and room to adapt · P"] },
];
const personalQuestions = ["What is happening in your life right now?", "What have you already tried?", "Why does this matter to you now?"];
const pick = (value = "") => value.split("||").filter(Boolean);
const mbtiType = (answers: Answers) => ["mbti_ie", "mbti_sn", "mbti_tf", "mbti_jp"].map(id => { const answer = answers[id] || ""; return answer.includes("· E") ? "E" : answer.includes("· S") ? "S" : answer.includes("· T") ? "T" : answer.includes("· J") ? "J" : answer.includes("· I") ? "I" : answer.includes("· N") ? "N" : answer.includes("· F") ? "F" : answer.includes("· P") ? "P" : "?"; }).join("");

export function StructuredPreferenceFlow({ profile, config, initial, onDone }: Props) {
  const language = useMemo(() => { try { return JSON.parse(localStorage.getItem(`careplus-setup-${profile.id}`) || "{}").language || "English"; } catch { return "English"; } }, [profile.id]);
  const text = localeText(language);
  useEffect(() => { applyLocaleToDocument(language); }, [language]);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [stage, setStage] = useState<"basic" | "mbti" | "optional" | "ai">("basic");
  const [index, setIndex] = useState(0);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/profiles/${profile.id}/preferences`).then(response => response.ok ? response.json() : null).then(state => { if (state?.answers) setAnswers({ ...initial, ...state.answers }); if (state?.ai_questions) setAiQuestions(state.ai_questions); }).catch(() => undefined); }, [profile.id]);
  const persist = (next: Answers, questions = aiQuestions) => { setAnswers(next); localStorage.setItem(`careplus-survey-${profile.id}`, JSON.stringify(next)); fetch(`/api/profiles/${profile.id}/preferences`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: next, ai_questions: questions }) }).catch(() => undefined); };
  const answer = (key: string, value: string) => persist({ ...answers, [key]: value });
  const nextChoice = (option: string) => { const question = stage === "basic" ? basicQuestions[index] : mbtiQuestions[index]; if (!question.multi) return answer(question.id, option); const current = pick(answers[question.id]); const exclusive = question.id === "constraints" ? "No major constraint" : question.id === "resources" ? "I am still figuring this out" : ""; const next = current.includes(option) ? current.filter(item => item !== option) : exclusive === option ? [option] : [...current.filter(item => item !== exclusive), option]; answer(question.id, next.join("||")); };
  const completeBasic = () => { if (basicQuestions.some(question => !pick(answers[question.id]).length)) return setError("Complete all six Basic Questions first."); setError(""); setIndex(0); setStage("mbti"); };
  const completeMbti = () => { if (mbtiQuestions.some(question => !answers[question.id])) return setError("Choose one answer for every MBTI dimension."); const next = { ...answers, mbti_type: mbtiType(answers) }; persist(next); setError(""); setIndex(0); setStage("ai"); };
  const generateAI = async () => { const next = { ...answers, mbti_type: mbtiType(answers) }; setLoading(true); setError(""); try { const response = await fetch(`/api/profiles/${profile.id}/ai-questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: next, count: 1, language, purpose: "review" }) }); const data = await response.json(); if (!response.ok) throw Error(data.detail || "AI review failed"); setAiQuestions(data.questions || []); persist(next, data.questions || []); setStage("ai"); } catch (reason) { setError(reason instanceof Error ? reason.message : "AI review failed"); } finally { setLoading(false); } };
  if (stage === "optional") return <section className="survey optional-preview structured-preferences"><p className="kicker">PART 2 · OPTIONAL QUESTIONS</p><h1>Add your<br /><em>own context.</em></h1><p>These three questions are optional. You can skip them and complete them later in Settings.</p>{personalQuestions.map((question, i) => <label className="optional-form-item" key={question}><span>{question}</span><textarea rows={3} value={answers[`personal_${i}`] || ""} onChange={event => answer(`personal_${i}`, event.target.value)} /></label>)}<div className="flow-footer"><button className="wizard-secondary" onClick={() => onDone({ ...answers, mbti_type: mbtiType(answers) })}>{text.skip}</button><button className="primary-button" onClick={() => config?.configured ? setStage("ai") : onDone({ ...answers, mbti_type: mbtiType(answers) })}>{config?.configured ? "Continue to AI review →" : text.enterProfile}</button></div></section>;
  if (stage === "ai") return <section className="survey flow-survey structured-preferences"><p className="kicker">PART 3 · AI REVIEW</p><h1>Questions shaped<br /><em>around you.</em></h1>{loading && <p className="ai-loading-text">Generating targeted questions…</p>}{error && <div className="ai-error"><p>{error}</p><button className="wizard-secondary" onClick={generateAI}>Try again</button></div>}{!loading && !error && !aiQuestions.length && <><p>AI review uses your Basic answers and MBTI profile.</p><button className="primary-button" onClick={generateAI}>Start AI review →</button></>}{aiQuestions.map((question, i) => <label className="ai-question-card" key={`${question}-${i}`}><span>AI REVIEW 0{i + 1}</span><p>{question}</p><textarea rows={3} value={answers[`ai_${i}`] || ""} onChange={event => answer(`ai_${i}`, event.target.value)} placeholder={text.optional} /></label>)}{!loading && aiQuestions.length > 0 && <button className="primary-button" onClick={() => onDone({ ...answers, mbti_type: mbtiType(answers) })}>{text.enterProfile}</button>}</section>;
  const questions = stage === "basic" ? basicQuestions : mbtiQuestions;
  const current = questions[index];
  const continueStep = () => stage === "basic" ? (index === basicQuestions.length - 1 ? completeBasic() : setIndex(value => value + 1)) : (index === mbtiQuestions.length - 1 ? completeMbti() : setIndex(value => value + 1));
  return <section className="survey flow-survey structured-preferences"><button type="button" className="ppt-next-arrow" onClick={continueStep} aria-label="Continue">→</button><p className="kicker">H·E · {profile.nickname} · {stage === "basic" ? `BASIC QUESTION ${index + 1} OF 6` : `MBTI DIMENSION ${index + 1} OF 4`}</p><h1>{current.title}</h1><p>{current.multi ? text.selectAll : "Choose one answer."}</p><div className="flow-choices">{current.options.map(option => <label className={`flow-choice ${pick(answers[current.id]).includes(option) ? "selected" : ""}`} key={option}><input type={current.multi ? "checkbox" : "radio"} checked={pick(answers[current.id]).includes(option)} onChange={() => nextChoice(option)} /><span>{option}</span></label>)}</div><div className="flow-footer"><button className="wizard-secondary" disabled={!index} onClick={() => setIndex(value => value - 1)}>{text.back}</button><button className="primary-button" onClick={continueStep}>{stage === "basic" && index === 5 ? "Continue to MBTI →" : stage === "mbti" && index === 3 ? "Continue to optional questions →" : text.next}</button></div>{error && <p className="wizard-error">{error}</p>}</section>;
}

