"use client";

import { useEffect, useRef, useState } from "react";

export function useHeaderMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }

    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return {
    open,
    ref,
    toggle: () => setOpen((p) => !p),
    close: () => setOpen(false),
  };
}
