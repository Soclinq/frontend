"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { authFetch } from "../lib/authFetch";
import { API_BASE_URL } from "../lib/config";

import type { UserProfile } from "@/types/profile";

/* ================= CONTEXT TYPES ================= */

function buildFreshUser(u: any): UserProfile {
  return {
    identity: {
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,

      username: u.username ?? null,
      full_name: u.fullName ?? null,
      photo: null,

      preferred_language: u.preferredLanguage ?? "en",
    },

    role: u.role,

    security: {
      is_active: true,
      is_suspended: false,
      failed_login_attempts: 0,

      is_staff: u.isStaff ?? false,
      is_verified: u.isVerified ?? false,
    },

    location: {
      last_known_location: u.location?.coordinates
        ? {
            lat: u.location.coordinates.lat,
            lng: u.location.coordinates.lng,
          }
        : null,

      location_source: u.location?.source ?? "UNKNOWN",
      location_confidence: u.location?.confidence ?? "LOW",

      admin_0: u.location?.admin?.["0"]
        ? { id: "admin0", name: u.location.admin["0"], level: 0 }
        : null,

      admin_1: u.location?.admin?.["1"]
        ? { id: "admin1", name: u.location.admin["1"], level: 1 }
        : null,

      admin_2: u.location?.admin?.["2"]
        ? { id: "admin2", name: u.location.admin["2"], level: 2 }
        : null,

      location_updated_at: new Date().toISOString(),
    },

    device: {
      platform: "WEB",
    },

    settings: {},

    sos: {
      active: false,
    },

    emergency_contacts: [],

    audit: {
      date_joined: "",
      last_updated: new Date().toISOString(),
    },
  };
}

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/* ================= CONTEXT ================= */

const UserContext = createContext<UserContextType | null>(null);

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}

/* ================= PROVIDER ================= */

export function UserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- Bootstrap session ---------- */
  useEffect(() => {
    refresh();
  }, []);

  /* ---------- Refresh (/auth/me) ---------- */
  const refresh = async () => {
    try {
      const res = await authFetch("/auth/me/");

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      const u = data.user;

      setUser(prev => {
        if (!prev) return buildFreshUser(u); // first load
      
        return {
          ...prev,
      
          identity: {
            ...prev.identity,
            id: u.id,
            email: u.email ?? prev.identity.email,
            phone: u.phone ?? prev.identity.phone,
            username: u.username ?? prev.identity.username,
            full_name: u.fullName ?? prev.identity.full_name,
            preferred_language:
              u.preferredLanguage ?? prev.identity.preferred_language,
          },
      
          role: u.role ?? prev.role,
      
          security: {
            ...prev.security,
            is_staff: u.isStaff ?? prev.security.is_staff,
            is_verified: u.isVerified ?? prev.security.is_verified,
          },
      
          location: {
            ...prev.location,
            last_known_location: u.location?.coordinates
              ? {
                  lat: u.location.coordinates.lat,
                  lng: u.location.coordinates.lng,
                }
              : prev.location.last_known_location,
      
            location_source:
              u.location?.source ?? prev.location.location_source,
      
            location_confidence:
              u.location?.confidence ?? prev.location.location_confidence,
          },
      
          audit: {
            ...prev.audit,
            last_updated: new Date().toISOString(),
          },
        };
      });
      

     
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Login ---------- */
  const login = async (identifier: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }

    await refresh();
  };

  /* ---------- Logout ---------- */
  const logout = async () => {
    try {
      await fetch("/auth/logout/", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
