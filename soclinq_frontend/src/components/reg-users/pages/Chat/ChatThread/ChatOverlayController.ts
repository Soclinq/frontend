"use client";

import { useCallback } from "react";
import {
  useChatOverlayCoordinator,
  useChatFocusManagement,
} from "@/hooks/ChatThread";
import type { ChatMessage } from "@/types/chat";

type Position = { x: number; y: number };

type Params = {
  inputRef: React.RefObject<
    HTMLInputElement | HTMLTextAreaElement | null
  >;
  onCloseReactionUI?: () => void;
};


export function useChatOverlayController({
  inputRef,
  onCloseReactionUI,
}: Params) {
  /* ================= Overlay Core ================= */
  const overlay = useChatOverlayCoordinator();

  /* ================= Focus ================= */
  useChatFocusManagement({
    inputRef,
    overlayOpen: overlay.overlay.type !== null,
  });

  /* ================= Open helpers ================= */

  const openReactionPicker = useCallback(
    (message: ChatMessage, pos: Position) => {
      overlay.open("REACTION_PICKER", { message, pos });
    },
    [overlay]
  );

  const openEmojiMart = useCallback(
    (message: ChatMessage, pos: Position) => {
      overlay.open("EMOJI_MART", { message, pos });
    },
    [overlay]
  );

  const openInfoModal = useCallback(
    (message: ChatMessage) => {
      overlay.open("INFO", { message });
    },
    [overlay]
  );
  

  const openCamera = useCallback(() => {
    overlay.open("CAMERA");
  }, [overlay]);

  const openDeleteSheet = useCallback(
    (message: ChatMessage) => {
      overlay.open("DELETE", { message });
    },
    [overlay]
  );

  const openForwardSheet = useCallback(
    (messages: ChatMessage[]) => {
      overlay.open("FORWARD", { messages });
    },
    [overlay]
  );

  /* ================= Close ================= */

  const closeOverlay = useCallback(() => {
    overlay.close();
    onCloseReactionUI?.(); // ✅ safe, optional
  }, [overlay, onCloseReactionUI]);

  /* ================= Public API ================= */

  return {
    active: overlay.overlay.type,
    data: overlay.overlay.data,

    openReactionPicker,
    openEmojiMart,
    openCamera,
    openInfoModal,
    openDeleteSheet,
    openForwardSheet,

    isOpen: overlay.isOpen,
    close: closeOverlay,
  };
}
