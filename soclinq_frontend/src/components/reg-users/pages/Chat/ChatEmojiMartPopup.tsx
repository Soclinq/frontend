"use client";

import React, { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import styles from "./styles/ChatEmojiMartPopup.module.css";

type ChatMessage = {
  id: string;
};

type EmojiMartState = {
  open: boolean;
  message: ChatMessage | null;
  x: number;
  y: number;
};

type Props = {
  mart: EmojiMartState;

  /** emoji-mart picker node */
  children: React.ReactNode;

  /** close popup */
  onClose: () => void;
};

export default function ChatEmojiMartPopup({ mart, children, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // ✅ close on outside click
  useEffect(() => {
    if (!mart.open) return;

    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [mart.open, onClose]);

  // ✅ close on escape
  useEffect(() => {
    if (!mart.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mart.open, onClose]);

  if (!mart.open || !mart.message) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={ref}
        className={styles.popup}
        style={{ left: mart.x, top: mart.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.topBar}>
          <div className={styles.title}>Reactions</div>

          <button
            type="button"
            className={styles.closeBtn}
            title="Close"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.pickerWrap}>{children}</div>
      </div>
    </div>
  );
}
