"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authFetch } from "../lib/authFetch";
import { API_BASE_URL } from "../lib/config";

/* ---------------- Types ---------------- */

export type UserRole = "USER" | "ORG" | "ADMIN";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}
export type SosRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface AuthUser {
  /* ===== AUTH / IDENTITY ===== */
  id: string;
  email?: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;

  /* ===== PROFILE ===== */
  photo?: string | null;
  phoneVerified?: boolean;

  /* ===== SAFETY / SETTINGS ===== */
  trackingEnabled: boolean;
  locationEnabled: boolean;

  /* ===== EMERGENCY ===== */
  emergencyContacts: EmergencyContact[];

  /* ===== SOS (READ-ONLY) ===== */
  sosActive?: boolean;
  sosRisk?: SosRiskLevel;
  sosStatus?: string;
}


interface UserContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;

  /* ===== AUTH ACTIONS ===== */
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/* ---------------- Context ---------------- */

export const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return ctx;
};

/* ---------------- Provider ---------------- */

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* -------- Session bootstrap (/me) -------- */
  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const res = await authFetch("/auth/me/");

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      


      /**
       * 🔐 IMPORTANT:
       * We normalize backend response so
       * missing fields never break UI
       */
      const normalizedUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        fullName: data.user.fullName,
        role: data.user.role,
        isVerified: data.user.isVerified,
      
        /* ===== PROFILE ===== */
        photo: data.user.photo ?? null,
        phoneVerified: data.user.phoneVerified ?? false,
      
        /* ===== SAFETY ===== */
        trackingEnabled: data.user.trackingEnabled ?? true,
        locationEnabled: data.user.locationEnabled ?? false,
      
        /* ===== EMERGENCY ===== */
        emergencyContacts: data.user.emergencyContacts ?? [],
      
        /* ===== SOS (READ-ONLY) ===== */
        sosActive: data.user.sosActive ?? false,
        sosRisk: data.user.sosRisk ?? "LOW",
        sosStatus: data.user.sosStatus ?? "Idle",
      };
      

      setUser(normalizedUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* -------- Login -------- */
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

  /* -------- Logout -------- */
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
        isAuthenticated: !!user,
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
