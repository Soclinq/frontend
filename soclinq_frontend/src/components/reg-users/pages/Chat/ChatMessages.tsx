"use client";

import React, { useEffect } from "react";
import {
  FiLoader,
  FiAlertCircle,
  FiCheck,
  FiChevronDown,
  FiClock,
} from "react-icons/fi";
import styles from "./styles/ChatMessages.module.css";

/* ---------------- Types ---------------- */
import type { ChatMessage, ChatReaction } from "@/types/chat";

/* ---------------- Hooks ---------------- */
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatGestures } from "@/hooks/useChatGestures";
import { useChatRetry } from "@/hooks/useChatRetry";
import { useChatSeen } from "@/hooks/useChatSeen";
import { useChatDedup } from "@/hooks/useChatDedup";
import { useReactionBurst } from "@/hooks/useReactionBurst";
import { useReactionSummary } from "@/hooks/useReactionSummary";

/* ---------------- Props ---------------- */

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;

  loadOlder: () => void;

  selectionMode: boolean;
  isSelected: (id: string) => boolean;
  toggleSelectMessage: (id: string) => void;
  onMessageClick: (e: React.MouseEvent, msg: ChatMessage) => void;

  startReply: (msg: ChatMessage) => void;
  scrollToMessage: (id: string) => void;

  reactToMessage: (msg: ChatMessage, emoji: string) => void;

  setReactionPicker: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      message: ChatMessage | null;
      x: number;
      y: number;
    }>
  >;

  onOpenContextMenu: (pos: { x: number; y: number }, msg: ChatMessage) => void;

  containerRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;

  onRetryMessage?: (msg: ChatMessage) => Promise<void>;
  sendChunk?: (opts: any) => Promise<void>;
};

/* ---------------- Helpers ---------------- */

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

/* ---------------- Component ---------------- */

