"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  FiX,
  FiSearch,
  FiSend,
  FiCheck,
  FiCircle,
  FiMessageSquare,
} from "react-icons/fi";
import styles from "./styles/ChatForwardSheet.module.css";

/** ✅ matches your NotificationProvider */
export type NotifyFn = (n: {
  type: "success" | "error" | "warning" | "info" | "loading";
  title?: string;
  message: string;
  duration?: number;
  confirm?: {
    label?: string;
    onConfirm: () => void;
  };
}) => void;

export type ForwardTarget = {
  id: string;
  name: string;
  type?: string;
  photo?: string | null;
};

export type ForwardMessagePreview = {
  id: string;
  text?: string;
  deletedAt?: string | null;
  attachments?: any[];
};

export type ForwardSheetState = {
  open: boolean;
  messages: ForwardMessagePreview[];
};

type Props = {
  sheet: ForwardSheetState;

  /** current hub id (so we hide same hub) */
  currentHubId?: string;

  /** list of hubs to forward to */
  targets: ForwardTarget[];

  /** loading targets */
  loading: boolean;

  /** selected hub ids */
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;

  /** close */
  onClose: () => void;

  /** forward action */
  onForward: () => Promise<void> | void;

  /** optional notify */
  notify?: NotifyFn;
};

function previewText(m: ForwardMessagePreview) {
  if (m.deletedAt) return "Deleted message";
  if (m.text?.trim()) return m.text.trim();
  if (m.attachments?.length) return "Media";
  return "Message";
}

export default function ChatForwardSheet({
  sheet,
  currentHubId,
  targets,
  loading,

  selectedIds,
  setSelectedIds,

  onClose,
  onForward,

  notify,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  const [search, setSearch] = React.useState("");

  // reset search & selection on open
  useEffect(() => {
    if (!sheet.open) return;
    setSearch("");
    setSelectedIds([]);
  }, [sheet.open, setSelectedIds]);

  // close when clicking outside
  useEffect(() => {
    if (!sheet.open) return;

    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [sheet.open, onClose]);

  // close on ESC
  useEffect(() => {
    if (!sheet.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet.open, onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = targets.filter((t) => t.id !== currentHubId);

    if (!q) return list;

    return list.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [targets, search, currentHubId]);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleForward() {
    if (!selectedIds.length) return;

    try {
      notify?.({
        type: "loading",
        title: "Forwarding…",
        message: `Forwarding to ${selectedIds.length} hub(s)`,
        duration: 1200,
      });

      await onForward();

      notify?.({
        type: "success",
        title: "Forwarded",
        message: "Message forwarded successfully",
        duration: 2200,
      });

      onClose();
    } catch {
      notify?.({
        type: "error",
        title: "Forward failed",
        message: "Could not forward messages",
        duration: 2800,
      });
    }
  }

  if (!sheet.open || sheet.messages.length === 0) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />

      <div ref={ref} className={styles.sheet} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FiMessageSquare />
            </div>

            <div className={styles.headerText}>
              <h4 className={styles.title}>Forward message</h4>
              <p className={styles.subTitle}>
                Select hubs to forward to
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title="Close"
          >
            <FiX />
          </button>
        </div>

        {/* Preview bubble */}
        <div className={styles.previewWrap}>
          {sheet.messages.slice(0, 2).map((m) => (
            <div key={m.id} className={styles.previewItem}>
              {previewText(m)}
            </div>
          ))}

          {sheet.messages.length > 2 ? (
            <div className={styles.previewMore}>
              +{sheet.messages.length - 2} more
            </div>
          ) : null}
        </div>

        {/* Search */}
        <div className={styles.searchRow}>
          <div className={styles.searchIcon}>
            <FiSearch />
          </div>

          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hubs..."
          />
        </div>

        {/* List */}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.listState}>Loading hubs…</div>
          ) : filtered.length === 0 ? (
            <div className={styles.listState}>No hubs found</div>
          ) : (
            filtered.map((hub) => {
              const active = selectedIds.includes(hub.id);

              return (
                <button
                  key={hub.id}
                  type="button"
                  className={`${styles.row} ${active ? styles.rowActive : ""}`}
                  onClick={() => toggle(hub.id)}
                >
                  <div className={styles.avatar}>
                    {hub.name?.slice(0, 1)?.toUpperCase()}
                  </div>

                  <div className={styles.meta}>
                    <div className={styles.name}>{hub.name}</div>
                    {hub.type ? (
                      <div className={styles.type}>{hub.type}</div>
                    ) : null}
                  </div>

                  <div className={styles.check}>
                    {active ? (
                      <span className={styles.checkActive}>
                        <FiCheck />
                      </span>
                    ) : (
                      <span className={styles.checkIdle}>
                        <FiCircle />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className={styles.sendBtn}
            disabled={selectedIds.length === 0}
            onClick={handleForward}
          >
            <FiSend />
            <span>Forward ({selectedIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
