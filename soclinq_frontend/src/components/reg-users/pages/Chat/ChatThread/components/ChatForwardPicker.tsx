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

  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  const [search, setSearch] = useState("");

  const [defaultTargets, setDefaultTargets] = useState<ForwardTarget[]>([]);
  const [searchTargets, setSearchTargets] = useState<ForwardTarget[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const searchMode = Boolean(search.trim());
  const debTimer = useRef<NodeJS.Timeout | null>(null);

  const targets = useMemo(() => {
    return searchMode ? searchTargets : defaultTargets;
  }, [searchMode, searchTargets, defaultTargets]);

  const selectedTargets = useMemo(() => {
    const set = new Set(selectedIds);
    return targets.filter((t) => set.has(t.id));
  }, [selectedIds, targets]);

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
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadDefault() {
      try {
        setLoading(true);

        /**
         * ✅ This endpoint should return:
         * - registered contacts on device
         * - recent chats
         * - hubs/groups
         * so forwarding is seamless.
         */
        const res = await authFetch(adapter.forwardTargets(), {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load targets");

        if (cancelled) return;

        setDefaultTargets(data.targets || []);
        setSearchTargets([]);
        setSearch("");
        setSelectedIds([]);
      } catch (e: any) {
        if (cancelled) return;

        setDefaultTargets([]);

        notify({
          type: "warning",
          title: "Targets unavailable",
          message: "Unable to load contacts/groups. Try again.",
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
  }, [open, adapter]);

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

        setSearchTargets(data.targets || []);
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
                : "Contacts on Soclinq"}
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
