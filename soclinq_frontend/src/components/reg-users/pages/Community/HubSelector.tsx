"use client";

import {
  FiMapPin,
  FiPlus,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiX,
  FiLayers,
} from "react-icons/fi";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/HubSelector.module.css";

import ChangeLGAModal from "./ChangeLGAModal";
import CreateHubModal from "./CreateHubModal";
import type { CreateHubPayload } from "./CreateHubModal";

import HubCard from "./HubCard"; // ✅ NEW
import type { Hub } from "@/types/hub"; // ✅ Official Hub type

/* ================= TYPES ================= */

export type LGAGroupBlock = {
  lga: { id: string; name: string };
  hubs: Hub[];
};

export type Group = {
  id: string;
  name: string;
  type: "LGA_MAIN";
};

export type HubSearchItem = {
  id: string;
  name: string;
  lga?: { id: string; name: string };
};

interface Props {
  open: boolean;
  loading: boolean;
  lgaGroups: LGAGroupBlock[];
  currentLGA: LGAGroupBlock | null;

  onSelectGroup: (group: Group) => void;
  onSwitchLGA: (lga: LGAGroupBlock) => void;

  onCreateHub: (payload: CreateHubPayload) => Promise<void>;
  creatingHub: boolean;

  searchHubs: (q: string) => Promise<HubSearchItem[]>;
}

export default function HubSelector({
  open,
  loading,
  lgaGroups,
  currentLGA,
  onSelectGroup,
  onSwitchLGA,
  onCreateHub,
  creatingHub,
  searchHubs,
}: Props) {
  const [changeLGAModalOpen, setChangeLGAModalOpen] = useState(false);
  const [createHubModalOpen, setCreateHubModalOpen] = useState(false);

  const [hubQuery, setHubQuery] = useState("");
  const [hubResults, setHubResults] = useState<HubSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  if (!open) return null;

  const disabledAll = loading || creatingHub;
  const trimmed = useMemo(() => hubQuery.trim(), [hubQuery]);

  const hubs = useMemo(() => currentLGA?.hubs ?? [], [currentLGA]);

  const joinedFirst = useMemo(() => {
    // ✅ joined hubs first (better UX)
    return [...hubs].sort(
      (a, b) => Number(b.user_joined) - Number(a.user_joined)
    );
  }, [hubs]);

  /* ✅ Auto search */
  useEffect(() => {
    if (!open) return;

    if (!trimmed) {
      setHubResults([]);
      setSearching(false);
      return;
    }

    let alive = true;

    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await searchHubs(trimmed);
        if (!alive) return;
        setHubResults(res || []);
        setShowDropdown(true);
      } catch {
        if (!alive) return;
        setHubResults([]);
      } finally {
        if (!alive) return;
        setSearching(false);
      }
    }, 320);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [trimmed, open, searchHubs]);

  /* ✅ Close dropdown outside */
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function openHubChat(hub: Hub) {
    onSelectGroup({
      id: hub.id,
      name: hub.name,
      type: "LGA_MAIN",
    });
  }

  function openSearchedHubChat(hub: HubSearchItem) {
    onSelectGroup({
      id: hub.id,
      name: hub.name,
      type: "LGA_MAIN",
    });

    setHubQuery("");
    setHubResults([]);
    setShowDropdown(false);
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalLarge}>
        {/* ================= HEADER ================= */}
        <header className={styles.topHeader}>
          <button
            type="button"
            className={styles.lgaHeaderBtn}
            disabled={disabledAll}
            onClick={() => setChangeLGAModalOpen(true)}
          >
            <div className={styles.lgaInfo}>
              <FiMapPin className={styles.lgaIcon} />

              <div className={styles.lgaText}>
                <h3 className={styles.lgaName}>
                  {currentLGA?.lga.name ?? "Select your LGA"}
                </h3>
                <p className={styles.lgaMeta}>Choose a community hub</p>
              </div>
            </div>

            <span className={styles.lgaArrow}>
              <FiChevronUp />
              <FiChevronDown />
            </span>
          </button>

          {/* ================= SEARCH ================= */}
          <div className={styles.searchWrap} ref={dropdownRef}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />

              <input
                className={styles.searchInput}
                placeholder="Search hubs..."
                value={hubQuery}
                disabled={disabledAll}
                onChange={(e) => {
                  setHubQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  if (trimmed) setShowDropdown(true);
                }}
              />

              {!!hubQuery && !disabledAll && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setHubQuery("");
                    setHubResults([]);
                    setShowDropdown(false);
                  }}
                >
                  <FiX />
                </button>
              )}
            </div>

            {showDropdown && trimmed && !disabledAll && (
              <div className={styles.searchDropdown}>
                {searching ? (
                  <div className={styles.dropItemMuted}>Searching…</div>
                ) : hubResults.length === 0 ? (
                  <div className={styles.dropItemMuted}>No hubs found</div>
                ) : (
                  hubResults.map((hub) => (
                    <button
                      key={hub.id}
                      type="button"
                      className={styles.dropItem}
                      onClick={() => openSearchedHubChat(hub)}
                    >
                      <FiLayers className={styles.dropIcon} />
                      <div className={styles.dropText}>
                        <span className={styles.dropName}>{hub.name}</span>
                        {hub.lga?.name && (
                          <span className={styles.dropMeta}>{hub.lga.name}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        {/* ================= ACTIONS ================= */}
        <div className={styles.actionRow}>
          <button
            className={styles.actionBtnPrimary}
            disabled={!currentLGA || disabledAll}
            onClick={() => setCreateHubModalOpen(true)}
          >
            <FiPlus />
            <span>Create Hub</span>
          </button>
        </div>

        {/* ================= HUB LIST ================= */}
        <section className={styles.hubListWrap}>
          {loading ? (
            <p className={styles.empty}>Loading hubs…</p>
          ) : !currentLGA ? (
            <p className={styles.empty}>Select an LGA to continue</p>
          ) : joinedFirst.length === 0 ? (
            <p className={styles.empty}>No hubs found in this LGA</p>
          ) : (
            <div className={styles.hubGrid}>
              {joinedFirst.map((hub) => (
                <HubCard
                  key={hub.id}
                  hub={hub}
                  onJoin={() => openHubChat(hub)} // ✅ for now same click
                  onOpen={() => openHubChat(hub)}
                  disabled={disabledAll} // ✅ optional prop (see HubCard below)
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <ChangeLGAModal
        open={changeLGAModalOpen}
        loading={loading}
        lgaGroups={lgaGroups}
        currentLGA={currentLGA}
        onSelect={(lga) => {
          onSwitchLGA(lga);
          setChangeLGAModalOpen(false);
        }}
        onClose={() => setChangeLGAModalOpen(false)}
      />

      <CreateHubModal
        open={createHubModalOpen}
        currentLGA={currentLGA as any}
        creating={creatingHub}
        onClose={() => setCreateHubModalOpen(false)}
        onSubmit={async (payload) => {
          await onCreateHub(payload);
          setCreateHubModalOpen(false);
        }}
      />
    </div>
  );
}
