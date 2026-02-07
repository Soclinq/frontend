import { useEffect, useRef, useState } from "react";

type Params = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  loadOlder: () => void;
  loading: boolean;
  deps?: any[];
};

export function useChatScroll({
  containerRef,
  loadOlder,
  loading,
  deps = [],
}: Params) {
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const loadingOlderRef = useRef(false);
  const prevScrollHeightRef = useRef<number | null>(null);
  const restoreScrollRef = useRef(false);
  const hideBtnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- helpers ---------- */

  const isNearBottom = (el: HTMLDivElement) => {
    const THRESHOLD = 220;
    return el.scrollHeight - (el.scrollTop + el.clientHeight) < THRESHOLD;
  };

  const scrollToBottom = (smooth = true) => {
    const el = containerRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });

    setShowScrollBottom(false);

    if (hideBtnTimerRef.current) {
      clearTimeout(hideBtnTimerRef.current);
    }

    hideBtnTimerRef.current = setTimeout(() => {
      setShowScrollBottom(false);
    }, 2000);
  };

  /* ---------- scroll listener ---------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      // 🔼 Load older when at top
      if (
        el.scrollTop <= 0 &&
        !loadingOlderRef.current &&
        !loading
      ) {
        loadingOlderRef.current = true;
        prevScrollHeightRef.current = el.scrollHeight;
        restoreScrollRef.current = true;
        loadOlder();
      }

      // 🔽 Scroll-to-bottom button
      const next = !isNearBottom(el);
      setShowScrollBottom((prev) => (prev === next ? prev : next));
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [containerRef, loading, loadOlder]);

  /* ---------- restore scroll after prepend ---------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!restoreScrollRef.current) return;

    const prevHeight = prevScrollHeightRef.current ?? el.scrollHeight;
    const newHeight = el.scrollHeight;

    el.scrollTop = newHeight - prevHeight;

    restoreScrollRef.current = false;
    loadingOlderRef.current = false;
    prevScrollHeightRef.current = null;
  }, deps);

  /* ---------- cleanup ---------- */

  useEffect(() => {
    return () => {
      if (hideBtnTimerRef.current) {
        clearTimeout(hideBtnTimerRef.current);
      }
    };
  }, []);

  return {
    showScrollBottom,
    scrollToBottom,
  };
}
