import L from "leaflet";
import { useEffect, useRef } from "react";

export function useSosMapCore(
    container: React.RefObject<HTMLDivElement | null>
  )   {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const dangerRef = useRef<L.Circle | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    mapRef.current = L.map(container.current).setView(
      [9.082, 8.6753],
      6
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    ).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  function updateLocation(
    lat: number,
    lng: number,
    accuracy: number
  ) {
    const map = mapRef.current;
    if (!map) return;
  
    // ✅ SAFE readiness check
    if (!map.getPane("mapPane")) return;
  
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
  
    if (!accuracyRef.current) {
      accuracyRef.current = L.circle([lat, lng], {
        radius: accuracy,
        fillOpacity: 0.1,
      }).addTo(map);
    } else {
      accuracyRef.current.setLatLng([lat, lng]);
      accuracyRef.current.setRadius(accuracy);
    }
  
    map.panTo([lat, lng], { animate: true });
  }
  
  return { mapRef, updateLocation };
}
