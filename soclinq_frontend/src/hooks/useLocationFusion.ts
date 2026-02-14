import { useRef } from "react";

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

const MAX_SPEED = 50; // meters/sec
const MAX_ACCURACY = 3000;
const EARTH_RADIUS_METERS = 6371000;

/* ================= Distance Helpers ================= */

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
) {
  const dLat = toRadians(endLat - startLat);
  const dLng = toRadians(endLng - startLng);

  const lat1 = toRadians(startLat);
  const lat2 = toRadians(endLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/* ================= Kalman Filter ================= */

class Kalman2D {
  lat: number;
  lng: number;
  variance: number; // ✅ ALWAYS meters²

  constructor(lat: number, lng: number, accuracy: number) {
    this.lat = lat;
    this.lng = lng;
    this.variance = accuracy ** 2; // ✅ FIXED
  }

  update(lat: number, lng: number, accuracy: number) {
    const measurementVariance = accuracy ** 2;

    const k =
      this.variance /
      (this.variance + measurementVariance);

    this.lat += k * (lat - this.lat);
    this.lng += k * (lng - this.lng);

    this.variance *= 1 - k;

    return { lat: this.lat, lng: this.lng };
  }
}

/* ================= Hook ================= */

export function useLocationFusion(
  onFused: (d: LocationPacket) => void
) {
  const kalmanRef = useRef<Kalman2D | null>(null);
  const lastRef = useRef<LocationPacket | null>(null);

  function isValid(d: LocationPacket) {
    const last = lastRef.current;
    if (!last) return true;

    if (d.timestamp <= last.timestamp) return false;

    const dist = getDistanceMeters(
      last.lat,
      last.lng,
      d.lat,
      d.lng
    );

    const dt = (d.timestamp - last.timestamp) / 1000;
    if (dt <= 0) return false;

    const speed = dist / dt;

    return speed < MAX_SPEED;
  }

  function ingest(d: LocationPacket) {
    if (d.accuracy > MAX_ACCURACY) return;

    if (!lastRef.current) {
      kalmanRef.current = new Kalman2D(
        d.lat,
        d.lng,
        d.accuracy
      );

      lastRef.current = d;
      onFused(d);
      return;
    }

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
