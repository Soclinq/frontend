"use client";

import { useState, ChangeEvent } from "react";
import styles from "./styles/ChatPanel.module.css";
import { useRBAC } from "@/hooks/useRBAC";

import type { User } from "@/types/auth";
import type { ChatMessage } from "@/types/message";

/* ================= PROPS ================= */

export interface ChatPanelProps {
  user: User;
  messages: ChatMessage[];
  sendChat: (text: string) => void;
}

/* ================= COMPONENT ================= */

export default function ChatPanel({
  user,
  messages,
  sendChat,
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const { can } = useRBAC(user.role);

  const handleSend = () => {
    if (!text.trim()) return;
    sendChat(text.trim());
    setText("");
  };

  return (
    <section className={styles.panel}>
      {/* Header */}
      <header className={styles.cpheader}>
        <h3>Community Chat</h3>
        <p>Talk with members in real time</p>
      </header>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>
            No messages yet. Start the conversation.
          </p>
        )}

        {messages.map((m) => (
          <div key={m.id} className={styles.message}>
            <p className={styles.text}>{m.text}</p>

            {can("DELETE_MESSAGE") && (
              <button className={styles.remove}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      {can("SEND_CHAT") && (
        <div className={styles.inputBox}>
          <input
            value={text}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setText(e.target.value)
            }
            placeholder="Write a message…"
          />
          <button onClick={handleSend}>Send</button>
        </div>
      )}
    </section>
  );
}
