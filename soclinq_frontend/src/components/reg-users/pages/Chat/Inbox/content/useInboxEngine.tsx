"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePreciseLocation } from "@/hooks/usePreciseLocation";
import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";

import type { Hub } from "@/types/hub";
import type { PrivateInboxItem } from "@/types/privateInbox";

import { normalizeHub } from "@/components/utils/normalizehub";
import { useChatUI } from "../state/ChatUIContext";

/* ================= TYPES ================= */

export type InboxItem =
  | {
      key: string;
      kind: "COMMUNITY";
      hub: Hub;
      lastTs: number;
    }
  | {
      key: string;
      kind: "PRIVATE";
      chat: PrivateInboxItem;
      lastTs: number;
    };

type UseInboxEngineArgs = {
  searchValue?: string;
  exposeReload?: (fn: () => void) => void;
};

/* ================= HELPERS ================= */

function tsFromISO(iso?: string | null) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/* ================= HOOK ================= */

export default function useInboxEngine({
  searchValue = "",
  exposeReload,
}: UseInboxEngineArgs) {
  const notify = useNotify();
  const ui = useChatUI();
  const { location, loading: locationLoading, source } = usePreciseLocation();

  const [loadingPrivate, setLoadingPrivate] = useState(false);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [privateInbox, setPrivateInbox] = useState<PrivateInboxItem[]>([]);

  const lastLoadedRef = useRef<string | null>(null);

  const loading = loadingPrivate || loadingCommunities;
  const disabled = loading || locationLoading;

  /* ================= FETCH ================= */

  const loadCommunities = useCallback(
    async (lat: number, lng: number) => {
      const res = await authFetch("/communities/nearby/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          source: source ?? "UNKNOWN",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("Unable to load communities");

      const blocks =
        (data?.groups ?? []).map((g: any) => ({
          lga: g.lga,
          hubs: Array.isArray(g.hubs) ? g.hubs.map(normalizeHub) : [],
        })) ?? [];

      const resolvedId = data?.resolvedLocation?.adminUnits?.["2"]?.id;

      ui.setInboxLGAs(blocks, resolvedId);
    },
    [source, ui] // ✅ FIXED
  );

  const loadPrivateInbox = useCallback(async () => {
    const res = await authFetch("/communities/private/inbox/");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error("Unable to load private inbox");
    return (data?.conversations ?? []) as PrivateInboxItem[];
  }, []);

  /* ================= SAFE LOADERS ================= */

  const loadPrivateNow = useCallback(async () => {
    try {
      setLoadingPrivate(true);
      const privates = await loadPrivateInbox();
      setPrivateInbox(privates);
    } catch {
      notify({
        type: "error",
        title: "Refresh failed",
        message: "Unable to refresh inbox.",
      });
    } finally {
      setLoadingPrivate(false);
    }
  }, [loadPrivateInbox, notify]);

  const loadCommunitiesNow = useCallback(async () => {
    if (!location) return;

    try {
      setLoadingCommunities(true);
      await loadCommunities(location.lat, location.lng);
    } catch {
      notify({
        type: "error",
        title: "Refresh failed",
        message: "Unable to refresh inbox.",
      });
    } finally {
      setLoadingCommunities(false);
    }
  }, [location, loadCommunities, notify]);

  /* ================= RELOAD ================= */

  const reload = useCallback(async () => {
    await Promise.allSettled([
      loadPrivateNow(),
      loadCommunitiesNow(),
    ]);
  }, [loadPrivateNow, loadCommunitiesNow]);

  /* ================= EXPOSE RELOAD ================= */

  useEffect(() => {
    exposeReload?.(reload);
  }, [reload, exposeReload]);

  /* ================= AUTO LOAD ================= */

  // Load private inbox once (no location needed)
  useEffect(() => {
    void loadPrivateNow();
  }, [loadPrivateNow]);

  // Load communities when location stabilizes
  useEffect(() => {
    if (!location || locationLoading) return;

    const key = `${location.lat}:${location.lng}`;
    if (lastLoadedRef.current === key) return;

    lastLoadedRef.current = key;

    void loadCommunitiesNow();
  }, [location, locationLoading, loadCommunitiesNow]);

  /* ================= BUILD INBOX ================= */

  const inboxItems = useMemo<InboxItem[]>(() => {
    const hubs = ui.currentLGA?.hubs ?? [];

    const communityItems: InboxItem[] = hubs.map((h) => ({
      key: `c_${h.id}`,
      kind: "COMMUNITY",
      hub: h,
      lastTs: tsFromISO(h.last_message_at),
    }));

    const privateItems: InboxItem[] = privateInbox.map((c) => ({
      key: `p_${c.conversation_id}`,
      kind: "PRIVATE",
      chat: c,
      lastTs: tsFromISO(c.last_message_at),
    }));

    return [...communityItems, ...privateItems].sort(
      (a, b) => b.lastTs - a.lastTs
    );
  }, [ui.currentLGA, privateInbox]);

  /* ================= SEARCH ================= */

  const filteredInbox = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return inboxItems;

    return inboxItems.filter((item) =>
      item.kind === "COMMUNITY"
        ? item.hub.name.toLowerCase().includes(q)
        : item.chat.other_user?.name?.toLowerCase().includes(q)
    );
  }, [inboxItems, searchValue]);

  return {
    inboxItems: filteredInbox,
    reload,
    disabled,
    loading,
  };
}
