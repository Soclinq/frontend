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
  const { mode, selection, activeChat } = ui;

  /* =====================================================
     SELECTION HEADERS
  ===================================================== */

  if (selection.active && selection.context) {
    /* ---------- NEW CHAT SELECTION ---------- */
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
            actions: [
              { icon: <FiCheckSquare />, onClick: selection.onSelectAll },
              { icon: <FiSquare />, onClick: selection.onUnselectAll },
              {
                icon: <FiUsers />,
                label: "Create group",
                onClick: selection.onForward,
              },
            ],
          }}
        />
      );
    }

    /* ---------- CHAT (MESSAGE) SELECTION ---------- */
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
            actions: [
              { icon: <FiCheckSquare />, onClick: selection.onSelectAll },
              { icon: <FiSquare />, onClick: selection.onUnselectAll },
              {
                icon: <FiSend />,
                label: "Forward",
                onClick: selection.onForward,
              },
              {
                icon: <FiShare2 />,
                label: "Share",
                onClick: selection.onShare,
              },
              {
                icon: <FiTrash2 />,
                danger: true,
                label: "Delete",
                onClick: selection.onDelete,
              },
            ],
          }}
        />
      );
    }

    /* ---------- INBOX SELECTION ---------- */
    if (selection.context === "INBOX") {
      const kind = selection.kind ?? "MIXED";
      const canDelete = !!selection.canDelete;
      const markLabel = selection.markLabel ?? "Mark as read";

      const menuItems = [
        ...(canDelete
          ? [
              {
                icon: <FiTrash2 />,
                label: "Delete",
                danger: true,
                onClick: selection.onDelete,
              },
            ]
          : []),
        {
          icon: <FiCheckSquare />,
          label: markLabel,
          onClick: selection.onMarkReadUnread,
        },
        {
          icon: <FiArchive />,
          label: "Archive",
          onClick: selection.onArchive,
        },
        ...(kind === "GROUP_ONLY"
          ? [
              {
                icon: <FiInfo />,
                label: "Group info",
                onClick: selection.onOpenGroupInfo,
              },
              {
                icon: <FiShare2 />,
                label: "Share group",
                onClick: selection.onShareGroup,
              },
              {
                icon: <FiLogOut />,
                label: "Exit group",
                danger: true,
                onClick: selection.onExitGroup,
              },
            ]
          : []),
        ...(kind === "PRIVATE_ONLY"
          ? [
              {
                icon: <FiUser />,
                label: "View contact",
                onClick: selection.onViewContact,
              },
              {
                icon: <FiSlash />,
                label: "Block contact",
                danger: true,
                onClick: selection.onBlockContact,
              },
            ]
          : []),
      ];

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
            actions: [
              { icon: <FiStar />, label: "Pin", onClick: selection.onPin },
              { icon: <FiBellOff />, label: "Mute", onClick: selection.onMute },
            ],
            menu: menuItems,
          }}
        />
      );
    }
  }

  /* =====================================================
     NORMAL HEADERS
  ===================================================== */

  if (mode === "NEW_CHAT") {
    return (
      <UnifiedHeader
        left={{
          type: "BUTTON",
          icon: <FiX />,
          onClick: ui.closeNewChat,
        }}
        center={{
          type: "SEARCH",
          value: ui.newChatSearch,
          placeholder: "Search name, phone or email...",
          autoFocus: true,
          onChange: ui.setNewChatSearch,
        }}
        right={{}}
      />
    );
  }

  /* ---------- INBOX ---------- */
  return (
    <UnifiedHeader
      left={{
        type: "BUTTON",
        icon: <FiMapPin />,
        onClick: () => {
          ui.resetSelection();
          ui.openChangeLGA();
        },
      }}
      center={{
        type: "SEARCH",
        value: ui.inboxSearch,
        placeholder: "Search inbox...",
        onChange: ui.setInboxSearch,
      }}
      right={{
        menu: [
          { icon: <FiRefreshCw />, label: "Refresh" },
          { icon: <FiPlus />, label: "Create hub" },
          { icon: <FiPlus />, label: "New chat", onClick: ui.openNewChat },
          { icon: <FiUsers />, label: "New group" },
          { icon: <FiSettings />, label: "Settings" },
          { icon: <FiHelpCircle />, label: "Help" },
        ],
      }}
    />
  );
}
