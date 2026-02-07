"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { ActiveChat, Mode } from "./state.types";
import type { SelectionState } from "./selection.types";

type ChatUIContextValue = {
  mode: Mode;
  activeChat: ActiveChat;

  inboxSearch: string;
  newChatSearch: string;

  selection: SelectionState;

  setInboxSearch(v: string): void;
  setNewChatSearch(v: string): void;

  openChat(chat: ActiveChat): void;
  openNewChat(): void;
  closeNewChat(): void;
  goHome(): void;

  setSelection(s: SelectionState): void;
};

const ChatUIContext = createContext<ChatUIContextValue | null>(null);

export function ChatUIProvider({ children }: { children: React.ReactNode }) {
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const [inboxSearch, setInboxSearch] = useState("");
  const [newChatSearch, setNewChatSearch] = useState("");

  const [selection, setSelection] = useState<SelectionState>({
    active: false,
    count: 0,
  });

  const mode: Mode = newChatOpen
    ? "NEW_CHAT"
    : activeChat
    ? "CHAT"
    : "INBOX";

  const resetSelection = () =>
    setSelection({ active: false, count: 0 });

  const value = useMemo(
    () => ({
      mode,
      activeChat,

      inboxSearch,
      newChatSearch,

      selection,

      setInboxSearch,
      setNewChatSearch,

      openChat(chat: ActiveChat) {
        setActiveChat(chat);
        setNewChatOpen(false);
        resetSelection();
      },

      openNewChat() {
        setNewChatOpen(true);
        setNewChatSearch("");
        resetSelection();
      },

      closeNewChat() {
        setNewChatOpen(false);
        setNewChatSearch("");
        resetSelection();
      },

      goHome() {
        setActiveChat(null);
        setNewChatOpen(false);
        resetSelection();
      },

      setSelection,
    }),
    [mode, activeChat, inboxSearch, newChatSearch, selection]
  );

  return (
    <ChatUIContext.Provider value={value}>
      {children}
    </ChatUIContext.Provider>
  );
}

export function useChatUI() {
  const ctx = useContext(ChatUIContext);
  if (!ctx) {
    throw new Error("useChatUI must be used inside ChatUIProvider");
  }
  return ctx;
}
