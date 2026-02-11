"use client";

import { FiLayers, FiUsers, FiCheckCircle, FiLock } from "react-icons/fi";
import type { Hub } from "@/types/hub";
import styles from "./styles/HubCard.module.css";

type Props = {
  hub: Hub;
  onJoin: () => void;
  onOpen: () => void;
  disabled?: boolean;
};

export default function HubCard({ hub, onJoin, onOpen, disabled }: Props) {
  const joined = hub.user_joined;
  const unread = hub.unread_count ?? 0;
  const members = hub.members_count ?? 0;
  const isPrivate = hub.privacy && hub.privacy !== "PUBLIC";

  return (
    <article className={styles.card}>
      {/* Cover */}
      <div className={styles.coverWrap}>
        {hub.cover_image ? (
          <img src={hub.cover_image} className={styles.coverImg} alt={hub.name} />
        ) : (
          <div className={styles.coverFallback}>
            <FiLayers />
          </div>
        )}

        {unread > 0 && <span className={styles.unreadBadge}>{unread}</span>}
      </div>

      {/* Body */}
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h4 className={styles.name}>{hub.name}</h4>

          {hub.is_verified && (
            <span className={styles.verified} title="Verified hub">
              <FiCheckCircle />
            </span>
          )}
        </div>

        <div className={styles.badgesRow}>
          <span className={styles.typeBadge}>
            {hub.type === "SYSTEM" ? "LGA Hub" : "Local Hub"}
          </span>

          {isPrivate && (
            <span className={styles.privateBadge}>
              <FiLock />
              Private
            </span>
          )}

          {hub.category && (
            <span className={styles.categoryBadge}>{hub.category}</span>
          )}
        </div>

        {hub.description ? (
          <p className={styles.desc}>{hub.description}</p>
        ) : (
          <p className={styles.descMuted}>No description yet</p>
        )}

        {hub.last_message_text ? (
          <p className={styles.preview}>
            <strong className={styles.previewStrong}>
              {hub.last_message_sender_name || "Someone"}:
            </strong>{" "}
            {hub.last_message_text}
          </p>
        ) : (
          <p className={styles.previewMuted}>No messages yet</p>
        )}

        <div className={styles.metaRow}>
          <span className={styles.metaStat}>
            <FiUsers />
            {members} members
          </span>

          {joined && hub.user_role && (
            <span className={styles.roleChip}>{hub.user_role}</span>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={joined ? styles.openBtn : styles.joinBtn}
            disabled={disabled}
            onClick={joined ? onOpen : onJoin}
          >
            
            {joined ? "Open" : "Join"}
          </button>
        </div>
      </div>
    </article>
  );
}
