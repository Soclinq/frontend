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

/* ---------------- Hooks ---------------- */
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

/* ---------------- Props (NEW API) ---------------- */

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  currentUserId: string;

  selectionMode: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;  

  selection: {
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    enter: (id: string) => void; // ✅ ADD THIS
  } | null;
  

  onReply: (msg: ChatMessage) => void;
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
  currentUserId,
  bottomRef,
  selection,
  onReply,
  onReact,
  selectionMode,
  
  onRetryMessage,
  sendChunk,
}: Props) {
  /* ---------- data hygiene ---------- */
  const dedupedMessages = useChatDedup(messages);

  /* ---------- scroll ---------- */
  const { showScrollBottom, scrollToBottom } = useChatScroll({
    containerRef,
    loading,
    deps: [dedupedMessages.length],
  });

  /* ---------- gestures ---------- */
  const { swipeDx, bindGestureHandlers } = useChatGestures({
    selectionMode, 
    toggleSelectMessage: selection?.toggle ?? (() => {}),
    startSelection: selection?.enter,
    startReply: onReply,
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

  function computeSeen(
    msg: ChatMessage,
    currentUserId: string,
    isGroup?: boolean
  ): boolean
   {
    if (!msg.isMine) return false;
  
    const seenBy = msg.seenBy ?? {};
  
    const otherSeenUsers = Object.keys(seenBy).filter(
      id => String(id) !== String(currentUserId)
    );
  
    if (!isGroup) {
      /* Private chat → any other user seen */
      return otherSeenUsers.length > 0;
    }
  
    /* Group chat → require everyone except sender */
    const memberCount = msg.threadMeta?.memberCount ?? 0;
    if (isGroup && memberCount <= 1) return false;
  
    return otherSeenUsers.length >= memberCount - 1;
  }
  
  console.log(
    "[ChatMessages] render",
    messages.map(m => ({
      id: m.id,
      temp: m.clientTempId,
      text: m.text
    }))
  );
  
  return (
    <div className={styles.messagesWrap}>
      <div ref={containerRef} className={styles.messages}  onContextMenu={(e) => e.preventDefault()}>
        {loading && (
          <div className={styles.center}>
            <FiLoader className={styles.spin} />
          </div>
        )}

        {error && <div className={styles.center}>{error}</div>}

        {!loading &&
          !error &&
          dedupedMessages.map((msg) => {
            const seen = computeSeen(
              msg,
              currentUserId,
              msg.threadMeta?.isGroup ?? false
            );
            
            
            const selected = selection?.isSelected(msg.id) ?? false;
            const translateX = swipeDx[msg.id] ?? 0;
            const reactions: ChatReaction[] = msg.reactions ?? [];
            const {
              consumeClickIfGesture,
              ...gestureHandlers
            } = bindGestureHandlers(msg);
            
            return (
              <div
                  key={msg.id}
                  {...gestureHandlers} // ✅ only real DOM handlers
                  className={[
                    styles.message,
                    msg.isMine ? styles.mine : styles.theirs,
                    selected ? styles.selectedMsg : "",
                  ].join(" ")}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{
                    transform:
                      translateX > 0 && !selection
                        ? `translateX(${Math.min(translateX, 42)}px)`
                        : undefined,
                  }}
                  onClick={(e) => {
                    if (consumeClickIfGesture(e)) return;

                    if (selection) {
                      selection.toggle(msg.id);
                    }
                  }}
                >

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
                      <FiClock className={styles.tickClock} />
                    )}

                    {msg.isMine && msg.status === "sent" && !seen && (
                      <FiCheck className={styles.tickSent} />
                    )}

                    {msg.isMine && msg.status === "delivered" && !seen && (
                      <span className={styles.doubleTickDelivered}>
                        <FiCheck />
                        <FiCheck />
                      </span>
                    )}

                    {msg.isMine && seen && (
                      <span className={styles.doubleTickSeen}>
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
