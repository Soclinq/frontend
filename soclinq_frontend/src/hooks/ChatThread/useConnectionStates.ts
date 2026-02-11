import { useEffect, useRef, useState } from "react";

/* ================= Types ================= */

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "error";

type Options = {
  /** optional: ws instance */
  socket?: WebSocket | null;

  /** max reconnect attempts before giving up */
  maxRetries?: number;
};

/* ================= Hook ================= */

export function useConnectionStates(
  wsConnected: boolean,
  options: Options = {}
) {
  const { socket, maxRetries = 5 } = options;

  const [status, setStatus] =
    useState<ConnectionStatus>("connecting");
  const [retryCount, setRetryCount] = useState(0);

  const retryTimerRef = useRef<number | null>(null);

  const online =
    typeof navigator !== "undefined"
      ? navigator.onLine
      : true;

  /* ================= online/offline ================= */

  useEffect(() => {
    function onOnline() {
      setStatus((s) =>
        s === "offline" ? "reconnecting" : s
      );
    }

    function onOffline() {
      setStatus("offline");
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  /* ================= ws state sync ================= */

  useEffect(() => {
    if (!online) {
      setStatus("offline");
      return;
    }

    if (wsConnected) {
      setStatus("connected");
      setRetryCount(0);
      return;
    }

    setStatus((prev) =>
      prev === "connected" || prev === "connecting"
        ? "reconnecting"
        : prev
    );
  }, [wsConnected, online]);

  /* ================= reconnect tracking ================= */

  useEffect(() => {
    if (status !== "reconnecting") return;

    if (retryCount >= maxRetries) {
      setStatus("error");
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(2, retryCount),
      8000
    );

    retryTimerRef.current = window.setTimeout(() => {
      setRetryCount((c) => c + 1);
      // actual reconnect is handled by WS hook
    }, delay);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [status, retryCount, maxRetries]);

  /* ================= cleanup ================= */

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  /* ================= derived ================= */

  const isConnected = status === "connected";
  const isReconnecting = status === "reconnecting";
  const isOffline = status === "offline";
  const isError = status === "error";

  /* ================= API ================= */

  return {
    status,
    retryCount,
    isConnected,
    isReconnecting,
    isOffline,
    isError,
    online,
  };
}
