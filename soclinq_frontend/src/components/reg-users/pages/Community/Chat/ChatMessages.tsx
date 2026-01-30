"use client";

import React from "react";
import {
  FiLoader,
  FiAlertCircle,
  FiCornerUpLeft,
  FiSmile,
  FiMoreVertical,
  FiCheck,
  FiFile,
} from "react-icons/fi";
import styles from "./styles/ChatMessages.module.css";

/* ---------------- Types ---------------- */

type AttachmentType = "IMAGE" | "AUDIO" | "VIDEO" | "FILE";

type Attachment = {
  id: string;
  type: AttachmentType;
  url: string;
  fileName?: string;
  mimeType?: string;
};

type Sender = {
  id: string;
  name: string;
  photo?: string | null;
};

type Reaction = {
  emoji: string;
  count: number;
};

export type ChatMessage = {
  id: string;

  messageType: "TEXT" | "MEDIA" | "SYSTEM";
  text?: string;

  sender: Sender;
  createdAt: string;

  isMine: boolean;
  status?: "sending" | "sent" | "failed";

  editedAt?: string | null;
  deletedAt?: string | null;

  replyTo?: {
    id: string;
    text?: string;
    senderName?: string;
  } | null;

  attachments?: Attachment[];
  reactions?: Reaction[];
  myReaction?: string | null;
};

/** ✅ This matches your NotificationProvider */
export type NotifyFn = (n: {
  type: "success" | "error" | "warning" | "info" | "loading";
  title?: string;
  message: string;
  duration?: number;
  confirm?: {
    label?: string;
    onConfirm: () => void;
  };
}) => void;

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;

  /** Infinite scroll */
  onLoadOlder: () => void;

  /** Selection */
  selectionMode: boolean;
  isSelected: (id: string) => boolean;
  onMessageClick: (e: React.MouseEvent, msg: ChatMessage) => void;
  onRightClickSelect?: (msg: ChatMessage) => void;
  onToggleSelect: (id: string) => void;

  /** Hover actions */
  hoverMsgId: string | null;
  setHoverMsgId: (id: string | null) => void;

  /** Reply + Jump */
  onStartReply: (msg: ChatMessage) => void;
  onJumpToMessage: (messageId: string) => void;

  /** Context menu */
  onOpenMenu: (pos: { x: number; y: number }, msg: ChatMessage) => void;

  /** Reaction quick picker */
  onOpenReactionPicker: (pos: { x: number; y: number }, msg: ChatMessage) => void;

  /** React to message */
  onReactToMessage: (msg: ChatMessage, emoji: string) => void;

  /** Highlight message */
  highlightMsgId: string | null;

  /** ✅ Notification from parent */
  notify?: NotifyFn;
};

