import { useState, useCallback } from "react";

export type OverlayType =
  | "CONTEXT_MENU"
  | "REACTION_PICKER"
  | "EMOJI_MART"
  | "CAMERA"
  | "DELETE"
  | "FORWARD"
  | null;

  type OverlayState<T = any> = {
    type: OverlayType;
    data?: T;
  };
  
  export function useChatOverlayCoordinator() {
    const [overlay, setOverlay] = useState<OverlayState>({
      type: null,
    });
  
    const open = useCallback(
      <T,>(type: OverlayType, data?: T) => {
        setOverlay({ type, data });
      },
      []
    );
  
    const close = useCallback(() => {
      setOverlay({ type: null });
    }, []);
  
    const isOpen = useCallback(
      (type?: OverlayType) =>
        type ? overlay.type === type : overlay.type !== null,
      [overlay.type]
    );
  
    return {
      overlay,
      open,
      close,
      isOpen,
    };
  }
  