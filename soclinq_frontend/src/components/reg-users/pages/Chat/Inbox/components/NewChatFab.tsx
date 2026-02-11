"use client";

import { useEffect, useRef, useState } from "react";
import { FiPlus, FiUsers } from "react-icons/fi";
import { MdChat } from "react-icons/md";

import styles from "./styles/NewChatFab.module.css";

type Props = {
  onNewGroup?: () => void;
  onNewMessage?: () => void;
};

export default function NewChatFab({ onNewGroup, onNewMessage }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // ✅ close when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapRef}>
      {/* ✅ MINI MENU */}
      <div className={`${styles.menu} ${open ? styles.menuOpen : ""}`}>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            setOpen(false);
            onNewGroup?.();
          }}
        >
          <span className={styles.menuIcon}>
            <FiUsers />
          </span>
          <span className={styles.menuLabel}>New Group</span>
        </button>

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            setOpen(false);
            onNewMessage?.();
          }}
        >
          <span className={styles.menuIcon}>
            <MdChat />
          </span>
          <span className={styles.menuLabel}>New Message</span>
        </button>
      </div>

      {/* ✅ MAIN FAB */}
      <button
        type="button"
        className={`${styles.fab} ${open ? styles.fabOpen : ""}`}
        aria-label="New chat"
        onClick={() => setOpen((v) => !v)}
      >
        <FiPlus className={styles.fabIcon} />
      </button>
    </div>
  );
}
