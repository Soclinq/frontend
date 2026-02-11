import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import type { ChatAdapter } from "@/types/chatAdapterTypes";

type Options = {
  threadId: string;
  adapter: ChatAdapter;
  onInvalid: () => void;
  onLoadingChange?: (loading: boolean) => void;
};

export function useRouteThreadGuard({
  threadId,
  adapter,
  onInvalid,
  onLoadingChange,
}: Options) {
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;

    (async () => {
      try {
        onLoadingChange?.(true);

        // adapter must expose a guard endpoint
        if (typeof adapter.guard !== "function") {
          setValid(true);
          return;
        }

        const res = await authFetch(adapter.guard(threadId), {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error("invalid");

        if (!cancelled) {
          setValid(true);
        }
      } catch {
        if (!cancelled) {
          setValid(false);
          onInvalid();
        }
      } finally {
        if (!cancelled) {
          onLoadingChange?.(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId, adapter, onInvalid, onLoadingChange]);

  return {
    valid,
  };
}
