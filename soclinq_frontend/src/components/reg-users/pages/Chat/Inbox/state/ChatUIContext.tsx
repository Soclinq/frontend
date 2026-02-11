"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

import type { ActiveChat, Mode, LGAGroupBlock } from "./state.types";
import type { SelectionState } from "./selection.types";
import type { CreateHubPayload } from "../components/CreateHubModal";
import { authFetch } from "@/lib/authFetch";

/* ================= TYPES ================= */

type InboxReloadFn = () => void;

type ChatUIContextValue = {
  /* ---------- Mode / Navigation ---------- */
  mode: Mode;
  activeChat: ActiveChat;

  openChat(chat: ActiveChat): void;
  openNewChat(): void;
  closeNewChat(): void;
  goHome(): void;
  changeLGAOpen: boolean;
  openChangeLGA(): void;
  closeChangeLGA(): void;


  

  /* ---------- Search ---------- */
  inboxSearch: string;
  newChatSearch: string;
  setInboxSearch(v: string): void;
  setNewChatSearch(v: string): void;

  /* ---------- Selection ---------- */
  selection: SelectionState;
  setSelection(s: SelectionState): void;
  resetSelection(): void;

  /* ---------- Inbox / Reload ---------- */
  registerInboxReload(fn: InboxReloadFn): void;
  refreshInbox(): void;

  /* ---------- LGA / Groups ---------- */
  lgaGroups: LGAGroupBlock[];
  currentLGA: LGAGroupBlock | null;
  setInboxLGAs(blocks: LGAGroupBlock[], resolvedId?: string): void;
  setCurrentLGAById(id: string): void;

  /* ---------- Create Hub ---------- */
  createHubOpen: boolean;
  creatingHub: boolean;
  openCreateHub(): void;
  closeCreateHub(): void;
  createHub(payload: CreateHubPayload): Promise<void>;
};

/* ================= CONTEXT ================= */

const ChatUIContext = createContext<ChatUIContextValue | null>(null);

/* ================= PROVIDER ================= */

export function ChatUIProvider({ children }: { children: React.ReactNode }) {
  /* ---------- Navigation ---------- */
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const mode: Mode = newChatOpen
    ? "NEW_CHAT"
    : activeChat
    ? "CHAT"
    : "INBOX";

  /* ---------- Search ---------- */
  const [inboxSearch, setInboxSearch] = useState("");
  const [newChatSearch, setNewChatSearch] = useState("");

  /* ---------- Selection ---------- */
  const [selection, setSelection] = useState<SelectionState>({
    active: false,
    count: 0,
  });

  const resetSelection = useCallback(() => {
    setSelection({ active: false, count: 0 });
  }, []);

  /* ---------- Inbox Reload ---------- */
  const inboxReloadRef = useRef<InboxReloadFn | null>(null);

  const registerInboxReload = useCallback((fn: InboxReloadFn) => {
    inboxReloadRef.current = fn;
  }, []);

  const refreshInbox = useCallback(() => {
    inboxReloadRef.current?.();
  }, []);

  /* ---------- LGA / Groups ---------- */
  const [lgaGroups, setLgaGroups] = useState<LGAGroupBlock[]>([]);
  const [currentLGA, setCurrentLGA] = useState<LGAGroupBlock | null>(null);

  const setInboxLGAs = useCallback(
    (blocks: LGAGroupBlock[], resolvedId?: string) => {
      setLgaGroups(blocks);

      if (!blocks.length) {
        setCurrentLGA(null);
        return;
      }

      const resolved =
        (resolvedId && blocks.find((b) => b.lga.id === resolvedId)) ||
        blocks[0];

      setCurrentLGA(resolved ?? null);
    },
    []
  );

  const setCurrentLGAById = useCallback(
    (id: string) => {
      const found = lgaGroups.find((b) => b.lga.id === id);
      if (found) setCurrentLGA(found);
    },
    [lgaGroups]
  );

  /* ---------- Create Hub ---------- */
  const [createHubOpen, setCreateHubOpen] = useState(false);
  const [creatingHub, setCreatingHub] = useState(false);

  const openCreateHub = () => setCreateHubOpen(true);
  const closeCreateHub = () => setCreateHubOpen(false);

  const createHub = async (payload: CreateHubPayload) => {
    try {
      setCreatingHub(true);

      const form = new FormData();
      form.append("name", payload.name);
      form.append("category", payload.category);
      if (payload.description) form.append("description", payload.description);
      if (payload.coverImage) form.append("cover", payload.coverImage);

      const res = await authFetch("/communities/create/", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Failed to create hub");

      closeCreateHub();
      refreshInbox();
    } finally {
      setCreatingHub(false);
    }
  };

  /* ---------- Navigation Actions ---------- */
  const openChat = useCallback((chat: ActiveChat) => {
    setActiveChat(chat);
    setNewChatOpen(false);
    resetSelection();
  }, [resetSelection]);

  /* ---------- Change LGA ---------- */
const [changeLGAOpen, setChangeLGAOpen] = useState(false);

const openChangeLGA = () => {
  setChangeLGAOpen((prev) => {
    if (prev) return prev; // 🔒 already open → do nothing
    return true;
  });
};
const closeChangeLGA = () => setChangeLGAOpen(false);


  const openNewChat = useCallback(() => {
    setNewChatOpen(true);
    setNewChatSearch("");
    resetSelection();
  }, [resetSelection]);

  const closeNewChat = useCallback(() => {
    setNewChatOpen(false);
    setNewChatSearch("");
    resetSelection();
  }, [resetSelection]);

  const goHome = useCallback(() => {
    setActiveChat(null);
    setNewChatOpen(false);
    resetSelection();
  }, [resetSelection]);

  /* ---------- Memo ---------- */
  const value = useMemo<ChatUIContextValue>(
    () => ({
      mode,
      activeChat,

      openChat,
      openNewChat,
      closeNewChat,
      goHome,
      changeLGAOpen,
      openChangeLGA,
      closeChangeLGA,


      inboxSearch,
      newChatSearch,
      setInboxSearch,
      setNewChatSearch,

      selection,
      setSelection,
      resetSelection,

      registerInboxReload,
      refreshInbox,

      lgaGroups,
      currentLGA,
      setInboxLGAs,
      setCurrentLGAById,

      createHubOpen,
      creatingHub,
      openCreateHub,
      closeCreateHub,
      createHub,
    }),
    [
      mode,
      activeChat,
      inboxSearch,
      newChatSearch,
      selection,
      lgaGroups,
      currentLGA,
      createHubOpen,
      creatingHub,
      changeLGAOpen, 
      openChat,
      openNewChat,
      closeNewChat,
      goHome,
      resetSelection,
      registerInboxReload,
      refreshInbox,
      setInboxLGAs,
      setCurrentLGAById,
    ]
  );

  return (
    <ChatUIContext.Provider value={value}>
      {children}
    </ChatUIContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useChatUI() {
  const ctx = useContext(ChatUIContext);
  if (!ctx) {
    throw new Error("useChatUI must be used within ChatUIProvider");
  }
  return ctx;
}
