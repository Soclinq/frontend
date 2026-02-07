// hooks/useReactionBurst.ts
import { useCallback, useState } from "react";

type Burst = {
  id: string;
  emoji: string;
  x: number;
  y: number;
};

export function useReactionBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  const triggerBurst = useCallback(
    (emoji: string, rect: DOMRect) => {
      const id = crypto.randomUUID();

      setBursts((prev) => [
        ...prev,
        {
          id,
          emoji,
          x: rect.left + rect.width / 2,
          y: rect.top,
        },
      ]);

      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 700);
    },
    []
  );

  return { bursts, triggerBurst };
}
