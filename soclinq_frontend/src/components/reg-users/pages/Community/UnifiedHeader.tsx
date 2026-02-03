"use client";

import {
  FiArrowLeft,
  FiHome,
  FiMapPin,
  FiSearch,
  FiX,
  FiTrash2,
  FiSend,
  FiCheckSquare,
  FiSquare,
} from "react-icons/fi";

import styles from "./styles/UnifiedHeader.module.css";

type Props = {
    hidden?: boolean; // ✅ NEW
  
    mode: "INBOX" | "CHAT";
    locationName?: string;
  
    searchValue: string;
    onSearchChange: (v: string) => void;
  
    onBack?: () => void;
    onHome: () => void;
  
    onOpenLocation?: () => void;
  
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
    searchValue,
    onSearchChange,
    onBack,
    onHome,
    onOpenLocation,
    selection,
  }: Props) {
    if (hidden) return null;

  const isChat = mode === "CHAT";
  const selectionActive = Boolean(selection?.active);

  // ✅ Selection Header (WhatsApp style)
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

  // ✅ Normal Header
  return (
    <header className={styles.header}>
      {/* LEFT */}
      <button
        type="button"
        className={styles.leftBtn}
        onClick={isChat ? onBack : onOpenLocation}
        title={isChat ? "Back" : "Change LGA"}
      >
        {isChat ? <FiArrowLeft /> : <FiMapPin />}
        <span className={styles.leftText}>
          {isChat ? "Back" : locationName || "Select LGA"}
        </span>
      </button>

      {/* SEARCH */}
      <div className={styles.searchWrap}>
        <FiSearch className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder={isChat ? "Search in chat..." : "Search inbox..."}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* HOME */}
      <button
        type="button"
        className={styles.homeBtn}
        onClick={onHome}
        title="Home"
      >
        <FiHome />
      </button>
    </header>
  );
}
