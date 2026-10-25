import { useEffect, useMemo, useState } from "react";

type Category = "self" | "education" | "career" | "relationships" | "finance" | "ethics" | "health" | "crisis";
type Profile = { id: number; nickname: string };
type DomainPack = { title: string; description: string; state_variables: string[]; actions: string[]; constraints: string[]; evaluation_criteria: string[] };
type Invite = { id: number; recipient_profile_id: number; recipient_nickname: string; status: "pending" | "accepted" | "declined" | "expired" };
type Props = { profileId: number; category: Category; pack: DomainPack | null; scenarioTitle: string; setScenarioTitle: (value: string) => void; context: string; setContext: (value: string) => void; probability: number; setProbability: (value: number) => void; displayAnswer: string; setDisplayAnswer: (value: string) => void; onBack: () => void; onStart: (participants: number[], context: string) => void };

const probabilityCategories = new Set<Category>(["education", "career", "relationships", "finance", "health", "crisis"]);
const displayCategories = new Set<Category>(["education", "career", "relationships", "finance", "health", "crisis"]);
const displayPrompts: Record<Category, string> = { self: "What should the result make visible about your progress?", education: "What should the result make visible about your learning progress?", career: "What should the result make visible about opportunity and trade-offs?", relationships: "What should the result make visible about each person's needs?", finance: "What should the result make visible about cost, savings, and risk?", ethics: "What should the result make visible about responsibility and consequences?", health: "What should the result make visible about effort, safety, and sustainability?", crisis: "What should the result make visible about urgency, safety, and available support?" };
const api = (path: string, init?: RequestInit) => fetch(`/api${path}`, init);

export function InteractionPanel({ profileId, category, pack, scenarioTitle, setScenarioTitle, context, setContext, probability, setProbability, displayAnswer, setDisplayAnswer, onBack, onStart }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [targets, setTargets] = useState<number[]>([]);
  const [sent, setSent] = useState<Invite[]>([]);
  const [requestIds, setRequestIds] = useState<number[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api("/profiles").then((response) => response.ok ? response.json() : []).then((items: Profile[]) => setProfiles(items.filter((item) => item.id !== profileId))).catch(() => setError("Could not load available profiles.")); }, [profileId]);
  useEffect(() => { const clearLegacyOptionalPanel = () => document.querySelectorAll(".interaction-panel .engine-optional-context").forEach((node) => node.remove()); const observer = new MutationObserver(clearLegacyOptionalPanel); observer.observe(document.body, { childList: true, subtree: true }); clearLegacyOptionalPanel(); return () => observer.disconnect(); }, []);
  useEffect(() => {
    if (!waiting || !requestIds.length) return;
    let alive = true;
    const poll = async () => {
      const response = await api(`/profiles/${profileId}/interaction-invites/sent`); const items: Invite[] = response.ok ? await response.json() : [];
      if (!alive) return;
      const current = items.filter((item) => requestIds.includes(item.id)); setSent(current);
      const accepted = current.filter((item) => item.status === "accepted").map((item) => item.recipient_profile_id);
      const pending = current.some((item) => item.status === "pending");
      if (accepted.length && !pending) { setWaiting(false); onStart(accepted, buildContext()); return; }
      if (accepted.length && !pending) return;
      if (deadline && Date.now() >= deadline) { setWaiting(false); if (accepted.length) onStart(accepted, buildContext()); else setError("No invited profile responded within three minutes. The interaction was cancelled."); }
    };
    void poll(); const timer = window.setInterval(() => void poll(), 2500); return () => { alive = false; window.clearInterval(timer); };
  }, [waiting, requestIds, deadline]);

  const accepted = useMemo(() => sent.filter((item) => item.status === "accepted").map((item) => item.recipient_profile_id), [sent]);
  const pending = sent.some((item) => item.status === "pending");
  const buildContext = () => [context.trim(), probabilityCategories.has(category) ? `Estimated occurrence probability: ${probability}%` : "", displayCategories.has(category) && displayAnswer.trim() ? `${displayPrompts[category]}\nAnswer: ${displayAnswer.trim()}` : ""].filter(Boolean).join("\n\n");
  const send = async () => {
    setError("");
    if (!scenarioTitle.trim() || !context.trim()) { setError("Add a scenario title and context first."); return; }
    if (!targets.length) { setError("Select at least one existing profile to invite."); return; }
    try {
      const created: Invite[] = [];
      for (const recipient_profile_id of targets) { const response = await api(`/profiles/${profileId}/interaction-invites`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient_profile_id, category, message: `${scenarioTitle.trim()} — authorization requested` }) }); const value = await response.json(); if (!response.ok) throw Error(value.detail || "Could not send authorization request."); created.push(value); }
      setSent(created); setRequestIds(created.map((item) => item.id)); setDeadline(Date.now() + 180000); setWaiting(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send authorization request."); }
  };
  const continueWithAccepted = () => { if (accepted.length) onStart(accepted, buildContext()); };

  return <div className="engine-card interaction-panel"><p className="kicker">INTERACTION · AUTHORIZATION</p><h2>Invite profiles to this scenario</h2><p>Only profiles that explicitly authorize will be included. People who were not invited cannot affect this simulation.</p><div className="engine-form-grid"><label><span>Scenario title</span><input value={scenarioTitle} onChange={(event) => setScenarioTitle(event.target.value)} placeholder="Example: Decide whether to change jobs" /></label><label><span>Current context</span><textarea rows={4} value={context} onChange={(event) => setContext(event.target.value)} placeholder="Describe the situation you are facing..." /></label></div>{pack && <p className="engine-pack-ready">{pack.title} domain pack ready</p>}{probabilityCategories.has(category) && <label className="interaction-option"><span>Estimated occurrence probability <b>{probability}%</b></span><input type="range" min="0" max="100" value={probability} onChange={(event) => setProbability(Number(event.target.value))} /></label>}{displayCategories.has(category) && <label className="interaction-option"><span>{displayPrompts[category]}</span><textarea rows={3} value={displayAnswer} onChange={(event) => setDisplayAnswer(event.target.value)} placeholder="Optional display context..." /></label>}<h3 className="interaction-heading">Choose existing profiles</h3><div className="interaction-profiles">{profiles.map((profile) => <label className="interaction-profile" key={profile.id}><input type="checkbox" checked={targets.includes(profile.id)} disabled={waiting} onChange={() => setTargets((current) => current.includes(profile.id) ? current.filter((id) => id !== profile.id) : [...current, profile.id])} /><span>{profile.nickname}</span></label>)}</div>{waiting && <div className="interaction-waiting"><strong>Waiting for authorization...</strong><span>Invitations expire after three minutes. Accepted profiles can continue the simulation.</span><div className="interaction-status-list">{sent.map((invite) => <span key={invite.id}>{invite.recipient_nickname}: {invite.status}</span>)}</div></div>}{error && <div className="engine-error">{error}</div>}<div className="engine-actions"><button className="wizard-secondary" onClick={onBack} disabled={waiting}>Back</button>{accepted.length > 0 && <button className="wizard-secondary" onClick={continueWithAccepted}>Continue with accepted ({accepted.length})</button>}<button className="primary-button" onClick={send} disabled={waiting || !targets.length}>Send authorization request</button></div></div>;
}
