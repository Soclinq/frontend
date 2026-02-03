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

type SelectionKind = "GROUP_ONLY" | "PRIVATE_ONLY" | "MIXED";

type Props = {
  currentLGA: LGAGroupBlock | null;
  setCurrentLGA: (lga: LGAGroupBlock | null) => void;

  setLgaGroups: (blocks: LGAGroupBlock[]) => void;

  onOpenChat: (chat: Exclude<ActiveChat, null>) => void;
  searchValue?: string;

  createHubModalOpen: boolean;
  setCreateHubModalOpen: (v: boolean) => void;

  exposeReload?: (fn: () => void) => void;

  // ✅ this controls UnifiedHeader selection mode (replaces header instantly)
  onSelectionChange?: (payload: {
    active: boolean;
    count: number;

    context: "INBOX";

    kind: SelectionKind;
    canDelete: boolean;
    markLabel: string;

    onExit: () => void;

    onSelectAll: () => void;
    onUnselectAll: () => void;

    onPin: () => void;
    onMute: () => void;
    onArchive: () => void;
    onMarkReadUnread: () => void;

    // ✅ GROUP actions
    onOpenGroupInfo?: () => void;
    onExitGroup?: () => void;
    onShareGroup?: () => void;

    // ✅ PRIVATE actions
    onViewContact?: () => void;
    onBlockContact?: () => void;

    // ✅ delete (top outside more)
    onDelete?: () => void;
  }) => void;
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

  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
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

function safeBool(v: any) {
  return v === true;
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
  onSelectionChange,
}: Props) {
  const notify = useNotify();
  const { location, loading: locationLoading, source } = usePreciseLocation();

  const [loading, setLoading] = useState(false);
  const [creatingHub, setCreatingHub] = useState(false);

  const [privateInbox, setPrivateInbox] = useState<PrivateInboxItem[]>([]);
  const lastLoadedRef = useRef<{ lat: number; lng: number } | null>(null);

  const disabledAll = loading || creatingHub || locationLoading;

  /* ================= SELECT MODE ================= */

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selecting = selectedKeys.size > 0;

  const clearSelection = () => setSelectedKeys(new Set());

  const keyOf = (item: InboxItem) =>
    item.kind === "COMMUNITY" ? `c_${item.hub.id}` : `p_${item.chat.conversation_id}`;

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
      lga: { id: String(g?.lga?.id ?? ""), name: String(g?.lga?.name ?? "") },
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

      setLgaGroups(blocks);
      setPrivateInbox(dmInbox);

      const autoSelected =
        (resolvedLgaId && blocks.find((b) => b.lga.id === resolvedLgaId)) || blocks[0];

      setCurrentLGA(autoSelected ?? null);

      clearSelection();
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
      if (x.kind === "COMMUNITY") return (x.hub.name || "").toLowerCase().includes(q);

      return (
        (x.chat.other_user?.name || "").toLowerCase().includes(q) ||
        (x.chat.last_message_text || "").toLowerCase().includes(q)
      );
    });
  }, [mixedInbox, searchValue]);

  /* ================= SELECTION META ================= */

  const selectedItems = useMemo(() => {
    if (!selecting) return [];
    const map = new Map(filteredInbox.map((i) => [keyOf(i), i]));
    return Array.from(selectedKeys)
      .map((k) => map.get(k))
      .filter(Boolean) as InboxItem[];
  }, [selecting, selectedKeys, filteredInbox]);

  const selectionKind = useMemo<SelectionKind>(() => {
    if (selectedItems.length === 0) return "MIXED";
    const hasGroup = selectedItems.some((i) => i.kind === "COMMUNITY");
    const hasPrivate = selectedItems.some((i) => i.kind === "PRIVATE");
    if (hasGroup && hasPrivate) return "MIXED";
    if (hasGroup) return "GROUP_ONLY";
    return "PRIVATE_ONLY";
  }, [selectedItems]);

  const anyUnreadSelected = useMemo(() => {
    return selectedItems.some((i) => {
      const unread = i.kind === "COMMUNITY" ? i.hub.unread_count ?? 0 : i.chat.unread_count ?? 0;
      return unread > 0;
    });
  }, [selectedItems]);

  const markLabel = anyUnreadSelected ? "Mark as read" : "Mark as unread";

  const canDelete = useMemo(() => {
    if (selectedItems.length === 0) return false;

    if (selectionKind === "PRIVATE_ONLY") return true;

    if (selectionKind === "GROUP_ONLY") {
      return selectedItems.every((i) => {
        if (i.kind !== "COMMUNITY") return false;
        const h: any = i.hub;
        return safeBool(h?.has_left) || h?.is_member === false;
      });
    }

    return false;
  }, [selectedItems, selectionKind]);

  /* ================= ACTIONS (SAFE PLACEHOLDER) ================= */

  function safeToast(title: string, message: string) {
    notify({ type: "success", title, message });
  }

  function handlePinSelected() {
    safeToast("Pinned", "Pinned selected chats ✅");
    clearSelection();
  }

  function handleMuteSelected() {
    safeToast("Muted", "Muted selected chats ✅");
    clearSelection();
  }

  function handleArchiveSelected() {
    safeToast("Archived", "Archived selected chats ✅");
    clearSelection();
  }

  function handleMarkReadUnread() {
    safeToast(markLabel, `${markLabel} ✅`);
    clearSelection();
  }

  function handleDeleteSelected() {
    safeToast("Deleted", "Deleted selected chats ✅");
    clearSelection();
  }

  function handleGroupInfo() {
    notify({ type: "info", title: "Group info", message: "Open group info" });
    clearSelection();
  }

  function handleExitGroup() {
    notify({ type: "warning", title: "Exit group", message: "You left the group" });
    clearSelection();
  }

  function handleViewContact() {
    notify({ type: "info", title: "Contact", message: "Open contact profile" });
    clearSelection();
  }

  function handleBlockContact() {
    notify({ type: "warning", title: "Blocked", message: "Contact blocked" });
    clearSelection();
  }

  function handleShareGroup() {
    notify({ type: "info", title: "Share Group", message: "Share group link / invite" });
    clearSelection();
  }

  /* ================= SELECTION -> PARENT HEADER ================= */

  useEffect(() => {
    if (!onSelectionChange) return;

    onSelectionChange({
      active: selecting,
      count: selectedKeys.size,

      context: "INBOX",
      kind: selectionKind,
      canDelete,
      markLabel,

      onExit: clearSelection,

      onSelectAll: () => setSelectedKeys(new Set(filteredInbox.map(keyOf))),
      onUnselectAll: clearSelection,

      onPin: handlePinSelected,
      onMute: handleMuteSelected,
      onArchive: handleArchiveSelected,
      onMarkReadUnread: handleMarkReadUnread,

      // group actions
      onOpenGroupInfo: selectionKind === "GROUP_ONLY" ? handleGroupInfo : undefined,
      onExitGroup: selectionKind === "GROUP_ONLY" ? handleExitGroup : undefined,
      onShareGroup: selectionKind === "GROUP_ONLY" ? handleShareGroup : undefined,

      // private actions
      onViewContact: selectionKind === "PRIVATE_ONLY" ? handleViewContact : undefined,
      onBlockContact: selectionKind === "PRIVATE_ONLY" ? handleBlockContact : undefined,

      // delete
      onDelete: canDelete ? handleDeleteSelected : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecting, selectedKeys.size, selectionKind, canDelete, markLabel, filteredInbox]);

  /* ================= RENDER ================= */

  return (
    <div className={[styles.page, selecting ? styles.selecting : ""].join(" ")}>
      <section className={styles.listArea}>
        <PullToRefresh
          onRefresh={reloadAll}
          pullDownThreshold={90}
          isPullable={!disabledAll && !selecting}
        >
          {filteredInbox.length === 0 ? (
            <p className={styles.empty}>{disabledAll ? "Loading chats…" : "No chats yet"}</p>
          ) : (
            <div className={styles.rows}>
              {(() => {
                let lastLabel = "";

                return filteredInbox.map((item) => {
                  const key = keyOf(item);
                  const isSelected = selectedKeys.has(key);

                  const label = formatDayLabel(item.lastISO);
                  const showDivider = label !== lastLabel;
                  lastLabel = label;

                  return (
                    <div key={key}>
                      <div
                        className={[
                          styles.rowWrap,
                          isSelected ? styles.rowSelected : "",
                        ].join(" ")}
                      >
                        <InboxRow
                          {...(item.kind === "COMMUNITY"
                            ? { kind: "COMMUNITY" as const, hub: item.hub }
                            : { kind: "PRIVATE" as const, chat: item.chat })}
                          active={false}
                          selected={isSelected}
                          onClick={() => {
                            if (selecting) {
                              toggleSelect(key);
                              return;
                            }

                            if (item.kind === "COMMUNITY") {
                              onOpenChat({ kind: "COMMUNITY", id: item.hub.id });
                            } else {
                              onOpenChat({
                                kind: "PRIVATE",
                                id: item.chat.conversation_id,
                              });
                            }
                          }}
                          onLongPress={() => toggleSelect(key)}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </PullToRefresh>
      </section>

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
