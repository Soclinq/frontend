"use client";

import { useMemo, useState } from "react";

import UnifiedHeader from "./UnifiedHeader";
import NewChatFab from "./NewChatFab";

import GroupsContainer, {
  type ActiveChat,
  type LGAGroupBlock,
} from "./GroupsContainer";
import ChatView from "./ChatView";

import ChangeLGAModal from "./ChangeLGAModal";

export default function ChatShell() {
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [search, setSearch] = useState("");

  const [lgaGroups, setLgaGroups] = useState<LGAGroupBlock[]>([]);
  const [currentLGA, setCurrentLGA] = useState<LGAGroupBlock | null>(null);

  const [changeLGAModalOpen, setChangeLGAModalOpen] = useState(false);

  const mode = activeChat ? "CHAT" : "INBOX";

  const [chatSelection, setChatSelection] = useState<{
    active: boolean;
    count: number;
    onExit?: () => void;
    onSelectAll?: () => void;
    onUnselectAll?: () => void;
    onDelete?: () => void;
    onForward?: () => void;
    onShare?: () => void;
  }>({
    active: false,
    count: 0,
  });

  const locationName = useMemo(() => {
    return currentLGA?.lga?.name ?? "Select LGA";
  }, [currentLGA]);

  const goHome = () => {
    setActiveChat(null);
    setChatSelection({ active: false, count: 0 }); // ✅ reset selection
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <UnifiedHeader
        hidden={chatSelection.active}  // ✅ HIDE WHEN SELECTING
        mode={mode}
        locationName={locationName}
        searchValue={search}
        onSearchChange={setSearch}
        onBack={() => setActiveChat(null)}
        onHome={() => setActiveChat(null)}
        onOpenLocation={() => setChangeLGAModalOpen(true)}
        />


      {/* CONTENT */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {!activeChat ? (
          <GroupsContainer
            currentLGA={currentLGA}
            setCurrentLGA={setCurrentLGA}
            setLgaGroups={setLgaGroups}
            searchValue={search}
            onOpenChat={(chat) => {
              setActiveChat(chat);
              setSearch("");
              setChatSelection({ active: false, count: 0 });
            }}
          />
        ) : (
          <ChatView
            mode={activeChat.kind}
            groupId={activeChat.kind === "COMMUNITY" ? activeChat.id : undefined}
            conversationId={activeChat.kind === "PRIVATE" ? activeChat.id : undefined}
            onSelectionChange={(payload) => {
                setChatSelection({
                  active: payload.active,
                  count: payload.count,
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
      <NewChatFab
        onClick={() => {
          alert("New chat: Create Group / New Message");
        }}
      />

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
