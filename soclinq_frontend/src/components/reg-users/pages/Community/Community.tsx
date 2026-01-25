"use client";

import styles from "./styles/Community.module.css";
import { useCommunityStore } from "@/hooks/useCommunityStore";

import CommunityHeader from "./CommunityHeader";
import GroupsPanel from "./GroupsPanel";
import ChatPanel from "./ChatPanel";
import AnnouncementsPanel from "./AnnouncementsPanel";
import NearbySupportPanel from "./NearbySupportPanel";
import { ReactElement } from "react";

export default function Community(): ReactElement {
  const store = useCommunityStore();

  return (
    <section className={styles.community}>
      {/* Page header */}
      <CommunityHeader />

      {/* Membership */}
      <section className={styles.section}>
        <GroupsPanel
          list={store.groups.list}
          createGroup={store.groups.createGroup}
          removeGroup={store.groups.removeGroup}
        />
      </section>

      {/* Core interaction */}
      <section className={styles.mainGrid}>
        <ChatPanel
          user={store.user}
          messages={store.chat.messages}
          sendChat={store.chat.sendChat}
        />

        <AnnouncementsPanel
          user={store.user}
          messages={store.announcements.messages}
          broadcast={store.announcements.broadcast}
          togglePin={store.announcements.togglePin}
        />
      </section>

      {/* Discovery */}
      <section className={styles.section}>
        <NearbySupportPanel />
      </section>
    </section>
  );
}
