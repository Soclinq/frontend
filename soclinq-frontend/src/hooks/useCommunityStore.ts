import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { User } from "@/types/auth";

/* ================= MESSAGE TYPES ================= */
import type {
  CommunityMessage,
  ChatMessage,
  Announcement,
} from "@/types/message";

/* ================= GROUP TYPES ================= */

export interface Group {
  name: string;
  createdAt: string;
}

/* ================= STORE SLICES ================= */

export interface GroupsStore {
  list: Group[];
  createGroup: (name: string) => void;
  removeGroup: (name: string) => void;
}

export interface ChatStore {
  messages: ChatMessage[];
  sendChat: (text: string) => void;
}

export interface AnnouncementsStore {
  messages: Announcement[];
  broadcast: (text: string) => void;
  togglePin: (id: string) => void;
}

/* ================= STORE ================= */

export function useCommunityStore(): {
  user: User;
  groups: GroupsStore;
  chat: ChatStore;
  announcements: AnnouncementsStore;
} {
  /* TEMP USER (replace with auth context later) */
  const user: User = {
    id: "demo-user-1",
    role: "LEADER",
  };

  const [groups, setGroups] =
    useLocalStorage<Group[]>("groups", []);

  const [messages, setMessages] =
    useLocalStorage<CommunityMessage[]>(
      "community_chat",
      []
    );

  return {
    user,

    /* ================= GROUPS ================= */
    groups: {
      list: groups,

      createGroup: (name: string) => {
        if (!name.trim()) return;

        setGroups((prev) => [
          ...prev,
          {
            name,
            createdAt: new Date().toISOString(),
          },
        ]);
      },

      removeGroup: (name: string) =>
        setGroups((prev) =>
          prev.filter((g) => g.name !== name)
        ),
    },

    /* ================= CHAT ================= */
    chat: {
      messages: messages.filter(
        (m): m is ChatMessage =>
          m.type === "chat"
      ),

      sendChat: (text: string) => {
        if (!text.trim()) return;

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text,
            type: "chat",
            senderId: user.id,
            readBy: [],
            createdAt: new Date().toISOString(),
          },
        ]);
      },
    },

    /* ================= ANNOUNCEMENTS ================= */
    announcements: {
      messages: messages.filter(
        (m): m is Announcement =>
          m.type === "announcement"
      ),

      broadcast: (text: string) => {
        if (!text.trim()) return;

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text,
            type: "announcement",
            senderId: user.id,
            pinned: false,
            createdAt: new Date().toISOString(),
          },
        ]);
      },

      togglePin: (id: string) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.type === "announcement" && m.id === id
              ? { ...m, pinned: !m.pinned }
              : m
          )
        ),
    },
  };
}
