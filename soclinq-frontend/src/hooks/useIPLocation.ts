import { useEffect } from "react";

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
  useEffect(() => {
    if (!enabled) return;

    fetch("/api/ip-location")
      .then(r => r.json())
      .then(d => {
        if (!d?.lat) return;
        onLocation({
          lat: d.lat,
          lng: d.lng,
          accuracy: 5000,
          timestamp: Date.now(),
        });
      })
      .catch(() => {});
  }, [enabled, onLocation]);
}
