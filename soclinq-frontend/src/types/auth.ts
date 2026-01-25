export type Role =
  | "MEMBER"
  | "LEADER"
  | "MODERATOR"
  | "ADMIN";

export interface User {
  id: string;
  role: Role;
}
