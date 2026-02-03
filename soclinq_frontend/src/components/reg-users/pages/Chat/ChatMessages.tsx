"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiLoader,
  FiAlertCircle,
  FiCornerUpLeft,
  FiSmile,
  FiMoreVertical,
  FiCheck,
  FiFile,
  FiChevronDown,
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
  thumbnailUrl?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

type Sender = {
  id: string;
  name: string;
  photo?: string | null;
};

type Reaction = {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
};

export type Message = {
  id: string;
  clientTempId?: string;

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
  messages: Message[];
  loading: boolean;
  error: string | null;

  loadOlder: () => void;

  selectionMode: boolean;
  isSelected: (id: string) => boolean;
  onMessageClick: (e: React.MouseEvent, msg: Message) => void;

  toggleSelectMessage: (id: string) => void;

  hoverMsgId: string | null;
  setHoverMsgId: (id: string | null) => void;

  startReply: (msg: Message) => void;
  scrollToMessage: (messageId: string) => void;

  highlightMsgId: string | null;

  reactToMessage: (msg: Message, emoji: string) => void;
  recentEmojis: string[];

  setReactionPicker: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      message: Message | null;
      x: number;
      y: number;
    }>
  >;

  onOpenContextMenu: (pos: { x: number; y: number }, msg: Message) => void;

  bottomRef: React.RefObject<HTMLDivElement | null>;

  notify?: NotifyFn;
};

/* ---------------- Helpers ---------------- */

