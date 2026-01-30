"use client";

import React, { useEffect, useRef } from "react";
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
  const ref = useRef<HTMLDivElement | null>(null);

  // ✅ close when clicking outside
  useEffect(() => {
    if (!picker.open) return;

    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [picker.open, onClose]);

  // ✅ close on escape
  useEffect(() => {
    if (!picker.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker.open, onClose]);

  if (!picker.open || !picker.message) return null;

  const msg = picker.message;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={ref}
        className={styles.row}
        style={{ left: picker.x, top: picker.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ✅ emojis */}
        <div className={styles.emojis}>
          {emojis.map((emoji) => {
            const active = msg.myReaction === emoji;

            return (
              <button
                key={emoji}
                type="button"
                className={`${styles.emojiBtn} ${
                  active ? styles.emojiActive : ""
                }`}
                onClick={() => {
                  onReact(msg, emoji);
                  onClose();
                }}
                title="React"
              >
                <span className={styles.emoji}>{emoji}</span>
              </button>
            );
          })}
        </div>

        {/* ✅ open emoji mart */}
        <button
          type="button"
          className={styles.plusBtn}
          title="More reactions"
          onClick={() => {
            onOpenEmojiMart({
              message: msg,
              x: picker.x,
              y: picker.y + 48,
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
          onClick={onClose}
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}
