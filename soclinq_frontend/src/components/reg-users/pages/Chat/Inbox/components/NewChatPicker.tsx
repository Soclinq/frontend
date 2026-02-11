"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/NewChatPicker.module.css";
import { authFetch } from "@/lib/authFetch";
import { useNotify } from "@/components/utils/NotificationContext";

type RegisteredUser = {
  kind: "REGISTERED";
  id: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
};

type InviteContact = {
  kind: "INVITE";
  id: string; // phone/email string
  name: string;
  phone?: string | null;
  email?: string | null;
};

type Props = {
  open: boolean;

  /** ✅ search controlled by UnifiedHeader */
  searchValue: string;
  onSearchChange: (v: string) => void;

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

    onForward?: () => void; // Create group
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

  // ✅ contacts flow
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsGranted, setContactsGranted] = useState<boolean>(false);

  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [inviteContacts, setInviteContacts] = useState<InviteContact[]>([]);

  const [searchRegistered, setSearchRegistered] = useState<RegisteredUser[]>([]);
  const [searchInvites, setSearchInvites] = useState<InviteContact[]>([]);

  // ✅ selection (only registered)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selecting = selectedIds.length > 0;

  // ✅ photo preview modal
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ long press refs
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTargetIdRef = useRef<string | null>(null);

  // ==========================
  // ✅ helpers
  // ==========================
  function sortByName<T extends { name: string }>(arr: T[]) {
    return [...arr].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      })
    );
  }

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

  function openPhoto(src: string | null | undefined, name: string) {
    if (!src) return;
    setPhotoSrc(src);
    setPhotoName(name || "Photo");
    setPhotoOpen(true);
  }

  function closePhoto() {
    setPhotoOpen(false);
    setPhotoSrc(null);
    setPhotoName("");
  }

  function stopLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTargetIdRef.current = null;
  }

  function startLongPress(id: string) {
    // ✅ if selection mode already active, do nothing
    if (selecting) return;

    if (longPressTimerRef.current) return;

    longPressTargetIdRef.current = id;

    longPressTimerRef.current = setTimeout(() => {
      navigator.vibrate?.(20);

      const targetId = longPressTargetIdRef.current;
      if (targetId) toggleSelect(targetId);

      stopLongPress();
    }, 350);
  }

  // ✅ cleanup when picker closes
  useEffect(() => {
    if (!open) {
      stopLongPress();
      closePhoto();
      clearSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ==========================
  // ✅ Invite action
  // ==========================
  async function inviteContact(c: InviteContact) {
    const inviteText = "Hey! Join me on Soclinq 🙌 Download it and let’s chat.";

    if (navigator.share) {
      try {
        await navigator.share({ text: inviteText });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(inviteText);
      notify({
        type: "success",
        title: "Invite copied",
        message: "Invite message copied to clipboard ✅",
        duration: 2000,
      });
    } catch {
      notify({
        type: "warning",
        title: "Invite failed",
        message: "Unable to copy invite message.",
        duration: 2000,
      });
    }
  }

  // ==========================
  // ✅ CONTACTS PERMISSION + SYNC
  // ==========================
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
        message:
          "Your browser cannot access contacts. You can still search by phone/email/username.",
        duration: 3500,
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

        tel.forEach((t: string) => {
          if (t && typeof t === "string") phones.push(t);
        });

        em.forEach((e: string) => {
          if (e && typeof e === "string") emails.push(e);
        });
      }

      const res = await authFetch("/api/chat/new-chat/sync-contacts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, emails }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();

      const reg: RegisteredUser[] = Array.isArray(data.registered)
        ? data.registered.map((u: any) => ({ ...u, kind: "REGISTERED" }))
        : [];

      const inv: InviteContact[] = Array.isArray(data.invites)
        ? data.invites.map((x: any) => ({ ...x, kind: "INVITE" }))
        : [];

      setRegisteredUsers(reg);
      setInviteContacts(inv);

      setContactsGranted(true);

      notify({
        type: "success",
        title: "Contacts synced",
        message: "People on Soclinq are now shown first ✅",
        duration: 2000,
      });
    } catch {
      setContactsGranted(false);
      notify({
        type: "warning",
        title: "Contacts denied",
        message: "Unable to access contacts. Search is still available.",
        duration: 2500,
      });
    } finally {
      setContactsLoading(false);
    }
  }

  // ==========================
  // ✅ Load default users
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
        if (!res.ok) throw new Error();

        if (cancelled) return;

        const reg: RegisteredUser[] = Array.isArray(data.users)
          ? data.users.map((u: any) => ({ ...u, kind: "REGISTERED" }))
          : [];

        setRegisteredUsers(reg);
        setInviteContacts([]);
        setSearchRegistered([]);
        setSearchInvites([]);
        clearSelection();
        onSearchChange("");
      } catch {
        if (!cancelled) {
          setRegisteredUsers([]);
          setInviteContacts([]);
        }
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
  // ✅ Search users
  // ==========================
  useEffect(() => {
    if (!open) return;

    const q = searchValue.trim();

    if (!q) {
      setSearchRegistered([]);
      setSearchInvites([]);
      setLoadingSearch(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoadingSearch(true);

        const res = await authFetch(
          `/communities/chat/new-chat/search-users?q=${encodeURIComponent(q)}`,
          { method: "GET", credentials: "include" }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();

        const reg: RegisteredUser[] = Array.isArray(data.users)
          ? data.users.map((u: any) => ({ ...u, kind: "REGISTERED" }))
          : [];

        setSearchRegistered(reg);

        const inv = inviteContacts.filter((c) => {
          const hay = `${c.name || ""} ${c.phone || ""} ${c.email || ""}`.toLowerCase();
          return hay.includes(q.toLowerCase());
        });

        setSearchInvites(inv);
      } catch {
        setSearchRegistered([]);
        setSearchInvites([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, open, inviteContacts]);

  // ==========================
  // ✅ rows to display
  // ==========================
  const showSearch = Boolean(searchValue.trim());

  const displayRegistered = useMemo(() => {
    const base = showSearch ? searchRegistered : registeredUsers;
    return sortByName(base);
  }, [showSearch, searchRegistered, registeredUsers]);

  const displayInvites = useMemo(() => {
    const base = showSearch ? searchInvites : inviteContacts;
    return sortByName(base);
  }, [showSearch, searchInvites, inviteContacts]);

  // ==========================
  // ✅ UnifiedHeader selection sync
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
      onSelectAll: () => setSelectedIds(displayRegistered.map((u) => u.id)),
      onUnselectAll: clearSelection,

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
  }, [selecting, selectedIds.length, displayRegistered]);

  if (!open) return null;

  const loadingAny = loadingDefault || loadingSearch || contactsLoading;

  return (
    <div className={styles.page}>
      {/* ✅ Contacts permission card */}
      {!contactsGranted && (
        <div className={styles.permissionCard}>
          <div className={styles.permissionTitle}>Find your contacts on Soclinq</div>
          <div className={styles.permissionText}>
            Allow contacts access to show people you already know.
          </div>

          <button
            className={styles.permissionBtn}
            disabled={contactsLoading}
            onClick={requestContactsAndSync}
          >
            {contactsLoading ? "Requesting..." : "Allow Contacts"}
          </button>
        </div>
      )}

      {/* ✅ LIST */}
      <div className={styles.list}>
        {loadingAny && <div className={styles.loading}>Loading...</div>}

        {!loadingAny &&
          displayRegistered.length === 0 &&
          displayInvites.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No results</div>
              <div className={styles.emptyText}>
                Try searching phone number, username or email.
              </div>
            </div>
          )}

        {/* ✅ ON SOCLINQ */}
        {displayRegistered.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>On Soclinq</div>

            {displayRegistered.map((u) => {
              const checked = isSelected(u.id);

              return (
                <div
                  key={u.id}
                  className={`${styles.row} ${checked ? styles.rowSelected : ""}`}
                  onMouseDown={() => startLongPress(u.id)}
                  onMouseUp={stopLongPress}
                  onMouseLeave={stopLongPress}
                  onTouchStart={() => startLongPress(u.id)}
                  onTouchEnd={stopLongPress}
                  onTouchCancel={stopLongPress}
                >
                  <button
                    className={styles.avatarBtn}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      if (selecting) {
                        toggleSelect(u.id);
                        return;
                      }

                      openPhoto(u.photo, u.name); // ✅ BIG PHOTO
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

                  <button
                    className={styles.rowBodyBtn}
                    onClick={() => {
                      if (selecting) {
                        toggleSelect(u.id);
                        return;
                      }

                      onOpenPrivateChat(u.id); // ✅ OPEN PRIVATE CHAT
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
        )}

        {/* ✅ INVITE */}
        {displayInvites.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Invite to Soclinq</div>

            {displayInvites.map((c) => {
              return (
                <div key={c.id} className={styles.row}>
                  <button
                    className={styles.avatarBtn}
                    onClick={() => inviteContact(c)}
                  >
                    <div className={styles.avatar}>
                      <span>{(c.name || "?").slice(0, 1).toUpperCase()}</span>
                    </div>
                  </button>

                  <button
                    className={styles.rowBodyBtn}
                    onClick={() => inviteContact(c)}
                  >
                    <div className={styles.meta}>
                      <div className={styles.name}>{c.name}</div>
                      <div className={styles.sub}>{c.phone || c.email || ""}</div>
                    </div>
                  </button>

                  <button
                    className={styles.inviteBtn}
                    onClick={() => inviteContact(c)}
                  >
                    Invite
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ PHOTO LIGHTBOX */}
      {photoOpen && (
        <div className={styles.photoOverlay} onClick={closePhoto}>
          <div
            className={styles.photoModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.photoHeader}>
              <div className={styles.photoTitle}>{photoName}</div>
              <button className={styles.photoCloseBtn} onClick={closePhoto}>
                ✕
              </button>
            </div>

            {photoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.photoBig} src={photoSrc} alt={photoName} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