function isMediaMessage(msg: Message) {
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayDiffFromNow(d: Date) {
  const now = new Date();
  const diff = startOfDay(now) - startOfDay(d);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatTopDayLabel(iso: string) {
  const d = new Date(iso);
  const diff = dayDiffFromNow(d);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";

  if (diff >= 2 && diff <= 7) {
    return d.toLocaleDateString([], { weekday: "long" }); // Thursday, Friday...
  }

  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ---------------- Component ---------------- */

export default function ChatMessages({
  messages,
  loading,
  error,
  loadOlder,

  selectionMode,
  isSelected,
  onMessageClick,
  toggleSelectMessage,

  hoverMsgId,
  setHoverMsgId,

  startReply,
  scrollToMessage,

  highlightMsgId,

  reactToMessage,
  recentEmojis,

  setReactionPicker,
  onOpenContextMenu,

  bottomRef,
  notify,
}: Props) {
  /* ================= Scroll container ref ================= */

  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ================= Floating scroll button ================= */

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const hideScrollBtnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function isNearBottom(el: HTMLDivElement) {
    const threshold = 220; // px
    return el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
  }

  function scrollToBottom(smooth = true) {
    const el = containerRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });

    setShowScrollBottom(false);

    if (hideScrollBtnTimer.current) clearTimeout(hideScrollBtnTimer.current);
    hideScrollBtnTimer.current = setTimeout(() => {
      setShowScrollBottom(false);
    }, 2000);
  }

  /* ================= Top middle date label ================= */

  const [topDayLabel, setTopDayLabel] = useState<string | null>(null);
  const [hideTodayLabel, setHideTodayLabel] = useState(false);
  const todayHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateTopDayLabelFromScroll() {
    const el = containerRef.current;
    if (!el) return;

    // Find the first visible message node
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-msg-id]"));
    if (!nodes.length) return;

    const top = el.getBoundingClientRect().top + 12;

    let best: HTMLElement | null = null;

    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (rect.bottom >= top) {
        best = node;
        break;
      }
    }

    if (!best) return;

    const iso = best.getAttribute("data-created-at");
    if (!iso) return;

    const label = formatTopDayLabel(iso);
    setTopDayLabel(label);

    // ✅ auto hide only when it's Today
    if (label === "Today") {
      setHideTodayLabel(false);

      if (todayHideTimerRef.current) clearTimeout(todayHideTimerRef.current);
      todayHideTimerRef.current = setTimeout(() => {
        setHideTodayLabel(true);
      }, 2200);
    } else {
      setHideTodayLabel(false);
      if (todayHideTimerRef.current) {
        clearTimeout(todayHideTimerRef.current);
        todayHideTimerRef.current = null;
      }
    }
  }

  /* ================= Long press selection + Swipe RIGHT reply ================= */

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const pointerDownRef = useRef<{
    x: number;
    y: number;
    id: number;
    msgId: string;
    pointerType: string;
  } | null>(null);

  const swipeTriggeredRef = useRef(false);

  const [swipeDx, setSwipeDx] = useState<Record<string, number>>({}); // msgId -> dx

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function openQuickEmojiRow(msg: Message, clientX: number, clientY: number) {
    const x = clamp(clientX, 16, window.innerWidth - 16);
    const y = clamp(clientY, 70, window.innerHeight - 16);

    setReactionPicker({
      open: true,
      message: msg,
      x,
      y,
    });
  }

  function maybeTriggerSwipeReply(msg: Message, dx: number) {
    if (swipeTriggeredRef.current) return;
    if (selectionMode) return;
    if (msg.deletedAt) return;
    if (msg.messageType === "SYSTEM") return;

    // ✅ swipe RIGHT threshold
    if (dx >= 80) {
      swipeTriggeredRef.current = true;
      startReply(msg);

      // reset swipe visual
      setSwipeDx((prev) => ({ ...prev, [msg.id]: 0 }));

      try {
        navigator.vibrate?.(10);
      } catch {}
    }
  }

  /* ================= Effects ================= */

  // scroll listeners + compute top day label + show floating scroll btn
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      // load older when reaching top
      if (el.scrollTop === 0) loadOlder();

      // floating scroll button
      setShowScrollBottom(!isNearBottom(el));

      // top date label
      updateTopDayLabelFromScroll();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // initial update
    onScroll();

    return () => {
      el.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOlder, messages.length]);

  // when new messages come in, if user is near bottom => auto scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isNearBottom(el)) {
      scrollToBottom(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // cleanup timers
  useEffect(() => {
    return () => {
      if (hideScrollBtnTimer.current) clearTimeout(hideScrollBtnTimer.current);
      if (todayHideTimerRef.current) clearTimeout(todayHideTimerRef.current);
    };
  }, []);

  /* ================= Render ================= */

  const showTopDate =
    Boolean(topDayLabel) && !(topDayLabel === "Today" && hideTodayLabel);

    
  return (
    <div className={styles.messagesWrap}>
      {/* ✅ Top center date label */}
      {showTopDate && (
        <div className={styles.topDateFloat}>
          <span className={styles.topDateChip}>{topDayLabel}</span>
        </div>
      )}

      {/* ✅ Messages scroll container */}
      <div
        ref={containerRef}
        className={styles.messages}
        aria-live="polite"
      >
        {loading ? (
          <div className={styles.center}>
            <FiLoader className={styles.spin} />
          </div>
        ) : error ? (
          <div className={styles.center}>{error}</div>
        ) : (
          messages.map((msg, idx) => {
            const selected = isSelected(msg.id);
            const highlighted = highlightMsgId === msg.id;

            const isSystem = msg.messageType === "SYSTEM";
            const isDeleted = !!msg.deletedAt;

            const translateX = swipeDx[msg.id] ?? 0;

            const prev = idx > 0 ? messages[idx - 1] : null;

            const showDayDivider =
              idx === 0 ||
              !prev ||
              !isSameDay(new Date(prev.createdAt), new Date(msg.createdAt));

            const dayLabel = formatTopDayLabel(msg.createdAt);

            return (
              <React.Fragment key={msg.id}>
                {/* ✅ Day separator above first message of that day */}
                {showDayDivider && (
                  <div className={styles.dayDivider}>
                    <span className={styles.dayChip}>{dayLabel}</span>
                  </div>
                )}
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                data-msg-id={msg.id}
                data-created-at={msg.createdAt}
                className={[
                  styles.message,
                  msg.isMine ? styles.mine : styles.theirs,
                  selected ? styles.selectedMsg : "",
                  highlighted ? styles.highlightMsg : "",
                  isSystem ? styles.system : "",
                ].join(" ")}
                data-selected={selected ? "1" : "0"}
                style={{
                  transform:
                    translateX > 0 && !selectionMode
                      ? `translateX(${Math.min(translateX, 42)}px)`
                      : undefined,
                  transition:
                    translateX === 0 ? "transform 160ms ease" : undefined,
                }}
                onMouseEnter={() => setHoverMsgId(msg.id)}
                onMouseLeave={() => setHoverMsgId(null)}
                onClick={(e) => {
                  if (longPressTriggered.current || swipeTriggeredRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => {
                      longPressTriggered.current = false;
                      swipeTriggeredRef.current = false;
                    }, 0);
                    return;
                  }

                  if (!selectionMode) return;
                  onMessageClick(e, msg);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();

                  if (!selectionMode) {
                    onOpenContextMenu({ x: e.clientX, y: e.clientY }, msg);
                    return;
                  }

                  toggleSelectMessage(msg.id);
                }}
                onPointerDown={(e) => {
                  if (isSystem || isDeleted) return;
                  if (!e.pointerType) return;

                  longPressTriggered.current = false;
                  swipeTriggeredRef.current = false;
                  clearLongPressTimer();

                  pointerDownRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    id: e.pointerId,
                    msgId: msg.id,
                    pointerType: e.pointerType,
                  };

                  // reset dx for this msg
                  setSwipeDx((prev) => ({ ...prev, [msg.id]: 0 }));

                  const delay = e.pointerType === "mouse" ? 520 : 420;

                  longPressTimer.current = setTimeout(() => {
                    if (swipeTriggeredRef.current) return;

                    longPressTriggered.current = true;

                    toggleSelectMessage(msg.id);

                    setTimeout(() => {
                      openQuickEmojiRow(msg, e.clientX, e.clientY);
                    }, 40);

                    try {
                      navigator.vibrate?.(15);
                    } catch {}
                  }, delay);
                }}
                onPointerMove={(e) => {
                  if (!pointerDownRef.current) return;
                  if (pointerDownRef.current.id !== e.pointerId) return;
                  if (pointerDownRef.current.msgId !== msg.id) return;

                  const dx = e.clientX - pointerDownRef.current.x;
                  const dy = e.clientY - pointerDownRef.current.y;

                  // ✅ swipe RIGHT only (ignore left)
                  const swipe = Math.max(0, dx);

                  // visual swipe feedback (only when not selection mode)
                  if (!selectionMode && swipe < 120) {
                    setSwipeDx((prev) => ({ ...prev, [msg.id]: swipe }));
                  }

                  // trigger swipe reply
                  maybeTriggerSwipeReply(msg, swipe);

                  // cancel long press if user is dragging / scrolling
                  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    // allow swipe right movement
                    if (dx < 20) clearLongPressTimer();
                  }
                }}
                onPointerUp={(e) => {
                  clearLongPressTimer();

                  try {
                    (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
                  } catch {}

                  pointerDownRef.current = null;

                  // reset swipe animation
                  setSwipeDx((prev) => ({ ...prev, [msg.id]: 0 }));

                  setTimeout(() => {
                    swipeTriggeredRef.current = false;
                  }, 0);
                }}
                onPointerCancel={() => {
                  clearLongPressTimer();
                  pointerDownRef.current = null;
                  swipeTriggeredRef.current = false;
                  setSwipeDx((prev) => ({ ...prev, [msg.id]: 0 }));
                }}
              >
                {/* ✅ selected tick overlay */}
                {selected && (
                  <div className={styles.selectedOverlay}>
                    <div className={styles.selectedTickCircle}>
                      <FiCheck className={styles.selectedCheckIcon} />
                    </div>
                  </div>
                )}

                {/* ✅ reply swipe hint (right side) */}
                {!selectionMode && !isDeleted && !isSystem && (
                  <div
                    className={styles.swipeReplyHintRight}
                    style={{
                      opacity: Math.min(0.6, (translateX || 0) / 90),
                      transform: `translateY(-50%) scale(${0.92 +
                        Math.min(0.08, (translateX || 0) / 240)})`,
                    }}
                  >
                    <FiCornerUpLeft />
                  </div>
                )}

                {isSystem ? (
                  <p className={styles.systemText}>{msg.text}</p>
                ) : (
                  <>
                    {!msg.isMine && !isDeleted ? (
                      <span className={styles.sender}>{msg.sender.name}</span>
                    ) : null}

                    {msg.replyTo?.id ? (
                      <button
                        type="button"
                        className={styles.replyPreviewBubble}
                        title="Jump to replied message"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToMessage(msg.replyTo!.id);
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

                    {isDeleted ? (
                      <p className={styles.deletedText}>
                        This message was deleted
                      </p>
                    ) : msg.text ? (
                      <p className={styles.text}>{msg.text}</p>
                    ) : null}

                    {!isDeleted && isMediaMessage(msg) ? (
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
                                    message:
                                      "Image preview modal coming soon.",
                                    duration: 2200,
                                  });
                                }}
                                title="Open image"
                              >
                                <img
                                  src={a.url}
                                  className={styles.image}
                                  alt=""
                                />
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
                                onClick={(e) => e.stopPropagation()}
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
                                onClick={(e) => e.stopPropagation()}
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
                                reactToMessage(msg, r.emoji);
                              }}
                            >
                              <span className={styles.reactionEmoji}>
                                {r.emoji}
                              </span>
                              <span className={styles.reactionCount}>
                                {r.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
{/* 
                    {!selectionMode && !isDeleted && hoverMsgId === msg.id ? (
                      <div className={styles.msgHoverActions}>
                        <button
                          type="button"
                          className={styles.msgHoverBtn}
                          title="Reply"
                          onClick={(e) => {
                            e.stopPropagation();
                            startReply(msg);
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
                            openQuickEmojiRow(msg, e.clientX, e.clientY);
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
                            onOpenContextMenu(
                              { x: e.clientX, y: e.clientY },
                              msg
                            );
                          }}
                        >
                          <FiMoreVertical />
                        </button>
                      </div>
                    ) : null} */}

                    <div className={styles.metaRow}>
                      <span className={styles.time}>
                        {formatTime(msg.createdAt)}
                        {!isDeleted && msg.editedAt ? (
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
              </React.Fragment>
            );
          })
        )}

        {/* bottom ref for parent smooth scroll helpers */}
        <div ref={bottomRef} className={styles.bottomSpacer} />
      </div>

      {/* ✅ Scroll to bottom floating button */}
      {showScrollBottom && (
        <button
          className={styles.scrollToBottomBtn}
          onClick={() => scrollToBottom(true)}
          title="Scroll to latest"
          aria-label="Scroll to latest message"
        >
          <FiChevronDown />
        </button>
      )}
    </div>
  );
}
