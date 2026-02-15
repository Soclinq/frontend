"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/ChatForwardPicker.module.css";
import { authFetch } from "@/lib/authFetch";
import { useNotify } from "@/components/utils/NotificationContext";
import type { ChatAdapter } from "@/types/chatAdapterTypes";

import type { ForwardMessageLite, ForwardTarget } from "@/types/chatForwardTypes";

type Mode = "NEW_MESSAGE" | "FORWARD";

type Props = {
  open: boolean;
  onClose: () => void;

  mode: Mode;

  adapter: ChatAdapter;

  // ✅ For NEW_MESSAGE mode
  onStartChat?: (target: ForwardTarget) => void;

  // ✅ For FORWARD mode
  forwardMessages?: ForwardMessageLite[];
  currentThreadId?: string;

  onForwardDone?: () => void;
};

type ContactMatchUser = {
  id: string;
  name: string;
  photo?: string | null;
};

function normalizeTargetType(input: unknown): "PRIVATE" | "COMMUNITY" {
  return String(input || "").toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "PRIVATE";
}

function toForwardTarget(raw: any): ForwardTarget | null {
  const id = String(
    raw?.id ?? raw?.threadId ?? raw?.thread_id ?? raw?.conversation_id ?? raw?.hub_id ?? ""
  ).trim();

  const name = String(
    raw?.name ?? raw?.title ?? raw?.display_name ?? raw?.other_user?.name ?? ""
  ).trim();

  if (!id || !name) return null;

  return {
    id,
    name,
    type: normalizeTargetType(raw?.type ?? raw?.threadType),
    photo: raw?.photo ?? raw?.avatar ?? raw?.other_user?.photo ?? null,
  };
}

