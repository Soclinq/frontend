import { useEffect, useRef } from "react";

type Focusable = HTMLElement & { focus(): void };

type Options = {
  inputRef: React.RefObject<Focusable | null>;
  overlayOpen: boolean;
  modalOpen?: boolean;
};


export function useChatFocusManagement({
  inputRef,
  overlayOpen,
  modalOpen = false,
}: Options) {
  const shouldRestoreRef = useRef(false);

  useEffect(() => {
    if (overlayOpen || modalOpen) {
      shouldRestoreRef.current = true;
      return;
    }

    if (shouldRestoreRef.current) {
      shouldRestoreRef.current = false;
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [overlayOpen, modalOpen, inputRef]);
}
