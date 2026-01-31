// utils/normalizeHub.ts

import { Hub } from "@/types/hub";

export function normalizeHub(raw: any): Hub {
  return {
    id: String(raw.id),
    name: raw.name ?? "Unnamed Hub",

    description: raw.description ?? "",
    category: raw.category ?? "General",
    tags: raw.tags ?? [],

    cover_image: raw.cover_image ?? null,
    avatar_icon: raw.avatar_icon ?? null,

    location_label: raw.location_label ?? "",

    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at,

    type: raw.type === "LOCAL" ? "LOCAL" : "SYSTEM",
    is_default: Boolean(raw.is_default),
    is_verified: Boolean(raw.is_verified),
    is_active: raw.is_active !== false,

    members_count: Number(raw.members_count ?? 0),
    online_count: Number(raw.online_count ?? 0),

    user_joined: Boolean(raw.joined),
    user_role: raw.role ?? null,

    last_message_text: raw.last_message_text ?? null,
    last_message_type: raw.last_message_type ?? null,
    last_message_at: raw.last_message_at ?? null,
    last_message_sender_name: raw.last_message_sender_name ?? null,

    unread_count: Number(raw.unread_count ?? 0),

    pinned_message_id: raw.pinned_message_id ?? null,

    privacy: raw.privacy ?? "PUBLIC",
    join_mode: raw.join_mode ?? "OPEN",
    is_locked: Boolean(raw.is_locked),
    requires_location_match: Boolean(raw.requires_location_match),
    min_age: raw.min_age,

    rules: raw.rules,
    report_count: raw.report_count,
    auto_moderation_enabled: raw.auto_moderation_enabled,
    banned_words: raw.banned_words,
    allow_media: raw.allow_media,
    allow_links: raw.allow_links,
    slow_mode_seconds: raw.slow_mode_seconds,
    max_members: raw.max_members,

    created_by: raw.created_by,
    verified_by: raw.verified_by,

    is_sponsored: raw.is_sponsored,
    sponsor_name: raw.sponsor_name,
    donation_enabled: raw.donation_enabled,
    subscription_enabled: raw.subscription_enabled,
    ad_slots_enabled: raw.ad_slots_enabled,
  };
}
