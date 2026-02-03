"use client";

import React from "react";
import { FiCheckCircle, FiLock, FiUsers } from "react-icons/fi";
import type { Hub } from "@/types/hub";
import styles from "./styles/HubListRow.module.css";

type Props = {
  hub: Hub;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function formatPreviewTime(iso?: string | null) {
  if (!iso) return "";

  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function HubListRow({ hub, active, disabled, onClick }: Props) {
  const unread = hub.unread_count ?? 0;
  const members = hub.members_count ?? 0;
  const isPrivate = hub.privacy && hub.privacy !== "PUBLIC";

  return (
    <button
      type="button"
      className={[
        styles.row,
        active ? styles.active : "",
        disabled ? styles.disabled : "",
      ].join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      {/* Left avatar */}
      <div className={styles.avatar}>
        {hub.cover_image ? (
          <img src={hub.cover_image} alt={hub.name} className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarFallback}>
            {hub.name?.slice(0, 1)?.toUpperCase() || "H"}
          </span>
        )}

        {hub.is_verified ? (
          <span className={styles.verified} title="Verified hub">
            <FiCheckCircle />
          </span>
        ) : null}
      </div>

      {/* Main content */}
      <div className={styles.main}>
        <div className={styles.topLine}>
          <span className={styles.name}>{hub.name}</span>

          <span className={styles.time}>
            {formatPreviewTime(hub.last_message_at)}
          </span>
        </div>

        <div className={styles.bottomLine}>
          <span className={styles.preview}>
            {hub.last_message_text
              ? `${hub.last_message_sender_name || "Someone"}: ${
                  hub.last_message_text
                }`
              : hub.description
              ? hub.description
              : "No messages yet"}
          </span>
        </div>

        <div className={styles.metaLine}>
          <span className={styles.metaItem}>
            <FiUsers />
            {members}
          </span>

          {isPrivate ? (
            <span className={styles.privateChip}>
              <FiLock />
              Private
            </span>
          ) : null}

          {hub.user_joined ? (
            <span className={styles.joinedChip}>{hub.user_role || "MEMBER"}</span>
          ) : (
            <span className={styles.joinChip}>Join</span>
          )}
        </div>
      </div>

      {/* Right unread */}
      <div className={styles.right}>
        {unread > 0 ? <span className={styles.unread}>{unread}</span> : null}
      </div>
    </button>
  );
}
