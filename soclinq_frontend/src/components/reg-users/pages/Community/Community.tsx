"use client";

import styles from "./styles/Community.module.css";
import { useCommunityStore } from "@/hooks/useCommunityStore";
import ChatShell from "../Chat/Inbox/ChatShell";
import AnnouncementsPanel from "./AnnouncementsPanel";
import NearbySupportPanel from "./NearbySupportPanel";
import { ReactElement } from "react";

export default function Community(): ReactElement {
  const store = useCommunityStore();

  return (
    <section className={styles.community}>
      {/* ✅ Chat should be full height */}
        <ChatShell />

      {/* <section className={styles.mainGrid}>
        <AnnouncementsPanel
          user={store.user}
          messages={store.announcements.messages}
          broadcast={store.announcements.broadcast}
          togglePin={store.announcements.togglePin}
        />
      </section>

      <section className={styles.section}>
        <NearbySupportPanel />
      </section> */}
    </section>
  );
}
