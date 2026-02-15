import type { Hub } from "@/types/hub";

export type LGAGroupBlock = {
  lga: {
    id: string;
    name: string;
  };
  hubs: Hub[];
};

/**
 * Active chat pointer
 */
export type ActiveChat =
    | {
      kind: "COMMUNITY";
      id: string;
      title?: string;
      avatarUrl?: string | null;
      onlineCount?: number | null;
    }
    | {
      kind: "PRIVATE";
      id: string;
      title?: string;
      avatarUrl?: string | null;
      subtitle?: string;
    }
  | null;

/**
 * UI mode
 */
export type Mode = "INBOX" | "CHAT" | "NEW_CHAT";
