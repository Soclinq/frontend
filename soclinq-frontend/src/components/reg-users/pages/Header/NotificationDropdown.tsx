"use client";

import { useEffect, useRef, useState } from "react";
import { MdNotificationsNone } from "react-icons/md";
import styles from "./styles/NotificationDropdown.module.css";

interface Notification {
  id: string;
  title: string;
  time: string;
}

interface Props {
  alerts: number;
  notifications?: Notification[];
}

export default function NotificationDropdown({
  alerts,
  notifications = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className={styles.wrapper} ref={ref}>
        <button
        className={`${styles.iconBtn} ${open ? styles.active : ""}`}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        >
        <MdNotificationsNone size={20} />
        </button>

      {open && (
        <div className={styles.dropdown}>
          <h4 className={styles.title}>Notifications</h4>

          {notifications.length === 0 ? (
            <p className={styles.empty}>No new notifications</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={styles.item}>
                <p className={styles.itemTitle}>{n.title}</p>
                <span className={styles.time}>{n.time}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
