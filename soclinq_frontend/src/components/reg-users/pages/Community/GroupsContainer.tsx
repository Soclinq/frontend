"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PullToRefresh from "react-simple-pull-to-refresh";

import { usePreciseLocation } from "@/hooks/usePreciseLocation";
import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";

import type { Hub } from "@/types/hub";
import type { PrivateInboxItem } from "@/types/privateInbox";

import { normalizeHub } from "@/components/utils/normalizehub";

import CreateHubModal from "./CreateHubModal";
import type { CreateHubPayload } from "./CreateHubModal";

import InboxRow from "./InboxRow";

import styles from "./styles/GroupsContainer.module.css";

/* ================= TYPES ================= */

export type LGAGroupBlock = {
  lga: { id: string; name: string };
  hubs: Hub[];
};

export type ActiveChat =
  | { kind: "COMMUNITY"; id: string }
  | { kind: "PRIVATE"; id: string }
  | null;

type InboxItem =
  | { kind: "COMMUNITY"; hub: Hub; lastTs: number; lastISO: string | null }
  | { kind: "PRIVATE"; chat: PrivateInboxItem; lastTs: number; lastISO: string | null };

type Props = {
  currentLGA: LGAGroupBlock | null;
  setCurrentLGA: (lga: LGAGroupBlock | null) => void;

  setLgaGroups: (blocks: LGAGroupBlock[]) => void; // ✅ comes from ChatShell

  onOpenChat: (chat: Exclude<ActiveChat, null>) => void;
  searchValue?: string;

  // ✅ Controlled from ChatShell/Header
  createHubModalOpen: boolean;
  setCreateHubModalOpen: (v: boolean) => void;

  // ✅ expose reload to header
  exposeReload?: (fn: () => void) => void;
};

/* ================= HELPERS ================= */

function tsFromISO(iso?: string | null) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayDiffFromNow(iso?: string | null) {
  if (!iso) return 9999;
  const d = new Date(iso);
  const now = new Date();
  return Math.round((startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24));
}

function formatDayLabel(iso?: string | null) {
  if (!iso) return "Older";
  const d = new Date(iso);
  const diff = dayDiffFromNow(iso);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff >= 2 && diff <= 7) return d.toLocaleDateString([], { weekday: "long" });

  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLng / 2);

  const c =
    2 *
    Math.asin(
      Math.sqrt(sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2)
    );

  return R * c;
}

/* ================= COMPONENT ================= */

