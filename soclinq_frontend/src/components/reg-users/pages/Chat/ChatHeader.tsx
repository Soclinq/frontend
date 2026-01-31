"use client";

import React from "react";
import {
  FiX,
  FiSend,
  FiTrash2,
  FiSquare,
  FiChevronLeft,
  FiShare2,
  FiCornerUpLeft,
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

  /** Actions */
  onExitSelection: () => void;

  /** ✅ only unselect all (clear all selection) */
  onUnselectAll: () => void;

  /** Bulk actions */
  onForwardSelected: () => void;
  onShareSelected: () => void;
  onDeleteSelectedForMe: () => void;

  /** ✅ reply when only ONE is selected */
  onReplySelected?: () => void;
};

export default function ChatHeader({
  title = "Community Chat",

  showBack = false,
  onBack,

  selectionMode,
  selectedCount,

  onExitSelection,
  onUnselectAll,

  onForwardSelected,
  onShareSelected,
  onDeleteSelectedForMe,

  onReplySelected,
}: Props) {
  const hasSelected = selectedCount > 0;
  const canReply = selectedCount === 1;

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

          {/* ✅ Unselect all (clear selection) */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onUnselectAll}
            disabled={!hasSelected}
            title="Unselect all"
          >
            <FiSquare />
          </button>

          <div className={styles.selectionActions}>
            {/* ✅ Reply only if 1 selected */}
            <button
              type="button"
              className={styles.iconBtn}
              disabled={!canReply}
              title={canReply ? "Reply" : "Reply (select 1 message)"}
              onClick={onReplySelected}
            >
              <FiCornerUpLeft />
            </button>

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
