"use client";

import React from "react";
import { FiUsers } from "react-icons/fi";
import type { Hub } from "@/types/hub";
import { PrivateInboxItem } from "@/types/privateInbox";
import styles from "./styles/InboxRow.module.css";

type Props =
  | {
      kind: "COMMUNITY";
      hub: Hub;
      active?: boolean;
      onClick: () => void;
    }
  | {
      kind: "PRIVATE";
      chat: PrivateInboxItem;
      active?: boolean;
      onClick: () => void;
    };

function formatTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function InboxRow(props: Props) {
  const active = props.active;

  const title =
    props.kind === "COMMUNITY" ? props.hub.name : props.chat.other_user.name;

  const preview =
    props.kind === "COMMUNITY"
      ? props.hub.last_message_text
        ? `${props.hub.last_message_sender_name || "Someone"}: ${
            props.hub.last_message_text
          }`
        : props.hub.description || "No messages yet"
      : props.chat.last_message_text || "No messages yet";

  const time =
    props.kind === "COMMUNITY"
      ? formatTime(props.hub.last_message_at)
      : formatTime(props.chat.last_message_at);

  const unread =
    props.kind === "COMMUNITY"
      ? props.hub.unread_count ?? 0
      : props.chat.unread_count ?? 0;

  const photo =
    props.kind === "COMMUNITY" ? props.hub.cover_image : props.chat.other_user.photo;

  return (
    <button
      type="button"
      className={[styles.row, active ? styles.active : ""].join(" ")}
      onClick={props.onClick}
    >
      {/* Avatar */}
      <div className={styles.avatar}>
        {photo ? (
          <img src={photo} alt={title} className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarFallback}>
            {title?.slice(0, 1)?.toUpperCase() || "C"}
          </span>
        )}

        {/* small icon for community */}
        {props.kind === "COMMUNITY" ? (
          <span className={styles.communityMark} title="Community Hub">
            <FiUsers />
          </span>
        ) : null}
      </div>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.topLine}>
          <span className={styles.name}>{title}</span>
          <span className={styles.time}>{time}</span>
        </div>

        <div className={styles.bottomLine}>
          <span className={styles.preview}>{preview}</span>

          {unread > 0 ? (
            <span className={styles.unread}>{unread}</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
