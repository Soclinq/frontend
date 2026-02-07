import React from "react";

export type HeaderMode = "INBOX" | "CHAT" | "NEW_CHAT";
export type SelectionContext = "INBOX" | "CHAT" | "NEW_CHAT";
export type SelectionKind = "GROUP_ONLY" | "PRIVATE_ONLY" | "MIXED";

export type HeaderLeft =
  | { type: "BUTTON"; icon: React.ReactNode; label?: string; onClick?: () => void }
  | { type: "NONE" };

export type HeaderCenter =
  | {
      type: "SEARCH";
      value: string;
      placeholder: string;
      autoFocus?: boolean;
      onChange: (v: string) => void;
    }
  | {
      type: "CHAT_META";
      title: string;
      subtitle?: string;
      avatarUrl?: string;
      onClick?: () => void;
    }
  | { type: "NONE" };

export type HeaderAction = {
  icon: React.ReactNode;
  label?: string;
  danger?: boolean;
  onClick?: () => void;
};

export type HeaderMenuItem = {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
};

export type HeaderRight =
  | { type: "NONE" }
  | { type: "ACTIONS"; actions: HeaderAction[] }
  | { type: "MENU"; items: HeaderMenuItem[] };

export type UnifiedHeaderViewProps = {
  hidden?: boolean;
  disabled?: boolean;

  left: HeaderLeft;
  center: HeaderCenter;
  right: HeaderRight;
};
