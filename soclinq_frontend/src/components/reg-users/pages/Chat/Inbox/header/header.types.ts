import React from "react";

/* ================= HEADER MODES ================= */

export type HeaderMode = "INBOX" | "CHAT" | "NEW_CHAT";
export type SelectionContext = "INBOX" | "CHAT" | "NEW_CHAT";
export type SelectionKind = "GROUP_ONLY" | "PRIVATE_ONLY" | "MIXED";

/* ================= LEFT ================= */

export type HeaderLeft =
  | {
      type: "BUTTON";
      icon: React.ReactNode;
      label?: string;
      title?: string;
      onClick?: () => void;
    }
  | {
      type: "BUTTON_GROUP";
      buttons: Array<{
        icon: React.ReactNode;
        label?: string;
        title?: string;
        onClick?: () => void;
      }>;
    }
  | { type: "NONE" };

/* ================= CENTER ================= */

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

/* ================= RIGHT ================= */

/** Quick icon actions (Pin, Mute, etc.) */
export type HeaderAction = {
  icon: React.ReactNode;
  label?: string;
  danger?: boolean;
  onClick?: () => void;
};

/** Overflow menu items (⋮) */
export type HeaderMenuItem = {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
};

/**
 * HeaderRight now supports BOTH:
 * - actions: quick icon buttons
 * - menu: overflow dropdown (⋮)
 */
export type HeaderRight = {
  actions?: HeaderAction[];
  menu?: HeaderMenuItem[];
};

/* ================= VIEW PROPS ================= */

export type UnifiedHeaderViewProps = {
  hidden?: boolean;
  disabled?: boolean;

  left: HeaderLeft;
  center: HeaderCenter;
  right: HeaderRight;
};
