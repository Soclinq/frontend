import { useEffect, useRef } from "react";

type IPCallback = (d: {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}) => void;

export function useIPLocation(
  enabled: boolean,
  onLocation: IPCallback
) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (attemptedRef.current) return;

    attemptedRef.current = true;

    fetch("/api/ip-location")
      .then((r) => {
        if (!r.ok) throw new Error("IP location failed");
        return r.json();
      })
      .then((d) => {
        if (!d?.lat || !d?.lng) return;

        onLocation({
          lat: d.lat,
          lng: d.lng,
          accuracy: 5000,
          timestamp: Date.now(),
        });
      })
      .catch(() => {
        // swallow error — fallback failed, do NOT retry
      });
  }, [enabled, onLocation]);
}
