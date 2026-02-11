"use client";

import { useCallback, useState } from "react";

export type ChatUIMode =
  | { type: "NORMAL" }
  | { type: "SELECTION"; ids: Set<string> }
  | { type: "REPLY"; messageId: string };

export function useChatUIController() {
  const [mode, setMode] = useState<ChatUIMode>({ type: "NORMAL" });

  /* ================= SELECTION ================= */

  const startSelection = useCallback((id: string) => {
    setMode({ type: "SELECTION", ids: new Set([id]) });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setMode((prev) => {
      // not in selection → start selection
      if (prev.type !== "SELECTION") {
        return { type: "SELECTION", ids: new Set([id]) };
      }

      const ids = new Set(prev.ids);
      ids.has(id) ? ids.delete(id) : ids.add(id);

      return ids.size === 0
        ? { type: "NORMAL" }
        : { type: "SELECTION", ids };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setMode({ type: "NORMAL" });
  }, []);

  /* ================= REPLY ================= */

  const startReply = useCallback((id: string) => {
    // replying always exits selection
    setMode({ type: "REPLY", messageId: id });
  }, []);

  const cancelReply = useCallback(() => {
    setMode({ type: "NORMAL" });
  }, []);

  /* ================= PUBLIC API ================= */

  return {
    mode,

    selection:
      mode.type === "SELECTION"
        ? {
            ids: mode.ids,
            count: mode.ids.size,
            start: startSelection,
            toggle: toggleSelection,
            clear: clearSelection,
          }
        : null,

    reply:
      mode.type === "REPLY"
        ? {
            messageId: mode.messageId,
            cancel: cancelReply,
          }
        : null,

    startReply,
  };
}
