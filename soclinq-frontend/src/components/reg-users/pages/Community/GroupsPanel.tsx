"use client";

import { useState, ChangeEvent, ReactElement } from "react";
import styles from "./styles/GroupsPanel.module.css";

/* ================= TYPES ================= */

export interface Group {
  name: string;
  createdAt: string;
}

interface GroupsPanelProps {
  list: Group[];
  createGroup: (name: string) => void;
  removeGroup: (name: string) => void;
}

/* ================= COMPONENT ================= */

export default function GroupsPanel({
  list,
  createGroup,
  removeGroup,
}: GroupsPanelProps): ReactElement {
  const [name, setName] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createGroup(name.trim());
    setName("");
  };

  return (
    <section className={styles.panel}>
      <header className={styles.grheader}>
        <h3>Membership & Groups</h3>
        <p>Create or manage trusted communities you belong to</p>
      </header>

      <div className={styles.createBox}>
        <input
          type="text"
          value={name}
          onChange={handleChange}
          placeholder="Neighbourhood, Estate, School…"
        />

        <button onClick={handleCreate}>Create Group</button>
      </div>

      <div className={styles.groupList}>
        {list.length === 0 && (
          <p className={styles.empty}>
            You haven’t joined or created any groups yet.
          </p>
        )}

        {list.map((g) => (
          <div key={g.name} className={styles.groupCard}>
            <div>
              <strong>{g.name}</strong>
              <span>
                Created {new Date(g.createdAt).toLocaleDateString()}
              </span>
            </div>

            <button
              className={styles.remove}
              onClick={() => removeGroup(g.name)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
