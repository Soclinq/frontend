"use client";

import styles from "./styles/ChatView.module.css";

import { communityChatAdapter } from "@/lib/communityAdapter";
import { privateChatAdapter } from "@/lib/privateAdapter";

import ChatThreadContainer from "../../ChatThread/ChatThreadContainer";
type ChatMode = "COMMUNITY" | "PRIVATE";

interface Props {
  mode: ChatMode;
  groupId?: string;
  conversationId?: string;

  onSelectionChange?: (payload: {
    active: boolean;
    count: number;

    onExit: () => void;
    onSelectAll: () => void;
    onUnselectAll: () => void;

    onForward: () => void;
    onShare: () => void;
    onDelete: () => void;
  }) => void;
}

export default function ChatView({
  mode,
  groupId,
  conversationId,
  onSelectionChange,
}: Props) {
  const threadId = mode === "COMMUNITY" ? groupId : conversationId;

  if (!threadId) return null;

  const adapter = mode === "COMMUNITY" ? communityChatAdapter : privateChatAdapter;

  return (
    <div className={styles.chatContainer}>
      <ChatThreadContainer
        threadId={threadId}
        adapter={adapter}
      />
    </div>
  );
}
