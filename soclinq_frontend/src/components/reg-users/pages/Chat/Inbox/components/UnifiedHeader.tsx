"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiMapPin,
  FiSearch,
  FiX,
  FiTrash2,
  FiSend,
  FiCheckSquare,
  FiSquare,
  FiMoreVertical,
  FiSettings,
  FiUsers,
  FiPlus,
  FiHelpCircle,
  FiRefreshCw,
  FiImage,
  FiInfo,
  FiBellOff,
  FiLogOut,
  FiStar,
  FiArchive,
  FiUser,
  FiSlash,
  FiShare2,
  FiCheckCircle,
} from "react-icons/fi";

import styles from "./styles/UnifiedHeader.module.css";

type SelectionKind = "GROUP_ONLY" | "PRIVATE_ONLY" | "MIXED";

/** ✅ NEW: supports NEW_CHAT selection/header */
type SelectionContext = "CHAT" | "INBOX" | "NEW_CHAT";

/** ✅ NEW: supports NEW_CHAT mode */
type HeaderMode = "INBOX" | "CHAT" | "NEW_CHAT";

type Props = {
  hidden?: boolean;

  mode: HeaderMode;
  locationName?: string;

  // CHAT header
  chatTitle?: string;
  chatSubtitle?: string;
  chatAvatarUrl?: string;

  // Shared search state (inbox/new chat)
  searchValue: string;
  onSearchChange: (v: string) => void;

  disabledAll?: boolean;

  // Left actions
  onBack?: () => void;
  onOpenLocation?: () => void;

  /** ✅ NEW: close new chat picker */
  onCloseNewChat?: () => void;

  // Menu actions
  onOpenSettings?: () => void;
  onNewGroup?: () => void;
  onNewChat?: () => void;
  onHelp?: () => void;

  onRefresh?: () => void;
  onCreateHub?: () => void;

  // Chat menu actions
  onOpenGroupInfo?: () => void;
  onOpenGroupMedia?: () => void;
  onMuteNotifications?: () => void;
  onExitGroup?: () => void;

  selection?: {
    active: boolean;
    count: number;

    /** ✅ CHAT selection OR INBOX selection OR NEW_CHAT selection */
    context?: SelectionContext;

    /** ✅ INBOX selection meta */
    kind?: SelectionKind;
    canDelete?: boolean;
    markLabel?: string;

    /** shared */
    onExit: () => void;

    /** optional actions */
    onSelectAll?: () => void;
    onUnselectAll?: () => void;

    /** CHAT actions */
    onForward?: () => void;
    onShare?: () => void;

    /** INBOX actions */
    onPin?: () => void;
    onMute?: () => void;
    onArchive?: () => void;
    onMarkReadUnread?: () => void;

    onShareGroup?: () => void;
    onOpenGroupInfo?: () => void;
    onExitGroup?: () => void;

    onViewContact?: () => void;
    onBlockContact?: () => void;

    /** delete for both */
    onDelete?: () => void;
  };
};

