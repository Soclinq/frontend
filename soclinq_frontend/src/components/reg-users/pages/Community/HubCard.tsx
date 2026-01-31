// components/HubCard.tsx

import { Hub } from "@/types/hub";
import styles from "./HubCard.module.css";

type Props = {
  hub: Hub;
  onJoin: () => void;
  onOpen: () => void;
};

export default function HubCard({ hub, onJoin, onOpen }: Props) {
  return (
    <div className={styles.card}>
      {hub.cover_image && (
        <img src={hub.cover_image} className={styles.cover} />
      )}

      <div className={styles.body}>
        <div className={styles.header}>
          <h4>{hub.name}</h4>
          {hub.is_verified && <span className={styles.verified}>✔</span>}
        </div>

        <p className={styles.desc}>{hub.description}</p>

        {hub.last_message_text && (
          <p className={styles.preview}>
            <strong>{hub.last_message_sender_name}:</strong>{" "}
            {hub.last_message_text}
          </p>
        )}

        <div className={styles.meta}>
          <span>{hub.members_count} members</span>
          {hub.unread_count > 0 && (
            <span className={styles.unread}>{hub.unread_count}</span>
          )}
        </div>

        <button
          className={hub.user_joined ? styles.joined : styles.join}
          onClick={hub.user_joined ? onOpen : onJoin}
        >
          {hub.user_joined ? "Joined" : "Join"}
        </button>
      </div>
    </div>
  );
}
