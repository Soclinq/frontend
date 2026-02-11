"use client";

import { FiMoreVertical, FiSearch } from "react-icons/fi";
import styles from "../components/styles/UnifiedHeader.module.css";
import { UnifiedHeaderViewProps } from "./header.types";
import { useHeaderMenu } from "./useHeaderMenu";

export default function UnifiedHeader({
  hidden,
  disabled,
  left,
  center,
  right,
}: UnifiedHeaderViewProps) {
  const menu = useHeaderMenu();
  if (hidden) return null;

  return (
    <header className={styles.header}>
      {/* ================= LEFT ================= */}
      {left?.type === "BUTTON" ? (
        <button
          className={styles.leftBtn}
          onClick={left.onClick}
          disabled={disabled}
        >
          {left.icon}
          {left.label && (
            <span className={styles.leftText}>{left.label}</span>
          )}
        </button>
      ) : (
        <div />
      )}

      {/* ================= CENTER ================= */}
      {center?.type === "SEARCH" && (
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={center.value}
            placeholder={center.placeholder}
            autoFocus={center.autoFocus}
            onChange={(e) => center.onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {center?.type === "CHAT_META" && (
        <button
          className={styles.chatTitleBtn}
          onClick={center.onClick}
          disabled={disabled}
        >
          <div className={styles.chatAvatar}>
            {center.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={center.avatarUrl} alt="avatar" />
            ) : (
              <span className={styles.chatAvatarFallback}>👥</span>
            )}
          </div>

          <div className={styles.chatMeta}>
            <div className={styles.chatName}>{center.title}</div>
            {center.subtitle && (
              <div className={styles.chatSubtitle}>
                {center.subtitle}
              </div>
            )}
          </div>
        </button>
      )}

      {center?.type === "NONE" && <div />}

      {/* ================= RIGHT ================= */}
      <div className={styles.rightWrap}>
        {/* Quick actions (Pin / Mute / etc.) */}
        {right?.actions && right.actions.length > 0 && (
          <div className={styles.selectionActions}>
            {right.actions.map((a, i) => (
              <button
                key={i}
                className={`${styles.iconBtn} ${
                  a.danger ? styles.danger : ""
                }`}
                onClick={a.onClick}
                disabled={disabled}
                title={a.label}
              >
                {a.icon}
              </button>
            ))}
          </div>
        )}

        {/* Overflow menu (⋮) */}
        {right?.menu && right.menu.length > 0 && (
          <div className={styles.moreWrap} ref={menu.ref}>
            <button
              className={styles.moreBtn}
              onClick={(e) => {
                e.stopPropagation();
                menu.toggle();
              }}
              disabled={disabled}
              aria-label="More options"
            >
              <FiMoreVertical />
            </button>

            {menu.open && (
              <div className={styles.moreMenu}>
                {right.menu.map((item, i) => (
                  <button
                    key={i}
                    className={`${styles.moreItem} ${
                      item.danger ? styles.dangerItem : ""
                    }`}
                    onClick={() => {
                      menu.close();
                      item.onClick?.();
                    }}
                    disabled={disabled}
                  >
                    {item.icon && <span>{item.icon}</span>}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