export default function UnifiedHeader({
  hidden,
  mode,
  locationName,

  chatTitle,
  chatSubtitle,
  chatAvatarUrl,

  searchValue,
  onSearchChange,

  disabledAll = false,

  onBack,
  onOpenLocation,
  onCloseNewChat,

  onOpenSettings,
  onNewGroup,
  onNewChat,
  onHelp,

  onRefresh,
  onCreateHub,

  onOpenGroupInfo,
  onOpenGroupMedia,
  onMuteNotifications,
  onExitGroup,

  selection,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isChat = mode === "CHAT";
  const isInbox = mode === "INBOX";
  const isNewChat = mode === "NEW_CHAT";

  const selectionActive = Boolean(selection?.active);

  // ✅ close dropdown on outside click
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    }

    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // ✅ close menu when switching view
  useEffect(() => {
    setMenuOpen(false);
  }, [mode, selectionActive]);

  if (hidden) return null;

  const selectionContext: SelectionContext = selection?.context || "CHAT";
  const selectionKind = selection?.kind || "MIXED";
  const markLabel = selection?.markLabel || "Mark as read";
  const canDelete = !!selection?.canDelete;

  /* ===============================
     ✅ SELECTION HEADER
  =============================== */
  if (selectionActive && selection) {
    const isInboxSelection = selectionContext === "INBOX";
    const isNewChatSelection = selectionContext === "NEW_CHAT";

    // ✅ NEW_CHAT selection header
    if (isNewChatSelection) {
      return (
        <header className={styles.header}>
          {/* LEFT */}
          <button
            type="button"
            className={styles.leftBtn}
            onClick={selection.onExit}
            title="Exit selection"
            disabled={disabledAll}
          >
            <FiX />
            <span className={styles.leftText}>{selection.count} selected</span>
          </button>

          <div className={styles.selectionActions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={selection.onSelectAll}
              title="Select all"
              disabled={disabledAll}
            >
              <FiCheckSquare />
            </button>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={selection.onUnselectAll}
              title="Unselect all"
              disabled={disabledAll}
            >
              <FiSquare />
            </button>

            {/* ✅ reuse onForward as "Create group" */}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={selection.onForward}
              title="Create group"
              disabled={disabledAll}
            >
              <FiUsers />
            </button>
          </div>
        </header>
      );
    }

    // ✅ INBOX selection header
    if (isInboxSelection) {
      return (
        <header className={styles.header}>
          {/* LEFT */}
          <button
            type="button"
            className={styles.leftBtn}
            onClick={selection.onExit}
            title="Exit selection"
            disabled={disabledAll}
          >
            <FiX />
            <span className={styles.leftText}>{selection.count} selected</span>
          </button>

          <div className={styles.selectionActions}>
            {/* ✅ Delete OUTSIDE MORE (only if allowed) */}
            {canDelete ? (
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.danger}`}
                onClick={() => selection.onDelete?.()}
                title="Delete"
                disabled={disabledAll}
              >
                <FiTrash2 />
              </button>
            ) : null}

            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => selection.onPin?.()}
              title="Pin"
              disabled={disabledAll}
            >
              <FiStar />
            </button>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => selection.onMute?.()}
              title="Mute"
              disabled={disabledAll}
            >
              <FiBellOff />
            </button>

            {/* ✅ More menu */}
            <div className={styles.moreWrap} ref={menuRef}>
              <button
                type="button"
                className={styles.moreBtn}
                title="More"
                disabled={disabledAll}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((p) => !p);
                }}
              >
                <FiMoreVertical />
              </button>

              {menuOpen && (
                <div className={styles.moreMenu}>
                  <button
                    type="button"
                    className={styles.moreItem}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                      selection.onMarkReadUnread?.();
                    }}
                  >
                    <FiCheckCircle /> {markLabel}
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                      selection.onArchive?.();
                    }}
                  >
                    <FiArchive /> Archive chat
                  </button>

                  <div className={styles.moreDivider} />

                  {selectionKind === "GROUP_ONLY" ? (
                    <>
                      <button
                        type="button"
                        className={styles.moreItem}
                        disabled={disabledAll}
                        onClick={() => {
                          setMenuOpen(false);
                          selection.onOpenGroupInfo?.();
                        }}
                      >
                        <FiInfo /> Group info
                      </button>

                      <button
                        type="button"
                        className={styles.moreItem}
                        disabled={disabledAll}
                        onClick={() => {
                          setMenuOpen(false);
                          selection.onShareGroup?.();
                        }}
                      >
                        <FiShare2 /> Share group
                      </button>

                      <button
                        type="button"
                        className={`${styles.moreItem} ${styles.dangerItem}`}
                        disabled={disabledAll}
                        onClick={() => {
                          setMenuOpen(false);
                          selection.onExitGroup?.();
                        }}
                      >
                        <FiLogOut /> Exit group
                      </button>
                    </>
                  ) : null}

                  {selectionKind === "PRIVATE_ONLY" ? (
                    <>
                      <button
                        type="button"
                        className={styles.moreItem}
                        disabled={disabledAll}
                        onClick={() => {
                          setMenuOpen(false);
                          selection.onViewContact?.();
                        }}
                      >
                        <FiUser /> View contact
                      </button>

                      <button
                        type="button"
                        className={`${styles.moreItem} ${styles.dangerItem}`}
                        disabled={disabledAll}
                        onClick={() => {
                          setMenuOpen(false);
                          selection.onBlockContact?.();
                        }}
                      >
                        <FiSlash /> Block contact
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </header>
      );
    }

    // ✅ CHAT selection header (messages selection)
    return (
      <header className={styles.header}>
        {/* LEFT */}
        <button
          type="button"
          className={styles.leftBtn}
          onClick={selection.onExit}
          title="Exit selection"
          disabled={disabledAll}
        >
          <FiX />
          <span className={styles.leftText}>{selection.count} selected</span>
        </button>

        <div className={styles.selectionActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={selection.onSelectAll}
            title="Select all"
            disabled={disabledAll}
          >
            <FiCheckSquare />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={selection.onUnselectAll}
            title="Unselect all"
            disabled={disabledAll}
          >
            <FiSquare />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={selection.onForward}
            title="Forward"
            disabled={disabledAll}
          >
            <FiSend />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={selection.onShare}
            title="Share"
            disabled={disabledAll}
          >
            📤
          </button>

          <button
            type="button"
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={selection.onDelete}
            title="Delete"
            disabled={disabledAll}
          >
            <FiTrash2 />
          </button>
        </div>
      </header>
    );
  }

  /* ===============================
     ✅ NORMAL HEADER
  =============================== */
  return (
    <header className={styles.header}>
      {/* LEFT */}
      <button
        type="button"
        className={styles.leftBtn}
        onClick={
          isChat ? onBack : isNewChat ? onCloseNewChat : onOpenLocation
        }
        title={isChat ? "Back" : isNewChat ? "Close" : "Change LGA"}
        disabled={disabledAll}
      >
        {isChat ? <FiArrowLeft /> : isNewChat ? <FiX /> : <FiMapPin />}
      </button>

      {/* ✅ MAIN AREA */}
      {isChat ? (
        <button
          type="button"
          className={styles.chatTitleBtn}
          onClick={() => onOpenGroupInfo?.()}
          disabled={disabledAll}
          title="Open group info"
        >
          <div className={styles.chatAvatar}>
            {chatAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chatAvatarUrl} alt="Group avatar" />
            ) : (
              <span className={styles.chatAvatarFallback}>👥</span>
            )}
          </div>

          <div className={styles.chatMeta}>
            <div className={styles.chatName}>{chatTitle || "Group Chat"}</div>
            {chatSubtitle ? (
              <div className={styles.chatSubtitle}>{chatSubtitle}</div>
            ) : null}
          </div>
        </button>
      ) : (
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={isNewChat ? "Search name, phone or email..." : "Search inbox..."}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabledAll}
            autoFocus={isNewChat}
          />
        </div>
      )}

      {/* ✅ MORE MENU (hidden in NEW_CHAT mode) */}
      {!isNewChat && (
        <div className={styles.moreWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.moreBtn}
            title="More"
            disabled={disabledAll}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((p) => !p);
            }}
          >
            <FiMoreVertical />
          </button>

          {menuOpen && (
            <div className={styles.moreMenu}>
              {/* ✅ CHAT MENU */}
              {isChat ? (
                <>
                  <button
                    type="button"
                    className={styles.moreItem}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenGroupInfo?.();
                    }}
                  >
                    <FiInfo /> Group info
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenGroupMedia?.();
                    }}
                  >
                    <FiImage /> Group media
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                    }}
                  >
                    <FiSearch /> Search
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                      onMuteNotifications?.();
                    }}
                  >
                    <FiBellOff /> Mute notifications
                  </button>

                  <div className={styles.moreDivider} />

                  <button
                    type="button"
                    className={`${styles.moreItem} ${styles.dangerItem}`}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                      onExitGroup?.();
                    }}
                  >
                    <FiLogOut /> Exit group
                  </button>
                </>
              ) : (
                /* ✅ INBOX MENU */
                <>
                  <button
                    type="button"
                    className={styles.moreItem}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                      onRefresh?.();
                    }}
                  >
                    <FiRefreshCw /> Refresh
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    disabled={disabledAll}
                    onClick={() => {
                      setMenuOpen(false);
                      onCreateHub?.();
                    }}
                  >
                    <FiPlus /> Create Hub
                  </button>

                  <div className={styles.moreDivider} />

                  <button
                    type="button"
                    className={styles.moreItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onNewChat?.();
                    }}
                  >
                    <FiPlus /> New chat
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onNewGroup?.();
                    }}
                  >
                    <FiUsers /> New group
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenLocation?.();
                    }}
                  >
                    <FiMapPin /> Change location
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSettings?.();
                    }}
                  >
                    <FiSettings /> Settings
                  </button>

                  <button
                    type="button"
                    className={styles.moreItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onHelp?.();
                    }}
                  >
                    <FiHelpCircle /> Help
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
