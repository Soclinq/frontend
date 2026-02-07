import { useCallback } from "react";

type Options = {
  onError?: (error: unknown) => void;
};

export function useChatErrorBoundaryBridge({
  onError,
}: Options) {
  const reportError = useCallback(
    (error: unknown) => {
      try {
        console.error("[ChatError]", error);
        onError?.(error);
      } catch {
        // never throw from error handler
      }
    },
    [onError]
  );

  return reportError;
}
