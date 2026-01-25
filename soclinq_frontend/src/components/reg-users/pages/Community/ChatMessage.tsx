"use client";

import { useEffect, useRef } from "react";
import styles from "./styles/ChatMessage.module.css";
import type { Socket } from "socket.io-client";
import {
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiShield,
  FiUser,
} from "react-icons/fi";

/* ================= TYPES ================= */

export type Role = "MEMBER" | "LEADER" | "MODERATOR" | "ADMIN";

export interface User {
  id: string;
  role: Role;
}

export interface ChatMessageType {
  id: string;
  text: string;
  readBy: string[];
  senderId: string;
  createdAt: string;
  status?: "SENDING" | "SENT"; // optional
}

/* ================= PROPS ================= */

interface ChatMessageProps {
  message: ChatMessageType;
  socket: Socket;
  user: User;
}

/* ================= COMPONENT ================= */

export default function ChatMessage({
  message,
  socket,
  user,
}: ChatMessageProps) {
  const hasEmitted = useRef(false);
  const isOwnMessage = message.senderId === user.id;

  useEffect(() => {
    if (hasEmitted.current || !isOwnMessage) return;

    socket.emit("read_message", {
      messageId: message.id,
      readerId: user.id,
    });

    hasEmitted.current = true;
  }, [socket, message.id, user.id, isOwnMessage]);

  const renderStatusIcon = () => {
    if (message.status === "SENDING") return <FiClock />;
    if (message.readBy.length > 0) return <FiCheckCircle />;
    return <FiCheck />;
  };

  const renderRoleIcon = () => {
    switch (user.role) {
      case "ADMIN":
      case "MODERATOR":
        return <FiShield />;
      default:
        return <FiUser />;
    }
  };

  return (
    <div
      className={`${styles.message} ${
        isOwnMessage ? styles.own : styles.other
      }`}
    >
      <div className={styles.header}>
        {!isOwnMessage && (
          <span className={styles.role}>{renderRoleIcon()}</span>
        )}
      </div>

      <p className={styles.text}>{message.text}</p>

      <div className={styles.meta}>
        <time>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>

        {isOwnMessage && (
          <span className={styles.read}>
            {renderStatusIcon()}
          </span>
        )}
      </div>
    </div>
  );
}
