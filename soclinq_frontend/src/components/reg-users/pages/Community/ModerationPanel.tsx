import { useRBAC } from "@/hooks/useRBAC";
import type { User } from "@/types/auth";
import type {
  CommunityMessage,
} from "@/types/message";
import { ReactElement } from "react";

interface ModerationPanelProps {
  user: User;
  messages: CommunityMessage[];
}

export interface ModerationMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

/* ================= COMPONENT ================= */

export default function ModerationPanel({
  user,
  messages,
}: ModerationPanelProps): ReactElement | null {
  const { can } = useRBAC(user?.role);

  if (!can("DELETE_MESSAGE")) return null;

  const handleRemove = (id: string): void => {
    // wire to backend / socket later
    console.log("Remove message:", id);
  };

  const handleMute = (userId: string): void => {
    // wire to backend / socket later
    console.log("Mute user:", userId);
  };

  return (
    <section>
      <h3>Moderation</h3>

      {messages.length === 0 && (
        <p>No messages to moderate.</p>
      )}

      {messages.map((m) => (
        <div key={m.id}>
          <p>{m.text}</p>

          <div>
            <button
              onClick={() => handleRemove(m.id)}
            >
              Remove
            </button>

            <button
              onClick={() => handleMute(m.senderId)}
            >
              Mute User
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
