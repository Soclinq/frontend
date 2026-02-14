/* ======================================================
   CORE ENUMS
====================================================== */

export type UserRole =
  | "CITIZEN"
  | "COMMUNITY_LEADER"
  | "LAW_ENFORCEMENT"
  | "NGO_PARTNER"
  | "HQ_ADMIN"
  | "INVESTIGATOR";

export type LocationSource = "GPS" | "IP" | "MANUAL" | "UNKNOWN";
export type LocationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type AllowMessagesFrom =
  | "EVERYONE"
  | "CONTACTS_ONLY"
  | "VERIFIED_ONLY";

export type SosRiskLevel = "LOW" | "MEDIUM" | "HIGH";

/* ======================================================
   SHARED VALUE OBJECTS
====================================================== */

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type AdminUnitMini = {
  id: string;
  name: string;
  level: 0 | 1 | 2;
  code?: string;
  country_code?: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;

  relationship?: "FAMILY" | "FRIEND" | "NEIGHBOR" | "COLLEAGUE" | "OTHER";
  priority?: 1 | 2 | 3 | 4 | 5;

  verified?: boolean;
  created_at?: string;
};

export type VerificationDoc = {
  id: string;
  file_url: string;
  uploaded_at: string;
};

export type OrganizationType =
  | "NGO"
  | "GOVERNMENT"
  | "NON_PROFIT"
  | "COMMUNITY"
  | "OTHER";

export type Organization = {
  id: string;
  name: string;
  org_type: OrganizationType;
  org_type_other?: string | null;
  address?: string | null;
  created_at: string;
};

/* ======================================================
   PROFILE SUB-STATES
====================================================== */

export type ProfileIdentity = {
  id: string;

  email?: string | null;
  phone?: string | null;
  phone_verified?: boolean;

  username?: string | null;
  full_name?: string | null;
  photo?: string | null;

  preferred_language?: string;
};

export type ProfileSecurityState = {
  is_active: boolean;
  is_suspended: boolean;

  failed_login_attempts: number;
  lock_until?: string | null;

  is_staff: boolean;
  is_verified: boolean;
};

export type ProfileLocationState = {
  last_known_location?: GeoPoint | null;

  location_source: LocationSource;
  location_confidence: LocationConfidence;

  admin_0?: AdminUnitMini | null;
  admin_1?: AdminUnitMini | null;
  admin_2?: AdminUnitMini | null;

  location_updated_at?: string | null;
};

export type UserDeviceInfo = {
  imei?: string | null;
  sim_number?: string | null;
  phone_model?: string | null;
  last_ip_address?: string | null;

  push_token?: string | null;
  platform?: "WEB" | "ANDROID" | "IOS" | null;
  app_version?: string | null;
  last_seen_at?: string | null;
};

export type ProfileSettings = {
  /* --- Privacy & comms --- */
  allow_messages_from?: AllowMessagesFrom;
  searchable_by_username?: boolean;
  hide_last_seen?: boolean;

  /* --- Safety --- */
  tracking_enabled?: boolean;
  location_enabled?: boolean;
  emergency_mode_enabled?: boolean;

  /* --- SOS automation --- */
  sos_silent_mode?: boolean;
  sos_countdown_seconds?: number;
  sos_auto_call_enabled?: boolean;
  sos_auto_share_location?: boolean;
  sos_auto_record_audio?: boolean;

  /* --- Misc --- */
  allow_push_notifications?: boolean;
  allow_media_upload?: boolean;
  allow_device_binding?: boolean;
  allow_anonymous_reports?: boolean;

  /* --- Quiet hours --- */
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
};

export type ProfileSOSState = {
  active: boolean;
  risk_level?: SosRiskLevel;
  status?: string;
};

/* ======================================================
   AUDIT
====================================================== */

export type ProfileAudit = {
  date_joined: string;
  last_updated: string;
};

/* ======================================================
   ✅ CANONICAL USER PROFILE
====================================================== */

export type UserProfile = {
  identity: ProfileIdentity;
  role: UserRole;

  security: ProfileSecurityState;
  location: ProfileLocationState;
  device: UserDeviceInfo;

  settings: ProfileSettings;
  sos: ProfileSOSState;

  emergency_contacts: EmergencyContact[];

  organizations?: Organization[];
  documents?: VerificationDoc[];

  audit: ProfileAudit;
};



/* ======================================================
   PUBLIC PROJECTION (SAFE)
====================================================== */

export type PublicUserProfile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  photo?: string | null;

  role?: UserRole;
  is_verified?: boolean;
};
