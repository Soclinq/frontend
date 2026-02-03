export type LocationSource = "GPS" | "IP" | "MANUAL" | "UNKNOWN";
export type LocationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type UserRole =
  | "CITIZEN"
  | "COMMUNITY_LEADER"
  | "LAW_ENFORCEMENT"
  | "NGO_PARTNER"
  | "HQ_ADMIN"
  | "INVESTIGATOR";

export type AdminUnitMini = {
  id: string;
  name: string;
  level: 0 | 1 | 2;
  code?: string;
  country_code?: string;
};

export type GeoPoint = {
  lat: number;
  lng: number;
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

export type ProfileIdentity = {
  id: string;

  email?: string | null;
  phone_number: string;

  username?: string | null;
  full_name?: string | null;

  preferred_language: string;

  live_photo?: string | null;
};

export type ProfileAudit = {
  date_joined: string;
  last_updated: string;
};


export type UserProfile = {
  identity: ProfileIdentity;
  role: UserRole;

  location: ProfileLocationState;
  device: UserDeviceInfo;
  security: ProfileSecurityState;

  organizations?: Organization[];
  documents?: VerificationDoc[];

  settings: ProfileSettings;

  audit: ProfileAudit;
};


export type PublicUserProfile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  photo?: string | null;

  role?: UserRole;
  is_verified?: boolean;
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

export type AllowMessagesFrom = "EVERYONE" | "CONTACTS_ONLY" | "VERIFIED_ONLY";

export type ProfileSettings = {
  emergency_mode_enabled?: boolean;

  emergency_contacts?: EmergencyContact[];
  tracking_enabled?: boolean;
  location_enabled?: boolean;

  allow_location_sharing?: boolean;
  allow_anonymous_reports?: boolean;

  allow_push_notifications?: boolean;

  allow_messages_from?: AllowMessagesFrom;

  allow_device_binding?: boolean;
  allow_media_upload?: boolean;

  searchable_by_username?: boolean;
  hide_last_seen?: boolean;

  sos_silent_mode?: boolean;
  sos_countdown_seconds?: number;

  sos_auto_call_enabled?: boolean;
  sos_auto_share_location?: boolean;
  sos_auto_record_audio?: boolean;

  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
};
