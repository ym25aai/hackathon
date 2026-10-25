import { useEffect, useState } from "react";

type Invite = { id: number; sender_nickname: string; category: string; message: string };
const api = (path: string, init?: RequestInit) => fetch(`/api${path}`, init);

export function InteractionInbox({ profileId }: { profileId: number }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => { let alive = true; const load = () => api(`/profiles/${profileId}/interaction-invites`).then((response) => response.ok ? response.json() : []).then((items: Invite[]) => { if (alive) setInvites(items); }).catch(() => undefined); void load(); const timer = window.setInterval(load, 4000); return () => { alive = false; window.clearInterval(timer); }; }, [profileId]);
  const respond = async (invite: Invite, accepted: boolean) => { setBusy(invite.id); try { const response = await api(`/profiles/${profileId}/interaction-invites/${invite.id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted }) }); if (response.ok) setInvites((items) => items.filter((item) => item.id !== invite.id)); } finally { setBusy(null); } };
  if (!invites.length) return null;
  return <div className="interaction-inbox" role="dialog" aria-label="Interaction authorization requests">{invites.map((invite) => <article key={invite.id}><button className="interaction-inbox-close" onClick={() => respond(invite, false)} aria-label="Decline request">×</button><p className="kicker">AUTHORIZATION REQUEST</p><h3>{invite.sender_nickname} invited you to an interaction simulation</h3><p>Category: {invite.category}</p><p>{invite.message}</p><div className="interaction-inbox-actions"><button className="wizard-secondary" disabled={busy === invite.id} onClick={() => respond(invite, false)}>Decline</button><button className="primary-button" disabled={busy === invite.id} onClick={() => respond(invite, true)}>Authorize</button></div></article>)}</div>;
}
