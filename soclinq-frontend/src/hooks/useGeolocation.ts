"use client";

import { useRef } from "react";

type WatchOptions = PositionOptions;

export function useGeolocation() {
  const watchIdRef = useRef<number | null>(null);

  const watchPosition = (
    onSuccess: PositionCallback,
    arg2?: PositionErrorCallback | WatchOptions,
    arg3?: WatchOptions
  ) => {
    if (!("geolocation" in navigator)) {
      return;
    }

    // ✅ interpret arguments safely
    let onError: PositionErrorCallback | undefined;
    let options: WatchOptions | undefined;

    // case: watchPosition(success, options)
    if (typeof arg2 === "object") {
      options = arg2;
    }
    // case: watchPosition(success, errorFn)
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

  return { watchPosition, clearWatch };
}
