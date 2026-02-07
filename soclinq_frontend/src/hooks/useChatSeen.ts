// hooks/useChatSeen.ts
import { useEffect, useRef } from "react";

export function useChatSeen(
  containerRef: React.RefObject<HTMLDivElement | null>,
  deps: any[] = []
) {
  const seenOnceRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = e.target.getAttribute("data-msg-id");
          if (!id || seenOnceRef.current.has(id)) return;

          seenOnceRef.current.add(id);
          window.dispatchEvent(new CustomEvent("chat:seen", { detail: id }));
        });
      },
      { threshold: 0.8 }
    );

    el.querySelectorAll("[data-msg-id]").forEach((n) =>
      observer.observe(n)
    );

    return () => observer.disconnect();
  }, deps);
}
