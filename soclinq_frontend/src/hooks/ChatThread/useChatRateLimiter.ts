import { useRef } from "react";

type Options = {
  max: number;
  perMs: number;
};

export function useChatRateLimiter({ max, perMs }: Options) {
  const timestampsRef = useRef<number[]>([]);

  function canSend() {
    const now = Date.now();
    timestampsRef.current = timestampsRef.current.filter(
      (t) => now - t < perMs
    );
    return timestampsRef.current.length < max;
  }

  function registerSend() {
    const now = Date.now();
    timestampsRef.current.push(now);
  }

  function remaining() {
    const now = Date.now();
    timestampsRef.current = timestampsRef.current.filter(
      (t) => now - t < perMs
    );
    return Math.max(0, max - timestampsRef.current.length);
  }

  return {
    canSend,
    registerSend,
    remaining,
  };
}
