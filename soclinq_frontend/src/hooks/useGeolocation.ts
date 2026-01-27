"use client";

import { useRef } from "react";

type WatchOptions = PositionOptions;

export function useGeolocation() {
  const watchIdRef = useRef<number | null>(null);

  /* ===================== WATCH POSITION ===================== */

  const watchPosition = (
    onSuccess: PositionCallback,
    arg2?: PositionErrorCallback | WatchOptions,
    arg3?: WatchOptions
  ) => {
    if (!("geolocation" in navigator)) return;

    let onError: PositionErrorCallback | undefined;
    let options: WatchOptions | undefined;

    // case: watchPosition(success, options)
    if (typeof arg2 === "object") {
      options = arg2;
    }
    // case: watchPosition(success, errorFn, options)
    else if (typeof arg2 === "function") {
      onError = arg2;
      options = arg3;
    }

    // ✅ Clear old watcher first
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      options
    );
  };

  const clearWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  /* ===================== GET LOCATION (ONE TIME) ===================== */

  const getLocation = (options?: PositionOptions) => {
    return new Promise<GeolocationCoordinates>((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
          ...(options || {}),
        }
      );
    });
  };

  return { watchPosition, clearWatch, getLocation };
}
