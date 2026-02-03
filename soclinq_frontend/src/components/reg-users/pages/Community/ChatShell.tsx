"use client";

import { useMemo, useRef, useState } from "react";

import UnifiedHeader from "./UnifiedHeader";
import NewChatFab from "./NewChatFab";

import GroupsContainer, { type ActiveChat, type LGAGroupBlock } from "./GroupsContainer";
import ChatView from "./ChatView";
import ChangeLGAModal from "./ChangeLGAModal";

// ✅ NEW
import NewChatPicker from "./NewChatPicker";

import { authFetch } from "@/lib/authFetch";

type SelectionKind = "GROUP_ONLY" | "PRIVATE_ONLY" | "MIXED";

/** ✅ NEW: add NEW_CHAT */
type UnifiedSelectionContext = "CHAT" | "INBOX" | "NEW_CHAT";

type UnifiedSelectionState = {
  active: boolean;
  count: number;

  context?: UnifiedSelectionContext;

  // ✅ inbox meta
  kind?: SelectionKind;
  canDelete?: boolean;
  markLabel?: string;

  // required
  onExit?: () => void;

  // generic
  onSelectAll?: () => void;
  onUnselectAll?: () => void;

  // CHAT actions (message selection)
  onForward?: () => void;
  onShare?: () => void;

  // INBOX actions (chat list selection)
  onPin?: () => void;
  onMute?: () => void;
  onArchive?: () => void;
  onMarkReadUnread?: () => void;

  onShareGroup?: () => void;
  onOpenGroupInfo?: () => void;
  onExitGroup?: () => void;

  onViewContact?: () => void;
  onBlockContact?: () => void;

  onDelete?: () => void;
};

