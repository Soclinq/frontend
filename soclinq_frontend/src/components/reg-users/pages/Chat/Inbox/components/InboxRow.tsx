"use client";

import { FiUsers } from "react-icons/fi";

import type { Hub } from "@/types/hub";
import type { PrivateInboxItem } from "@/types/privateInbox";

import { useLongPress } from "@/hooks/Inbox/useLongPressOptions";
import styles from "./styles/InboxRow.module.css";

/* ================= PROPS ================= */

type LongPressMeta = {
  id: string;
  kind: "COMMUNITY" | "PRIVATE";
};

type Props =
  | {
      kind: "COMMUNITY";
      hub: Hub;
      active?: boolean;
      selected?: boolean;
      onClick: () => void;
      onLongPress?: (meta: LongPressMeta) => void;
    }
  | {
      kind: "PRIVATE";
      chat: PrivateInboxItem;
      active?: boolean;
      selected?: boolean;
      onClick: () => void;
      onLongPress?: (meta: LongPressMeta) => void;
    };

/* ================= HELPERS ================= */

function formatSmartDate(iso?: string | null) {
  if (!iso) return "";

  try {
    const d = new Date(iso);
    const now = new Date();

    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 24) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    if (diffDays >= 1 && diffDays < 2) return "Yesterday";

    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "long" });
    }

    return d.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function getTypingName(props: Props) {
  return props.kind === "PRIVATE"
    ? props.chat.other_user.name
    : props.hub.name;
}

/* ================= COMPONENT ================= */

export default function InboxRow(props: Props) {
  /* ---------- Identity ---------- */

  const id =
    props.kind === "COMMUNITY"
      ? props.hub.id
      : props.chat.id;

  /* ---------- Long Press ---------- */

  const longPress = useLongPress({
    onLongPress: () => {
      props.onLongPress?.({
        id,
        kind: props.kind,
      });
    },
    onClick: props.onClick,
  });

  /* ---------- Derived UI ---------- */

  const title =
    props.kind === "COMMUNITY"
      ? props.hub.name
      : props.chat.other_user.name;

  const photo =
    props.kind === "COMMUNITY"
      ? props.hub.cover_image
      : props.chat.other_user.photo;

  const unread =
    props.kind === "COMMUNITY"
      ? props.hub.unread_count ?? 0
      : props.chat.unread_count ?? 0;

  const time =
    props.kind === "COMMUNITY"
      ? formatSmartDate(props.hub.last_message_at)
      : formatSmartDate(props.chat.last_message_at);

  const typing =
    props.kind === "COMMUNITY"
      ? !!props.hub.is_typing
      : !!props.chat.is_typing;

  const typingName = getTypingName(props);

  const preview = typing ? (
    <span className={styles.typing}>
      <span className={styles.typingText}>
        {props.kind === "PRIVATE" ? "Typing" : `${typingName} typing`}
      </span>
      <span className={styles.typingDots} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  ) : props.kind === "COMMUNITY" ? (
    props.hub.last_message_text ? (
      `${props.hub.last_message_sender_name || "Someone"}: ${props.hub.last_message_text}`
    ) : (
      props.hub.description || "No messages yet"
    )
  ) : (
    props.chat.last_message_text || "No messages yet"
  );

  const isOnline =
    props.kind === "PRIVATE"
      ? !!props.chat.other_user.is_online
      : false;

  /* ================= RENDER ================= */

  return (
    <button
      type="button"
      {...longPress}
      className={[
        styles.row,
        props.active ? styles.active : "",
        props.selected ? styles.selected : "",
      ].join(" ")}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Avatar */}
      <div className={styles.avatar}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={title} className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarFallback}>
            {title?.slice(0, 1)?.toUpperCase() || "C"}
          </span>
        )}

        {/* Online Dot */}
        {props.kind === "PRIVATE" && isOnline && (
          <span className={styles.onlineDot} title="Online" />
        )}

        {/* Community Icon */}
        {props.kind === "COMMUNITY" && (
          <span className={styles.communityMark} title="Community Hub">
            <FiUsers />
          </span>
        )}
      </div>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.topLine}>
          <span className={styles.name}>{title}</span>
          {time && <span className={styles.time}>{time}</span>}
        </div>

        <div className={styles.bottomLine}>
          <span className={styles.preview}>{preview}</span>
          {unread > 0 && <span className={styles.unread}>{unread}</span>}
        </div>
      </div>
    </button>
  );
}
