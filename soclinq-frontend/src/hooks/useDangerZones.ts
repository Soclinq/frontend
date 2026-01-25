import L from "leaflet";
import { useEffect, useRef, useState } from "react";

export type DangerLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type DangerZone = {
  id: string;
  name: string;
  level: DangerLevel;
  type: "CIRCLE" | "POLYGON";
  center?: [number, number];
  radius?: number;
  polygon?: [number, number][];
  active?: boolean;
};

export function useDangerZones(
  map: L.Map | null,
  onEnter?: (z: DangerZone) => void,
  onExit?: (z: DangerZone) => void
) {
  const [zones, setZones] = useState<DangerZone[]>([]);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const insideRef = useRef<Set<string>>(new Set());

  /* ================= LOAD ZONES ================= */

  useEffect(() => {
    fetch("/api/danger-zones")
      .then(r => r.json())
      .then(setZones)
      .catch(() => {
        // Offline fallback
        const cached = localStorage.getItem("dangerZones");
        if (cached) setZones(JSON.parse(cached));
      });
  }, []);

  useEffect(() => {
    if (zones.length) {
      localStorage.setItem(
        "dangerZones",
        JSON.stringify(zones)
      );
    }
  }, [zones]);

  /* ================= DRAW ZONES ================= */

  useEffect(() => {
    if (!map || !zones.length) return;

    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    } else {
      layerRef.current.clearLayers();
    }

    zones.forEach(z => {
      if (!z.active) return;

      const color =
        z.level === "LOW"
          ? "#22c55e"
          : z.level === "MEDIUM"
          ? "#eab308"
          : z.level === "HIGH"
          ? "#f97316"
          : "#dc2626";

      if (z.type === "CIRCLE" && z.center) {
        L.circle(z.center, {
          radius: z.radius ?? 200,
          color,
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(layerRef.current!);
      }

      if (z.type === "POLYGON" && z.polygon) {
        L.polygon(z.polygon, {
          color,
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(layerRef.current!);
      }
    });
  }, [map, zones]);

  /* ================= DETECTION ================= */

  function check(lat: number, lng: number) {
    if (!zones.length) return [];

    const point = L.latLng(lat, lng);
    const entered: DangerZone[] = [];

    zones.forEach(z => {
      if (!z.active) return;

      let inside = false;

      if (z.type === "CIRCLE" && z.center) {
        inside =
          point.distanceTo(z.center) <
          (z.radius ?? 200);
      }

      if (z.type === "POLYGON" && z.polygon) {
        inside = L.polygon(z.polygon)
          .getBounds()
          .contains(point);
      }

      if (inside && !insideRef.current.has(z.id)) {
        insideRef.current.add(z.id);
        onEnter?.(z);
        entered.push(z);
      }

      if (!inside && insideRef.current.has(z.id)) {
        insideRef.current.delete(z.id);
        onExit?.(z);
      }
    });

    return entered;
  }

  return { zones, check };
}
