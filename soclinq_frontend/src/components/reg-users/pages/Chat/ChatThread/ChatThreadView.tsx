"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { ChatMessage } from "@/types/chat";
import { useChatUI } from "../Inbox/state/ChatUIContext";
import ChatHeader from "./components/ChatHeader";
import ChatMessages from "./components/ChatMessages";
import ChatTypingBar from "./components/ChatTypingBar";
import ChatFooter from "./components/ChatFooter";
import ReplyBar from "./components/ReplyBar";
import ChatReactionQuickRow from "./components/ChatReactionQuickRow";
import ChatEmojiMartPopup from "./components/ChatEmojiMartPopup";
import ChatMessageInfoModal from "./components/ChatMessageInfoModal";
import ChatDeleteSheet from "./components/ChatDeleteSheet";
import ChatForwardPicker from "./components/ChatForwardPicker";
import CameraModal from "./components/CameraModal";
import ChatAudioRecorder from "./components/ChatAudioRecorder";
import styles from "./components/styles/ChatPanel.module.css";
import { useChatClipboard } from "@/hooks/ChatThread/useChatClipboard";

/* ================= TYPES ================= */

type Props = {
  model: {
    thread: any;
    composer: any;
    overlays: any;
    view: any;
    ui?: {
      selection: {
        active: boolean;
        ids: Set<string>;
        count: number;
        toggle: (id: string) => void;
        enter: (id: string) => void;   // ✅ ADD
        clear: () => void;
      } | null;
      startReply: (id: string) => void;
    };    
    refs: {
      containerRef: React.RefObject<HTMLDivElement | null>;
      bottomRef: React.RefObject<HTMLDivElement | null>;
      inputRef: React.RefObject<HTMLInputElement | null>;
    };
  };
};


/* ================= COMPONENT ================= */

export default function ChatThreadView({ model }: Props) {
  const chatUI = useChatUI();
  const { thread, composer, overlays, view, ui, refs } = model;

  const currentUserId = thread.currentUser?.id;

  if (thread.guardLoading) return null;

  const selectedMessages: ChatMessage[] = ui?.selection
    ? view.messages.filter((m: ChatMessage) =>
        ui?.selection!.ids.has(m.id)
      )
    : [];

  const { copy } = useChatClipboard();

  const selection = ui?.selection;
  const [recordingActive, setRecordingActive] = useState(false);
  const hasText = composer.input.trim().length > 0;
  const hasAttachments = composer.attachments.length > 0;

  const shouldShowAudioRecorder =
    !hasText &&
    !hasAttachments

 const selectionMode = selection?.active ?? false;

 const rawSelection = ui?.selection;

 const headerSelection =
 rawSelection && rawSelection.active && rawSelection.count > 0
   ? rawSelection
   : null;




  return (
    <div className={styles.chat} ref={refs.containerRef}>
      {/* ================= HEADER ================= */}
      <ChatHeader
          title={thread.ws.chatName ?? "Chat"}
          avatarUrl={thread.ws.avatarUrl}
          subtitle={thread.data.online ? "Online" : thread.ws.lastSeen}
          isGroup={thread.ws.isGroup}
          onlineCount={thread.ws.onlineCount}
          members={thread.ws.members}
          showBack
          onBack={chatUI.goHome}
          onCall={thread.ws.startCall}
          onViewContact={() => thread.ws.openProfile?.()}
          onSearch={overlays.openSearch}
          onToggleMute={thread.ws.toggleMute}
          onViewGroupInfo={overlays.openGroupInfo}
          onGroupMedia={overlays.openGroupMedia}

          selection={
            headerSelection
              ? {
                  active: true,
                  count: headerSelection.count,
          
                  onExit: headerSelection.clear,
                  onUnselectAll: headerSelection.clear,
          
                  canReply: headerSelection.count === 1,
                  onReply: () =>
                    ui!.startReply([...headerSelection.ids][0]),
          
                  onCopy: () => copy(selectedMessages),
                  onForward: () =>
                    overlays.openForwardSheet(selectedMessages),
                  onDelete: () =>
                    overlays.openDeleteSheet(selectedMessages[0]),
          
                  /* ✅ MESSAGE INFO */
                  canInfo: headerSelection.count === 1,
                  onInfo: () =>
                    overlays.openInfoModal(selectedMessages[0]),  // ✅ KEY LINE
                }
              : undefined
          }
          
        />

        {shouldShowAudioRecorder && (
          <ChatAudioRecorder
            disabled={!thread.data.online}
            onSend={(file) => composer.sendVoice(file)}
            onActiveChange={(active) => {
              setRecordingActive(active);
            }}
          />
        )}


      {/* ================= MESSAGES ================= */}
      <ChatMessages
  messages={view.messages}
  currentUserId={currentUserId}
  loading={thread.data.loading}
  error={thread.data.error}
  containerRef={refs.containerRef}
  bottomRef={refs.bottomRef}
  selectionMode={selectionMode}

  selection={
    selection
      ? {
          isSelected: (id: string) => selection.ids.has(id),
          toggle: selection.toggle,
          enter: selection.enter, // ✅ REQUIRED
        }
      : null
  }

  onReply={(msg) => ui?.startReply(msg.id)}
  onReact={(msg, emoji) =>
    thread.actions.reactions.react(msg, emoji)
  }
/>



      {/* ================= TYPING ================= */}
{/* ================= TYPING ================= */}
      {thread.data.typingUsers?.length > 0 && (
        <ChatTypingBar typingUsers={thread.data.typingUsers} />
      )}

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

      {/* ================= FOOTER ================= */}
      {!recordingActive && (
        <ChatFooter
          input={composer.input}
          setInput={composer.setInput}
          attachments={composer.attachments}
          setAttachments={composer.setAttachments}
          onSend={composer.send}
          onOpenCamera={() => overlays.openCamera()}
          inputRef={refs.inputRef}
        />
      )}


      {overlays.isOpen("REACTION_PICKER") && (
        <ChatReactionQuickRow {...overlays.data} onClose={overlays.close} />
      )}

      {overlays.isOpen("EMOJI_MART") && (
        <ChatEmojiMartPopup {...overlays.data} onClose={overlays.close} />
      )}

        {overlays.isOpen("CAMERA") && (
          <CameraModal
            onClose={overlays.close}
            onSend={async ({ files, caption }) => {
              // forward into composer
              for (const file of files) {
                await composer.sendVoice(file); // OR composer.sendMedia(file, caption)
              }
            }}
          />
        )}


      {overlays.isOpen("DELETE") && (
        <ChatDeleteSheet {...overlays.data} onClose={overlays.close} />
      )}

      {overlays.isOpen("FORWARD") && (
        <ChatForwardPicker {...overlays.data} onClose={overlays.close} />
      )}

        {overlays.isOpen("INFO") && (
          <ChatMessageInfoModal {...overlays.data} onClose={overlays.close} />
        )}

    </div>
  );
}
