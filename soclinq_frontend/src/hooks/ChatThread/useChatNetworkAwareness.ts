import { useEffect, useState, useRef } from "react";

export function useChatNetworkAwareness(pingUrl = "/ping") {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [latency, setLatency] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function onOnline() {
      setOnline(true);
    }

    function onOffline() {
      setOnline(false);
      setLatency(null);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // latency probe (best-effort)
  useEffect(() => {
    if (!online) return;

    async function probe() {
      const start = performance.now();
      try {
        await fetch(pingUrl, {
          method: "HEAD",
          cache: "no-store",
        });
        setLatency(Math.round(performance.now() - start));
      } catch {
        setLatency(null);
      }
    }

    probe();
    timerRef.current = window.setInterval(probe, 15000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [online, pingUrl]);

  return { online, latency };
}
