"use client";

import styles from "./styles/UserStat.module.css";
import type { IconType } from "react-icons";

interface UserStatProps {
  id: string;
  label: string;
  value: string;
  icon: IconType;
  color: string;
  note: string;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  onAction?: () => void;
}

export default function UserStat({
  id,
  label,
  value,
  icon: Icon,
  color,
  note,
  activeId,
  setActiveId,
  onAction,
}: UserStatProps) {
    
  const isOpen = activeId === id;

  const isTouchDevice =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none)").matches;


  return (
    <div
      className={styles.wrapper}
      onMouseEnter={
        !isTouchDevice ? () => setActiveId(id) : undefined
      }
      onMouseLeave={
        !isTouchDevice ? () => setActiveId(null) : undefined
      }
    >
      <button
        className={styles.iconButton}
        style={{ color }}
        aria-label={label}
        onClick={() => {
          if (isTouchDevice) {
            setActiveId(isOpen ? null : id);
          }
        }}
      >
        <div className={styles.iconWrapper}><Icon /></div>
        <span className={styles.title}>{label}</span>
                <span className={styles.value}>{value}</span>
                <p className={styles.note}>{note}</p>
      </button>



    </div>
  );
}
