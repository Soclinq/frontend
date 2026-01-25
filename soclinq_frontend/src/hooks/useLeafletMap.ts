"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface MapOptions {
  center: [number, number];
  zoom: number;
}

export function useLeafletMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  { center, zoom }: MapOptions
) {
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ✅ If already initialized, just fix size
    if (mapRef.current) {
      mapRef.current.invalidateSize();
      return;
    }

    // ✅ Create map
    const map = L.map(container, {
      center,
      zoom,
      zoomControl: true,
    });

    mapRef.current = map;

    // ✅ Add tiles (THIS IS REQUIRED)
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    });

    tiles.addTo(map);
    tileRef.current = tiles;

    // ✅ Fix modal rendering issues
    const timeout = window.setTimeout(() => {
      try {
        map.invalidateSize();
        map.setView(center, zoom);
      } catch {}
    }, 60);

    // ✅ Keep responsive
    const onResize = () => {
      try {
        map.invalidateSize();
      } catch {}
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", onResize);

      try {
        map.remove(); // ✅ Proper cleanup
      } catch {}

      mapRef.current = null;
      tileRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return mapRef;
}
