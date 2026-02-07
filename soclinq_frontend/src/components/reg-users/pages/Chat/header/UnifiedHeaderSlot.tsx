"use client";

import {
  FiArrowLeft,
  FiMapPin,
  FiX,
  FiUsers,
  FiSend,
  FiTrash2,
  FiCheckSquare,
  FiSquare,
  FiBellOff,
  FiStar,
  FiArchive,
  FiLogOut,
  FiUser,
  FiSlash,
  FiInfo,
  FiShare2,
  FiRefreshCw,
  FiPlus,
  FiSettings,
  FiHelpCircle,
  FiImage,
} from "react-icons/fi";

import UnifiedHeader from "./UnifiedHeader";
import { useChatUI } from "../state/ChatUIContext";

export default function UnifiedHeaderSlot() {
  const ui = useChatUI();
  const { mode, selection } = ui;

  /* ===============================
     SELECTION HEADER
  =============================== */
  if (selection.active && selection.context) {
    // NEW_CHAT selection
    if (selection.context === "NEW_CHAT") {
      return (
        <UnifiedHeader
          left={{
            type: "BUTTON",
            icon: <FiX />,
            label: `${selection.count} selected`,
            onClick: selection.onExit,
          }}
          center={{ type: "NONE" }}
          right={{
            type: "ACTIONS",
            actions: [
              { icon: <FiCheckSquare />, onClick: selection.onSelectAll },
              { icon: <FiSquare />, onClick: selection.onUnselectAll },
              { icon: <FiUsers />, onClick: selection.onForward },
            ],
          }}
        />
      );
    }

    // CHAT selection
    if (selection.context === "CHAT") {
      return (
        <UnifiedHeader
          left={{
            type: "BUTTON",
            icon: <FiX />,
            label: `${selection.count} selected`,
            onClick: selection.onExit,
          }}
          center={{ type: "NONE" }}
          right={{
            type: "ACTIONS",
            actions: [
              { icon: <FiCheckSquare />, onClick: selection.onSelectAll },
              { icon: <FiSquare />, onClick: selection.onUnselectAll },
              { icon: <FiSend />, onClick: selection.onForward },
              { icon: <FiTrash2 />, danger: true, onClick: selection.onDelete },
            ],
          }}
        />
      );
    }
  }

  /* ===============================
     NORMAL HEADER
  =============================== */
  if (mode === "CHAT") {
    return (
      <UnifiedHeader
        left={{ type: "BUTTON", icon: <FiArrowLeft />, onClick: ui.goHome }}
        center={{
          type: "CHAT_META",
          title: "Group Chat",
        }}
        right={{
          type: "MENU",
          items: [
            { icon: <FiInfo />, label: "Group info" },
            { icon: <FiImage />, label: "Group media" },
            { icon: <FiBellOff />, label: "Mute notifications" },
            { icon: <FiLogOut />, label: "Exit group", danger: true },
          ],
        }}
      />
    );
  }

  if (mode === "NEW_CHAT") {
    return (
      <UnifiedHeader
        left={{ type: "BUTTON", icon: <FiX />, onClick: ui.closeNewChat }}
        center={{
          type: "SEARCH",
          value: ui.newChatSearch,
          placeholder: "Search name, phone or email...",
          autoFocus: true,
          onChange: ui.setNewChatSearch,
        }}
        right={{ type: "NONE" }}
      />
    );
  }

  // INBOX
  return (
    <UnifiedHeader
      left={{ type: "BUTTON", icon: <FiMapPin /> }}
      center={{
        type: "SEARCH",
        value: ui.inboxSearch,
        placeholder: "Search inbox...",
        onChange: ui.setInboxSearch,
      }}
      right={{
        type: "MENU",
        items: [
          { icon: <FiRefreshCw />, label: "Refresh" },
          { icon: <FiPlus />, label: "Create hub" },
          { icon: <FiPlus />, label: "New chat" },
          { icon: <FiUsers />, label: "New group" },
          { icon: <FiSettings />, label: "Settings" },
          { icon: <FiHelpCircle />, label: "Help" },
        ],
      }}
    />
  );
}
