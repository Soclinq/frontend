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
} from "react-icons/fi";

import styles from "./styles/UnifiedHeader.module.css";

type Props = {
  hidden?: boolean;

  mode: "INBOX" | "CHAT";
  locationName?: string;

  // ✅ group/chat display
  chatTitle?: string;
  chatSubtitle?: string; // e.g "12 members" or "online"
  chatAvatarUrl?: string;

  searchValue: string;
  onSearchChange: (v: string) => void;

  disabledAll?: boolean;

  onBack?: () => void;
  onOpenLocation?: () => void;

  onOpenSettings?: () => void;
  onNewGroup?: () => void;
  onNewChat?: () => void;
  onHelp?: () => void;

  // inbox controls
  onRefresh?: () => void;
  onCreateHub?: () => void;

  // ✅ Group actions (CHAT menu)
  onOpenGroupInfo?: () => void;
  onOpenGroupMedia?: () => void;
  onMuteNotifications?: () => void;
  onExitGroup?: () => void;

  selection?: {
    active: boolean;
    count: number;
    onExit: () => void;
    onSelectAll: () => void;
    onUnselectAll: () => void;
    onForward: () => void;
    onShare: () => void;
    onDelete: () => void;
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
  }, [mode]);

  if (hidden) return null;

  /* ===============================
     ✅ SELECTION HEADER
  =============================== */
  if (selectionActive && selection) {
    return (
      <header className={styles.header}>
        <button
          type="button"
          className={styles.leftBtn}
          onClick={selection.onExit}
          title="Exit selection"
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
          >
            <FiCheckSquare />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={selection.onUnselectAll}
            title="Unselect all"
          >
            <FiSquare />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={selection.onForward}
            title="Forward"
          >
            <FiSend />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={selection.onShare}
            title="Share"
          >
            📤
          </button>

          <button
            type="button"
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={selection.onDelete}
            title="Delete"
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
        onClick={isChat ? onBack : onOpenLocation}
        title={isChat ? "Back" : "Change LGA"}
        disabled={disabledAll}
      >
        {isChat ? <FiArrowLeft /> : <FiMapPin />}
      </button>

      {/* ✅ CHAT TITLE AREA */}
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
        /* ✅ INBOX SEARCH */
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={"Search inbox..."}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabledAll}
          />
        </div>
      )}

     
      {/* ✅ MORE MENU */}
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
                    // focus search input or open search UI
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
    </header>
  );
}
