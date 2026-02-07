// hooks/useMessageHighlight.ts
import { useCallback, useRef, useState } from "react";

export function useMessageHighlight(duration = 900) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const highlight = useCallback((id: string) => {
    setHighlightedId(id);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(
      () => setHighlightedId(null),
      duration
    );
  }, [duration]);

  return { highlightedId, highlight };
}
