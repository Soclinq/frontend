"use client";

import React, { useEffect, useRef } from "react";
import {
  FiCornerUpLeft,
  FiInfo,
  FiCopy,
  FiSend,
  FiSmile,
  FiEdit3,
  FiTrash2,
} from "react-icons/fi";
import styles from "./styles/ChatContextMenu.module.css";

/* ---------------- Types ---------------- */

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
  messageType: "TEXT" | "MEDIA" | "SYSTEM";
  text?: string;
  isMine: boolean;
  deletedAt?: string | null;
};

type MenuState = {
  open: boolean;
  x: number;
  y: number;
  message: ChatMessage | null;
};

type Props = {
  menu: MenuState;

  /** used for edit visibility */
  canEdit?: (msg: ChatMessage) => boolean;

  /** handlers */
  onClose: () => void;
  onReply: (msg: ChatMessage) => void;
  onInfo: (msg: ChatMessage) => void;
  onCopy: (msg: ChatMessage) => Promise<void> | void;
  onForward: (msg: ChatMessage) => void;
  onReact: (pos: { x: number; y: number }, msg: ChatMessage) => void;
  onEdit?: (msg: ChatMessage) => void;
  onDelete: (msg: ChatMessage) => void;

  /** notify (passed from ChatPanel) */
  notify?: NotifyFn;
};

export default function ChatContextMenu({
  menu,
  canEdit,

  onClose,
  onReply,
  onInfo,
  onCopy,
  onForward,
  onReact,
  onEdit,
  onDelete,

  notify,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // ✅ Close if clicking outside
  useEffect(() => {
    if (!menu.open) return;

    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menu.open, onClose]);

  // ✅ Close on ESC
  useEffect(() => {
    if (!menu.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu.open, onClose]);

  if (!menu.open || !menu.message) return null;

  const msg = menu.message;

  const isDeleted = Boolean(msg.deletedAt);
  const allowEdit = Boolean(onEdit && canEdit?.(msg) && !isDeleted);
  const allowCopy = Boolean(msg.text?.trim()) && !isDeleted;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={ref}
        className={styles.menu}
        style={{
          left: menu.x,
          top: menu.y,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reply */}
        {!isDeleted && msg.messageType !== "SYSTEM" && (
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onReply(msg);
              onClose();
            }}
          >
            <FiCornerUpLeft />
            <span>Reply</span>
          </button>
        )}

        {/* Info */}
        <button
          type="button"
          className={styles.item}
          onClick={() => {
            onInfo(msg);
            onClose();
          }}
        >
          <FiInfo />
          <span>Message info</span>
        </button>

        {/* Copy */}
        <button
          type="button"
          className={styles.item}
          disabled={!allowCopy}
          onClick={async () => {
            try {
              await onCopy(msg);
              notify?.({
                type: "success",
                title: "Copied",
                message: "Message copied to clipboard",
                duration: 2200,
              });
            } catch {
              notify?.({
                type: "error",
                title: "Copy failed",
                message: "Could not copy message",
                duration: 2500,
              });
            } finally {
              onClose();
            }
          }}
        >
          <FiCopy />
          <span>Copy</span>
        </button>

        {/* Forward */}
        {!isDeleted && msg.messageType !== "SYSTEM" && (
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onForward(msg);
              onClose();
            }}
          >
            <FiSend />
            <span>Forward</span>
          </button>
        )}

        {/* React */}
        {!isDeleted && msg.messageType !== "SYSTEM" && (
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onReact({ x: menu.x, y: menu.y }, msg);
              onClose();
            }}
          >
            <FiSmile />
            <span>React</span>
          </button>
        )}

        {/* Edit */}
        {allowEdit && (
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onEdit?.(msg);
              onClose();
            }}
          >
            <FiEdit3 />
            <span>Edit</span>
          </button>
        )}

        {/* Divider */}
        <div className={styles.divider} />

        {/* Delete */}
        <button
          type="button"
          className={`${styles.item} ${styles.danger}`}
          onClick={() => {
            onDelete(msg);
            // keep menu open? WhatsApp closes -> close
            onClose();
          }}
        >
          <FiTrash2 />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
