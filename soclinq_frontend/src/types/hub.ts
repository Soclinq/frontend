// types/hub.ts

export type HubPrivacy = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export type JoinMode = "OPEN" | "REQUEST" | "APPROVAL";

export type HubRole = "MEMBER" | "LEADER" | "MODERATOR";

export type HubMessageType = "TEXT" | "MEDIA" | "SYSTEM";

export type Hub = {
  /* ---------------- Identity ---------------- */
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];

  cover_image?: string | null;
  avatar_icon?: string | null;

  location_label?: string;

  created_at: string;
  updated_at?: string;

  /* ---------------- Status ---------------- */
  type: "SYSTEM" | "LOCAL";
  is_default?: boolean;
  is_verified: boolean;
  is_active: boolean;

  /* ---------------- Membership ---------------- */
  members_count: number;
  online_count?: number;

  user_joined: boolean;
  user_role: HubRole | null;

  /* ---------------- Messaging preview ---------------- */
  last_message_text?: string | null;
  last_message_type?: HubMessageType | null;
  last_message_at?: string | null;
  last_message_sender_name?: string | null;

  unread_count: number;

  pinned_message_id?: string | null;

  /* ---------------- Privacy ---------------- */
  privacy: HubPrivacy;
  join_mode: JoinMode;
  is_locked?: boolean;
  requires_location_match?: boolean;
  min_age?: number;

  /* ---------------- Moderation ---------------- */
  rules?: string;
  report_count?: number;
  auto_moderation_enabled?: boolean;
  banned_words?: string[];
  allow_media?: boolean;
  allow_links?: boolean;
  slow_mode_seconds?: number;
  max_members?: number;

  /* ---------------- Ownership ---------------- */
  created_by?: string;
  verified_by?: string | null;

  /* ---------------- Monetization ---------------- */
  is_sponsored?: boolean;
  sponsor_name?: string;
  donation_enabled?: boolean;
  subscription_enabled?: boolean;
  ad_slots_enabled?: boolean;
};