export default function ChatMessages(props: Props) {
  const {
    messages,
    loading,
    error,
    loadOlder,
    selectionMode,
    isSelected,
    toggleSelectMessage,
    onMessageClick,
    startReply,
    scrollToMessage,
    reactToMessage,
    setReactionPicker,
    onOpenContextMenu,
    containerRef,
    bottomRef,
    onRetryMessage,
    sendChunk,
  } = props;

  /* ---------- dedup ---------- */
  const dedupedMessages = useChatDedup(messages);

  /* ---------- scroll ---------- */
  const { showScrollBottom, scrollToBottom } = useChatScroll({
    containerRef,
    loadOlder,
    loading,
    deps: [dedupedMessages.length],
  });

  /* ---------- gestures ---------- */
  const openQuickEmojiRow = (msg: ChatMessage, x: number, y: number) => {
    setReactionPicker({
      open: true,
      message: msg,
      x: Math.max(16, Math.min(window.innerWidth - 16, x)),
      y: Math.max(70, Math.min(window.innerHeight - 16, y)),
    });
  };

  const { swipeDx, bindGestureHandlers } = useChatGestures({
    selectionMode,
    toggleSelectMessage,
    startReply,
    openQuickEmojiRow,
    reactQuick: (msg) => reactToMessage(msg, "❤️"),
  });

  /* ---------- retry ---------- */
  const { retryMessage, autoRetryFailed, isRetrying } = useChatRetry({
    onRetryMessage,
    sendChunk,
  });

  useEffect(() => {
    autoRetryFailed(dedupedMessages);
  }, [dedupedMessages, autoRetryFailed]);

  /* ---------- seen ---------- */
  useChatSeen(containerRef, [dedupedMessages.length]);

  /* ---------- reactions ---------- */
  const { bursts, triggerBurst } = useReactionBurst();

  const {
    open: summaryOpen,
    message: summaryMessage,
    openSummary,
    closeSummary,
  } = useReactionSummary();

  /* ---------------- render ---------------- */

  return (
    <div className={styles.messagesWrap}>
      <div ref={containerRef} className={styles.messages}>
        {loading && (
          <div className={styles.center}>
            <FiLoader className={styles.spin} />
          </div>
        )}

        {error && <div className={styles.center}>{error}</div>}

        {!loading &&
          !error &&
          dedupedMessages.map((msg) => {
            const translateX = swipeDx[msg.id] ?? 0;
            const selected = isSelected(msg.id);
            const reactions: ChatReaction[] = msg.reactions ?? [];

            return (
              <div
                key={msg.id}
                data-msg-id={msg.id}
                data-created-at={msg.createdAt}
                {...bindGestureHandlers(msg)}
                className={[
                  styles.message,
                  msg.isMine ? styles.mine : styles.theirs,
                ].join(" ")}
                data-selected={selected ? "1" : "0"}
                style={{
                  transform:
                    translateX > 0 && !selectionMode
                      ? `translateX(${Math.min(translateX, 42)}px)`
                      : undefined,
                }}
                onClick={(e) => {
                  if (bindGestureHandlers(msg).consumeClickIfGesture(e)) return;
                  if (!selectionMode) return;
                  onMessageClick(e, msg);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  selectionMode
                    ? toggleSelectMessage(msg.id)
                    : onOpenContextMenu(
                        { x: e.clientX, y: e.clientY },
                        msg
                      );
                }}
              >
                {/* reply preview */}
                {msg.replyTo?.id && (
                  <button
                    className={styles.replyPreviewBubble}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToMessage(msg.replyTo!.id);
                    }}
                  >
                    <span className={styles.replySender}>
                      {msg.replyTo.senderName}
                    </span>
                    <span className={styles.replyText}>
                      {msg.replyTo.text || "[message]"}
                    </span>
                  </button>
                )}

                {/* text */}
                {msg.text && <p className={styles.text}>{msg.text}</p>}

                {/* reactions */}
                {reactions.length > 0 && (
                  <div
                    className={styles.reactionsRow}
                    onClick={(e) => {
                      e.stopPropagation();
                      openSummary(msg);
                    }}
                  >
                    {reactions.map((r) => (
                      <button
                        key={r.emoji}
                        className={[
                          styles.reactionChip,
                          msg.myReaction === r.emoji
                            ? styles.reactionChipMine
                            : "",
                        ].join(" ")}
                        onClick={(e) => {
                          e.stopPropagation();

                          triggerBurst(
                            r.emoji,
                            e.currentTarget.getBoundingClientRect()
                          );

                          reactToMessage(
                            msg,
                            msg.myReaction === r.emoji ? "" : r.emoji
                          );
                        }}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* meta */}
                <div className={styles.metaRow}>
                  <span className={styles.time}>
                    {formatTime(msg.createdAt)}
                  </span>

                  {msg.isMine && msg.status === "sending" && (
                    <FiClock className={styles.tickPending} />
                  )}

                  {msg.isMine && msg.status === "sent" && (
                    <FiCheck className={styles.tickSingle} />
                  )}

                  {msg.isMine && msg.status === "delivered" && (
                    <span className={styles.tickDouble}>
                      <FiCheck />
                      <FiCheck />
                    </span>
                  )}

                  {msg.isMine && msg.status === "seen" && (
                    <span className={styles.tickDoubleSeen}>
                      <FiCheck />
                      <FiCheck />
                    </span>
                  )}

                  {msg.isMine &&
                    msg.status === "failed" &&
                    !isRetrying(msg) && (
                      <button
                        className={styles.failedBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          retryMessage(msg);
                        }}
                      >
                        <FiAlertCircle />
                      </button>
                    )}

                {msg.reactions?.length > 0 && (
                  <div className={styles.reactionSummary}>
                    {msg.reactions.map((r) => {
                      const mine = r.userIds.includes(myUserId);
                      return (
                        <button
                          key={r.emoji}
                          className={mine ? styles.mineReaction : ""}
                          onClick={() => reactToMessage(msg, r.emoji)}
                        >
                          {r.emoji} {r.userIds.length}
                        </button>
                      );
                    })}
                  </div>
                )}

                </div>
              </div>
            );
          })}

        <div ref={bottomRef} />
      </div>

      {showScrollBottom && (
        <button
          className={styles.scrollToBottomBtn}
          onClick={() => scrollToBottom(true)}
        >
          <FiChevronDown />
        </button>
      )}

      {/* floating emoji bursts */}
      {bursts.map((b) => (
        <span
          key={b.id}
          className={styles.reactionBurst}
          style={{ left: b.x, top: b.y }}
        >
          {b.emoji}
        </span>
      ))}

      {/* reaction summary */}
      {summaryOpen && summaryMessage && (
        <div className={styles.reactionSummaryOverlay} onClick={closeSummary}>
          <div
            className={styles.reactionSummaryCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h4>Reactions</h4>
            {(summaryMessage.reactions ?? []).map((r) => (
              <div key={r.emoji} className={styles.reactionSummaryRow}>
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
