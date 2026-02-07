import { useEffect, useRef } from "react";

type Options = {
  idleMs: number;
  onIdle: () => void;
  onActive?: () => void;
};

export function useChatIdleDetection({
  idleMs,
  onIdle,
  onActive,
}: Options) {
  const timerRef = useRef<number | null>(null);
  const idleRef = useRef(false);

  useEffect(() => {
    function reset() {
      if (idleRef.current) {
        idleRef.current = false;
        onActive?.();
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        idleRef.current = true;
        onIdle();
      }, idleMs);
    }

    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
    ];

    events.forEach((e) =>
      window.addEventListener(e, reset)
    );

    reset();

    return () => {
      events.forEach((e) =>
        window.removeEventListener(e, reset)
      );
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idleMs, onIdle, onActive]);
}
