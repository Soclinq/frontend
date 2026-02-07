export type ActiveChat =
  | { kind: "COMMUNITY"; id: string }
  | { kind: "PRIVATE"; id: string }
  | null;

export type Mode = "INBOX" | "CHAT" | "NEW_CHAT";
