// hooks/useResolvedLocation.ts
"use client";

import { useEffect, useState } from "react";
import { usePreciseLocation } from "./usePreciseLocation";

export type ResolvedLocation = {
    countryCode: string;     // "NG"
    country: string;         // "Nigeria"
    state?: string;          // "Kano"
    lga?: string;            // "Nassarawa"
    city?: string;
    source: "GPS" | "IP";
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };

  
export function useResolvedLocation() {
  const { location, loading, error } = usePreciseLocation();
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);

  useEffect(() => {
    if (!location) return;

    // 🔴 TEMPORARY: replace with backend reverse-geocode later
    // Example assumes Nigeria
    setResolved({
      countryCode: "NG",
      country: "Nigeria",
      state: "Kano",
      lga: "Nassarawa",
      source: location.source,
      confidence:
        location.accuracy < 50 ? "HIGH" :
        location.accuracy < 150 ? "MEDIUM" : "LOW",
    });
  }, [location]);

  return {
    location: resolved,
    loading,
    error,
  };
}
