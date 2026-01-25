import { useEffect, useRef } from "react";
import L from "leaflet";

type LocationInput = {
  lat: number;
  lng: number;
  accuracy: number;
  source: "GPS" | "SOCKET" | "IP";
  timestamp: number;
};

const MAX_SPEED = 50; // m/s
const MAX_ACCURACY = 800;

class Kalman2D {
  lat: number;
  lng: number;
  variance: number;

  constructor(lat: number, lng: number, variance: number) {
    this.lat = lat;
    this.lng = lng;
    this.variance = variance;
  }

  update(lat: number, lng: number, accuracy: number) {
    const k = this.variance / (this.variance + accuracy ** 2);
    this.lat += k * (lat - this.lat);
    this.lng += k * (lng - this.lng);
    this.variance *= 1 - k;
    return { lat: this.lat, lng: this.lng };
  }
}

export function useLocationFusion(
  onLocation: (loc: LocationInput) => void
) {
  const kalmanRef = useRef<Kalman2D | null>(null);
  const lastRef = useRef<LocationInput | null>(null);

  function isValid(loc: LocationInput) {
    if (!lastRef.current) return true;

    const dist = L.latLng(lastRef.current).distanceTo(
      [loc.lat, loc.lng]
    );

    const dt =
      (loc.timestamp - lastRef.current.timestamp) / 1000;

    if (dt <= 0) return false;

    const speed = dist / dt;
    return speed < MAX_SPEED;
  }

  function weight(loc: LocationInput) {
    let score = 0;

    if (loc.source === "GPS") score += 3;
    if (loc.source === "SOCKET") score += 2;
    if (loc.source === "IP") score += 1;

    score += Math.max(0, 500 - loc.accuracy) / 100;

    return score;
  }

  function ingest(loc: LocationInput) {
    if (loc.accuracy > MAX_ACCURACY) return;
    if (!isValid(loc)) return;

    if (!kalmanRef.current) {
      kalmanRef.current = new Kalman2D(
        loc.lat,
        loc.lng,
        loc.accuracy
      );
    }

    kalmanRef.current.variance = Math.max(
      kalmanRef.current.variance,
      loc.accuracy ** 2
    );

    const filtered = kalmanRef.current.update(
      loc.lat,
      loc.lng,
      loc.accuracy
    );

    lastRef.current = loc;

    onLocation({
      ...loc,
      ...filtered,
    });
  }

  return { ingest };
}
