"use client";

import React from "react";
import { FiX, FiCornerUpLeft } from "react-icons/fi";
import styles from "./styles/ReplyBar.module.css";

type Sender = {
  name: string;
};

export type ReplyTarget = {
  id: string;
  isMine: boolean;
  sender: Sender;
  text?: string;
  deletedAt?: string | null;
  attachments?: any[];
};

type Props = {
  replyTo: ReplyTarget;

  /** Jump to original message */
  onJump: (messageId: string) => void;

  /** Cancel reply */
  onCancel: () => void;
};

function buildPreviewText(replyTo: ReplyTarget) {
  if (replyTo.deletedAt) return "This message was deleted";
  if (replyTo.text?.trim()) return replyTo.text.trim();
  if (replyTo.attachments?.length) return "Media";
  return "Message";
}

export default function ReplyBar({ replyTo, onJump, onCancel }: Props) {
  const senderLabel = replyTo.isMine ? "You" : replyTo.sender?.name || "Someone";
  const previewText = buildPreviewText(replyTo);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.body}
        onClick={() => onJump(replyTo.id)}
        title="Jump to message"
      >
        <div className={styles.icon}>
          <FiCornerUpLeft />
        </div>

        <div className={styles.content}>
          <div className={styles.title}>
            Replying to <strong>{senderLabel}</strong>
          </div>

          <div className={styles.preview}>{previewText}</div>
        </div>
      </button>

      <button
        type="button"
        className={styles.close}
        onClick={onCancel}
        title="Cancel reply"
      >
        <FiX />
      </button>
    </div>
  );
}
