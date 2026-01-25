import { useEffect } from "react";
import L from "leaflet";

export function useLeafletMap(id: string, center: [number, number], zoom = 5) {
  useEffect(() => {
    const map = L.map(id).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    return () => map.remove();
  }, [id]);
}
