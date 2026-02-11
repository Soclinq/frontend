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

import type { ChatMessage, ChatReaction } from "@/types/chat";

import { useChatScroll } from "@/hooks/ChatThread/useChatScroll";
import { useChatGestures } from "@/hooks/ChatThread/useChatGestures";
import { useChatRetry } from "@/hooks/useChatRetry";
import { useChatSeen } from "@/hooks/ChatThread/useChatSeen";
import { useChatDedup } from "@/hooks/ChatThread/useChatDedup";
import { useReactionBurst } from "@/hooks/useReactionBurst";
import { useReactionSummary } from "@/hooks/useReactionSummary";

/* ---------------- Helpers ---------------- */

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

/* ---------------- Props ---------------- */

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;

  containerRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  loadOlder?: () => void;

  selection: {
    active: boolean;
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
  } | null;

  onReply: (msg: ChatMessage) => void;
  onContextMenu: (
    pos: { x: number; y: number },
    msg: ChatMessage
  ) => void;
  onReact: (msg: ChatMessage, emoji: string) => void;

  onRetryMessage?: (msg: ChatMessage) => Promise<void>;
  sendChunk?: (opts: any) => Promise<void>;
};


/* ---------------- Component ---------------- */

export default function ChatMessages({
  messages,
  loading,
  error,
  containerRef,
  bottomRef,
  loadOlder,
  selection,
  onReply,
  onContextMenu,
  onReact,
  onRetryMessage,
  sendChunk,
}: Props) {
  /* ---------- data hygiene ---------- */
  const dedupedMessages = useChatDedup(messages);

  /* ---------- scroll ---------- */
  const { showScrollBottom, scrollToBottom } = useChatScroll({
    containerRef,
    loadOlder,
    loading,
    deps: [dedupedMessages.length],
  });

  /* ---------- gestures ---------- */
  const { swipeDx, bindGestureHandlers } = useChatGestures({
    selectionMode: !!selection,
    toggleSelectMessage: (id) => selection?.toggle(id),
    startReply: onReply,
    reactQuick: (msg) => onReact(msg, "❤️"),
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
  const { open, message, openSummary, closeSummary } =
    useReactionSummary();

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
            const selected = selection?.isSelected(msg.id) ?? false;
            const translateX = swipeDx[msg.id] ?? 0;
            const reactions: ChatReaction[] = msg.reactions ?? [];

            return (
              <div
                key={msg.id}
                {...bindGestureHandlers(msg)}
                className={[
                  styles.message,
                  msg.isMine ? styles.mine : styles.theirs,
                  selected ? styles.selected : "",
                ].join(" ")}
                style={{
                  transform:
                    translateX > 0 && !selection
                      ? `translateX(${Math.min(translateX, 42)}px)`
                      : undefined,
                }}
                onClick={(e) => {
                  if (bindGestureHandlers(msg).consumeClickIfGesture(e))
                    return;

                  if (selection) {
                    selection.toggle(msg.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  selection
                    ? selection.toggle(msg.id)
                    : onContextMenu(
                        { x: e.clientX, y: e.clientY },
                        msg
                      );
                }}
              >
                {/* reply preview */}
                {msg.replyTo && (
                  <div className={styles.replyPreview}>
                    <span className={styles.replySender}>
                      {msg.replyTo.senderName}
                    </span>
                    <span className={styles.replyText}>
                      {msg.replyTo.text ?? "[message]"}
                    </span>
                  </div>
                )}

                {msg.text && <p className={styles.text}>{msg.text}</p>}

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
                        className={styles.reactionChip}
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerBurst(
                            r.emoji,
                            e.currentTarget.getBoundingClientRect()
                          );
                          onReact(
                            msg,
                            msg.myReaction === r.emoji ? "" : r.emoji
                          );
                        }}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}

                <div className={styles.metaRow}>
                  <span className={styles.time}>
                    {formatTime(msg.createdAt)}
                  </span>

                  {msg.isMine && msg.status === "sending" && (
                    <FiClock />
                  )}

                  {msg.isMine && msg.status === "sent" && <FiCheck />}

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

      {bursts.map((b) => (
        <span
          key={b.id}
          className={styles.reactionBurst}
          style={{ left: b.x, top: b.y }}
        >
          {b.emoji}
        </span>
      ))}

      {open && message && (
        <div className={styles.reactionSummaryOverlay} onClick={closeSummary}>
          <div
            className={styles.reactionSummaryCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h4>Reactions</h4>
            {message.reactions?.map((r) => (
              <div key={r.emoji} className={styles.reactionSummaryRow}>
                {r.emoji} {r.count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
