"use client";

import styles from "./styles/NearbySupportPanel.module.css";
import { ReactElement } from "react";

/* ================= TYPES ================= */

type SupportType = "HELPER" | "CLINIC" | "LEADER";

interface SupportItem {
  id: string;
  name: string;
  role: SupportType;
  distanceKm?: number;
  verified: boolean;
}

/* ================= MOCK DATA (replace later) ================= */

const nearbySupport: SupportItem[] = [
  {
    id: "1",
    name: "Ada",
    role: "HELPER",
    distanceKm: 0.7,
    verified: true,
  },
  {
    id: "2",
    name: "Clinic Volunteer",
    role: "CLINIC",
    verified: true,
  },
  {
    id: "3",
    name: "Community Leader",
    role: "LEADER",
    verified: true,
  },
];

/* ================= COMPONENT ================= */

export default function NearbySupportPanel(): ReactElement {
  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h3>Nearby Support</h3>
        <p>Verified help and assistance around you</p>
      </header>

      <ul className={styles.list}>
        {nearbySupport.map((item) => (
          <li
            key={item.id}
            className={styles.card}
            onClick={() => {
              // 🔗 Future route:
              // router.push(`/support/${item.id}`)
            }}
          >
            <div className={styles.left}>
              <span className={styles.icon}>
                {item.role === "HELPER" && "👤"}
                {item.role === "CLINIC" && "🏥"}
                {item.role === "LEADER" && "🛡️"}
              </span>

              <div>
                <strong>{item.name}</strong>
                <span className={styles.meta}>
                  {item.role.toLowerCase()}
                  {item.distanceKm && ` • ${item.distanceKm}km away`}
                </span>
              </div>
            </div>

            {item.verified && (
              <span className={styles.verified}>
                Verified
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
