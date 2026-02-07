import { useCallback, useEffect, useRef, useState } from "react";

/* ================= Types ================= */

type Params = {
  containerRef: React.RefObject<HTMLElement | null>;
  bottomRef?: React.RefObject<HTMLElement | null>;

  /** number of messages (used to detect prepend / append) */
  itemCount: number;

  /** px threshold to consider "near bottom" */
  bottomThreshold?: number;
};

type Anchor = {
  id: string;
  prevTop: number;
};

/* ================= Hook ================= */

export function useScrollAnchoring({
  containerRef,
  bottomRef,
  itemCount,
  bottomThreshold = 80,
}: Params) {
  const isAtBottomRef = useRef(true);
  const pendingAnchorRef = useRef<Anchor | null>(null);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  /* ================= helpers ================= */

  const getScrollContainer = () => containerRef.current;

  const isNearBottom = useCallback(() => {
    const el = getScrollContainer();
    if (!el) return true;

    return (
      el.scrollHeight - el.scrollTop - el.clientHeight <
      bottomThreshold
    );
  }, [bottomThreshold]);

  /* ================= track user scroll ================= */

  useEffect(() => {
    const el = getScrollContainer();
    if (!el) return;

    const onScroll = () => {
      isAtBottomRef.current = isNearBottom();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearBottom]);

  /* ================= preserve scroll on prepend ================= */

  const captureAnchorBeforePrepend = useCallback(() => {
    const el = getScrollContainer();
    if (!el) return;

    const first = el.querySelector<HTMLElement>("[data-msg-id]");
    if (!first) return;

    pendingAnchorRef.current = {
      id: first.dataset.msgId!,
      prevTop: first.getBoundingClientRect().top,
    };
  }, []);

  const restoreAnchorAfterPrepend = useCallback(() => {
    const el = getScrollContainer();
    const anchor = pendingAnchorRef.current;
    if (!el || !anchor) return;

    const node = el.querySelector<HTMLElement>(
      `[data-msg-id="${anchor.id}"]`
    );
    if (!node) return;

    const newTop = node.getBoundingClientRect().top;
    el.scrollTop += newTop - anchor.prevTop;

    pendingAnchorRef.current = null;
  }, []);

  /* ================= auto-scroll on append ================= */

  useEffect(() => {
    if (!bottomRef?.current) return;
    if (!isAtBottomRef.current) return;

    bottomRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [itemCount, bottomRef]);

  /* ================= jump to message ================= */

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const el = getScrollContainer();
      if (!el) return;

      const node = el.querySelector<HTMLElement>(
        `[data-msg-id="${messageId}"]`
      );
      if (!node) return;

      node.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setHighlightedId(messageId);
      setTimeout(() => setHighlightedId(null), 1600);
    },
    []
  );

  /* ================= public API ================= */

  return {
    /* scrolling state */
    isNearBottom,

    /* prepend-safe loading */
    captureAnchorBeforePrepend,
    restoreAnchorAfterPrepend,

    /* jump + highlight */
    scrollToMessage,
    highlightedId,
  };
}
