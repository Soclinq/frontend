"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiCheckCircle, FiEye, FiSmile, FiX } from "react-icons/fi";
import styles from "./styles/ChatMessageInfoModal.module.css";

import type {
  ChatDeliveredReceipt,
  ChatMessage,
  ChatReactionReceipt,
  ChatReadReceipt,
} from "@/types/chat";

import type { PublicUserProfile } from "@/types/profile";

/* ====================================================== */
/* Helpers */
/* ====================================================== */

function formatTime(iso?: string) {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortByTimeDesc<T>(
  arr: T[],
  getTime: (item: T) => string | undefined
) {
  return [...arr].sort((a, b) => {
    const aTime = new Date(getTime(a) ?? 0).getTime();
    const bTime = new Date(getTime(b) ?? 0).getTime();
    return bTime - aTime;
  });
}

/* ====================================================== */
/* Avatar */
/* ====================================================== */

function Avatar({ user }: { user: PublicUserProfile }) {
  const [failed, setFailed] = useState(false);

  if (user.photo && !failed) {
    return (
      <img
        src={user.photo}
        className={styles.avatarImg}
        onError={() => setFailed(true)}
        alt={user.full_name ?? user.username ?? "User"}
      />
    );
  }

  const letter =
    user.full_name?.slice(0, 1) ??
    user.username?.slice(0, 1) ??
    "?";

  return (
    <div className={styles.avatarFallback}>
      {letter.toUpperCase()}
    </div>
  );
}

/* ====================================================== */
/* Component */
/* ====================================================== */

type Props = {
  message: ChatMessage;
  onClose: () => void;
};

export default function ChatMessageInfoModal({ message, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- Close Behaviors ---------------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const modal = modalRef.current;
      if (!modal || modal.contains(event.target as Node)) return;
      onClose();
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  /* ---------------- Normalization ---------------- */

  const readReceipts = message.readReceipts ?? [];
  const deliveredReceipts = message.deliveredReceipts ?? [];
  const reactionReceipts = message.reactionReceipts ?? [];
  const threadMembers = message.threadMembers ?? [];

  /* ---------------- Derived State ---------------- */

  const derived = useMemo(() => {
    const readSorted = sortByTimeDesc<ChatReadReceipt>(
      readReceipts,
      (r) => r.readAt
    );

    const deliveredSorted = sortByTimeDesc<ChatDeliveredReceipt>(
      deliveredReceipts,
      (d) => d.deliveredAt
    );

    const reactionSorted = sortByTimeDesc<ChatReactionReceipt>(
      reactionReceipts,
      (r) => r.createdAt
    );

    const readIds = new Set(readSorted.map((r) => r.user.id));

    const deliveredOnly = deliveredSorted.filter(
      (d) => !readIds.has(d.user.id)
    );

    const interacted = new Set([
      ...readSorted.map((r) => r.user.id),
      ...deliveredSorted.map((d) => d.user.id),
    ]);

    const remaining = threadMembers.filter(
      (member) => !interacted.has(member.id)
    );

    return {
      readSorted,
      deliveredOnly,
      reactionSorted,
      remaining,
    };
  }, [readReceipts, deliveredReceipts, reactionReceipts, threadMembers]);

  /* ---------------- Render ---------------- */

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} />

      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Message Info"
      >
        <div className={styles.header}>
          <div>
            <h3>Message Info</h3>
            <span className={styles.messagePreview}>
              {message.text ?? "Media message"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        <div className={styles.body}>
          <Section icon={<FiEye />} title="Read by" count={derived.readSorted.length}>
            {derived.readSorted.length ? (
              derived.readSorted.map((r) => (
                <UserRow
                  key={r.user.id}
                  user={r.user}
                  time={formatTime(r.readAt)}
                />
              ))
            ) : (
              <Empty />
            )}
          </Section>

          <Section
            icon={<FiCheckCircle />}
            title="Delivered to"
            count={derived.deliveredOnly.length}
          >
            {derived.deliveredOnly.length ? (
              derived.deliveredOnly.map((d) => (
                <UserRow
                  key={d.user.id}
                  user={d.user}
                  time={formatTime(d.deliveredAt)}
                />
              ))
            ) : (
              <Empty />
            )}
          </Section>

          <Section title="Remaining" count={derived.remaining.length}>
            {derived.remaining.length ? (
              derived.remaining.map((u) => (
                <UserRow key={u.id} user={u} />
              ))
            ) : (
              <div className={styles.none}>Everyone received</div>
            )}
          </Section>

          <Section
            icon={<FiSmile />}
            title="Reactions"
            count={derived.reactionSorted.length}
          >
            {derived.reactionSorted.length ? (
              derived.reactionSorted.map((r, i) => (
                <UserRow
                  key={`${r.user.id}-${i}`}
                  user={r.user}
                  time={formatTime(r.createdAt)}
                  extra={<span>{r.emoji}</span>}
                />
              ))
            ) : (
              <Empty />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ====================================================== */
/* Sub Components */
/* ====================================================== */

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          {icon}
          <span>{title}</span>
        </div>

        {count !== undefined && (
          <span className={styles.count}>{count}</span>
        )}
      </div>

      <div className={styles.rows}>{children}</div>
    </div>
  );
}

function UserRow({
  user,
  time,
  extra,
}: {
  user: PublicUserProfile;
  time?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className={styles.row}>
      <Avatar user={user} />

      <div className={styles.meta}>
        <span className={styles.name}>
          {extra} {user.full_name ?? user.username ?? "User"}
        </span>

        {time && <span className={styles.time}>{time}</span>}
      </div>
    </div>
  );
}

function Empty() {
  return <div className={styles.emptyRow}>None</div>;
}
