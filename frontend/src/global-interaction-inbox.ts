type Profile = { id: number; nickname: string };
type Invite = { id: number; sender_nickname: string; category: string; message: string };

const api = (path: string, init?: RequestInit) => fetch(`/api${path}`, init);
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
const hidden = new Set<number>();
let currentProfileId: number | null = null;

function activeProfileId(profiles: Profile[]) {
  if (document.querySelector(".profile-home.gate")) return null;
  const name = document.querySelector<HTMLElement>(".profile-name")?.textContent?.trim();
  if (!name) return null;
  return profiles.find((profile) => profile.nickname === name)?.id || null;
}

function draw(invites: Invite[]) {
  let host = document.getElementById("global-interaction-inbox");
  if (!host) { host = document.createElement("div"); host.id = "global-interaction-inbox"; document.body.appendChild(host); }
  const visible = invites.filter((invite) => !hidden.has(invite.id));
  host.innerHTML = visible.map((invite) => `<article class="global-interaction-card" data-invite-id="${invite.id}"><button class="global-interaction-close" data-action="hide" aria-label="Dismiss">×</button><p class="kicker">AUTHORIZATION REQUEST</p><h3>${escapeHtml(invite.sender_nickname)} invited you to an interaction simulation</h3><p>Category: ${escapeHtml(invite.category)}</p><p>${escapeHtml(invite.message || "The sender is waiting for your authorization.")}</p><div class="global-interaction-actions"><button class="wizard-secondary" data-action="decline">Decline</button><button class="primary-button" data-action="accept">Authorize</button></div></article>`).join("");
  host.querySelectorAll<HTMLElement>("[data-action]").forEach((button) => { button.onclick = async () => { const card = button.closest<HTMLElement>("[data-invite-id]"); const inviteId = Number(card?.dataset.inviteId); if (!inviteId || !currentProfileId) return; if (button.dataset.action === "hide") { hidden.add(inviteId); card?.remove(); return; } button.setAttribute("disabled", "true"); const response = await api(`/profiles/${currentProfileId}/interaction-invites/${inviteId}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted: button.dataset.action === "accept" }) }); if (response.ok) { hidden.delete(inviteId); card?.remove(); } else button.removeAttribute("disabled"); }; });
}

async function refresh() {
  const response = await api("/profiles"); if (!response.ok) return;
  const profiles: Profile[] = await response.json(); const profileId = activeProfileId(profiles); currentProfileId = profileId;
  if (!profileId) { draw([]); return; }
  const invitesResponse = await api(`/profiles/${profileId}/interaction-invites`); if (invitesResponse.ok) draw(await invitesResponse.json());
}

if (typeof window !== "undefined") { window.setInterval(() => void refresh(), 4000); window.setTimeout(() => void refresh(), 500); }
