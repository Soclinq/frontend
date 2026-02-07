import { useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";

type Params = {
  selectionMode: boolean;
  toggleSelectMessage: (id: string) => void;
  startReply: (msg: ChatMessage) => void;
  openQuickEmojiRow: (msg: ChatMessage, x: number, y: number) => void;

  /** ✅ Instant reaction on long-press (WhatsApp-style) */
  reactQuick?: (msg: ChatMessage) => void;
};

export function useChatGestures({
  selectionMode,
  toggleSelectMessage,
  startReply,
  openQuickEmojiRow,
  reactQuick,
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

  /* ---------------- helpers ---------------- */

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const maybeTriggerSwipeReply = (msg: ChatMessage, dx: number) => {
    if (swipeTriggered.current) return;
    if (selectionMode) return;
    if (msg.deletedAt) return;
    if (msg.messageType === "SYSTEM") return;

    if (dx >= 80) {
      swipeTriggered.current = true;
      startReply(msg);

      setSwipeDx((s) => ({ ...s, [msg.id]: 0 }));

      try {
        navigator.vibrate?.(10);
      } catch {}
    }
  };

  /* ---------------- bindings ---------------- */

  const bindGestureHandlers = (msg: ChatMessage) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (msg.deletedAt || msg.messageType === "SYSTEM") return;

      longPressTriggered.current = false;
      swipeTriggered.current = false;
      clearLongPress();

      pointerDownRef.current = {
        id: e.pointerId,
        msgId: msg.id,
        x: e.clientX,
        y: e.clientY,
      };

      setSwipeDx((s) => ({ ...s, [msg.id]: 0 }));

      const delay = e.pointerType === "mouse" ? 520 : 420;

      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
      
        openQuickEmojiRow(msg, e.clientX, e.clientY);
      
        navigator.vibrate?.(15);
      }, delay);      
    },

    onPointerMove: (e: React.PointerEvent) => {
      const ref = pointerDownRef.current;
      if (!ref) return;
      if (ref.id !== e.pointerId) return;
      if (ref.msgId !== msg.id) return;

      const dx = e.clientX - ref.x;
      const dy = e.clientY - ref.y;

      const swipe = Math.max(0, dx);

      if (!selectionMode && swipe < 120) {
        setSwipeDx((s) => ({ ...s, [msg.id]: swipe }));
      }

      maybeTriggerSwipeReply(msg, swipe);

      // cancel long press if user drags
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        if (dx < 20) clearLongPress();
      }
    },

    onPointerUp: (e: React.PointerEvent) => {
      clearLongPress();

      try {
        (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
      } catch {}

      pointerDownRef.current = null;
      setSwipeDx((s) => ({ ...s, [msg.id]: 0 }));

      setTimeout(() => {
        swipeTriggered.current = false;
      }, 0);
    },

    onPointerCancel: () => {
      clearLongPress();
      pointerDownRef.current = null;
      swipeTriggered.current = false;
      setSwipeDx((s) => ({ ...s, [msg.id]: 0 }));
    },

    /** Prevent ghost clicks after gesture */
    consumeClickIfGesture: (e: React.MouseEvent) => {
      if (longPressTriggered.current || swipeTriggered.current) {
        e.preventDefault();
        e.stopPropagation();
        longPressTriggered.current = false;
        swipeTriggered.current = false;
        return true;
      }
      return false;
    },
  });

  return {
    swipeDx,
    bindGestureHandlers,
  };
}
