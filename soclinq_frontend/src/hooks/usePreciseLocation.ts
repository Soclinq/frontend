"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGeolocation } from "./useGeolocation";
import { useIPLocation } from "./useIPLocation";
import { useLocationFusion, LocationPacket } from "./useLocationFusion";

type PreciseLocation = {
  lat: number;
  lng: number;
  accuracy: number;
  source: LocationPacket["source"];
  timestamp: number;
};

export function usePreciseLocation() {
  const [location, setLocation] = useState<PreciseLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { watchPosition, clearWatch } = useGeolocation();

  const fusion = useLocationFusion((loc: LocationPacket) => {
    setLocation({
      lat: loc.lat,
      lng: loc.lng,
      accuracy: loc.accuracy,
      source: loc.source,
      timestamp: loc.timestamp,
    });
    setLoading(false);
  });
  

  /* ---------- GPS (PRIMARY) ---------- */
  useEffect(() => {
    try {
      watchPosition(
        (pos) => {
          fusion.ingest({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            source: "GPS",
          });
        },
        (err) => {
          setError(err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      setError("Geolocation not supported");
    }

    return () => clearWatch();
  }, []);

  /* ---------- IP FALLBACK ---------- */
  const handleIPLocation = useCallback(
    (ip: {
      lat: number;
      lng: number;
      accuracy: number;
      timestamp: number;
    }) => {
      fusion.ingest({
        ...ip,
        source: "IP",
      });
    },
    [fusion]
  );
  
  useIPLocation(true, handleIPLocation);
  
  

  /* ---------- MANUAL REFRESH ---------- */
  const refresh = () => {
    setLocation(null);
    setLoading(true);
    setError(null);
  };

  return {
    location,
    accuracy: location?.accuracy ?? null,
    source: location?.source ?? null,
    loading,
    error,
    refresh,
  };
}
