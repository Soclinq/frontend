import { useCallback } from "react";
import { authFetch } from "@/lib/authFetch";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { ChatMessage, ChatReaction } from "@/types/chat";

type Params = {
  adapter: ChatAdapter;
  currentUserId: string;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
};

/**
 * WhatsApp-style reactions:
 * - One reaction per user per message
 * - Tap same emoji → undo
 * - Optimistic UI
 */
export function useChatReactions({
  adapter,
  currentUserId,
  updateMessage,
}: Params) {
  /* ================= helpers ================= */

  const applyLocalReaction = useCallback(
    (msg: ChatMessage, emoji: string) => {
      const prev = msg.reactions ?? [];

      // remove user from all reactions
      let next: ChatReaction[] = prev
        .map((r) => ({
          ...r,
          userIds: r.userIds.filter((id) => id !== currentUserId),
        }))
        .filter((r) => r.userIds.length > 0);

      // undo if same emoji
      if (msg.myReaction === emoji) {
        return { reactions: next, myReaction: null };
      }

      // add new reaction
      const found = next.find((r) => r.emoji === emoji);
      if (found) {
        found.userIds.push(currentUserId);
      } else {
        next.push({ emoji, userIds: [currentUserId] });
      }

      return { reactions: next, myReaction: emoji };
    },
    [currentUserId]
  );

  /* ================= public API ================= */

  const reactToMessage = useCallback(
    async (msg: ChatMessage, emoji: string) => {
      if (!adapter.features.reactions) return;
      if (!msg || msg.deletedAt) return;

      // optimistic update
      const local = applyLocalReaction(msg, emoji);
      updateMessage(msg.id, local);

      try {
        await authFetch(adapter.react(msg.id), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
      } catch {
        // rollback on failure
        updateMessage(msg.id, {
          reactions: msg.reactions ?? [],
          myReaction: msg.myReaction ?? null,
        });
      }
    },
    [adapter, applyLocalReaction, updateMessage]
  );

  return {
    reactToMessage,
  };
}
