import { useRef } from "react";

export function useRetryBackpressure() {
  const lastReconnectRef = useRef(0);

  const canRetryNow = () => {
    const now = Date.now();
    if (now - lastReconnectRef.current < 3000) {
      return false;
    }
    return true;
  };

  const notifyReconnect = () => {
    lastReconnectRef.current = Date.now();
  };

  return { canRetryNow, notifyReconnect };
}
