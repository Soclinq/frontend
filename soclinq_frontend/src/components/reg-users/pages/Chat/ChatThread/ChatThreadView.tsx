"use client";

import React from "react";

/* ================= Types ================= */
import type { ChatMessage } from "@/types/chat";

/* ================= UI Components ================= */
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatTypingBar from "./ChatTypingBar";
import ChatFooter from "./ChatFooter";
import ReplyBar from "./ReplyBar";

import ChatContextMenu from "./ChatContextMenu";
import ChatReactionQuickRow from "./ChatReactionQuickRow";
import ChatEmojiMartPopup from "./ChatEmojiMartPopup";
import ChatMessageInfoModal from "./ChatMessageInfoModal";
import ChatDeleteSheet from "./ChatDeleteSheet";
import ChatForwardPicker from "./ChatForwardPicker";
import CameraModal from "./CameraModal";

/* ================= Styles ================= */
import styles from "./styles/ChatPanel.module.css";

/* ================= Model ================= */
type ChatThreadViewModel = {
  thread: {
    guardLoading: boolean;
    data: {
      messages: ChatMessage[];
      loading: boolean;
      error: string | null;
      unreadCount: number;
      online: boolean;
    };
    actions: any;
    ws: any;
  };

  composer: {
    input: string;
    setInput: (v: string) => void;
    attachments: File[];
    setAttachments: (f: File[]) => void;
    replyTo: ChatMessage | null;
    cancelReply: () => void;
    editingId: string | null;
    send: () => Promise<void>;
    sendVoice: (file: File) => Promise<void>;
  };

  overlays: {
    active: string | null;
    data: any;
    isOpen: (type: any) => boolean;
    close: () => void;

    openContextMenu: (m: ChatMessage, p: { x: number; y: number }) => void;
    openReactionPicker: (m: ChatMessage, p: { x: number; y: number }) => void;
    openEmojiMart: (m: ChatMessage, p: { x: number; y: number }) => void;
    openCamera: () => void;
    openDeleteSheet: (m: ChatMessage) => void;
    openForwardSheet: (m: ChatMessage[]) => void;
  };

  view: {
    messages: ChatMessage[];
    scroll: {
      isAtBottom: boolean;
      showScrollToBottom: boolean;
      scrollToBottom: () => void;
      onUserScroll: () => void;
    };
    viewport: {
      visibleMessageIds: string[];
    };
  };

  refs: {
    containerRef: React.RefObject<HTMLDivElement>;
    bottomRef: React.RefObject<HTMLDivElement>;
    inputRef: React.RefObject<HTMLInputElement>;
  };
};

type Props = {
  model: ChatThreadViewModel;
};

/* ================= COMPONENT ================= */

export default function ChatThreadView({ model }: Props) {
  const { thread, composer, overlays, view, refs } = model;

  if (thread.guardLoading) {
    return null;
  }

  return (
    <div className={styles.chat} ref={refs.containerRef}>
      {/* ================= HEADER ================= */}
      <ChatHeader
        online={thread.data.online}
        unreadCount={thread.data.unreadCount}
      />

      {/* ================= MESSAGES ================= */}
      <ChatMessages
        messages={view.messages}
        loading={thread.data.loading}
        error={thread.data.error}
        onScroll={view.scroll.onUserScroll}
        onOpenContextMenu={(pos, msg) =>
          overlays.openContextMenu(msg, pos)
        }
        onOpenReaction={(pos, msg) =>
          overlays.openReactionPicker(msg, pos)
        }
        onOpenEmojiPicker={(pos, msg) =>
          overlays.openEmojiMart(msg, pos)
        }
        bottomRef={refs.bottomRef}
      />

      {/* ================= TYPING ================= */}
      <ChatTypingBar />

      {/* ================= REPLY BAR ================= */}
      {composer.replyTo && (
        <ReplyBar
          replyTo={composer.replyTo}
          onCancel={composer.cancelReply}
          onJump={(id) =>
            document
              .getElementById(`msg-${id}`)
              ?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
          }
        />
      )}

      {/* ================= SCROLL TO BOTTOM ================= */}
      {view.scroll.showScrollToBottom && (
        <button
          className={styles.scrollToBottom}
          onClick={view.scroll.scrollToBottom}
        >
          ↓
        </button>
      )}

      {/* ================= FOOTER / COMPOSER ================= */}
      <ChatFooter
        input={composer.input}
        setInput={composer.setInput}
        attachments={composer.attachments}
        setAttachments={composer.setAttachments}
        onSend={composer.send}
        onSendVoice={composer.sendVoice}
        inputRef={refs.inputRef}
      />

      {/* ================= OVERLAYS ================= */}

      {/* Context Menu */}
      {overlays.isOpen("CONTEXT_MENU") && (
        <ChatContextMenu
          {...overlays.data}
          onClose={overlays.close}
        />
      )}

      {/* Reaction Picker */}
      {overlays.isOpen("REACTION_PICKER") && (
        <ChatReactionQuickRow
          {...overlays.data}
          onClose={overlays.close}
        />
      )}

      {/* Emoji Mart */}
      {overlays.isOpen("EMOJI_MART") && (
        <ChatEmojiMartPopup
          {...overlays.data}
          onClose={overlays.close}
        />
      )}

      {/* Camera */}
      {overlays.isOpen("CAMERA") && (
        <CameraModal onClose={overlays.close} />
      )}

      {/* Delete Sheet */}
      {overlays.isOpen("DELETE") && (
        <ChatDeleteSheet
          {...overlays.data}
          onClose={overlays.close}
        />
      )}

      {/* Forward Picker */}
      {overlays.isOpen("FORWARD") && (
        <ChatForwardPicker
          {...overlays.data}
          onClose={overlays.close}
        />
      )}

      {/* Message Info */}
      {overlays.isOpen("INFO") && (
        <ChatMessageInfoModal
          {...overlays.data}
          onClose={overlays.close}
        />
      )}
    </div>
  );
}
