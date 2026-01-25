"use client";

import { useState, ChangeEvent, ReactElement } from "react";
import styles from "./styles/AnnouncementsPanel.module.css";
import { useRBAC } from "@/hooks/useRBAC";

import type { User } from "@/types/auth";
import type { Announcement } from "@/types/message";

/* ================= PROPS ================= */

interface AnnouncementsPanelProps {
  user: User;
  messages: Announcement[];
  broadcast: (text: string) => void;
  togglePin: (id: string) => void;
}

/* ================= COMPONENT ================= */

export default function AnnouncementsPanel({
  user,
  messages,
  broadcast,
  togglePin,
}: AnnouncementsPanelProps): ReactElement {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const { can } = useRBAC(user.role);

  const filtered = messages
    .filter((a) =>
      a.text.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1
    );

  return (
    <section className={styles.panel}>
      {/* Header */}
      <header className={styles.header}>
        <h3>Announcements</h3>
        <p>Official updates from community leaders</p>
      </header>

      {/* Search */}
      <div className={styles.searchBox}>
        <input
          placeholder="Search announcements…"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
        />
      </div>

      {/* List */}
      <div className={styles.list}>
        {filtered.length === 0 && (
          <p className={styles.empty}>
            No announcements found.
          </p>
        )}

        {filtered.map((a) => (
          <article
            key={a.id}
            className={`${styles.card} ${
              a.pinned ? styles.pinned : ""
            }`}
          >
            <div className={styles.cardHeader}>
              <span className={styles.label}>
                {a.pinned ? "Pinned Announcement" : "Announcement"}
              </span>

              {can("PIN_ANNOUNCEMENT") && (
                <button
                  className={styles.pin}
                  onClick={() => togglePin(a.id)}
                >
                  {a.pinned ? "Unpin" : "Pin"}
                </button>
              )}
            </div>

            <p className={styles.text}>{a.text}</p>
          </article>
        ))}
      </div>

      {/* Broadcast */}
      {can("SEND_ANNOUNCEMENT") && (
        <div className={styles.broadcast}>
          <textarea
            placeholder="Write an official announcement…"
            value={text}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setText(e.target.value)
            }
            rows={3}
          />

          <button
            onClick={() => {
              if (!text.trim()) return;
              broadcast(text.trim());
              setText("");
            }}
          >
            Broadcast
          </button>
        </div>
      )}
    </section>
  );
}
