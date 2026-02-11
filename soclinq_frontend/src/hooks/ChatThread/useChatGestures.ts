import { useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";

type Params = {
  selectionMode: boolean;
  toggleSelectMessage: (id: string) => void;
  startSelection?: (id: string) => void; // ✅ OPTIONAL
  startReply: (msg: ChatMessage) => void;
};

export function useChatGestures({
  selectionMode,
  toggleSelectMessage,
  startSelection,
  startReply,
}: Params) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const swipeTriggered = useRef(false);

  const pointerDownRef = useRef<{
    id: number;
    msgId: string;
    x: number;
    y: number;
  } | null>(null);

  const [swipeDx, setSwipeDx] = useState<Record<string, number>>({});

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const bindGestureHandlers = (msg: ChatMessage) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (msg.deletedAt || msg.messageType === "SYSTEM") return;

      longPressTriggered.current = false;
      swipeTriggered.current = false;
      clearLongPress();

      if (e.pointerType === "touch") {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      }

      pointerDownRef.current = {
        id: e.pointerId,
        msgId: msg.id,
        x: e.clientX,
        y: e.clientY,
      };

      setSwipeDx((s) => ({ ...s, [msg.id]: 0 }));

      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;

        if (!selectionMode) {
          startSelection?.(msg.id); // ✅ ENTER SELECTION MODE
        } else {
          toggleSelectMessage(msg.id);
        }

        try {
          navigator.vibrate?.(20);
        } catch {}
      }, 420);
    },

    onPointerMove: (e: React.PointerEvent) => {
      const ref = pointerDownRef.current;
      if (!ref || ref.id !== e.pointerId) return;

      const dx = e.clientX - ref.x;
      const dy = e.clientY - ref.y;

      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearLongPress();
      }

      if (!selectionMode && dx > 0) {
        setSwipeDx((s) => ({ ...s, [msg.id]: Math.min(dx, 42) }));

        if (dx >= 80 && !swipeTriggered.current) {
          swipeTriggered.current = true;
          startReply(msg);
          setSwipeDx((s) => ({ ...s, [msg.id]: 0 }));
        }
      }
    },

    onPointerUp: (e: React.PointerEvent) => {
      clearLongPress();

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}

      pointerDownRef.current = null;
      setSwipeDx((s) => ({ ...s, [msg.id]: 0 }));
      swipeTriggered.current = false;
    },

    onPointerCancel: () => {
      clearLongPress();
      pointerDownRef.current = null;
      swipeTriggered.current = false;
      setSwipeDx((s) => ({ ...s, [msg.id]: 0 }));
    },

    consumeClickIfGesture: (e: React.MouseEvent) => {
      if (swipeTriggered.current) {
        e.preventDefault();
        e.stopPropagation();
        swipeTriggered.current = false;
        return true;
      }
      return false;
    },
  });

  return { swipeDx, bindGestureHandlers };
}
