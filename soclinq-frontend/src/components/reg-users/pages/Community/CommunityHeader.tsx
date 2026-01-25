"use client";

import styles from "./styles/CommunityHeader.module.css";

export default function CommunityHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        <span className={styles.badge}>Community</span>

        <h1 className={styles.title}>
          Community <span>Hub</span>
        </h1>

        <p className={styles.subtitle}>
          Connect with trusted groups, engage in peer discussions,
          and receive announcements from verified leaders.
        </p>
      </div>
    </header>
  );
}
