import NotificationItem from "./NotificationItem";
import { Notification } from "./NotificationContext";
import "./Notifications.css";

interface Props {
  items: Notification[];
  onRemove: (id: string) => void;
}

export default function NotificationContainer({
  items,
  onRemove,
}: Props) {
  return (
    <div className="notification-stack">
      {items.map((n) => (
        <NotificationItem
          key={n.id}
          n={n}
          onClose={() => onRemove(n.id)}
        />
      ))}
    </div>
  );
}
