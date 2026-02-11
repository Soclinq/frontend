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
  | { kind: "COMMUNITY"; id: string }
  | { kind: "PRIVATE"; id: string }
  | null;

/**
 * UI mode
 */
export type Mode = "INBOX" | "CHAT" | "NEW_CHAT";
