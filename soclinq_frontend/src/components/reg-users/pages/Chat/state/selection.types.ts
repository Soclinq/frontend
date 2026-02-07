export type SelectionContext = "INBOX" | "CHAT" | "NEW_CHAT";
export type SelectionKind = "GROUP_ONLY" | "PRIVATE_ONLY" | "MIXED";

type BaseSelection = {
  active: boolean;
  count: number;
  onExit: () => void;
  onSelectAll?: () => void;
  onUnselectAll?: () => void;
};

/* ===============================
   CHAT (message selection)
=============================== */
export type ChatSelection = BaseSelection & {
  context: "CHAT";
  onForward?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
};

/* ===============================
   INBOX (chat list selection)
=============================== */
export type InboxSelection = BaseSelection & {
  context: "INBOX";
  kind: SelectionKind;
  canDelete?: boolean;
  markLabel?: string;

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

/* ===============================
   NEW CHAT (picker selection)
=============================== */
export type NewChatSelection = BaseSelection & {
  context: "NEW_CHAT";
  onForward?: () => void; // create group
};

export type SelectionState =
  | { active: false; count: 0 }
  | ChatSelection
  | InboxSelection
  | NewChatSelection;
