"use client";

import { useCallback, useMemo, useState } from "react";
import type { InboxItem } from "../content/useInboxEngine";

import {
  pinChats,
  muteChats,
  archiveChats,
  markChatsRead,
  deleteChats,
} from "./chatActions";

/* ================= TYPES ================= */

export type SelectionKind = "GROUP_ONLY" | "PRIVATE_ONLY" | "MIXED";

/* ================= HELPERS ================= */

function keyOf(item: InboxItem) {
  return item.kind === "COMMUNITY"
    ? `c_${item.hub.id}`
    : `p_${item.chat.conversation_id}`;
}

/* ================= HOOK ================= */

export function useInboxSelection(items: InboxItem[]) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const selecting = selectedKeys.size > 0;

  /* ---------- Selection ops ---------- */

  // 🔹 Start selection with ONE item (used by long-press)
  const start = useCallback((key: string) => {
    setSelectedKeys(new Set([key]));
  }, []);

  // 🔹 Toggle selection (tap while selecting)
  const toggle = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // 🔹 Clear everything (exit selection mode)
  const clear = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  // 🔹 Select all visible items
  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(items.map(keyOf)));
  }, [items]);

  // 🔹 Explicit unselect-all (semantic clarity for header)
  const unselectAll = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  /* ---------- Selected items ---------- */

  const selectedItems = useMemo(() => {
    if (!selecting) return [];

    const map = new Map(items.map((i) => [keyOf(i), i]));
    return Array.from(selectedKeys)
      .map((k) => map.get(k))
      .filter(Boolean) as InboxItem[];
  }, [items, selectedKeys, selecting]);

  /* ---------- Selection kind ---------- */

  const kind: SelectionKind = useMemo(() => {
    const hasGroup = selectedItems.some((i) => i.kind === "COMMUNITY");
    const hasPrivate = selectedItems.some((i) => i.kind === "PRIVATE");

    if (hasGroup && hasPrivate) return "MIXED";
    if (hasGroup) return "GROUP_ONLY";
    if (hasPrivate) return "PRIVATE_ONLY";
    return "MIXED";
  }, [selectedItems]);

  /* ---------- Unread state ---------- */

  const anyUnread = useMemo(
    () =>
      selectedItems.some((i) =>
        i.kind === "COMMUNITY"
          ? (i.hub.unread_count ?? 0) > 0
          : (i.chat.unread_count ?? 0) > 0
      ),
    [selectedItems]
  );

  const markLabel = anyUnread ? "Mark as read" : "Mark as unread";

  /* ---------- IDs ---------- */

  const selectedChatIds = useMemo(
    () =>
      selectedItems.map((i) =>
        i.kind === "COMMUNITY"
          ? i.hub.id
          : i.chat.conversation_id
      ),
    [selectedItems]
  );

  const canDelete = kind === "PRIVATE_ONLY";

  /* ---------- Actions ---------- */

  const onPin = useCallback(async () => {
    await pinChats(selectedChatIds);
    clear();
  }, [selectedChatIds, clear]);

  const onMute = useCallback(async () => {
    await muteChats(selectedChatIds);
    clear();
  }, [selectedChatIds, clear]);

  const onArchive = useCallback(async () => {
    await archiveChats(selectedChatIds);
    clear();
  }, [selectedChatIds, clear]);

  const onMark = useCallback(async () => {
    await markChatsRead(selectedChatIds, anyUnread);
    clear();
  }, [selectedChatIds, anyUnread, clear]);

  const onDelete = useCallback(async () => {
    if (!canDelete) return;
    await deleteChats(selectedChatIds);
    clear();
  }, [selectedChatIds, canDelete, clear]);

  /* ---------- Return ---------- */

  return {
    /* state */
    selecting,
    selectedKeys,
    selectedItems,

    /* meta */
    kind,
    canDelete,
    markLabel,

    /* selection ops */
    start,
    toggle,
    clear,
    selectAll,
    unselectAll,

    /* actions (InboxSelection contract) */
    onPin,
    onMute,
    onArchive,
    onMark,
    onDelete,
  };
}
