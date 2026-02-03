// utils/normalizeHub.ts

import type {
  Hub,
  HubPrivacy,
  JoinMode,
  HubRole,
  HubMessageType,
} from "@/types/hub";

export function normalizeHub(raw: any): Hub {
  const privacy: HubPrivacy =
    raw?.privacy === "PRIVATE" || raw?.privacy === "INVITE_ONLY"
      ? raw.privacy
      : "PUBLIC";

  const join_mode: JoinMode =
    raw?.join_mode === "REQUEST" || raw?.join_mode === "APPROVAL"
      ? raw.join_mode
      : "OPEN";

  const user_role: HubRole | null =
    raw?.user_role === "LEADER" ||
    raw?.user_role === "MODERATOR" ||
    raw?.user_role === "MEMBER"
      ? raw.user_role
      : null;

  const last_message_type: HubMessageType | null =
    raw?.last_message_type === "TEXT" ||
    raw?.last_message_type === "MEDIA" ||
    raw?.last_message_type === "SYSTEM"
      ? raw.last_message_type
      : null;

  return {
    /* ---------------- Identity ---------------- */
    id: String(raw?.id ?? ""),
    name: String(raw?.name ?? "Unnamed Hub"),
    description: raw?.description ?? "",
    category: raw?.category ?? "General",
    tags: Array.isArray(raw?.tags) ? raw.tags : [],

    cover_image: raw?.cover_image ?? null,
    avatar_icon: raw?.avatar_icon ?? null,

    location_label: raw?.location_label ?? "",

    created_at: raw?.created_at ?? new Date().toISOString(),
    updated_at: raw?.updated_at ?? undefined,

    /* ---------------- Status ---------------- */
    type: raw?.type === "LOCAL" ? "LOCAL" : "SYSTEM",
    is_default: Boolean(raw?.is_default),
    is_verified: Boolean(raw?.is_verified),
    is_active: raw?.is_active !== false,

    /* ---------------- Membership ---------------- */
    members_count: Number(raw?.members_count ?? 0),
    online_count: raw?.online_count != null ? Number(raw.online_count) : undefined,

    user_joined: Boolean(raw?.user_joined), // ✅ FIXED
    user_role, // ✅ FIXED

    /* ---------------- Messaging preview ---------------- */
    last_message_text: raw?.last_message_text ?? null,
    last_message_type, // ✅ validated
    last_message_at: raw?.last_message_at ?? null,
    last_message_sender_name: raw?.last_message_sender_name ?? null,

    unread_count: Number(raw?.unread_count ?? 0),

    pinned_message_id: raw?.pinned_message_id ?? null,

    /* ---------------- Privacy ---------------- */
    privacy,
    join_mode,
    is_locked: raw?.is_locked != null ? Boolean(raw.is_locked) : undefined,
    requires_location_match:
      raw?.requires_location_match != null
        ? Boolean(raw.requires_location_match)
        : undefined,
    min_age: raw?.min_age ?? undefined,

    /* ---------------- Moderation ---------------- */
    rules: raw?.rules ?? undefined,
    report_count: raw?.report_count ?? undefined,
    auto_moderation_enabled:
      raw?.auto_moderation_enabled != null
        ? Boolean(raw.auto_moderation_enabled)
        : undefined,
    banned_words: Array.isArray(raw?.banned_words) ? raw.banned_words : undefined,
    allow_media:
      raw?.allow_media != null ? Boolean(raw.allow_media) : undefined,
    allow_links:
      raw?.allow_links != null ? Boolean(raw.allow_links) : undefined,
    slow_mode_seconds:
      raw?.slow_mode_seconds != null ? Number(raw.slow_mode_seconds) : undefined,
    max_members: raw?.max_members ?? undefined,

    /* ---------------- Ownership ---------------- */
    created_by: raw?.created_by ?? undefined,
    verified_by: raw?.verified_by ?? null,

    /* ---------------- Monetization ---------------- */
    is_sponsored: raw?.is_sponsored != null ? Boolean(raw.is_sponsored) : undefined,
    sponsor_name: raw?.sponsor_name ?? undefined,
    donation_enabled:
      raw?.donation_enabled != null ? Boolean(raw.donation_enabled) : undefined,
    subscription_enabled:
      raw?.subscription_enabled != null
        ? Boolean(raw.subscription_enabled)
        : undefined,
    ad_slots_enabled:
      raw?.ad_slots_enabled != null ? Boolean(raw.ad_slots_enabled) : undefined,
  };
}
