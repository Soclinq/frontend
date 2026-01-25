import { useEffect } from "react";

type GPSCallback = (d: {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}) => void;

export function useBrowserGPS(onLocation: GPSCallback) {
  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      pos => {
        onLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      err => console.warn("GPS error", err),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );

    return () =>
      navigator.geolocation.clearWatch(id);
  }, [onLocation]);
}
