"use client";

import { FiX } from "react-icons/fi";
import styles from "./styles/HubSelector.module.css";
import type { LGAGroupBlock } from "./HubSelector";

interface Props {
  open: boolean;
  loading?: boolean;
  lgaGroups: LGAGroupBlock[];
  currentLGA: LGAGroupBlock | null;
  onSelect: (lga: LGAGroupBlock) => void;
  onClose: () => void;
}

export default function ChangeLGAModal({
  open,
  loading,
  lgaGroups,
  currentLGA,
  onSelect,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalCard}>
        <header className={styles.modalTop}>
          <div>
            <h3 className={styles.modalTitle}>Change LGA</h3>
            <p className={styles.modalSub}>
              Select the LGA you want to switch to
            </p>
          </div>

          <button className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </header>

        <div className={styles.modalBody}>
          {loading ? (
            <p className={styles.modalEmpty}>Loading…</p>
          ) : (
            <div className={styles.list}>
              {lgaGroups.map((block) => {
                const active = currentLGA?.lga.id === block.lga.id;

                return (
                  <button
                    key={block.lga.id}
                    className={`${styles.listItem} ${active ? styles.activeItem : ""}`}
                    onClick={() => {
                      onSelect(block);
                      onClose();
                    }}
                  >
                    <span className={styles.listItemTitle}>{block.lga.name}</span>
                    {active && <span className={styles.chip}>Current</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
