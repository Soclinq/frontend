export type PrivateInboxItem = {
  conversation_id: string;

  other_user: {
    id: string;
    name: string;
    photo?: string | null;
    online?: boolean; // optional
  };

  last_message_id?: string | null;
  last_message_text?: string | null;
  last_message_type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM";
  last_message_at?: string | null;

  last_message_is_mine?: boolean;
  last_message_status?: "sent" | "delivered" | "read" | "failed";

  unread_count: number;

  // WhatsApp controls
  is_pinned?: boolean;
  pinned_at?: string | null;

  is_muted?: boolean;
  mute_until?: string | null;

  is_archived?: boolean;
};
