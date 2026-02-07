import { useEffect } from "react";

type Options = {
  onVisible?: () => void;
  onHidden?: () => void;
};

export function useChatVisibilityLifecycle({
  onVisible,
  onHidden,
}: Options) {
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        onVisible?.();
      } else {
        onHidden?.();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [onVisible, onHidden]);
}
