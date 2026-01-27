import { useRef } from "react";
import L from "leaflet";

export type LocationSource =
  | "GPS"
  | "SOCKET"
  | "IP"
  | "REPLAY";

export type LocationPacket = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  source: LocationSource;
};

const MAX_SPEED = 50; // m/s
const MAX_ACCURACY = 3000;

class Kalman2D {
  lat: number;
  lng: number;
  variance: number;

  constructor(lat: number, lng: number, v: number) {
    this.lat = lat;
    this.lng = lng;
    this.variance = v;
  }

  update(lat: number, lng: number, acc: number) {
    const k = this.variance / (this.variance + acc ** 2);
    this.lat += k * (lat - this.lat);
    this.lng += k * (lng - this.lng);
    this.variance *= 1 - k;
    return { lat: this.lat, lng: this.lng };
  }
}

export function useLocationFusion(
  onFused: (d: LocationPacket) => void
) {
  const kalmanRef = useRef<Kalman2D | null>(null);
  const lastRef = useRef<LocationPacket | null>(null);

  function isValid(d: LocationPacket) {
    if (!lastRef.current) return true;

    const dist = L.latLng(
      lastRef.current.lat,
      lastRef.current.lng
    ).distanceTo([d.lat, d.lng]);

    const dt =
      (d.timestamp - lastRef.current.timestamp) / 1000;

    if (dt <= 0) return false;

    const speed = dist / dt;
    return speed < MAX_SPEED;
  }

  function ingest(d: LocationPacket) {
    if (!lastRef.current) {
      kalmanRef.current = new Kalman2D(d.lat, d.lng, d.accuracy);
      lastRef.current = d;
      onFused(d);
      return;
    }

    if (d.accuracy > MAX_ACCURACY) return;
    if (!isValid(d)) return;

    if (!kalmanRef.current) {
      kalmanRef.current = new Kalman2D(
        d.lat,
        d.lng,
        d.accuracy
      );
    }

    kalmanRef.current.variance = Math.max(
      kalmanRef.current.variance,
      d.accuracy ** 2
    );

    const filtered = kalmanRef.current.update(
      d.lat,
      d.lng,
      d.accuracy
    );

    lastRef.current = d;

    onFused({
      ...d,
      ...filtered,
    });
  }

  return { ingest };
}
