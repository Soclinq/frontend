"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import type { ChatMessage } from "@/types/chat";

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

  /** notify */
  notify?: NotifyFn;
};

/* ---------------- Helpers ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

  // ✅ corrected position
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: menu.x,
    top: menu.y,
  });

  /* ✅ Close if clicking outside */
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

  /* ✅ Close on ESC */
  useEffect(() => {
    if (!menu.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu.open, onClose]);

  /**
   * ✅ WhatsApp-smart positioning:
   * - open above finger if near bottom
   * - open left if near right
   * - always clamp inside viewport
   */
  useLayoutEffect(() => {
    if (!menu.open) return;

    const el = ref.current;
    if (!el) return;

    // First place at raw touch/click point (so we can measure accurately)
    setPos({ left: menu.x, top: menu.y });

    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();

      const padding = 10; // screen edge padding
      const gap = 8; // tiny spacing from finger point

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // ✅ Decide direction (left/right + above/below)
      const openLeft = menu.x > vw * 0.62; // near right side
      const openUp = menu.y > vh * 0.62; // near bottom

      // ✅ compute target left/top relative to click
      let left = openLeft ? menu.x - rect.width - gap : menu.x + gap;
      let top = openUp ? menu.y - rect.height - gap : menu.y + gap;

      // ✅ clamp into viewport so it NEVER goes out
      const maxLeft = vw - rect.width - padding;
      const maxTop = vh - rect.height - padding;

      left = clamp(left, padding, Math.max(padding, maxLeft));
      top = clamp(top, padding, Math.max(padding, maxTop));

      setPos({ left, top });
    });
  }, [menu.open, menu.x, menu.y]);

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
          left: pos.left,
          top: pos.top,
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
              // ✅ use menu position (not original click point)
              onReact({ x: pos.left, y: pos.top }, msg);
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
