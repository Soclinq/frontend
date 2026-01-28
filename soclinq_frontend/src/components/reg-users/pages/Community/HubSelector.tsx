"use client";

import {
  FiMapPin,
  FiChevronRight,
  FiLayers,
  FiPlus,
} from "react-icons/fi";
import { useState } from "react";
import styles from "./styles/HubSelector.module.css";

import ChangeLGAModal from "./ChangeLGAModal";
import CreateHubModal from "./CreateHubModal";
import type { CreateHubPayload } from "./CreateHubModal";

/* ================= TYPES ================= */

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
  type: "LGA_MAIN";
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
}: Props) {
  const [changeLGAModalOpen, setChangeLGAModalOpen] = useState(false);
  const [createHubModalOpen, setCreateHubModalOpen] = useState(false);

  if (!open) return null;

  const disabledAll = loading || creatingHub;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalLarge}>
        {/* Header */}
        <header className={styles.modalHeader}>
          <div className={styles.lgaInfo}>
            <FiMapPin className={styles.lgaIcon} />
            <div>
              <h3 className={styles.lgaName}>
                {currentLGA?.lga.name ?? "Select your LGA"}
              </h3>
              <p className={styles.lgaMeta}>Community hub</p>
            </div>
          </div>
        </header>

        {/* Actions */}
        <div className={styles.actionRow}>
          <button
            className={styles.actionBtn}
            disabled={!currentLGA || disabledAll}
            onClick={() => setChangeLGAModalOpen(true)}
          >
            <FiChevronRight />
            <span>Change LGA</span>
          </button>

          <button
            className={styles.actionBtnPrimary}
            disabled={!currentLGA || disabledAll}
            onClick={() => setCreateHubModalOpen(true)}
          >
            <FiPlus />
            <span>Create Hub</span>
          </button>
        </div>

        {/* Hub List */}
        <div className={styles.groupList}>
          {loading ? (
            <p className={styles.empty}>Loading communities…</p>
          ) : !currentLGA ? (
            <p className={styles.empty}>Select an LGA to continue</p>
          ) : (
            <button
              className={styles.groupRow}
              disabled={disabledAll}
              onClick={() =>
                onSelectGroup({
                  id: currentLGA.hub.id,
                  name: currentLGA.hub.name,
                  type: "LGA_MAIN",
                })
              }
            >
              <FiLayers className={styles.groupIcon} />
              <div>
                <span className={styles.groupName}>{currentLGA.hub.name}</span>
                <span className={styles.badge}>LGA Community</span>
              </div>
            </button>
          )}
        </div>
      </div>

      <ChangeLGAModal
        open={changeLGAModalOpen}
        loading={loading}
        lgaGroups={lgaGroups}
        currentLGA={currentLGA}
        onSelect={onSwitchLGA}
        onClose={() => setChangeLGAModalOpen(false)}
      />

      <CreateHubModal
        open={createHubModalOpen}
        currentLGA={currentLGA}
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
