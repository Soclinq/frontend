"use client";

import { useCallback, useEffect, useState } from "react";

import ProfileTabs, { type ProfileTabKey } from "./ProfileTabs";

import { authFetch } from "@/lib/authFetch";
import { profileAdapter } from "@/lib/profileAdapter";
import { normalizeProfile } from "@/components/utils/normalizeProfile";
import type { UserProfile } from "@/types/profile";
import type { UserProfileApi } from "@/types/profileApi";

type PatchFn = (prev: UserProfile) => UserProfile;

export default function ProfileTabsContainer() {
  const [tab, setTab] = useState<ProfileTabKey>("account");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ✅ optional but useful
  const [error, setError] = useState<string | null>(null);

  const patchProfile = useCallback((fn: PatchFn) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return fn(prev);
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const res = await authFetch(profileAdapter.me(), { method: "GET" });
      const raw = (await res.json().catch(() => ({}))) as Partial<UserProfileApi>;

      if (!res.ok) {
        setError((raw as any)?.error || "Failed to refresh profile.");
        setProfile(null);
        return;
      }

      
      console.log(raw)
      setProfile(normalizeProfile(raw as UserProfileApi));
      console.log(profile)
    } catch {
      setError("Network error while refreshing profile.");
      setProfile(null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ✅ initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshProfile();
      setLoading(false);
    })();
  }, [refreshProfile]);

  if (loading) return <div style={{ padding: 16 }}>Loading profile…</div>;
  if (error) return <div style={{ padding: 16, color: "red" }}>{error}</div>;
  if (!profile) return <div style={{ padding: 16 }}>No profile found.</div>;

  return (
    <ProfileTabs
      tab={tab}
      setTab={setTab}
      profile={profile}
      patchProfile={patchProfile}
      refreshProfile={refreshProfile}
      refreshing={refreshing}
    />
  );
}
