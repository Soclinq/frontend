import { UserRole, LocationSource, LocationConfidence, AdminUnitMini, Organization, VerificationDoc, ProfileSettings } from "./profile";

export type UserProfileApi = {
    id: string;
  
    email?: string | null;
    phone_number: string;
  
    username?: string | null;
    full_name?: string | null;
  
    role: UserRole;
  
    live_photo?: string | null;
    preferred_language: string;
  
    last_known_location?: { lat: number; lng: number } | null;
  
    location_source: LocationSource;
    location_confidence: LocationConfidence;
  
    admin_0?: AdminUnitMini | null;
    admin_1?: AdminUnitMini | null;
    admin_2?: AdminUnitMini | null;
  
    location_updated_at?: string | null;
  
    imei?: string | null;
    sim_number?: string | null;
    phone_model?: string | null;
    last_ip_address?: string | null;
  
    push_token?: string | null;
    platform?: "WEB" | "ANDROID" | "IOS" | null;
    app_version?: string | null;
    last_seen_at?: string | null;
  
    organizations?: Organization[];
    documents?: VerificationDoc[];
  
    settings?: ProfileSettings;
  
    is_active: boolean;
    is_suspended: boolean;
  
    failed_login_attempts: number;
    lock_until?: string | null;
  
    is_staff: boolean;
    is_verified: boolean;
  
    date_joined: string;
    last_updated: string;
  };
  