function isMediaMessage(msg: ChatMessage) {
  return msg.messageType === "MEDIA" && (msg.attachments?.length ?? 0) > 0;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatMessages({
  messages,
  loading,
  error,
  onLoadOlder,

  selectionMode,
  isSelected,
  onMessageClick,
  onRightClickSelect,
  onToggleSelect,

  hoverMsgId,
  setHoverMsgId,

  onStartReply,
  onJumpToMessage,

  onOpenMenu,
  onOpenReactionPicker,

  onReactToMessage,

  highlightMsgId,

  notify,
}: Props) {
  return (
    <div
      className={styles.messages}
      onScroll={(e) => {
        if (e.currentTarget.scrollTop === 0) onLoadOlder();
      }}
    >
      {loading ? (
        <div className={styles.center}>
          <FiLoader className={styles.spin} />
        </div>
      ) : error ? (
        <div className={styles.center}>{error}</div>
      ) : (
        messages.map((msg) => {
          const selected = selectionMode && isSelected(msg.id);
          const highlighted = highlightMsgId === msg.id;

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={[
                styles.message,
                msg.isMine ? styles.mine : styles.theirs,
                selected ? styles.selectedMsg : "",
                highlighted ? styles.highlightMsg : "",
                msg.messageType === "SYSTEM" ? styles.system : "",
              ].join(" ")}
              onMouseEnter={() => setHoverMsgId(msg.id)}
              onMouseLeave={() => setHoverMsgId(null)}
              onClick={(e) => onMessageClick(e, msg)}
              onContextMenu={(e) => {
                e.preventDefault();

                // WhatsApp Web behavior:
                // - if not in selectionMode => start selection
                if (!selectionMode) {
                  onRightClickSelect?.(msg);
                  return;
                }

                // - if selectionMode => toggle
                onToggleSelect(msg.id);
              }}
            >
              {/* ✅ Selection overlay */}
              {selected && (
                <div className={styles.selectedOverlay}>
                  <FiCheck className={styles.selectedCheckIcon} />
                </div>
              )}

              {/* SYSTEM */}
              {msg.messageType === "SYSTEM" ? (
                <p className={styles.systemText}>{msg.text}</p>
              ) : (
                <>
                  {/* Sender name (only for theirs) */}
                  {!msg.isMine && !msg.deletedAt ? (
                    <span className={styles.sender}>{msg.sender.name}</span>
                  ) : null}

                  {/* Reply preview */}
                  {msg.replyTo?.id ? (
                    <button
                      type="button"
                      className={styles.replyPreviewBubble}
                      title="Jump to replied message"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToMessage(msg.replyTo!.id);
                      }}
                    >
                      <span className={styles.replySender}>
                        {msg.replyTo.senderName || "Reply"}
                      </span>
                      <span className={styles.replyText}>
                        {msg.replyTo.text || "[message]"}
                      </span>
                    </button>
                  ) : null}

                  {/* Content */}
                  {msg.deletedAt ? (
                    <p className={styles.deletedText}>This message was deleted</p>
                  ) : msg.text ? (
                    <p className={styles.text}>{msg.text}</p>
                  ) : null}

                  {/* Attachments */}
                  {!msg.deletedAt && isMediaMessage(msg) ? (
                    <div className={styles.attachments}>
                      {msg.attachments?.map((a) => {
                        if (a.type === "IMAGE") {
                          return (
                            <button
                              type="button"
                              key={a.id}
                              className={styles.mediaBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                notify?.({
                                  type: "info",
                                  title: "Preview",
                                  message: "Image preview modal coming soon.",
                                  duration: 2200,
                                });
                              }}
                              title="Open image"
                            >
                              <img src={a.url} className={styles.image} alt="" />
                            </button>
                          );
                        }

                        if (a.type === "VIDEO") {
                          return (
                            <video
                              key={a.id}
                              className={styles.video}
                              controls
                              src={a.url}
                            />
                          );
                        }

                        if (a.type === "AUDIO") {
                          return (
                            <audio
                              key={a.id}
                              className={styles.audio}
                              controls
                              src={a.url}
                            />
                          );
                        }

                        return (
                          <a
                            key={a.id}
                            className={styles.file}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className={styles.fileIcon}>
                              <FiFile />
                            </span>
                            <span className={styles.fileName}>
                              {a.fileName || "Download file"}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 ? (
                    <div className={styles.reactionsRow}>
                      {msg.reactions.map((r) => {
                        const mine = msg.myReaction === r.emoji;

                        return (
                          <button
                            key={r.emoji}
                            type="button"
                            className={[
                              styles.reactionChip,
                              mine ? styles.reactionChipMine : "",
                            ].join(" ")}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReactToMessage(msg, r.emoji);
                            }}
                          >
                            <span className={styles.reactionEmoji}>{r.emoji}</span>
                            <span className={styles.reactionCount}>{r.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Hover actions */}
                  {!selectionMode &&
                    !msg.deletedAt &&
                    hoverMsgId === msg.id && (
                      <div className={styles.msgHoverActions}>
                        <button
                          type="button"
                          className={styles.msgHoverBtn}
                          title="Reply"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartReply(msg);
                          }}
                        >
                          <FiCornerUpLeft />
                        </button>

                        <button
                          type="button"
                          className={styles.msgHoverBtn}
                          title="React"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReactionPicker(
                              { x: e.clientX, y: Math.max(12, e.clientY - 70) },
                              msg
                            );
                          }}
                        >
                          <FiSmile />
                        </button>

                        <button
                          type="button"
                          className={styles.msgHoverBtn}
                          title="More"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMenu({ x: e.clientX, y: e.clientY }, msg);
                          }}
                        >
                          <FiMoreVertical />
                        </button>
                      </div>
                    )}

                  {/* Meta row */}
                  <div className={styles.metaRow}>
                    <span className={styles.time}>
                      {formatTime(msg.createdAt)}
                      {!msg.deletedAt && msg.editedAt ? (
                        <span className={styles.editedTag}> • Edited</span>
                      ) : null}
                    </span>

                    {msg.status === "failed" ? (
                      <FiAlertCircle className={styles.failed} />
                    ) : null}

                    {msg.status === "sending" ? (
                      <span className={styles.sending}>Sending…</span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}

      <div className={styles.bottomSpacer} />
    </div>
  );
}
