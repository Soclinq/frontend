export type ActiveChat =
  | { kind: "COMMUNITY"; id: string }
  | { kind: "PRIVATE"; id: string }
  | null;
