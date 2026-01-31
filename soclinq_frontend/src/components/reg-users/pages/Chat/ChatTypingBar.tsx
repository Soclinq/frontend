"use client";

import React from "react";
import { FiEdit3 } from "react-icons/fi";
import styles from "./styles/ChatTypingBar.module.css";

type Props = {
  typingUsers: string[];
};

export default function ChatTypingBar({ typingUsers }: Props) {
  if (!typingUsers.length) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing…`
      : `${typingUsers.slice(0, 2).join(", ")}${typingUsers.length > 2 ? " and others" : ""} are typing…`;

  return (
    <div className={styles.typing}>
      <FiEdit3 className={styles.icon} />
      <span className={styles.text}>{label}</span>
    </div>
  );
}
