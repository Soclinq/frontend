import { useEffect, useRef, useState } from "react";

/* ================= Types ================= */

type Params = {
  /** container that scrolls */
  rootRef: React.RefObject<HTMLElement | null>;

  /** percentage of visibility required */
  threshold?: number;

  /** debounce time (ms) before marking visible */
  delay?: number;
};

/* ================= Hook ================= */

export function useViewportObserver({
  rootRef,
  threshold = 0.6,
  delay = 300,
}: Params) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timersRef = useRef<Map<string, number>>(new Map());

  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () => new Set()
  );

  /* ================= setup ================= */

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const id = el.dataset.msgId;
          if (!id) return;

          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= threshold
          ) {
            if (timersRef.current.has(id)) return;

            const t = window.setTimeout(() => {
              setVisibleIds((prev) => {
                if (prev.has(id)) return prev;
                const next = new Set(prev);
                next.add(id);
                return next;
              });
              timersRef.current.delete(id);
            }, delay);

            timersRef.current.set(id, t);
          } else {
            const t = timersRef.current.get(id);
            if (t) {
              window.clearTimeout(t);
              timersRef.current.delete(id);
            }
          }
        });
      },
      {
        root,
        threshold,
      }
    );

    /* observe existing children */
    const nodes =
      root.querySelectorAll<HTMLElement>("[data-msg-id]");
    nodes.forEach((n) => observerRef.current?.observe(n));

    return () => {
      observerRef.current?.disconnect();
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current.clear();
    };
  }, [rootRef, threshold, delay]);

  /* ================= API ================= */

  return visibleIds;
}
