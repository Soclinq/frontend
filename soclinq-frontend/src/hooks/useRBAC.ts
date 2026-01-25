import { Role } from "@/types/auth";

type Permission =
  | "SEND_CHAT"
  | "SEND_ANNOUNCEMENT"
  | "DELETE_MESSAGE"
  | "PIN_ANNOUNCEMENT";

const PERMISSIONS: Record<Permission, readonly Role[]> = {
  SEND_CHAT: ["MEMBER", "LEADER", "MODERATOR"],
  SEND_ANNOUNCEMENT: ["LEADER", "ADMIN"],
  DELETE_MESSAGE: ["MODERATOR", "ADMIN"],
  PIN_ANNOUNCEMENT: ["LEADER", "ADMIN"],
};

export function useRBAC(role: Role) {
  return {
    can(permission: Permission): boolean {
      return PERMISSIONS[permission].includes(role);
    },
  };
}
