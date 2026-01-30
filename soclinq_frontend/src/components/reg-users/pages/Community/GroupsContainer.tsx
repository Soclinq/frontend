"use client";

import { useEffect, useMemo, useState } from "react";
import { usePreciseLocation } from "@/hooks/usePreciseLocation";
import { useNotify } from "@/components/utils/NotificationContext";
import { authFetch } from "@/lib/authFetch";
import type { CreateHubPayload } from "./CreateHubModal";

import HubSelector from "./HubSelector";
import ChatView from "./ChatView";

/* ================= TYPES ================= */

export type Subgroup = {
  id: string;
  name: string;
};

export type LGAGroupBlock = {
  lga: {
    id: string;
    name: string;
  };
  hub: {
    id: string;
    name: string;
    type: "SYSTEM";
  };
};

export type Group = {
  id: string;
  name: string;
  type: "LGA_MAIN" | "SUBGROUP";
};

type ViewMode = "GROUPS" | "CHAT";

/* ================= COMPONENT ================= */

export default function GroupsContainer() {
  const notify = useNotify();
  const { location, loading: locationLoading, source } = usePreciseLocation();

  const [hubOpen, setHubOpen] = useState(true);

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
  
    if (!res.ok) throw new Error();
  
    const data = await res.json();
  
    const blocks: LGAGroupBlock[] = data.groups ?? [];
  
    const resolvedLgaId: string | undefined =
      data?.resolvedLocation?.adminUnits?.["2"]?.id;
  
    return { blocks, resolvedLgaId };
  }
  


async function createHub(payload: CreateHubPayload) {
  try {
    setCreatingHub(true);

    const form = new FormData();
    form.append("name", payload.name);
    form.append("category", payload.category);
    form.append("description", payload.description || "");

    if (payload.coverImage) {
      form.append("cover", payload.coverImage);
    }

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

    // ✅ optionally reload communities
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


  useEffect(() => {
    if (!location || locationLoading) return;
    const { lat, lng } = location;

    async function load() {
      try {
        setLoading(true);


        const { blocks, resolvedLgaId } = await loadCommunities(lat, lng);

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

        // ✅ select based on resolved LGA (ADMIN_2)
        const autoSelected =
          (resolvedLgaId && blocks.find((b) => b.lga.id === resolvedLgaId)) || blocks[0];

        setCurrentLGA(autoSelected);

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

  /* ================= DERIVED GROUPS ================= */

  const groups: Group[] = useMemo(() => {
    if (!currentLGA) return [];

    return [
      {
        id: currentLGA.hub.id,
        name: currentLGA.hub.name,
        type: "LGA_MAIN",
      },
    ];
  }, [currentLGA]);

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
      onSelectGroup={(group) => {
        openChat(group);
      }}
      onSwitchLGA={switchLGA}
    />
  ) : (
    <ChatView groupId={activeGroupId!} onBack={backToGroups} />
  );
}
