"use client";

import { useEffect, useState } from "react";
import { usePreciseLocation } from "@/hooks/usePreciseLocation";
import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";
import type { CreateHubPayload } from "./CreateHubModal";
import { normalizeHub } from "@/components/utils/normalizehub";
import HubSelector from "./HubSelector";
import ChatView from "./ChatView";

/* ================= TYPES ================= */

export type Hub = {
  id: string;
  name: string;
  type: "SYSTEM" | "LOCAL";
  joined: boolean;
  role: "MEMBER" | "LEADER" | "MODERATOR" | null;
};

export type LGAGroupBlock = {
  lga: {
    id: string;
    name: string;
  };
  hubs: Hub[];
};

export type Group = {
  id: string;
  name: string;
  type: "LGA_MAIN";
};

type ViewMode = "GROUPS" | "CHAT";

/* ✅ search result item */
export type HubSearchItem = {
  id: string;
  name: string;

  // optional (nice for UI)
  lga?: { id: string; name: string };
};

/* ================= COMPONENT ================= */

export default function GroupsContainer() {
  const notify = useNotify();
  const { location, loading: locationLoading, source } = usePreciseLocation();

  const [hubOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [creatingHub, setCreatingHub] = useState(false);

  const [lgaGroups, setLgaGroups] = useState<LGAGroupBlock[]>([]);
  const [currentLGA, setCurrentLGA] = useState<LGAGroupBlock | null>(null);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("GROUPS");

  /* ================= LOAD COMMUNITIES ================= */

  async function loadCommunities(lat: number, lng: number) {
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

    if (!res.ok) throw new Error(data?.error || "Unable to load communities");

    // ✅ ensure correct shape always
    const blocks: LGAGroupBlock[] = (data?.groups ?? []).map((g: any) => ({
      lga: {
        id: g.lga.id,
        name: g.lga.name,
      },
      hubs: Array.isArray(g.hubs)
        ? g.hubs.map(normalizeHub)
        : [],
    }));
    
    const resolvedLgaId: string | undefined =
      data?.resolvedLocation?.adminUnits?.["2"]?.id;

    return { blocks, resolvedLgaId };
  }

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

      // ✅ reload communities after creating hub
      if (location) {
        const { blocks, resolvedLgaId } = await loadCommunities(
          location.lat,
          location.lng
        );

        setLgaGroups(blocks);

        const autoSelected =
          (resolvedLgaId && blocks.find((b) => b.lga.id === resolvedLgaId)) ||
          blocks[0];

        setCurrentLGA(autoSelected ?? null);
      }
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

  /* ================= HUB SEARCH ENDPOINT ================= */
  async function searchHubs(q: string): Promise<HubSearchItem[]> {
    try {
      const res = await authFetch(
        `/communities/search/?q=${encodeURIComponent(q)}`,
        { method: "GET" }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return [];

      // ✅ backend recommended: { hubs: [{id,name,lga:{id,name}}] }
      return (data?.hubs ?? []).map((h: any) => ({
        id: String(h?.id ?? ""),
        name: String(h?.name ?? ""),
        lga: h?.lga?.id
          ? { id: String(h.lga.id), name: String(h.lga.name ?? "") }
          : undefined,
      }));
    } catch {
      return [];
    }
  }

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    if (!location || locationLoading) return;

    async function load() {
      try {
        setLoading(true);

        const { blocks, resolvedLgaId } = await loadCommunities(
          location.lat,
          location.lng
        );

        if (!blocks.length) {
          notify({
            type: "warning",
            title: "No communities",
            message: "No communities found near you.",
            duration: 4000,
          });
          return;
        }

        setLgaGroups(blocks);

        const autoSelected =
          (resolvedLgaId && blocks.find((b) => b.lga.id === resolvedLgaId)) ||
          blocks[0];

        setCurrentLGA(autoSelected ?? null);
        setViewMode("GROUPS");
        setActiveGroupId(null);
      } catch {
        notify({
          type: "error",
          title: "Location error",
          message: "Unable to load communities.",
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [location, locationLoading, source, notify]);

  /* ================= HANDLERS ================= */

  function openChat(group: Group) {
    setActiveGroupId(group.id);
    setViewMode("CHAT");
  }

  function backToGroups() {
    setViewMode("GROUPS");
  }

  function switchLGA(block: LGAGroupBlock) {
    setCurrentLGA(block);
    setViewMode("GROUPS");
    setActiveGroupId(null);
  }

  /* ================= RENDER ================= */

  return viewMode === "GROUPS" ? (
    <HubSelector
      open={hubOpen}
      loading={loading || locationLoading}
      lgaGroups={lgaGroups}
      currentLGA={currentLGA}
      creatingHub={creatingHub}
      onCreateHub={createHub}
      onSelectGroup={(group) => openChat(group)}
      onSwitchLGA={switchLGA}
      searchHubs={searchHubs}
    />
  ) : (
    <ChatView groupId={activeGroupId!} onBack={backToGroups} />
  );
}
