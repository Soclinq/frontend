import { useEffect, useRef } from "react";

/* ================= Types ================= */

type Params = {
  /** container that scrolls */
  rootRef: React.RefObject<HTMLElement | null>;

  /** called when an item is considered "seen" */
  onVisible: (id: string) => void;

  /** percentage of visibility required */
  threshold?: number;

  /** debounce time (ms) before marking seen */
  delay?: number;
};

/* ================= Hook ================= */

export function useViewportObserver({
  rootRef,
  onVisible,
  threshold = 0.6,
  delay = 300,
}: Params) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timersRef = useRef<Map<string, number>>(new Map());
  const seenRef = useRef<Set<string>>(new Set());

  /* ================= setup ================= */

  useEffect(() => {
    if (!rootRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const id = el.dataset.msgId;
          if (!id) return;

          // already marked seen
          if (seenRef.current.has(id)) return;

          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            // debounce
            if (timersRef.current.has(id)) return;

            const t = window.setTimeout(() => {
              seenRef.current.add(id);
              timersRef.current.delete(id);
              onVisible(id);
            }, delay);

            timersRef.current.set(id, t);
          } else {
            // cancel pending debounce
            const t = timersRef.current.get(id);
            if (t) {
              window.clearTimeout(t);
              timersRef.current.delete(id);
            }
          }
        });
      },
      {
        root: rootRef.current,
        threshold,
      }
    );

    return () => {
      observerRef.current?.disconnect();
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current.clear();
    };
  }, [rootRef, onVisible, threshold, delay]);

  /* ================= observe / unobserve ================= */

  const observe = (el: HTMLElement | null) => {
    if (!el || !observerRef.current) return;
    observerRef.current.observe(el);
  };

  const unobserve = (el: HTMLElement | null) => {
    if (!el || !observerRef.current) return;
    observerRef.current.unobserve(el);
  };

  /* ================= API ================= */

  return {
    observe,
    unobserve,
  };
}
