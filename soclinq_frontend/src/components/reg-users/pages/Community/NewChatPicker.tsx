"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/NewChatPicker.module.css";
import { authFetch } from "@/lib/authFetch";
import { useNotify } from "@/components/utils/NotificationContext";

type AppUser = {
  id: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
};

type Props = {
  open: boolean;

  /** ✅ search controlled by UnifiedHeader (ChatShell decides value) */
  searchValue: string;
  onSearchChange: (v: string) => void;

  /** ✅ close picker view */
  onClose: () => void;

  /** ✅ open/create private conversation */
  onOpenPrivateChat: (userId: string) => Promise<void> | void;

  /** ✅ view profile preview */
  onViewProfile: (userId: string) => void;

  /** ✅ create group with selected users */
  onCreateGroup: (userIds: string[]) => Promise<void> | void;

  /** ✅ controls UnifiedHeader selection UI */
  onSelectionChange?: (payload: {
    active: boolean;
    count: number;

    onExit: () => void;
    onSelectAll?: () => void;
    onUnselectAll?: () => void;

    // ✅ we use this as Create Group (UnifiedHeader will show FiUsers)
    onForward?: () => void;
  }) => void;
};

export default function NewChatPicker({
  open,

  searchValue,
  onSearchChange,

  onClose,
  onOpenPrivateChat,
  onViewProfile,
  onCreateGroup,
  onSelectionChange,
}: Props) {
  const notify = useNotify();

  const [loadingDefault, setLoadingDefault] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [defaultUsers, setDefaultUsers] = useState<AppUser[]>([]);
  const [searchUsers, setSearchUsers] = useState<AppUser[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const selecting = selectedIds.length > 0;

  const showSearch = Boolean(searchValue.trim());

  const list = useMemo(() => {
    return showSearch ? searchUsers : defaultUsers;
  }, [showSearch, searchUsers, defaultUsers]);

  function isSelected(id: string) {
    return selectedIds.includes(id);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  // ==========================
  // ✅ Long press helper
  // ==========================
  function useLongPress(handler: () => void, ms = 350) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const start = () => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => handler(), ms);
    };

    const stop = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    return { start, stop };
  }

  // ==========================
  // ✅ Load default app users (contacts + emails already on app)
  // ==========================
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadDefault() {
      try {
        setLoadingDefault(true);

        const res = await authFetch("/api/chat/new-chat/default-users", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load");

        if (cancelled) return;

        setDefaultUsers(Array.isArray(data.users) ? data.users : []);
        setSearchUsers([]);
        clearSelection();

        // ✅ reset search for clean entry
        onSearchChange("");
      } catch {
        if (cancelled) return;
        setDefaultUsers([]);
      } finally {
        if (!cancelled) setLoadingDefault(false);
      }
    }

    loadDefault();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ==========================
  // ✅ Search username/phone/email (driven by UnifiedHeader searchValue)
  // ==========================
  useEffect(() => {
    if (!open) return;

    const q = searchValue.trim();

    // reset search results
    if (!q) {
      setSearchUsers([]);
      setLoadingSearch(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoadingSearch(true);

        const res = await authFetch(
          `/api/chat/new-chat/search-users?q=${encodeURIComponent(q)}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();

        setSearchUsers(Array.isArray(data.users) ? data.users : []);
      } catch {
        setSearchUsers([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, open]);

  // ==========================
  // ✅ Tell UnifiedHeader when selecting (NEW_CHAT selection header)
  // ==========================
  useEffect(() => {
    if (!onSelectionChange) return;

    if (!selecting) {
      onSelectionChange({
        active: false,
        count: 0,
        onExit: clearSelection,
      });
      return;
    }

    onSelectionChange({
      active: true,
      count: selectedIds.length,

      onExit: clearSelection,
      onSelectAll: () => setSelectedIds(list.map((u) => u.id)),
      onUnselectAll: clearSelection,

      // ✅ Create Group button in header
      onForward: async () => {
        if (selectedIds.length < 2) {
          notify({
            type: "warning",
            title: "Select 2+ users",
            message: "Pick at least 2 users to create a group.",
            duration: 2000,
          });
          return;
        }

        await onCreateGroup(selectedIds);

        clearSelection();
        onSearchChange("");
        onClose();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecting, selectedIds.length, list]);

  if (!open) return null;

  return (
    <div className={styles.page}>
      {/* ✅ Content list only (header is UnifiedHeader) */}
      <div className={styles.list}>
        {(loadingDefault || loadingSearch) && (
          <div className={styles.loading}>Loading...</div>
        )}

        {!loadingDefault && !loadingSearch && list.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No users found</div>
            <div className={styles.emptyText}>
              Try searching with phone number, username or email.
            </div>
          </div>
        )}

        {!loadingDefault &&
          !loadingSearch &&
          list.map((u) => {
            const checked = isSelected(u.id);

            const longPress = useLongPress(() => {
              // ✅ long press begins selection
              toggleSelect(u.id);
            });

            return (
              <div
                key={u.id}
                className={`${styles.row} ${checked ? styles.rowSelected : ""}`}
                onMouseDown={() => longPress.start()}
                onMouseUp={() => longPress.stop()}
                onMouseLeave={() => longPress.stop()}
                onTouchStart={() => longPress.start()}
                onTouchEnd={() => longPress.stop()}
              >
                {/* ✅ Avatar click -> profile preview */}
                <button
                  className={styles.avatarBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // while selecting -> toggle
                    if (selecting) {
                      toggleSelect(u.id);
                      return;
                    }

                    onViewProfile(u.id);
                  }}
                >
                  <div className={styles.avatar}>
                    {u.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.photo} alt={u.name} />
                    ) : (
                      <span>{(u.name || "?").slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                </button>

                {/* ✅ Body click -> open chat OR toggle selection */}
                <button
                  className={styles.rowBodyBtn}
                  onClick={() => {
                    if (selecting) {
                      toggleSelect(u.id);
                      return;
                    }

                    onOpenPrivateChat(u.id);
                    onSearchChange("");
                    onClose();
                  }}
                >
                  <div className={styles.meta}>
                    <div className={styles.name}>{u.name}</div>
                    <div className={styles.sub}>
                      {u.username ? `@${u.username}` : u.phone || u.email || ""}
                    </div>
                  </div>
                </button>

                {/* ✅ checkbox visible only when selecting */}
                {selecting && (
                  <button
                    className={styles.checkBtn}
                    onClick={() => toggleSelect(u.id)}
                  >
                    {checked ? "✅" : "⬜"}
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
