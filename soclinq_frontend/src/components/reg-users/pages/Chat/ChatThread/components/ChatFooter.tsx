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

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

type Props = {
  input: string;
  setInput: (v: string) => void;

  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;

  onSend: () => void | Promise<void>;
  onOpenCamera: () => void;

  sending?: boolean;
  disabled?: boolean;

  inputRef?: React.RefObject<HTMLInputElement | null>;
};

function fmtBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return <FiImage />;
  if (type.startsWith("video/")) return <FiVideo />;
  return <FiFile />;
}

export default function ChatFooter({
  input,
  setInput,
  attachments,
  setAttachments,
  onSend,
  onOpenCamera,
  sending = false,
  disabled = false,
  inputRef,
}: Props) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ================= Derived ================= */

  const hasText = input.trim().length > 0;
  const hasAttachments = attachments.length > 0;

  const canSend = hasText || hasAttachments;
  const showSend = canSend;
  const showCamera = !hasText && !hasAttachments;

  /* ================= Handlers ================= */

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if (!canSend || disabled || sending) return;
    setAttachOpen(false);
    setEmojiOpen(false);
    await onSend();
  }

  /* ================= Effects ================= */

  // ESC closes menus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAttachOpen(false);
        setEmojiOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.footer}>
      {/* ================= Attachments Preview ================= */}
      {attachments.length > 0 && (
        <div className={styles.attachPreview}>
          {attachments.map((f, i) => (
            <div key={`${f.name}-${i}`} className={styles.attachItem}>
              <div className={styles.attachIcon}>{fileIcon(f.type)}</div>
              <div className={styles.attachMeta}>
                <div className={styles.attachName}>{f.name}</div>
                <div className={styles.attachSize}>{fmtBytes(f.size)}</div>
              </div>
              <button onClick={() => removeAttachment(i)}>
                <FiX />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ================= Input Row ================= */}
      <div className={styles.row}>
      <div className={styles.inputShell}>
        <button
          className={`${styles.iconBtn} ${emojiOpen ? styles.active : ""}`}
          onClick={() => {
            setAttachOpen(false);
            setEmojiOpen((p) => !p);
          }}
          disabled={disabled || sending}
        >
          <FiSmile />
        </button>

        <input
          ref={inputRef as any}
          className={styles.input}
          value={input}
          disabled={disabled || sending}
          placeholder="Message"
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => {
            setAttachOpen(false);
            setEmojiOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          className={styles.iconBtn}
          onClick={() => {
            setEmojiOpen(false);
            setAttachOpen((p) => !p);
          }}
          disabled={disabled || sending}
        >
          <FiPaperclip />
        </button>

    {showCamera && (
      <button
        className={styles.iconBtn}
        onClick={() => {
          setAttachOpen(false);
          setEmojiOpen(false);
          onOpenCamera();
        }}
        disabled={disabled || sending}
      >
        <FiCamera />
      </button>
    )}
      </div>

  {showSend && (
    <button
      className={styles.sendBtn}
      onClick={handleSend}
      disabled={!canSend || disabled || sending}
    >
      {sending ? <FiLoader className={styles.spin} /> : <FiSend />}
    </button>
  )}
</div>

      {/* ================= Attach Menu ================= */}
      {attachOpen && (
        <div className={styles.attachMenu}>
          <button onClick={() => fileInputRef.current?.click()}>
            <FiFile /> File
          </button>
          <button onClick={() => fileInputRef.current?.click()}>
            <FiImage /> Image
          </button>
          <button onClick={() => fileInputRef.current?.click()}>
            <FiVideo /> Video
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => onPickFiles(e.target.files)}
          />
        </div>
      )}

      {/* ================= Emoji Picker ================= */}
      {emojiOpen && (
        <div className={styles.emojiPopup}>
          <Picker
            data={data}
            previewPosition="none"
            onEmojiSelect={(e: any) => {
              setInput(input + (e?.native ?? ""));
            }}
          />
        </div>
      )}
    </div>
  );
}
