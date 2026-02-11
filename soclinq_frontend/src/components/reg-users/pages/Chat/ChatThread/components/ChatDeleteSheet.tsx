"use client";

import React, { useEffect, useRef } from "react";
import { FiTrash2, FiX, FiUsers, FiUser } from "react-icons/fi";
import styles from "./styles/ChatDeleteSheet.module.css";

/** ✅ same Notification type you use */
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

export type ChatMessage = {
  id: string;
  text?: string;
  isMine: boolean;
  deletedAt?: string | null;
};

export type DeleteSheetState = {
  open: boolean;
  message: ChatMessage | null;
};

type Props = {
  sheet: DeleteSheetState;

  /** Close sheet */
  onClose: () => void;

  /** Delete only for this user */
  onDeleteForMe: (msg: ChatMessage) => Promise<void> | void;

  /** Show "delete for everyone" */
  canDeleteForEveryone?: (msg: ChatMessage) => boolean;

  /** Delete for everyone (soft delete) */
  onDeleteForEveryone?: (msg: ChatMessage) => Promise<void> | void;

  /** notify from parent */
  notify?: NotifyFn;
};

export default function ChatDeleteSheet({
  sheet,
  onClose,
  onDeleteForMe,
  canDeleteForEveryone,
  onDeleteForEveryone,
  notify,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // ✅ close on outside click
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

  // ✅ close on ESC
  useEffect(() => {
    if (!sheet.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet.open, onClose]);

  if (!sheet.open || !sheet.message) return null;

  const msg = sheet.message;
  const showDeleteForEveryone = Boolean(
    canDeleteForEveryone?.(msg) && onDeleteForEveryone && !msg.deletedAt
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />

      <div ref={ref} className={styles.sheet} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.iconWrap}>
              <FiTrash2 />
            </div>

            <div className={styles.titleText}>
              <h4 className={styles.title}>Delete message?</h4>
              <p className={styles.subTitle}>This action cannot be undone.</p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            title="Close"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.actions}>
          {/* Delete for me */}
          <button
            type="button"
            className={styles.actionBtn}
            onClick={async () => {
              try {
                notify?.({
                  type: "loading",
                  title: "Deleting…",
                  message: "Removing message for you",
                  duration: 1200,
                });

                await onDeleteForMe(msg);

                notify?.({
                  type: "success",
                  title: "Deleted",
                  message: "Message removed for you",
                  duration: 2200,
                });
              } catch {
                notify?.({
                  type: "error",
                  title: "Delete failed",
                  message: "Could not delete message",
                  duration: 2500,
                });
              } finally {
                onClose();
              }
            }}
          >
            <span className={styles.actionIcon}>
              <FiUser />
            </span>
            <span className={styles.actionText}>Delete for me</span>
          </button>

          {/* Delete for everyone */}
          {showDeleteForEveryone ? (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.dangerBtn}`}
              onClick={async () => {
                try {
                  notify?.({
                    type: "loading",
                    title: "Deleting…",
                    message: "Removing message for everyone",
                    duration: 1400,
                  });

                  await onDeleteForEveryone?.(msg);

                  notify?.({
                    type: "success",
                    title: "Deleted",
                    message: "Message deleted for everyone",
                    duration: 2200,
                  });
                } catch {
                  notify?.({
                    type: "error",
                    title: "Delete failed",
                    message: "Could not delete for everyone",
                    duration: 2800,
                  });
                } finally {
                  onClose();
                }
              }}
            >
              <span className={styles.actionIcon}>
                <FiUsers />
              </span>
              <span className={styles.actionText}>Delete for everyone</span>
            </button>
          ) : null}

          {/* Cancel */}
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
