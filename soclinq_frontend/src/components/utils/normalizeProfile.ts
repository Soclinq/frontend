import type { UserProfile } from "@/types/profile";
import type { UserProfileApi } from "@/types/profileApi";

const safeBool = (v: any, fallback = false) =>
  typeof v === "boolean" ? v : fallback;

const safeNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizeProfile(raw: any): UserProfile {
    const s = raw.settings ?? {};
  
    return {
      identity: {
        id: String(raw?.identity?.id ?? ""),
        email: raw?.identity?.email ?? null,
        phone_number: String(raw?.identity?.phone_number ?? ""),
  
        username: raw?.identity?.username ?? null,
        full_name: raw?.identity?.full_name ?? null,
  
        preferred_language: raw?.identity?.preferred_language ?? "en",
        live_photo: raw?.identity?.live_photo ?? null,
      },
  
      role: raw?.role ?? "CITIZEN",
  
      location: {
        last_known_location: raw?.location?.last_known_location ?? null,
  
        location_source: raw?.location?.location_source ?? "UNKNOWN",
        location_confidence: raw?.location?.location_confidence ?? "LOW",
  
        admin_0: raw?.location?.admin_0 ?? null,
        admin_1: raw?.location?.admin_1 ?? null,
        admin_2: raw?.location?.admin_2 ?? null,
  
        location_updated_at: raw?.location?.location_updated_at ?? null,
      },
  
      device: {
        imei: raw?.device?.imei ?? null,
        sim_number: raw?.device?.sim_number ?? null,
        phone_model: raw?.device?.phone_model ?? null,
        last_ip_address: raw?.device?.last_ip_address ?? null,
  
        push_token: raw?.device?.push_token ?? null,
        platform: raw?.device?.platform ?? null,
        app_version: raw?.device?.app_version ?? null,
        last_seen_at: raw?.device?.last_seen_at ?? null,
      },
  
      security: {
        is_active: safeBool(raw?.security?.is_active, true),
        is_suspended: safeBool(raw?.security?.is_suspended, false),
  
        failed_login_attempts: safeNum(raw?.security?.failed_login_attempts, 0),
        lock_until: raw?.security?.lock_until ?? null,
  
        is_staff: safeBool(raw?.security?.is_staff, false),
        is_verified: safeBool(raw?.security?.is_verified, false),
      },
  
      organizations: Array.isArray(raw?.organizations) ? raw.organizations : [],
      documents: Array.isArray(raw?.documents) ? raw.documents : [],
  
      settings: {
        emergency_mode_enabled: safeBool(s.emergency_mode_enabled, true),
        emergency_contacts: Array.isArray(s.emergency_contacts)
          ? s.emergency_contacts.map((c: any) => ({
              id: String(c?.id ?? ""),
              name: String(c?.name ?? ""),
              phone: String(c?.phone ?? ""),
              relationship: c?.relationship ?? "OTHER",
              priority: c?.priority ?? undefined,
              verified: Boolean(c?.verified),
              created_at: c?.created_at ?? null,
            }))
          : [],
  
        tracking_enabled: safeBool(s.tracking_enabled, true),
        location_enabled: safeBool(s.location_enabled, true),
  
        allow_location_sharing: safeBool(s.allow_location_sharing, true),
        allow_anonymous_reports: safeBool(s.allow_anonymous_reports, false),
  
        allow_push_notifications: safeBool(s.allow_push_notifications, true),
        allow_messages_from: s.allow_messages_from ?? "EVERYONE",
  
        allow_device_binding: safeBool(s.allow_device_binding, true),
        allow_media_upload: safeBool(s.allow_media_upload, true),
  
        searchable_by_username: safeBool(s.searchable_by_username, true),
        hide_last_seen: safeBool(s.hide_last_seen, false),
  
        sos_silent_mode: safeBool(s.sos_silent_mode, false),
        sos_countdown_seconds: safeNum(s.sos_countdown_seconds, 5),
  
        sos_auto_call_enabled: safeBool(s.sos_auto_call_enabled, false),
        sos_auto_share_location: safeBool(s.sos_auto_share_location, true),
        sos_auto_record_audio: safeBool(s.sos_auto_record_audio, false),
  
        quiet_hours_enabled: safeBool(s.quiet_hours_enabled, false),
        quiet_hours_start: s.quiet_hours_start ?? null,
        quiet_hours_end: s.quiet_hours_end ?? null,
      },
  
      audit: {
        date_joined: raw?.audit?.date_joined ?? new Date().toISOString(),
        last_updated: raw?.audit?.last_updated ?? new Date().toISOString(),
      },
    };
  }
  
