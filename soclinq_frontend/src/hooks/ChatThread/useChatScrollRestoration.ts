import { useEffect, useRef } from "react";

const KEY = "soclinq_chat_scroll_v1";

function loadScroll(threadId: string): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.[threadId] === "number"
      ? parsed[threadId]
      : null;
  } catch {
    return null;
  }
}

function saveScroll(threadId: string, value: number) {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[threadId] = value;
    localStorage.setItem(KEY, JSON.stringify(parsed));
  } catch {}
}

export function useChatScrollRestoration(
  containerRef: React.RefObject<HTMLElement | null>,
  threadId: string
) {

  const restoredRef = useRef(false);

  // restore on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el || restoredRef.current) return;

    const saved = loadScroll(threadId);
    if (saved !== null) {
      el.scrollTop = saved;
      restoredRef.current = true;
    }
  }, [threadId, containerRef]);

  // persist on scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
  
    const element = el; // lock non-null
  
    let raf: number | null = null;
  
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        saveScroll(threadId, element.scrollTop);
        raf = null;
      });
    }
  
    element.addEventListener("scroll", onScroll, { passive: true });
  
    return () => {
      element.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threadId, containerRef]);
  
}
