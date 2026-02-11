import { useRef } from "react";

interface UseLongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

export function useLongPress({
  delay = 380,
  onLongPress,
  onClick,
}: UseLongPressOptions) {
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const startYRef = useRef(0);

  const start = (e: React.PointerEvent) => {
    firedRef.current = false;
    startYRef.current = e.clientY;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      onLongPress();

      if (navigator.vibrate) navigator.vibrate(15);
    }, delay);
  };

  const end = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!firedRef.current && onClick) {
      onClick();
    }
  };

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const move = (e: React.PointerEvent) => {
    if (Math.abs(e.clientY - startYRef.current) > 10) {
      cancel(); // user is scrolling
    }
  };

  return {
    onPointerDown: start,
    onPointerUp: end,
    onPointerMove: move,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
  };
}
