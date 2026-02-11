"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import styles from "./styles/ChatReactionQuickRow.module.css";

/* ---------------- Types ---------------- */

export type ChatMessage = {
  id: string;
  myReaction?: string | null;
};

export type ReactionPickerState = {
  open: boolean;
  message: ChatMessage | null;
  x: number;
  y: number;
};

type Props = {
  picker: ReactionPickerState;

  /** list of emojis shown (max 5 recommended) */
  emojis: string[];

  /** react handler */
  onReact: (message: ChatMessage, emoji: string) => void;

  /** open full emoji mart */
  onOpenEmojiMart: (payload: {
    message: ChatMessage;
    x: number;
    y: number;
  }) => void;

  /** close picker */
  onClose: () => void;
};

export default function ChatReactionQuickRow({
  picker,
  emojis,
  onReact,
  onOpenEmojiMart,
  onClose,
}: Props) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  const open = picker.open && !!picker.message;
  const msg = picker.message;

  const safeEmojis = useMemo(() => {
    const cleaned = (emojis || []).filter((e) => typeof e === "string" && e.trim());
    // ✅ enforce max 6 (you can change)
    return cleaned.slice(0, 6);
  }, [emojis]);

  // ✅ Close on outside click/touch
  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent | TouchEvent) => {
      const el = rowRef.current;
      if (!el) return;

      const target = e.target as Node | null;
      if (!target) return;

      // ✅ Clicked inside row => ignore
      if (el.contains(target)) return;

      onClose();
    };

    window.addEventListener("mousedown", handler, { passive: true });
    window.addEventListener("touchstart", handler, { passive: true });

    return () => {
      window.removeEventListener("mousedown", handler as any);
      window.removeEventListener("touchstart", handler as any);
    };
  }, [open, onClose]);

  // ✅ Close on escape
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // ✅ Close on scroll (WhatsApp style)
  useEffect(() => {
    if (!open) return;

    const onScroll = () => onClose();
    window.addEventListener("scroll", onScroll, true);

    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open, onClose]);

  // ✅ Close on resize/orientation change
  useEffect(() => {
    if (!open) return;

    const onResize = () => onClose();
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [open, onClose]);

  if (!open || !msg) return null;

  return (
    <div
      className={styles.overlay}
      aria-hidden="true"
      onClick={onClose}
      onTouchStart={onClose}
    >
      <div
        ref={rowRef}
        className={styles.row}
        style={{
          left: picker.x,
          top: picker.y,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* ✅ emoji list */}
        <div className={styles.emojis} role="list">
          {safeEmojis.map((emoji) => {
            const active = msg.myReaction === emoji;

            return (
              <button
                key={emoji}
                type="button"
                className={`${styles.emojiBtn} ${active ? styles.emojiActive : ""}`}
                onClick={() => {
                  onReact(msg, emoji);
                  onClose();
                }}
                aria-label={`React ${emoji}`}
                title="React"
              >
                <span className={styles.emoji}>{emoji}</span>
              </button>
            );
          })}
        </div>

        {/* ✅ plus -> full emoji picker */}
        <button
          type="button"
          className={styles.plusBtn}
          title="More reactions"
          aria-label="More reactions"
          onClick={() => {
            onOpenEmojiMart({
              message: msg,
              x: picker.x,
              y: picker.y + 52,
            });
            onClose();
          }}
        >
          <FiPlus />
        </button>

        {/* ✅ close */}
        <button
          type="button"
          className={styles.closeBtn}
          title="Close"
          aria-label="Close reactions"
          onClick={onClose}
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}
