import { useCallback, useRef, useState } from "react";
import type { ChatMessage, ChatReaction } from "@/types/chat";

/* ================= Types ================= */

type Burst = {
  id: string;
  emoji: string;
  x: number;
  y: number;
};

type Params = {
  currentUserId?: string; // 👈 optional
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
};

/* ================= Hook ================= */

export function useReactionUI({
  currentUserId,
  setMessages,
}: Params) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);

  /* ================= helpers ================= */

  const spawnBurst = (emoji: string, x: number, y: number) => {
    const id = `burst-${burstIdRef.current++}`;
    setBursts((prev) => [...prev, { id, emoji, x, y }]);

    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 900);
  };

  /* ================= reaction logic ================= */

  const toggleReactionLocal = useCallback(
    (msg: ChatMessage, emoji: string) => {
      // 🔐 Guard: user not ready yet
      if (!currentUserId) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msg.id) return m;

          const prevReactions = m.reactions ?? [];
          const myPrev = m.myReaction ?? null;

          let next: ChatReaction[] = prevReactions
            .map((r) => ({
              ...r,
              userIds: r.userIds.filter((id) => id !== currentUserId),
            }))
            .filter((r) => r.userIds.length > 0);

          if (myPrev === emoji) {
            return {
              ...m,
              reactions: next,
              myReaction: null,
            };
          }

          const found = next.find((r) => r.emoji === emoji);
          if (found) {
            found.userIds.push(currentUserId);
          } else {
            next.push({ emoji, userIds: [currentUserId] });
          }

          return {
            ...m,
            reactions: next,
            myReaction: emoji,
          };
        })
      );
    },
    [currentUserId, setMessages]
  );

  return {
    toggleReactionLocal,
    spawnBurst,
    bursts,
  };
}