export default function GroupsContainer({
  currentLGA,
  setCurrentLGA,
  setLgaGroups,
  onOpenChat,
  searchValue = "",

  createHubModalOpen,
  setCreateHubModalOpen,

  exposeReload,
}: Props) {
  const notify = useNotify();
  const { location, loading: locationLoading, source } = usePreciseLocation();

  const [loading, setLoading] = useState(false);
  const [creatingHub, setCreatingHub] = useState(false);

  const [privateInbox, setPrivateInbox] = useState<PrivateInboxItem[]>([]);

  const lastLoadedRef = useRef<{ lat: number; lng: number } | null>(null);

  const disabledAll = loading || creatingHub || locationLoading;

  /* ================= FETCH ================= */

  async function loadCommunities(lat: number, lng: number) {
    const res = await authFetch("/communities/nearby/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, source: source ?? "UNKNOWN" }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Unable to load communities");

    const blocks: LGAGroupBlock[] = (data?.groups ?? []).map((g: any) => ({
      lga: {
        id: String(g?.lga?.id ?? ""),
        name: String(g?.lga?.name ?? ""),
      },
      hubs: Array.isArray(g?.hubs) ? g.hubs.map(normalizeHub) : [],
    }));

    const resolvedLgaId: string | undefined =
      data?.resolvedLocation?.adminUnits?.["2"]?.id;

    return { blocks, resolvedLgaId };
  }

  async function loadPrivateInbox() {
    const res = await authFetch("/communities/private/inbox/", { method: "GET" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return [];
    return (data?.conversations ?? []) as PrivateInboxItem[];
  }

  async function reloadAll() {
    if (!location) return;

    try {
      setLoading(true);

      const [{ blocks, resolvedLgaId }, dmInbox] = await Promise.all([
        loadCommunities(location.lat, location.lng),
        loadPrivateInbox(),
      ]);

      // ✅ store LGAs in ChatShell
      setLgaGroups(blocks);

      // ✅ set DMs
      setPrivateInbox(dmInbox);

      // ✅ auto-select LGA
      const autoSelected =
        (resolvedLgaId && blocks.find((b) => b.lga.id === resolvedLgaId)) ||
        blocks[0];

      setCurrentLGA(autoSelected ?? null);
    } catch {
      notify({
        type: "error",
        title: "Refresh failed",
        message: "Unable to refresh chats.",
      });
    } finally {
      setLoading(false);
    }
  }

  /* ================= EXPOSE RELOAD TO HEADER ================= */

  useEffect(() => {
    exposeReload?.(reloadAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, locationLoading]);

  /* ================= CREATE HUB ================= */

  async function createHub(payload: CreateHubPayload) {
    try {
      setCreatingHub(true);

      const form = new FormData();
      form.append("name", payload.name);
      form.append("category", payload.category);
      form.append("description", payload.description || "");

      if (payload.coverImage) form.append("cover", payload.coverImage);

      const res = await authFetch("/communities/create/", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        notify({
          type: "error",
          title: "Create failed",
          message: data?.error || "Unable to create hub.",
        });
        return;
      }

      notify({
        type: "success",
        title: "Hub created",
        message: `"${data?.name ?? payload.name}" created successfully ✅`,
      });

      await reloadAll();
    } catch {
      notify({
        type: "error",
        title: "Create failed",
        message: "Something went wrong while creating your hub.",
      });
    } finally {
      setCreatingHub(false);
    }
  }

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    if (!location || locationLoading) return;

    reloadAll();
    lastLoadedRef.current = { lat: location.lat, lng: location.lng };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, locationLoading]);

  useEffect(() => {
    if (!location) return;

    const last = lastLoadedRef.current;
    if (!last) return;

    const moved = metersBetween(last, { lat: location.lat, lng: location.lng });

    if (moved > 650) {
      lastLoadedRef.current = { lat: location.lat, lng: location.lng };
      reloadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  /* ================= MIXED INBOX ================= */

  const mixedInbox = useMemo<InboxItem[]>(() => {
    const hubs = currentLGA?.hubs ?? [];

    const communityItems: InboxItem[] = hubs.map((h) => ({
      kind: "COMMUNITY",
      hub: h,
      lastISO: h.last_message_at ?? null,
      lastTs: tsFromISO(h.last_message_at),
    }));

    const privateItems: InboxItem[] = privateInbox.map((c) => ({
      kind: "PRIVATE",
      chat: c,
      lastISO: c.last_message_at ?? null,
      lastTs: tsFromISO(c.last_message_at),
    }));

    const all = [...privateItems, ...communityItems];
    all.sort((a, b) => b.lastTs - a.lastTs);

    return all;
  }, [currentLGA, privateInbox]);

  const filteredInbox = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return mixedInbox;

    return mixedInbox.filter((x) => {
      if (x.kind === "COMMUNITY") {
        return (x.hub.name || "").toLowerCase().includes(q);
      }

      return (
        (x.chat.other_user?.name || "").toLowerCase().includes(q) ||
        (x.chat.last_message_text || "").toLowerCase().includes(q)
      );
    });
  }, [mixedInbox, searchValue]);

  /* ================= RENDER ================= */

  return (
    <div className={styles.page}>
      <section className={styles.listArea}>
        {/* ✅ Pull down / swipe down refresh */}
        <PullToRefresh
          onRefresh={reloadAll}
          pullDownThreshold={90}
          isPullable={!disabledAll}
        >
          {filteredInbox.length === 0 ? (
            <p className={styles.empty}>
              {disabledAll ? "Loading chats…" : "No chats yet"}
            </p>
          ) : (
            <div className={styles.rows}>
              {(() => {
                let lastLabel = "";

                return filteredInbox.map((item) => {
                  const label = formatDayLabel(item.lastISO);
                  const showDivider = label !== lastLabel;
                  lastLabel = label;

                  const key =
                    item.kind === "COMMUNITY"
                      ? `c_${item.hub.id}`
                      : `p_${item.chat.conversation_id}`;

                  return (
                    <div key={key}>
                      {showDivider && (
                        <div className={styles.dayDivider}>
                          <span>{label}</span>
                        </div>
                      )}

                      {item.kind === "COMMUNITY" ? (
                        <InboxRow
                          kind="COMMUNITY"
                          hub={item.hub}
                          active={false}
                          onClick={() =>
                            onOpenChat({ kind: "COMMUNITY", id: item.hub.id })
                          }
                        />
                      ) : (
                        <InboxRow
                          kind="PRIVATE"
                          chat={item.chat}
                          active={false}
                          onClick={() =>
                            onOpenChat({
                              kind: "PRIVATE",
                              id: item.chat.conversation_id,
                            })
                          }
                        />
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </PullToRefresh>
      </section>

      {/* ✅ Create hub modal controlled from ChatShell/Header */}
      <CreateHubModal
        open={createHubModalOpen}
        currentLGA={currentLGA as any}
        creating={creatingHub}
        onClose={() => setCreateHubModalOpen(false)}
        onSubmit={async (payload) => {
          await createHub(payload);
          setCreateHubModalOpen(false);
        }}
      />
    </div>
  );
}
