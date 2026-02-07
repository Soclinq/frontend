"use client";

import React, { useMemo } from "react";
import styles from "./styles/ChatTypingBar.module.css";

/* ================= Types ================= */

export type TypingUser = {
  userId: string;
  name: string;
  photo?: string | null;
};

type Props = {
  /** List of users currently typing (from useChatThreadWS) */
  typingUsers: TypingUser[];
};

/* ================= Component ================= */

export default function ChatTypingBar({ typingUsers }: Props) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const label = useMemo(() => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing…`;
    }

    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing…`;
    }

    return `${typingUsers[0].name}, ${typingUsers[1].name} and others are typing…`;
  }, [typingUsers]);

  return (
    <div
      className={styles.typingRow}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={styles.avatars}>
        {typingUsers.slice(0, 3).map((u) => (
          <img
            key={u.userId}
            src={u.photo || "/avatar-fallback.png"}
            alt={u.name}
            className={styles.avatar}
            loading="lazy"
          />
        ))}
      </div>

      <div className={styles.typingText}>
        <span className={styles.label}>{label}</span>
        <span className={styles.dots} aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
