"use client";

import { useMemo, useState } from "react";
import { FiMapPin, FiSearch, FiX, FiCheck } from "react-icons/fi";
import styles from "./styles/LgaSwitchModal.module.css";

interface Props {
  lgas: { id: string; name: string }[];
  activeLgaId?: string;
  onSelect: (lga: { id: string; name: string }) => void;
  onClose: () => void;
}

export default function LgaSwitchModal({
  lgas,
  activeLgaId,
  onSelect,
  onClose,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return lgas;

    return lgas.filter((l) => l.name.toLowerCase().includes(query));
  }, [lgas, q]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <span className={styles.iconWrap}>
              <FiMapPin />
            </span>

            <div>
              <h3 className={styles.title}>Switch LGA</h3>
              <p className={styles.subtitle}>Select your community location</p>
            </div>
          </div>

          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchRow}>
          <FiSearch className={styles.searchIcon} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={styles.searchInput}
            placeholder="Search LGA..."
          />
        </div>

        {/* List */}
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>No LGAs found</div>
          ) : (
            filtered.map((lga) => {
              const active = lga.id === activeLgaId;

              return (
                <button
                  key={lga.id}
                  type="button"
                  onClick={() => onSelect(lga)}
                  className={`${styles.item} ${active ? styles.itemActive : ""}`}
                >
                  <span className={styles.itemLeft}>
                    <span className={styles.pinDot} />
                    <span className={styles.itemName}>{lga.name}</span>
                  </span>

                  {active ? (
                    <span className={styles.activeBadge}>
                      <FiCheck />
                      Active
                    </span>
                  ) : (
                    <span className={styles.itemHint}>Tap to switch</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.footerBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
