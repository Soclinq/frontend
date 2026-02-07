"use client";

import { useCallback } from "react";
import {
  useChatOverlayCoordinator,
  useChatFocusManagement,
  useReactionUI,
} from "@/hooks/ChatThread";
import type { ChatMessage } from "@/types/chat";

type Position = { x: number; y: number };

export function useChatOverlayController({
  inputRef,
}: {
  inputRef: React.RefObject<
    HTMLInputElement | HTMLTextAreaElement
  >;
}) {
  /* ================= Overlay Core ================= */
  const overlay = useChatOverlayCoordinator();

  /* ================= Reaction UI ================= */
  const reactionUI = useReactionUI();

  /* ================= Focus ================= */
  useChatFocusManagement({
    inputRef,
    overlayOpen: overlay.overlay.type !== null,
  });

  /* ================= Open helpers ================= */

  const openContextMenu = useCallback(
    (message: ChatMessage, pos: Position) => {
      overlay.open("CONTEXT_MENU", {
        message,
        pos,
      });
    },
    [overlay]
  );

  const openReactionPicker = useCallback(
    (message: ChatMessage, pos: Position) => {
      overlay.open("REACTION_PICKER", {
        message,
        pos,
      });
    },
    [overlay]
  );

  const openEmojiMart = useCallback(
    (message: ChatMessage, pos: Position) => {
      overlay.open("EMOJI_MART", {
        message,
        pos,
      });
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
    reactionUI.reset();
  }, [overlay, reactionUI]);

  /* ================= Public API ================= */

  return {
    // raw state
    active: overlay.overlay.type,
    data: overlay.overlay.data,

    // open actions
    openContextMenu,
    openReactionPicker,
    openEmojiMart,
    openCamera,
    openDeleteSheet,
    openForwardSheet,

    // helpers
    isOpen: overlay.isOpen,
    close: closeOverlay,
  };
}
