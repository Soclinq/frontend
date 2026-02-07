// hooks/useChatSelection.ts
import { useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";

export function useChatSelection(messages: ChatMessage[]) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedRef = useRef<string | null>(null);

  const selectedMessages = useMemo(
    () => messages.filter((m) => selectedIds.includes(m.id)),
    [messages, selectedIds]
  );

  function toggleSelect(id: string) {
    setSelectionMode(true);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearSelection() {
    setSelectionMode(false);
    setSelectedIds([]);
    lastSelectedRef.current = null;
  }

  return {
    selectionMode,
    selectedIds,
    selectedMessages,
    toggleSelect,
    clearSelection,
  };
}
