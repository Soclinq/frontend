import React, { createContext, useContext, useState } from "react";
import { v4 as uuid } from "uuid";
import NotificationContainer from "./NotificationContainer";

/* ---------------- Types ---------------- */

export type NotificationType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading";

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  confirm?: {
    label?: string;
    onConfirm: () => void;
  };
}

interface Ctx {
  notify: (n: Omit<Notification, "id">) => void;
  remove: (id: string) => void;
}

const NotificationContext = createContext<Ctx | null>(null);


const MAX_NOTIFICATIONS = 3;


export const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotify must be used inside NotificationProvider");
  }
  return ctx.notify;
};


export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<Notification[]>([]);

  const notify = (n: Omit<Notification, "id">) => {
    const id = uuid();

    setItems((prev) => {
      const next = [...prev, { ...n, id }];

      // ✅ keep only the latest 3 notifications
      return next.slice(-MAX_NOTIFICATIONS);
    });

    if (n.duration) {
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, n.duration);
    }
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify, remove }}>
      {children}
      <NotificationContainer items={items} onRemove={remove} />
    </NotificationContext.Provider>
  );
}
