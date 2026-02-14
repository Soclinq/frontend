"use client";

import React, { useState } from "react";
import {
  FiX,
  FiSend,
  FiTrash2,
  FiSquare,
  FiChevronLeft,
  FiShare2,
  FiCornerUpLeft,
  FiPhone,
  FiMoreVertical,
  FiImage,
  FiUser,
  FiUsers,
  FiSearch,
  FiBellOff,
  FiDownload,
  FiSlash,
  FiFileText,
  FiAlertCircle,
  FiPlus,
  FiCopy,
} from "react-icons/fi";
import styles from "./styles/ChatHeader.module.css";

type MessageLike = { text?: string };

type SelectionProps = {
  active: boolean;
  count: number;
  onExit: () => void;
  onUnselectAll: () => void;

  canReply?: boolean;
  onReply?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onShare?: () => void;
  onDelete?: () => void;

  canInfo?: boolean;        // ✅ ADD
  onInfo?: () => void;      // ✅ ADD
};


type Props = {
  // basic
  title: string;
  avatarUrl?: string | null;
  subtitle?: string; // last seen / status line

  // group specific
  isGroup?: boolean;
  onlineCount?: number; // number currently online
  members?: string[]; // names displayed (or count used)

  // navigation
  showBack?: boolean;
  onBack?: () => void;

  // actions
  onCall?: () => void;
  onViewContact?: () => void;
  onSearch?: () => void;
  onToggleMute?: () => void;
  onViewGroupInfo?: () => void;
  onGroupMedia?: () => void;
  onGroupSearch?: () => void;
  onClearChat?: () => void;
  onExportChat?: () => void;
  onAddToList?: () => void;
  onReport?: () => void;
  onExitGroup?: () => void;
  onBlock?: () => void;
  onViewMediaLinks?: () => void;

  // selection
  selection?: SelectionProps;
};

