export type Role = "MEMBER" | "LEADER" | "MODERATOR" | "ADMIN";

const PERMISSIONS = {
  SEND_CHAT: ["MEMBER", "LEADER", "MODERATOR"],
  SEND_ANNOUNCEMENT: ["LEADER", "ADMIN"],
  DELETE_MESSAGE: ["MODERATOR", "ADMIN"],
  PIN_ANNOUNCEMENT: ["LEADER", "ADMIN"],
};

export function useRBAC(role: Role) {
  return {
    can: (action: keyof typeof PERMISSIONS) =>
      PERMISSIONS[action].includes(role),
  };
}