function uniqueTargets(items: ForwardTarget[]): ForwardTarget[] {
  const seen = new Set<string>();
  const output: ForwardTarget[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    output.push(item);
  }

  return output;
}
export default function ChatForwardPicker({
  open,
  onClose,
  mode,
  adapter,
  onStartChat,
  forwardMessages = [],
  currentThreadId,
  onForwardDone,
}: Props) {
  const notify = useNotify();
  const notifyRef = useRef(notify);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  const [search, setSearch] = useState("");

  const [defaultTargets, setDefaultTargets] = useState<ForwardTarget[]>([]);
  const [searchTargets, setSearchTargets] = useState<ForwardTarget[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsGranted, setContactsGranted] = useState(false);

  const searchMode = Boolean(search.trim());
  const debTimer = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedDefaultsRef = useRef(false);

  const targets = useMemo(() => {
    return searchMode ? searchTargets : defaultTargets;
  }, [searchMode, searchTargets, defaultTargets]);


  const canSubmit =
    mode === "NEW_MESSAGE"
      ? selectedIds.length === 1
      : selectedIds.length > 0 && forwardMessages.length > 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  // ==========================
  // ✅ Load default list (contacts + groups)
  // ==========================
  async function fetchRecentTargets() {
    try {
      const res = await authFetch(adapter.inbox(), {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return [];

      const list =
        data?.results ??
        data?.items ??
        data?.threads ??
        data?.conversations ??
        data?.inbox ??
        data?.targets ??
        [];

      if (!Array.isArray(list)) return [];

      return uniqueTargets(
        list
          .map(toForwardTarget)
          .filter(Boolean) as ForwardTarget[]
      );
    } catch {
      return [];
    }
  }

  async function requestContactsAndSync() {
    const hasContactAPI =
      typeof navigator !== "undefined" &&
      // @ts-ignore
      navigator.contacts &&
      // @ts-ignore
      typeof navigator.contacts.select === "function";

    if (!hasContactAPI) {
      notify({
        type: "info",
        title: "Contacts not supported",
        message: "Your browser does not support contact sync. You can still use search.",
        duration: 3000,
      });
      setContactsGranted(false);
      return;
    }

    try {
      setContactsLoading(true);

      // @ts-ignore
      const picked = await navigator.contacts.select(["name", "tel", "email"], {
        multiple: true,
      });

      const phones: string[] = [];
      const emails: string[] = [];

      for (const c of picked || []) {
        const tel = Array.isArray(c.tel) ? c.tel : [];
        const em = Array.isArray(c.email) ? c.email : [];

        tel.forEach((t: string) => t && phones.push(t));
        em.forEach((e: string) => e && emails.push(e));
      }

      const res = await authFetch("/api/chat/new-chat/sync-contacts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, emails }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();

      const contactTargets = (Array.isArray(data?.registered) ? data.registered : [])
        .map((u: ContactMatchUser) => ({
          id: String(u.id),
          name: u.name,
          type: "PRIVATE" as const,
          photo: u.photo ?? null,
        }))
        .filter((t: ForwardTarget) => t.id && t.name);

      setDefaultTargets((prev) => uniqueTargets([...contactTargets, ...prev]));
      setContactsGranted(true);

      notify({
        type: "success",
        title: "Contacts synced",
        message: "Matched contacts are now available in your forward list.",
        duration: 2000,
      });
    } catch {
      setContactsGranted(false);
      notify({
        type: "warning",
        title: "Contacts unavailable",
        message: "Could not sync contacts right now. You can still use recent chats/search.",
        duration: 2500,
      });
    } finally {
      setContactsLoading(false);
    }
  }


  useEffect(() => {
    if (!open) {
      hasLoadedDefaultsRef.current = false;
      return;
    }

    if (hasLoadedDefaultsRef.current) return;
    hasLoadedDefaultsRef.current = true;

    let cancelled = false;

    async function loadDefault() {
      try {
        setLoading(true);

        const res = await authFetch(adapter.forwardTargets(), {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load targets");

        if (cancelled) return;

        const apiTargets = Array.isArray(data?.targets)
          ? (data.targets.map(toForwardTarget).filter(Boolean) as ForwardTarget[])
          : [];

        const recentTargets = await fetchRecentTargets();
        if (cancelled) return;

        setDefaultTargets(uniqueTargets([...apiTargets, ...recentTargets]));
        setSearchTargets([]);
        setSearch("");
        setSelectedIds([]);
      } catch {
        if (cancelled) return;

        const recentTargets = await fetchRecentTargets();
        if (cancelled) return;

        setDefaultTargets(recentTargets);

        notifyRef.current({
          type: "warning",
          title: "Limited targets",
          message: "Showing recent chats. Pull contacts to add more people.",
          duration: 2500,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDefault();

    return () => {
      cancelled = true;
    };
  }, [open, adapter.mode]);
  // ==========================
  // ✅ Search remote (username/phone/email)
  // ==========================
  useEffect(() => {
    if (!open) return;

    const q = search.trim();

    if (!q) {
      setSearchTargets([]);
      return;
    }

    if (debTimer.current) clearTimeout(debTimer.current);

    debTimer.current = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/chat/search-targets?q=${encodeURIComponent(q)}`, {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();

        const results = Array.isArray(data?.targets)
          ? (data.targets.map(toForwardTarget).filter(Boolean) as ForwardTarget[])
          : [];

        setSearchTargets(results);
      } catch {
        setSearchTargets([]);
      }
    }, 250);

    return () => {
      if (debTimer.current) clearTimeout(debTimer.current);
    };
  }, [search, open]);

  // ==========================
  // ✅ Forward Handler (TEXT + MEDIA)
  // ==========================
  async function handleForward() {
    if (!adapter.features.forward) return;

    if (selectedIds.length === 0) {
      notify({
        type: "warning",
        title: "No target selected",
        message: "Select at least one chat to forward to.",
        duration: 2000,
      });
      return;
    }

    if (forwardMessages.length === 0) {
      notify({
        type: "warning",
        title: "Nothing to forward",
        message: "No messages selected to forward.",
        duration: 2000,
      });
      return;
    }

    try {
      setForwarding(true);

      /**
       * ✅ Payload supports:
       * - multiple target IDs
       * - multiple messages
       * - media attachments forwarding
       *
       * Your backend should clone messages into each target.
       */
      const res = await authFetch(adapter.forwardMessages(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromThreadId: currentThreadId || null,
          targetIds: selectedIds,
          messages: forwardMessages.map((m) => ({
            id: m.id,
            text: m.text || "",
            attachments: m.attachments || [],
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Forward failed");

      notify({
        type: "success",
        title: "Forwarded",
        message: `Sent to ${selectedIds.length} chat(s)`,
        duration: 1800,
      });

      clearSelection();
      onForwardDone?.();
      onClose();
    } catch (e: any) {
      notify({
        type: "error",
        title: "Forward failed",
        message: "Unable to forward messages right now.",
        duration: 2500,
      });
    } finally {
      setForwarding(false);
    }
  }

  function handleStartChat() {
    if (selectedIds.length !== 1) return;
    const chosen = targets.find((t) => t.id === selectedIds[0]);
    if (!chosen) return;

    onStartChat?.(chosen);
    onClose();
  }

  if (!open) return null;

  const title = mode === "FORWARD" ? "Forward to..." : "New message";

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            ←
          </button>

          <div className={styles.titleBlock}>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.sub}>
              {mode === "FORWARD"
                ? `${selectedIds.length} selected`
                : searchMode
                ? "Search results"
                : "Recent chats + your contacts"}
            </p>
          </div>

          <button
            className={styles.actionBtn}
            disabled={!canSubmit || loading || forwarding}
            onClick={mode === "FORWARD" ? handleForward : handleStartChat}
          >
            {mode === "FORWARD" ? (forwarding ? "Sending..." : "Send") : "Chat"}
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            placeholder="Search username, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search.trim() && (
            <button className={styles.clearBtn} onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        {!contactsGranted && (
          <div className={styles.permissionBanner}>
            <div>
              <div className={styles.permissionTitle}>Find more contacts</div>
              <div className={styles.permissionText}>
                Sync phone contacts to show people linked to your account.
              </div>
            </div>
            <button
              className={styles.permissionBtn}
              onClick={requestContactsAndSync}
              disabled={contactsLoading}
            >
              {contactsLoading ? "Syncing..." : "Sync Contacts"}
            </button>
          </div>
        )}
        <div className={styles.body}>
          {loading && <div className={styles.loading}>Loading...</div>}

          {!loading && targets.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No results</div>
              <div className={styles.emptyText}>
                Try searching by username, phone number or email.
              </div>
            </div>
          )}

          {!loading &&
            targets.map((t) => {
              const checked = selectedIds.includes(t.id);

              return (
                <button
                  key={t.id}
                  className={`${styles.row} ${checked ? styles.rowActive : ""}`}
                  onClick={() => toggleSelect(t.id)}
                >
                  <div className={styles.avatar}>
                    {t.photo ? <img src={t.photo} alt={t.name} /> : <span>{t.name[0]}</span>}
                  </div>

                  <div className={styles.meta}>
                    <div className={styles.name}>{t.name}</div>
                    <div className={styles.subline}>
                      {t.type === "COMMUNITY" ? "Group" : "Private"}
                    </div>
                  </div>

                  <div className={styles.check}>{checked ? "✅" : "⬜"}</div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
