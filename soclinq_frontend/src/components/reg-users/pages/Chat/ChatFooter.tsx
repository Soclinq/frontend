"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSmile,
  FiPaperclip,
  FiCamera,
  FiSend,
  FiX,
  FiFile,
  FiImage,
  FiVideo,
  FiLoader,
} from "react-icons/fi";
import styles from "./styles/ChatFooter.module.css";

type Props = {
  input: string;
  setInput: (v: string) => void;

  sending?: boolean;
  disabled?: boolean;

  pickedFiles: File[];
  setPickedFiles: React.Dispatch<React.SetStateAction<File[]>>;

  sendMessage: () => Promise<void> | void;
  handleTyping: (value: string) => void;

  inputRef?: React.RefObject<HTMLInputElement | null>;
  inputBarRef?: React.RefObject<HTMLDivElement | null>;

  onOpenCamera?: () => void;
  onOpenAudio?: () => void; // optional if you later want modal style
  emojiOpen?: boolean;
  onToggleEmoji?: () => void;
  onPickEmoji?: (emoji: string) => void;
  onCloseEmoji?: () => void;



  /**
   * ✅ WhatsApp-like control:
   * - undefined => auto show only when canSend (recommended)
   * - true => always show send button
   * - false => never show send button
   */
  showSendButton?: boolean;
};

function fmtBytes(bytes: number) {
  if (!bytes || bytes < 1) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const v = bytes / Math.pow(k, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return <FiImage />;
  if (type.startsWith("video/")) return <FiVideo />;
  return <FiFile />;
}

export default function ChatFooter({
  input,
  setInput,
  sending = false,
  disabled = false,
  pickedFiles,
  setPickedFiles,
  sendMessage,
  handleTyping,
  inputRef,
  inputBarRef,
  onOpenCamera,
  showSendButton,
  onToggleEmoji,
  onPickEmoji,
  onCloseEmoji,
  emojiOpen
}: Props) {
  const [attachOpen, setAttachOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => {
    return Boolean(input.trim()) || pickedFiles.length > 0;
  }, [input, pickedFiles.length]);

  // ✅ Auto-control send button visibility (WhatsApp behavior)
  const shouldRenderSend =
    showSendButton === false ? false : showSendButton === true ? true : canSend;

  function closeAllPopups() {
    setAttachOpen(false);
  }

  function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setPickedFiles((prev) => [...prev, ...arr]);
  }

  async function onSendClick() {
    if (disabled || sending) return;
    if (!canSend) return;

    closeAllPopups();
    await sendMessage();
  }

  function removePicked(index: number) {
    setPickedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  /* ✅ close emoji / attach when clicking outside */
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      if (!t) return;

      // attach menu click-out
      if (attachOpen && attachRef.current && !attachRef.current.contains(t)) {
        setAttachOpen(false);
      }

      // emoji click-out
      if (emojiOpen) {
        const btn = document.getElementById("chat-emoji-btn");
        const isEmojiBtn = btn ? btn.contains(t) : false;
      }
    }

    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [attachOpen, emojiOpen]);

  /* ✅ ESC closes popups */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAllPopups();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={inputBarRef as any} className={styles.footer}>
      {/* ================= Attachments Preview ================= */}
      {pickedFiles.length > 0 && (
        <div className={styles.attachPreview}>
          <div className={styles.attachPreviewHeader}>
            <span className={styles.attachTitle}>Attachments</span>

            <button
              className={styles.attachClearBtn}
              onClick={() => setPickedFiles([])}
              disabled={disabled || sending}
              title="Clear all"
            >
              <FiX />
            </button>
          </div>

          <div className={styles.attachList}>
            {pickedFiles.map((f, idx) => (
              <div key={`${f.name}-${idx}`} className={styles.attachItem}>
                <div className={styles.attachIcon}>{fileIcon(f.type)}</div>

                <div className={styles.attachMeta}>
                  <div className={styles.attachName}>{f.name}</div>
                  <div className={styles.attachSize}>
                    {f.type || "file"} • {fmtBytes(f.size)}
                  </div>
                </div>

                <button
                  className={styles.attachRemoveBtn}
                  onClick={() => removePicked(idx)}
                  disabled={disabled || sending}
                  title="Remove"
                >
                  <FiX />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= Bottom Row ================= */}
      <div className={styles.row}>
        {/* ✅ WhatsApp Message Bar */}
        <div className={styles.messageBar}>
          {/* Emoji (inside bar - left) */}
          <button
            id="chat-emoji-btn"
            className={`${styles.barIconBtn} ${emojiOpen ? styles.active : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setAttachOpen(false);
              onToggleEmoji?.();
            }}            
            disabled={disabled || sending}
            title="Emoji"
          >
            <FiSmile />
          </button>

          {/* Input */}
          <input
            ref={inputRef as any}
            className={styles.input}
            value={input}
            disabled={disabled || sending}
            placeholder={disabled ? "Please wait..." : "Message"}
            onChange={(e) => handleTyping(e.target.value)}
            onFocus={() => closeAllPopups()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendClick();
              }
            }}
          />

          {/* Attach (inside bar - right) */}
          <div ref={attachRef} className={styles.attachWrap}>
            <button
              className={`${styles.barIconBtn} ${attachOpen ? styles.active : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setAttachOpen((p) => !p);
              }}
              disabled={disabled || sending}
              title="Attach"
            >
              <FiPaperclip />
            </button>

            {attachOpen && (
              <div className={styles.attachMenu}>
                <button
                  className={styles.attachAction}
                  onClick={() => {
                    setAttachOpen(false);
                    fileInputRef.current?.click();
                  }}
                  disabled={disabled || sending}
                >
                  <FiFile />
                  <span>File</span>
                </button>

                <button
                  className={styles.attachAction}
                  onClick={() => {
                    setAttachOpen(false);
                    fileInputRef.current?.click();
                  }}
                  disabled={disabled || sending}
                >
                  <FiImage />
                  <span>Image</span>
                </button>

                <button
                  className={styles.attachAction}
                  onClick={() => {
                    setAttachOpen(false);
                    fileInputRef.current?.click();
                  }}
                  disabled={disabled || sending}
                >
                  <FiVideo />
                  <span>Video</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => onPickFiles(e.target.files)}
            />
          </div>

          {/* Camera (inside bar - right) */}
          <button
            className={styles.barIconBtn}
            onClick={() => {
              closeAllPopups();
              onOpenCamera?.();
            }}
            disabled={disabled || sending}
            title="Camera"
          >
            <FiCamera />
          </button>
        </div>

        {/* ✅ WhatsApp Send Button (outside bar - far right) */}
        {showSendButton && (
              <button
                className={`${styles.sendBtn} ${canSend ? styles.sendActive : ""}`}
                onClick={onSendClick}
                disabled={disabled || sending || !canSend}
                title="Send"
              >
                {sending ? <FiLoader className={styles.spin} /> : <FiSend />}
              </button>
            )}
      </div>
    </div>
  );
}
