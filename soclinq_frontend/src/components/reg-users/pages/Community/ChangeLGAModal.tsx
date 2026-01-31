"use client";

import { useMemo, useState } from "react";
import { FiX, FiSearch, FiMapPin, FiCheck } from "react-icons/fi";
import styles from "./styles/ChangeLGAModal.module.css";
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
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return lgaGroups;
    return lgaGroups.filter((b) =>
      b.lga.name.toLowerCase().includes(query)
    );
  }, [lgaGroups, q]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <header className={styles.modalTop}>
          <div className={styles.modalHeading}>
            <span className={styles.modalHeadingIcon}>
              <FiMapPin />
            </span>

            <div>
              <h3 className={styles.modalTitle}>Change LGA</h3>
              <p className={styles.modalSub}>
                Select the LGA you want to switch to
              </p>
            </div>
          </div>

          <button
            className={styles.iconBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </header>

        {/* Search */}
        <div className={styles.modalSearchWrap}>
          <div className={styles.modalSearchBox}>
            <FiSearch className={styles.modalSearchIcon} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={styles.modalSearchInput}
              placeholder="Search LGA..."
            />
          </div>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {loading ? (
            <p className={styles.modalEmpty}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p className={styles.modalEmpty}>No LGAs found</p>
          ) : (
            <div className={styles.list}>
              {filtered.map((block) => {
                const active = currentLGA?.lga.id === block.lga.id;

                return (
                  <button
                    key={block.lga.id}
                    className={`${styles.listItem} ${
                      active ? styles.activeItem : ""
                    }`}
                    onClick={() => {
                      onSelect(block);
                      onClose();
                    }}
                  >
                    <span className={styles.listItemTitle}>
                      {block.lga.name}
                    </span>

                    {active ? (
                      <span className={styles.activeMark}>
                        <FiCheck />
                        Current
                      </span>
                    ) : (
                      <span className={styles.listHint}>Tap to switch</span>
                    )}
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