export default function ChatShell() {
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);

  /** ✅ Split searches: inbox search vs new chat search */
  const [inboxSearch, setInboxSearch] = useState("");
  const [newChatSearch, setNewChatSearch] = useState("");

  const [lgaGroups, setLgaGroups] = useState<LGAGroupBlock[]>([]);
  const [currentLGA, setCurrentLGA] = useState<LGAGroupBlock | null>(null);

  const [changeLGAModalOpen, setChangeLGAModalOpen] = useState(false);
  const [createHubModalOpen, setCreateHubModalOpen] = useState(false);

  /** ✅ NEW */
  const [newChatOpen, setNewChatOpen] = useState(false);

  /** ✅ NEW: unified header mode */
  const mode = newChatOpen ? "NEW_CHAT" : activeChat ? "CHAT" : "INBOX";

  const [selection, setSelection] = useState<UnifiedSelectionState>({
    active: false,
    count: 0,
  });

  const reloadInboxRef = useRef<null | (() => void)>(null);

  const locationName = useMemo(() => {
    return currentLGA?.lga?.name ?? "Select LGA";
  }, [currentLGA]);

  const resetSelection = () => setSelection({ active: false, count: 0 });

  const goHome = () => {
    setActiveChat(null);
    resetSelection();
  };

  /** ✅ Close new chat picker */
  const closeNewChat = () => {
    setNewChatOpen(false);
    setNewChatSearch("");
    resetSelection();
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <UnifiedHeader
        mode={mode}
        locationName={locationName}
        chatTitle={undefined}
        chatSubtitle={undefined}
        chatAvatarUrl={undefined}
        searchValue={mode === "NEW_CHAT" ? newChatSearch : inboxSearch}
        onSearchChange={mode === "NEW_CHAT" ? setNewChatSearch : setInboxSearch}
        onBack={() => {
          setActiveChat(null);
          resetSelection();
        }}
        onCloseNewChat={closeNewChat}
        onOpenLocation={() => setChangeLGAModalOpen(true)}
        onRefresh={() => reloadInboxRef.current?.()}
        onCreateHub={() => setCreateHubModalOpen(true)}
        onNewChat={() => {
          setNewChatOpen(true);
          setNewChatSearch("");
          resetSelection();
        }}
        disabledAll={false}
        selection={
          selection.active
            ? {
                active: true,
                count: selection.count,

                context: selection.context,

                kind: selection.kind,
                canDelete: selection.canDelete,
                markLabel: selection.markLabel,

                onExit: selection.onExit || resetSelection,

                // shared
                onSelectAll: selection.onSelectAll,
                onUnselectAll: selection.onUnselectAll,

                // chat selection actions
                onForward: selection.onForward,
                onShare: selection.onShare,

                // inbox selection actions
                onPin: selection.onPin,
                onMute: selection.onMute,
                onArchive: selection.onArchive,
                onMarkReadUnread: selection.onMarkReadUnread,

                onShareGroup: selection.onShareGroup,
                onOpenGroupInfo: selection.onOpenGroupInfo,
                onExitGroup: selection.onExitGroup,

                onViewContact: selection.onViewContact,
                onBlockContact: selection.onBlockContact,

                onDelete: selection.onDelete,
              }
            : undefined
        }
      />

      {/* CONTENT */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {/* ✅ NEW CHAT PICKER */}
        {newChatOpen ? (
          <NewChatPicker
            open={newChatOpen}
            searchValue={newChatSearch}
            onSearchChange={setNewChatSearch}
            onClose={closeNewChat}
            onOpenPrivateChat={async (userId) => {
              // ✅ Create/Open conversation
              const res = await authFetch("/communities/private/open/", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId }),
              });

              const data = await res.json().catch(() => ({}));
              if (!res.ok) return;

              setActiveChat({ kind: "PRIVATE", id: data.conversation_id });
              closeNewChat();
            }}
            onCreateGroup={async (userIds) => {
              // ✅ Hook this to your create group modal or endpoint
              console.log("Create group with:", userIds);

              // Example endpoint:
              // await authFetch("/communities/private/create-group/", { ... })

              closeNewChat();
            }}
            onViewProfile={(userId) => {
              console.log("Open profile preview:", userId);
            }}
            onSelectionChange={(payload) => {
              setSelection({
                active: payload.active,
                count: payload.count,
                context: "NEW_CHAT", // ✅ IMPORTANT: drives new header style
                onExit: payload.onExit,
                onSelectAll: payload.onSelectAll,
                onUnselectAll: payload.onUnselectAll,
                onForward: payload.onForward, // ✅ Create group
              });
            }}
          />
        ) : !activeChat ? (
          /* ✅ INBOX */
          <GroupsContainer
            currentLGA={currentLGA}
            setCurrentLGA={setCurrentLGA}
            setLgaGroups={setLgaGroups}
            searchValue={inboxSearch}
            onOpenChat={(chat) => {
              setActiveChat(chat);
              setInboxSearch("");
              resetSelection();
            }}
            createHubModalOpen={createHubModalOpen}
            setCreateHubModalOpen={setCreateHubModalOpen}
            exposeReload={(fn) => {
              reloadInboxRef.current = fn;
            }}
            onSelectionChange={(payload) => {
              setSelection({
                active: payload.active,
                count: payload.count,

                context: "INBOX",

                kind: payload.kind,
                canDelete: payload.canDelete,
                markLabel: payload.markLabel,

                onExit: payload.onExit,
                onSelectAll: payload.onSelectAll,
                onUnselectAll: payload.onUnselectAll,

                onPin: payload.onPin,
                onMute: payload.onMute,
                onArchive: payload.onArchive,
                onMarkReadUnread: payload.onMarkReadUnread,

                onShareGroup: payload.onShareGroup,
                onOpenGroupInfo: payload.onOpenGroupInfo,
                onExitGroup: payload.onExitGroup,

                onViewContact: payload.onViewContact,
                onBlockContact: payload.onBlockContact,

                onDelete: payload.onDelete,
              });
            }}
          />
        ) : (
          /* ✅ CHAT VIEW */
          <ChatView
            mode={activeChat.kind}
            groupId={activeChat.kind === "COMMUNITY" ? activeChat.id : undefined}
            conversationId={activeChat.kind === "PRIVATE" ? activeChat.id : undefined}
            onSelectionChange={(payload) => {
              setSelection({
                active: payload.active,
                count: payload.count,

                context: "CHAT",

                onExit: payload.onExit,
                onSelectAll: payload.onSelectAll,
                onUnselectAll: payload.onUnselectAll,

                onDelete: payload.onDelete,
                onForward: payload.onForward,
                onShare: payload.onShare,
              });
            }}
          />
        )}
      </div>

      {/* FLOATING ACTION */}
      {!activeChat && !newChatOpen && (
        <NewChatFab
          onClick={() => {
            setNewChatOpen(true);
            setNewChatSearch("");
            resetSelection();
          }}
        />
      )}

      {/* ✅ GLOBAL LGA MODAL */}
      <ChangeLGAModal
        open={changeLGAModalOpen}
        loading={false}
        lgaGroups={lgaGroups}
        currentLGA={currentLGA}
        onSelect={(lga) => {
          setCurrentLGA(lga);
          setChangeLGAModalOpen(false);

          if (activeChat?.kind === "COMMUNITY") {
            const exists = lga.hubs.some((h) => h.id === activeChat.id);
            if (!exists) goHome();
          }
        }}
        onClose={() => setChangeLGAModalOpen(false)}
      />
    </div>
  );
}
