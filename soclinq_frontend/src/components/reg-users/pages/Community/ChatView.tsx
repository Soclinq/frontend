"use client";

import { FiArrowLeft } from "react-icons/fi";
import ChatPanel from "./ChatPanel";
import styles from "./styles/GroupsPanel.module.css";

interface Props {
  groupId: string;
  onBack: () => void;
}

export default function ChatView({ groupId, onBack }: Props) {
  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <button className={styles.backBtn} onClick={onBack}>
          <FiArrowLeft />
          Back
        </button>
      </header>

      <ChatPanel groupId={groupId} />
    </div>
  );
}
