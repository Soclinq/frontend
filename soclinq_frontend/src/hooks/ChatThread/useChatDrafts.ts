import { useCallback, useEffect, useRef, useState } from "react";
import { openDB } from "idb";

/* ================= TYPES ================= */

export type DraftAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type ChatDraft = {
  text: string;
  replyToId: string | null;
  attachments: DraftAttachment[];
  updatedAt: number;
};

type Params = {
  threadId: string;
  encrypt?: (plain: string) => Promise<string>;
  decrypt?: (cipher: string) => Promise<string>;
  syncRemote?: (draft: ChatDraft | null) => void;
};

/* ================= STORAGE ================= */

const LOCAL_PREFIX = "soclinq_draft_v2_";
const DB_NAME = "chat-drafts-db";
const STORE = "drafts";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: "threadId" });
    }
  },
});

/* ================= UTILS ================= */

function isLarge(text: string) {
  return text.length > 2000;
}

/* ================= HOOK ================= */

export function useChatDrafts({
  threadId,
  encrypt,
  decrypt,
  syncRemote,
}: Params) {
  const [draft, setDraft] = useState<ChatDraft>({
    text: "",
    replyToId: null,
    attachments: [],
    updatedAt: Date.now(),
  });

  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const storageKey = `${LOCAL_PREFIX}${threadId}`;
  const [isHydrated, setIsHydrated] = useState(false);

  /* ================= LOAD ================= */

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setIsHydrated(false);

    (async () => {
      try {
        // 1️⃣ IndexedDB first (large drafts)
        const db = await dbPromise;
        const record = await db.get(STORE, threadId);
        if (record && !cancelled) {
          const text = decrypt
            ? await decrypt(record.text)
            : record.text;
          setDraft({ ...record, text });
          hydratedRef.current = true;
          return;
        }

        // 2️⃣ Fallback to localStorage
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;

        const parsed: ChatDraft = JSON.parse(raw);
        const text = decrypt
          ? await decrypt(parsed.text)
          : parsed.text;

        if (!cancelled) {
          setDraft({ ...parsed, text });
        }
      } catch {
        // ignore hydration errors
      } finally {
        hydratedRef.current = true;
        setIsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  /* ================= SAVE (DEBOUNCED) ================= */

  const persistDraft = useCallback(async (nextDraft: ChatDraft) => {
    try {
      const payload: ChatDraft = {
        ...nextDraft,
        text: encrypt ? await encrypt(nextDraft.text) : nextDraft.text,
        updatedAt: Date.now(),
      };

      // Large drafts → IndexedDB
      if (isLarge(nextDraft.text)) {
        const db = await dbPromise;
        await db.put(STORE, { threadId, ...payload });
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      }

      // Optional cross-device sync
      syncRemote?.(nextDraft);
    } catch {
      // ignore persistence errors
    }
  }, [encrypt, storageKey, syncRemote, threadId]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    const draftSnapshot = draft;

    saveTimerRef.current = window.setTimeout(() => {
      void persistDraft(draftSnapshot);
    }, 350);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      void persistDraft(draftSnapshot);
    };
  }, [draft, persistDraft]);

  /* ================= API ================= */

  const setText = useCallback((text: string) => {
    setDraft((d) => ({ ...d, text }));
  }, []);

  const setReply = useCallback((replyToId: string | null) => {
    setDraft((d) => ({ ...d, replyToId }));
  }, []);

  const addAttachment = useCallback((att: DraftAttachment) => {
    setDraft((d) => ({
      ...d,
      attachments: [...d.attachments, att],
    }));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setDraft((d) => ({
      ...d,
      attachments: d.attachments.filter((a) => a.id !== id),
    }));
  }, []);

  const clearDraft = useCallback(async () => {
    setDraft({
      text: "",
      replyToId: null,
      attachments: [],
      updatedAt: Date.now(),
    });

    try {
      localStorage.removeItem(storageKey);
      const db = await dbPromise;
      await db.delete(STORE, threadId);
      syncRemote?.(null);
    } catch {}
  }, [threadId, syncRemote]);

  return {
    draft,
  
    /* granular setters */
    setText,
    setReply,
    addAttachment,
    removeAttachment,
    isHydrated,
  
    /* aliases for composer ergonomics */
    save: setText,
    clear: clearDraft,
  
    /* lifecycle */
    clearDraft,
  
    /* helpers */
    hasDraft:
      Boolean(draft.text.trim()) ||
      draft.attachments.length > 0 ||
      Boolean(draft.replyToId),
  };
  
}
