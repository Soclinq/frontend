import L from "leaflet";
import { useRef } from "react";

type Responder = {
  id: string;
  lat: number;
  lng: number;
  role: "POLICE" | "MEDIC" | "SECURITY";
};

export function useResponderLayer(map: L.Map | null) {
  const layerRef = useRef<L.LayerGroup | null>(null);

  function update(responders: Responder[]) {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    } else {
      layerRef.current.clearLayers();
    }

    responders.forEach(r => {
      L.circleMarker([r.lat, r.lng], {
        radius: 6,
        color:
          r.role === "POLICE"
            ? "#2563eb"
            : r.role === "MEDIC"
            ? "#16a34a"
            : "#f97316",
      }).addTo(layerRef.current!);
    });
  }

  return { update };
}
