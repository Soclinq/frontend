"use client";

import React, { useEffect, useRef } from "react";
import {
  FiX,
  FiEye,
  FiCheckCircle,
  FiSmile,
  FiLoader,
} from "react-icons/fi";
import styles from "./styles/ChatMessageInfoModal.module.css";

/* ---------------- Types ---------------- */

export type InfoUser = {
  id: string;
  name: string;
  photo?: string | null;
};

export type InfoReadItem = {
  user: InfoUser;
  readAt: string;
};

export type InfoDeliveredItem = {
  user: InfoUser;
  deliveredAt: string;
};

export type InfoReactionItem = {
  emoji: string;
  user: InfoUser;
  createdAt: string;
};

export type MessageInfoData = {
  read: InfoReadItem[];
  delivered: InfoDeliveredItem[];
  reactions: InfoReactionItem[];
};

export type InfoModalState = {
  open: boolean;
  messageId: string | null;
  loading?: boolean;
  data?: MessageInfoData | null;
};

type Props = {
  modal: InfoModalState;
  onClose: () => void;
};

function formatDateTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function ChatMessageInfoModal({ modal, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // ✅ close on outside click
  useEffect(() => {
    if (!modal.open) return;

    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [modal.open, onClose]);

  // ✅ close on ESC
  useEffect(() => {
    if (!modal.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.open, onClose]);

  if (!modal.open) return null;

  const data = modal.data;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />

      <div ref={ref} className={styles.modal} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <h3 className={styles.title}>Message Info</h3>
            <p className={styles.subTitle}>
              {modal.messageId ? `Message ID: ${modal.messageId}` : "No message selected"}
            </p>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title="Close"
          >
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {modal.loading ? (
            <div className={styles.loading}>
              <FiLoader className={styles.spin} />
              <span>Loading message info…</span>
            </div>
          ) : !data ? (
            <div className={styles.emptyState}>
              <span>Unable to load message info.</span>
            </div>
          ) : (
            <>
              {/* READ */}
              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <div className={styles.blockIcon}>
                    <FiEye />
                  </div>
                  <h4 className={styles.blockTitle}>Read</h4>
                  <span className={styles.blockCount}>
                    {data.read?.length || 0}
                  </span>
                </div>

                {data.read?.length ? (
                  <div className={styles.rows}>
                    {data.read.map((x) => (
                      <div key={x.user.id} className={styles.row}>
                        <div className={styles.user}>
                          <div className={styles.avatar}>
                            {x.user.name?.slice(0, 1)?.toUpperCase()}
                          </div>
                          <div className={styles.userMeta}>
                            <span className={styles.userName}>{x.user.name}</span>
                            <span className={styles.userTime}>
                              {formatDateTime(x.readAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.none}>None</div>
                )}
              </div>

              {/* DELIVERED */}
              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <div className={styles.blockIcon}>
                    <FiCheckCircle />
                  </div>
                  <h4 className={styles.blockTitle}>Delivered</h4>
                  <span className={styles.blockCount}>
                    {data.delivered?.length || 0}
                  </span>
                </div>

                {data.delivered?.length ? (
                  <div className={styles.rows}>
                    {data.delivered.map((x) => (
                      <div key={x.user.id} className={styles.row}>
                        <div className={styles.user}>
                          <div className={styles.avatar}>
                            {x.user.name?.slice(0, 1)?.toUpperCase()}
                          </div>
                          <div className={styles.userMeta}>
                            <span className={styles.userName}>{x.user.name}</span>
                            <span className={styles.userTime}>
                              {formatDateTime(x.deliveredAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.none}>None</div>
                )}
              </div>

              {/* REACTIONS */}
              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <div className={styles.blockIcon}>
                    <FiSmile />
                  </div>
                  <h4 className={styles.blockTitle}>Reactions</h4>
                  <span className={styles.blockCount}>
                    {data.reactions?.length || 0}
                  </span>
                </div>

                {data.reactions?.length ? (
                  <div className={styles.rows}>
                    {data.reactions.map((x, idx) => (
                      <div key={`${x.user.id}-${idx}`} className={styles.row}>
                        <div className={styles.user}>
                          <div className={styles.avatar}>
                            {x.user.name?.slice(0, 1)?.toUpperCase()}
                          </div>

                          <div className={styles.userMeta}>
                            <span className={styles.userName}>
                              <span className={styles.reactionEmoji}>{x.emoji}</span>{" "}
                              {x.user.name}
                            </span>
                            <span className={styles.userTime}>
                              {formatDateTime(x.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.none}>None</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.okBtn} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
