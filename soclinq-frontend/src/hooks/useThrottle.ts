import { useRef } from "react";

export function useThrottle(ms: number) {
  const lastRef = useRef(0);

  return function shouldRun() {
    const now = Date.now();
    if (now - lastRef.current < ms) return false;
    lastRef.current = now;
    return true;
  };
}
