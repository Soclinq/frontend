// hooks/useReactionAnimations.ts
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";

export function useReactionAnimations(msg: ChatMessage) {
  const prevRef = useRef<string>("");

  const [animate, setAnimate] = useState(false);

  const signature =
    msg.reactions
      ?.map((r) => `${r.emoji}:${r.count}`)
      .join("|") ?? "";

  useEffect(() => {
    if (prevRef.current && prevRef.current !== signature) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 420);
      return () => clearTimeout(t);
    }
    prevRef.current = signature;
  }, [signature]);

  return animate;
}
