import { useEffect, useState } from "react";
import { InteractionChat } from "./interaction-chat";

type Session = {
  id: string;
  sender_profile_id: number;
  sender_nickname: string;
  scenario_title: string;
  category: string;
  participant_nicknames: string[];
};

const api = (path: string) => fetch(`/api${path}`);

export function InteractionInbox({ profileId }: { profileId: number }) {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api(`/profiles/${profileId}/interaction-sessions`)
        .then((response) => (response.ok ? response.json() : []))
        .then((items: Session[]) => {
          if (alive) setSessions(items.filter((item) => item.sender_nickname && item.sender_profile_id !== profileId));
        })
        .catch(() => undefined);
    };
    void load();
    const timer = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [profileId]);

  if (!sessions.length) return null;
  return (
    <div className="interaction-inbox" role="dialog" aria-label="Authorized interaction sessions">
      {sessions.map((session) => (
        <article key={session.id}>
          <p className="kicker">AUTHORIZED SESSION</p>
          <h3>{session.sender_nickname}: {session.scenario_title}</h3>
          <p>Take over your own persona or continue reading the shared conversation.</p>
          <InteractionChat profileId={profileId} sessionId={session.id} participantNames={session.participant_nicknames} takeover />
        </article>
      ))}
    </div>
  );
}
