import L from "leaflet";
import { useRef } from "react";

type Responder = {
  id: string;
  lat: number;
  lng: number;
  speed?: number; // m/s (optional)
};

export function useResponderETA(
  onArrival: (id: string) => void
) {
  const arrivedRef = useRef<Set<string>>(
    new Set()
  );

  function compute(
    sosLat: number,
    sosLng: number,
    responders: Responder[]
  ) {
    return responders.map(r => {
      const dist = L.latLng(
        sosLat,
        sosLng
      ).distanceTo([r.lat, r.lng]);

      const eta =
        r.speed && r.speed > 0
          ? Math.round(dist / r.speed)
          : Math.round(dist / 1.4); // walking fallback

      if (
        dist < 20 &&
        !arrivedRef.current.has(r.id)
      ) {
        arrivedRef.current.add(r.id);
        onArrival(r.id);
      }

      return {
        ...r,
        distance: dist,
        eta,
      };
    });
  }

  return { compute };
}
