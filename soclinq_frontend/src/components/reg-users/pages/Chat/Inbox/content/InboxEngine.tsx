"use client";

import { useMemo, useEffect } from "react";
import PullToRefresh from "react-simple-pull-to-refresh";

import InboxRow from "../components/InboxRow";
import styles from "../components/styles/InboxEngine.module.css";

import useInboxEngine from "./useInboxEngine";
import { useInboxSelection } from "../state/useInboxSelection";
import type { ActiveChat } from "../state/state.types";

/* ================= TYPES ================= */

type Props = {
  searchValue?: string;
  onOpenChat: (chat: Exclude<ActiveChat, null>) => void;
  exposeReload?: (fn: () => void) => void;
  onSelectionChange?: (payload: any) => void;
};

/* ================= COMPONENT ================= */

export default function InboxEngine({
  searchValue,
  onOpenChat,
  exposeReload,
  onSelectionChange,
}: Props) {
  /* ---------- Engine ---------- */
  const engine = useInboxEngine({
    searchValue,
    exposeReload,
  });

  /* ---------- Selection ---------- */
  const selection = useInboxSelection(engine.inboxItems);

  /* ---------- Selection → Header ---------- */
  const selectionPayload = useMemo(() => {
    if (!selection.selecting) {
      return {
        context: "INBOX",
        active: false,
        count: 0,
      };
    }
  
    return {
      context: "INBOX",
      active: true,
      count: selection.selectedKeys.size,
  
      kind: selection.kind,
      canDelete: selection.canDelete,
      markLabel: selection.markLabel,
  
      ids: Array.from(selection.selectedKeys),
  
      onExit: selection.clear,
      onSelectAll: selection.selectAll,
      onUnselectAll: selection.unselectAll,
  
      onPin: selection.onPin,
      onMute: selection.onMute,
      onArchive: selection.onArchive,
      onMarkReadUnread: selection.onMark,
      onDelete: selection.canDelete ? selection.onDelete : undefined,
    };
  }, [
    selection.selecting,
    selection.selectedKeys,
    selection.kind,
    selection.canDelete,
    selection.markLabel,
    selection.clear,
    selection.selectAll,
    selection.unselectAll,
    selection.onPin,
    selection.onMute,
    selection.onArchive,
    selection.onMark,
    selection.onDelete,
  ]);
  
  /* ---------- Push selection to header ---------- */
  useEffect(() => {
    onSelectionChange?.(selectionPayload);
  }, [selectionPayload, onSelectionChange]);

  /* ---------- Render ---------- */
  return (
    <div
      className={[
        styles.page,
        selection.selecting ? styles.selecting : "",
      ].join(" ")}
    >
      <PullToRefresh
        onRefresh={engine.reload}
        pullDownThreshold={90}
        isPullable={!engine.disabled && !selection.selecting}
      >
        {engine.inboxItems.length === 0 ? (
          <p className={styles.empty}>
            {engine.disabled ? "Loading chats…" : "No chats yet"}
          </p>
        ) : (
          <div className={styles.rows}>
            {engine.inboxItems.map((item) => {
              const selected = selection.selectedKeys.has(item.key);

              return (
                <InboxRow
                  key={item.key}
                  {...(item.kind === "COMMUNITY"
                    ? { kind: "COMMUNITY", hub: item.hub }
                    : { kind: "PRIVATE", chat: item.chat })}
                  selected={selected}
                  active={false}
                  onClick={() => {
                    if (selection.selecting) {
                      selection.toggle(item.key);
                      return;
                    }

                    onOpenChat(
                      item.kind === "COMMUNITY"
                        ? { kind: "COMMUNITY", id: item.hub.id }
                        : { kind: "PRIVATE", id: item.chat.conversation_id }
                    );
                  }}
                  onLongPress={() => {
                    if (!selection.selecting) {
                      selection.start(item.key); // ✅ enter selection mode
                    } else {
                      selection.toggle(item.key);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
