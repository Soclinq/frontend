"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { FiX, FiLoader, FiEye, FiCheckCircle, FiSmile } from "react-icons/fi";
import styles from "./styles/ChatMessageInfoModal.module.css";
import type { ChatMessage } from "@/types/chat";
import type { PublicUserProfile } from "@/types/profile";

/* ======================================================
   TYPES (Overlay-Compatible)
====================================================== */

type Props = {
  message: ChatMessage;
  onClose: () => void;
};

/* ======================================================
   HELPERS
====================================================== */

function formatTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortByTimeDesc<T>(arr: T[], getTime: (item: T) => string | undefined) {
  return [...arr].sort(
    (a, b) =>
      new Date(getTime(b) ?? 0).getTime() -
      new Date(getTime(a) ?? 0).getTime()
  );
}


/* ======================================================
   AVATAR
====================================================== */

function Avatar({ user }: { user: PublicUserProfile }) {
  const [failed, setFailed] = React.useState(false);

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

/* ======================================================
   COMPONENT
====================================================== */

export default function ChatMessageInfoModal({
  message,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  /* ---------- Close Behaviors ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [onClose]);

  /* ======================================================
     NORMALIZATION (VERY IMPORTANT)
  ====================================================== */

  const read = message.readReceipts ?? [];
  const delivered = message.deliveredReceipts ?? [];
  const reactions = message.reactionReceipts ?? [];
  const members = message.threadMembers ?? [];

  /* ======================================================
     DERIVED WHATSAPP LOGIC
  ====================================================== */

  const derived = useMemo(() => {
    const readSorted = sortByTimeDesc(read, r => r.readAt);
  const deliveredSorted = sortByTimeDesc(delivered, d => d.deliveredAt);
  const reactionSorted = sortByTimeDesc(reactions, r => r.createdAt);




    const readIds = new Set(readSorted.map(r => r.user.id));

    /* Delivered excluding read */
    const deliveredOnly = deliveredSorted.filter(
      d => !readIds.has(d.user.id)
    );

    const interacted = new Set([
      ...readSorted.map(r => r.user.id),
      ...deliveredSorted.map(d => d.user.id),
    ]);

    const remaining = members.filter(
      u => !interacted.has(u.id)
    );

    return {
      readSorted,
      deliveredOnly,
      reactionSorted,
      remaining,
    };
  }, [read, delivered, reactions, members]);

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} />

      <div ref={ref} className={styles.modal}>
        {/* HEADER */}
        <div className={styles.header}>
          <div>
            <h3>Message Info</h3>
            <span className={styles.messagePreview}>
              {message.text ?? "Media message"}
            </span>
          </div>

          <button onClick={onClose} className={styles.closeBtn}>
            <FiX />
          </button>
        </div>

        {/* BODY */}
        <div className={styles.body}>
          <Section
            icon={<FiEye />}
            title="Read by"
            count={derived.readSorted.length}
          >
            {derived.readSorted.length ? (
              derived.readSorted.map(x => (
                <UserRow
                  key={x.user.id}
                  user={x.user}
                  time={formatTime(x.readAt)}
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
              derived.deliveredOnly.map(x => (
                <UserRow
                  key={x.user.id}
                  user={x.user}
                  time={formatTime(x.deliveredAt)}
                />
              ))
            ) : (
              <Empty />
            )}
          </Section>

          <Section
            title="Remaining"
            count={derived.remaining.length}
          >
            {derived.remaining.length ? (
              derived.remaining.map(u => (
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
              derived.reactionSorted.map((r, idx) => (
                <UserRow
                  key={`${r.user.id}-${idx}`}
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

/* ======================================================
   SUB COMPONENTS
====================================================== */

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
