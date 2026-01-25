"use client";

import styles from "@/styles/Topbar.module.css";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.menu} onClick={onMenu}>☰</button>
        <div>
          <strong>LINQMI</strong>
          <div className={styles.sub}>Safety Platform</div>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.ghost}>SOS</button>
        <div className={styles.avatar}>U</div>
      </div>
    </header>
  );
}