export default function ChatHeader(props: Props) {
  const {
    title,
    avatarUrl,
    subtitle,
    isGroup = false,
    onlineCount,
    members = [],

    showBack = true,
    onBack,

    onCall,
    onViewContact,
    onSearch,
    onToggleMute,
    onViewGroupInfo,
    onGroupMedia,
    onGroupSearch,
    onClearChat,
    onExportChat,
    onAddToList,
    onReport,
    onExitGroup,
    onBlock,
    onViewMediaLinks,

    selection,
  } = props;

  const selecting = !!selection?.active;

  /* two-level menus */
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const toggleMain = () => {
    setMainMenuOpen((s) => {
      if (!s) setMoreMenuOpen(false);
      return !s;
    });
  };
  const toggleMore = () => {
    setMoreMenuOpen((s) => !s);
  };

  /* close both when selection changes */
  React.useEffect(() => {
    setMainMenuOpen(false);
    setMoreMenuOpen(false);
  }, [selecting]);

  return (
    <header className={styles.header}>
      {selecting ? (
        /* ================= SELECTION MODE ================= */
        <div className={styles.selectionRow}>
          <button
            type="button"
            className={styles.closeSelectionBtn}
            onClick={selection!.onExit}
            title="Exit selection"
            aria-label="Exit selection"
          >
            <FiX />
          </button>

          <span className={styles.selectionCount}>
            {selection!.count} selected
          </span>

          <button
            className={styles.iconBtn}
            onClick={selection!.onUnselectAll}
            title="Unselect all"
            aria-label="Unselect all"
          >
            <FiSquare />
          </button>

          <div className={styles.selectionActions}>
            <button
              className={styles.iconBtn}
              disabled={!selection!.canReply}
              onClick={selection!.onReply}
              title="Reply"
              aria-label="Reply"
            >
              <FiCornerUpLeft />
            </button>

            <button
              className={styles.iconBtn}
              onClick={selection!.onCopy}
              title="Copy"
              aria-label="Copy"
            >
              <FiCopy />
            </button>
            <button
              className={styles.iconBtn}
              disabled={!selection!.canInfo}
              onClick={selection!.onInfo}
              title="Message info"
              aria-label="Message info"
            >
              <FiAlertCircle />
            </button>

            <button
              className={styles.iconBtn}
              onClick={selection!.onForward}
              title="Forward"
              aria-label="Forward"
            >
              <FiSend />
            </button>

            <button
              className={styles.iconBtn}
              onClick={selection!.onShare}
              title="Share"
              aria-label="Share"
            >
              <FiShare2 />
            </button>

            <button
              className={`${styles.iconBtn} ${styles.dangerBtn}`}
              onClick={selection!.onDelete}
              title="Delete"
              aria-label="Delete"
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
      ) : (
        /* ================= NORMAL MODE ================= */
        <div className={styles.normalRow}>
          <div className={styles.leftColumn}>
            {showBack && (
              <button
                className={styles.backBtn}
                onClick={onBack}
                title="Back"
                aria-label="Back to chats"
              >
                <FiChevronLeft />
              </button>
            )}

            <div
              className={styles.avatarWrap}
              role="button"
              tabIndex={0}
              onClick={onViewContact}
              onKeyDown={(e) => {
                if (e.key === "Enter") onViewContact?.();
              }}
              aria-label="View contact"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${title} avatar`} className={styles.avatar} />
              ) : (
                <div className={styles.placeholderAvatar}>
                  {isGroup ? <FiUsers /> : <FiUser />}
                </div>
              )}
            </div>

            <div className={styles.titleBlock}>
              <div className={styles.titleRow}>
                <h3 className={styles.title}>{title}</h3>
              </div>

              <div className={styles.subtitleRow}>
                {/* group or private status */}
                {isGroup ? (
                  <span className={styles.subtitle}>
                    {onlineCount != null ? `${onlineCount} online` : `${members.length} members`}
                    {members.length > 0 ? ` • ${members.slice(0, 3).join(", ")}` : ""}
                  </span>
                ) : subtitle ? (
                  <span className={styles.subtitle}>{subtitle}</span>
                ) : (
                  <span className={styles.subtitle}>Last seen recently</span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.rightColumn}>
            {/* call button (always on right side) */}
            <button
              className={styles.iconBtn}
              onClick={onCall}
              title="Call"
              aria-label="Call"
            >
              <FiPhone />
            </button>

            {/* MAIN MENU (group or private) */}
            <div className={styles.menuWrap}>
              <button
                className={styles.iconBtn}
                onClick={toggleMain}
                title="More"
                aria-haspopup
                aria-expanded={mainMenuOpen}
                aria-label="Main menu"
              >
                <FiMoreVertical />
              </button>

              {mainMenuOpen && (
                <ul className={styles.menuList} role="menu">
                  {/* group vs private */}
                  {isGroup ? (
                    <>
                      <li role="menuitem" onClick={() => { onViewGroupInfo?.(); setMainMenuOpen(false); }}>
                        <FiImage /> Group info
                      </li>
                      <li role="menuitem" onClick={() => { onGroupMedia?.(); setMainMenuOpen(false); }}>
                        <FiImage /> Group media
                      </li>
                      <li role="menuitem" onClick={() => { onGroupSearch?.(); setMainMenuOpen(false); }}>
                        <FiSearch /> Search in group
                      </li>
                      <li role="menuitem" onClick={() => { onToggleMute?.(); setMainMenuOpen(false); }}>
                        <FiBellOff /> Mute notifications
                      </li>

                      <li className={styles.menuDivider} />

                      {/* nested "More" open toggles second menu */}
                      <li role="menuitem" onClick={() => { toggleMore(); }}>
                        <FiMoreVertical /> More
                      </li>
                    </>
                  ) : (
                    <>
                      <li role="menuitem" onClick={() => { onViewContact?.(); setMainMenuOpen(false); }}>
                        <FiUser /> View contact
                      </li>
                      <li role="menuitem" onClick={() => { onSearch?.(); setMainMenuOpen(false); }}>
                        <FiSearch /> Search
                      </li>
                      <li role="menuitem" onClick={() => { onBlock?.(); setMainMenuOpen(false); }}>
                        <FiSlash /> Block
                      </li>
                      <li role="menuitem" onClick={() => { onToggleMute?.(); setMainMenuOpen(false); }}>
                        <FiBellOff /> Mute notifications
                      </li>

                      <li className={styles.menuDivider} />

                      <li role="menuitem" onClick={() => { toggleMore(); }}>
                        <FiMoreVertical /> More
                      </li>
                    </>
                  )}
                </ul>
              )}
              {moreMenuOpen && (
                <ul className={styles.menuList} role="menu">
                  {isGroup ? (
                    <>
                      <li role="menuitem" onClick={() => { onClearChat?.(); setMoreMenuOpen(false); }}>
                        <FiTrash2 /> Clear chat
                      </li>
                      <li role="menuitem" onClick={() => { onExportChat?.(); setMoreMenuOpen(false); }}>
                        <FiDownload /> Export chat
                      </li>
                      <li role="menuitem" onClick={() => { onAddToList?.(); setMoreMenuOpen(false); }}>
                        <FiPlus /> Add to list
                      </li>
                      <li role="menuitem" onClick={() => { onReport?.(); setMoreMenuOpen(false); }}>
                        <FiAlertCircle /> Report
                      </li>
                      <li role="menuitem" onClick={() => { onExitGroup?.(); setMoreMenuOpen(false); }}>
                        <FiSlash /> Exit group
                      </li>
                    </>
                  ) : (
                    <>
                      <li role="menuitem" onClick={() => { onViewMediaLinks?.(); setMoreMenuOpen(false); }}>
                        <FiFileText /> Media, links & docs
                      </li>
                      <li role="menuitem" onClick={() => { onClearChat?.(); setMoreMenuOpen(false); }}>
                        <FiTrash2 /> Clear chat
                      </li>
                      <li role="menuitem" onClick={() => { onExportChat?.(); setMoreMenuOpen(false); }}>
                        <FiDownload /> Export chat
                      </li>
                    </>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
