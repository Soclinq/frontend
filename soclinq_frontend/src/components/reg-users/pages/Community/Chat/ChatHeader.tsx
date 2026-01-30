"use client";

import React from "react";
import {
  FiX,
  FiSend,
  FiTrash2,
  FiCheckSquare,
  FiSquare,
  FiChevronLeft,
  FiShare2,
} from "react-icons/fi";
import styles from "./styles/ChatHeader.module.css";

type Props = {
  title?: string;

  /** Optional back button */
  showBack?: boolean;
  onBack?: () => void;

  /** Selection mode */
  selectionMode: boolean;
  selectedCount: number;

  /** Needed to decide button states */
  selectedMessagesCount: number;
  selectableMessagesCount: number;

  /** Actions */
  onExitSelection: () => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;

  onForwardSelected: () => void;
  onShareSelected: () => void;
  onDeleteSelectedForMe: () => void;
};

export default function ChatHeader({
  title = "Community Chat",

  showBack = false,
  onBack,

  selectionMode,
  selectedCount,

  selectedMessagesCount,
  selectableMessagesCount,

  onExitSelection,
  onSelectAll,
  onUnselectAll,

  onForwardSelected,
  onShareSelected,
  onDeleteSelectedForMe,
}: Props) {
  const canSelectAll =
    selectableMessagesCount > 0 && selectedCount < selectableMessagesCount;

  const canUnselectAll = selectedCount > 0;

  const hasSelected = selectedMessagesCount > 0;

  return (
    <header className={styles.header}>
      {selectionMode ? (
        <div className={styles.selectionRow}>
          {/* Exit selection */}
          <button
            type="button"
            className={styles.closeSelectionBtn}
            onClick={onExitSelection}
            title="Exit selection"
          >
            <FiX />
          </button>

          <span className={styles.selectionCount}>{selectedCount} selected</span>

          {/* Select all */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onSelectAll}
            disabled={!canSelectAll}
            title="Select all"
          >
            <FiCheckSquare />
          </button>

          {/* Unselect all */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onUnselectAll}
            disabled={!canUnselectAll}
            title="Unselect all"
          >
            <FiSquare />
          </button>

          <div className={styles.selectionActions}>
            {/* Forward */}
            <button
              type="button"
              className={styles.iconBtn}
              disabled={!hasSelected}
              title="Forward"
              onClick={onForwardSelected}
            >
              <FiSend />
            </button>

            {/* Share */}
            <button
              type="button"
              className={styles.iconBtn}
              disabled={!hasSelected}
              title="Share"
              onClick={onShareSelected}
            >
              <FiShare2 />
            </button>

            {/* Delete */}
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.dangerBtn}`}
              disabled={!hasSelected}
              title="Delete"
              onClick={onDeleteSelectedForMe}
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.normalRow}>
          {showBack ? (
            <button
              type="button"
              className={styles.backBtn}
              onClick={onBack}
              title="Back"
            >
              <FiChevronLeft />
            </button>
          ) : null}

          <h3 className={styles.title}>{title}</h3>
        </div>
      )}
    </header>
  );
}
