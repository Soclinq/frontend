"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/ChatPanel.module.css";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import { authFetch } from "@/lib/authFetch";
import { useNotify } from "@/components/utils/NotificationContext";

/* ✅ UI Components */
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatTypingBar from "./ChatTypingBar";
import ReplyBar from "./ReplyBar";
import ChatFooter from "./ChatFooter";

import ChatContextMenu from "./ChatContextMenu";
import ChatReactionQuickRow from "./ChatReactionQuickRow";
import ChatEmojiMartPopup from "./ChatEmojiMartPopup";

import ChatMessageInfoModal from "./ChatMessageInfoModal";
import ChatDeleteSheet from "./ChatDeleteSheet";
import ChatForwardSheet from "./ChatForwardSheet";

import CameraModal from "./CameraModal";
import ChatAudioRecorder from "./ChatAudioRecorder";

import type { ChatAdapter } from "@/types/adapterTypes";
/* ================= TYPES ================= */

type AttachmentType = "IMAGE" | "AUDIO" | "VIDEO" | "FILE";

type Attachment = {
  id: string;
  type: AttachmentType;
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

type Sender = {
  id: string;
  name: string;
  photo?: string | null;
};

type Reaction = {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
};

type Message = {
  id: string;
  clientTempId?: string;
  hubId: string;

  messageType: "TEXT" | "MEDIA" | "SYSTEM";
  text?: string;

  sender: Sender;
  createdAt: string;

  myReaction?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;

  replyTo?: {
    id: string;
    text?: string;
    senderName?: string;
  } | null;

  attachments?: Attachment[];
  reactions?: Reaction[];

  isMine: boolean;
  status?: "sending" | "sent" | "failed";
};

type ForwardTarget = {
  id: string;
  name: string;
  type?: string;
  photo?: string | null;
};

type WSIncoming =
  | { type: "message:new"; payload: Message }
  | {
      type: "reaction:update";
      payload: {
        messageId: string;
        emoji: string;
        userId: string;
        action: "added" | "removed";
      };
    }
  | {
      type: "typing:update";
      payload: { userId: string; name: string; isTyping: boolean };
    }
  | { type: "message:delete"; payload: { messageId: string; deletedAt?: string } }
  | { type: "message:edit"; payload: Message }
  | { type: "ERROR"; message: string };

type Props = {
  threadId: string;     // ✅ groupId OR conversationId
  adapter: ChatAdapter; // ✅ communityAdapter OR privateAdapter
};

/* ================= CONSTANTS / HELPERS ================= */

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const RECENT_EMOJI_KEY = "soclinq_recent_emojis_v1";

function getRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_EMOJI_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function saveRecentEmoji(emoji: string) {
  try {
    const prev = getRecentEmojis();
    const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 5);
    localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next));
  } catch {}
}

function buildWsUrl(path: string) {
  const raw = process.env.NEXT_PUBLIC_WS_URL;

  if (!raw) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${path}`;
  }

  if (raw.startsWith("http://")) return raw.replace("http://", "ws://") + path;
  if (raw.startsWith("https://")) return raw.replace("https://", "wss://") + path;

  return raw + path;
}

function canEdit(msg: Message) {
  if (!msg.isMine) return false;
  if (msg.deletedAt) return false;
  if (msg.messageType !== "TEXT") return false;

  const created = new Date(msg.createdAt).getTime();
  return Date.now() - created <= 20 * 60 * 1000;
}

function canDeleteForEveryone(msg: Message) {
  if (!msg.isMine) return false;
  if (msg.deletedAt) return false;

  const created = new Date(msg.createdAt).getTime();
  return Date.now() - created <= 60 * 60 * 1000;
}

/* ================= COMPONENT ================= */

export default function ChatThread({ threadId, adapter }: Props) {
  const notify = useNotify();

  /* ---------- Primary State ---------- */
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [audioActive, setAudioActive] = useState(false);

  const [input, setInput] = useState("");
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const hideScrollBtnTimer = useRef<NodeJS.Timeout | null>(null);

  /* ---------- UI refs ---------- */
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputBarRef = useRef<HTMLDivElement | null>(null);

  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // ✅ IMPORTANT: key depends on threadId now
  const LOCAL_DELETE_KEY = `soclinq_deleted_for_me_${adapter.mode}_${threadId}`;

  /* ---------- Hover + highlight ---------- */
  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null);
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);

  const [footerEmojiOpen, setFooterEmojiOpen] = useState(false);

  /* ---------- Selection Mode ---------- */
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  const lastSelectedMsgIdRef = useRef<string | null>(null);

  /* ---------- Overlays ---------- */
  const [menu, setMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    message: Message | null;
  }>({ open: false, x: 0, y: 0, message: null });

  const [reactionPicker, setReactionPicker] = useState<{
    open: boolean;
    message: Message | null;
    x: number;
    y: number;
  }>({ open: false, message: null, x: 0, y: 0 });

  const [emojiMart, setEmojiMart] = useState<{
    open: boolean;
    message: Message | null;
    x: number;
    y: number;
  }>({ open: false, message: null, x: 0, y: 0 });

  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    messageId: string | null;
    data?: any;
    loading?: boolean;
  }>({ open: false, messageId: null });

  const [deleteSheet, setDeleteSheet] = useState<{
    open: boolean;
    message: Message | null;
  }>({ open: false, message: null });

  const [forwardSheet, setForwardSheet] = useState<{
    open: boolean;
    messages: Message[];
  }>({ open: false, messages: [] });

  const [forwardTargets, setForwardTargets] = useState<ForwardTarget[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardSelectedIds, setForwardSelectedIds] = useState<string[]>([]);

  const [cameraOpen, setCameraOpen] = useState(false);

  const [recentEmojis, setRecentEmojis] = useState<string[]>(
    QUICK_REACTIONS.slice(0, 5)
  );

  /* ================= Derived ================= */

  const disabledInput = loading || sending;

  const selectedCount = selectedMsgIds.length;

  function isSelected(id: string) {
    return selectedMsgIds.includes(id);
  }

  useEffect(() => {
    function close() {
      setFooterEmojiOpen(false);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const selectableMessages = useMemo(() => {
    return messages.filter((m) => m.messageType !== "SYSTEM" && !m.deletedAt);
  }, [messages]);

  const selectableMessageIds = useMemo(() => {
    return selectableMessages.map((m) => m.id);
  }, [selectableMessages]);

  const selectedMessages = useMemo(() => {
    return messages.filter((m) => selectedMsgIds.includes(m.id));
  }, [messages, selectedMsgIds]);

  const filteredForwardTargets = useMemo(() => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return forwardTargets;
    return forwardTargets.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [forwardTargets, forwardSearch]);

  const canSend = useMemo(() => {
    return Boolean(input.trim()) || pickedFiles.length > 0;
  }, [input, pickedFiles]);

  /* ================= Local delete store ================= */

  useEffect(() => {
    if (selectedMsgIds.length === 0) {
      setSelectionMode(false);
      lastSelectedMsgIdRef.current = null;
    }
  }, [selectedMsgIds]);

  function getDeletedForMeSet(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_DELETE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.filter((x) => typeof x === "string"));
    } catch {
      return new Set();
    }
  }

  function markDeletedForMe(messageId: string) {
    try {
      const s = getDeletedForMeSet();
      s.add(messageId);
      localStorage.setItem(LOCAL_DELETE_KEY, JSON.stringify(Array.from(s)));
    } catch {}
  }

  /* ================= Scrolling ================= */

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    setHighlightMsgId(messageId);
    setTimeout(() => {
      setHighlightMsgId((prev) => (prev === messageId ? null : prev));
    }, 900);
  }

  /* ================= Selection Mode ================= */

  function toggleSelectMessage(id: string) {
    setSelectionMode(true);
    setSelectedMsgIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearSelection() {
    setSelectionMode(false);
    setSelectedMsgIds([]);
    lastSelectedMsgIdRef.current = null;
  }

  function unselectAllMessages() {
    setSelectedMsgIds([]);
    clearSelection();
  }

  /* ================= Reply ================= */

  function startReply(msg: Message) {
    setReplyTo(msg);

    setTimeout(() => {
      inputBarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      inputRef.current?.focus();
    }, 50);
  }

  function buildReplyPreview(target: Message) {
    return {
      id: target.id,
      senderName: target.isMine ? "You" : target.sender.name,
      text: target.deletedAt
        ? "This message was deleted"
        : target.text
        ? target.text
        : target.attachments?.length
        ? "Media"
        : "Message",
    };
  }

  /* ================= Menu / overlay close ================= */

  function closeMenu() {
    setMenu({ open: false, x: 0, y: 0, message: null });
    setReactionPicker({ open: false, message: null, x: 0, y: 0 });
    setEmojiMart({ open: false, message: null, x: 0, y: 0 });
  }

  useEffect(() => {
    function onGlobalClick() {
      if (menu.open || reactionPicker.open || emojiMart.open) closeMenu();
    }
    window.addEventListener("click", onGlobalClick);
    return () => window.removeEventListener("click", onGlobalClick);
  }, [menu.open, reactionPicker.open, emojiMart.open]);

  /* ================= Emoji init ================= */

  useEffect(() => {
    const local = getRecentEmojis();
    if (local.length) setRecentEmojis(local);
  }, []);

  /* ================= Load Initial ================= */

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;

    async function loadInitial() {
      try {
        setLoading(true);
        setError(null);

        setMessages([]);
        setCursor(null);
        setHasMore(true);

        const res = await authFetch(adapter.listMessages(threadId), {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load messages");
        if (cancelled) return;

        const deletedSet = getDeletedForMeSet();
        const cleaned: Message[] = (data.messages || []).filter(
          (m: Message) => !deletedSet.has(m.id)
        );

        setMessages(cleaned);
        setCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
      } catch {
        setError("Unable to load messages");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTimeout(() => scrollToBottom(false), 50);
        }
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [threadId, adapter]);

  /* ================= Load Older ================= */

  async function loadOlder() {
    if (!hasMore || !cursor || loading) return;

    try {
      const res = await authFetch(adapter.listMessagesOlder(threadId, cursor), {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const deletedSet = getDeletedForMeSet();
      const older = (data.messages || []).filter((m: Message) => !deletedSet.has(m.id));

      setMessages((prev) => [...older, ...prev]);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {}
  }

  /* ================= WebSocket ================= */

  useEffect(() => {
    if (!threadId) return;

    const wsUrl = buildWsUrl(adapter.wsPath(threadId));
    const ws = new WebSocket(wsUrl);

    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload: WSIncoming = JSON.parse(event.data);

        if (payload.type === "ERROR") return;

        if (payload.type === "message:new") {
          const msg = payload.payload;

          setMessages((prev) => {
            if (msg.clientTempId) {
              const idx = prev.findIndex((m) => m.clientTempId === msg.clientTempId);
              if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = { ...msg, status: "sent" };
                return copy;
              }
            }
            return [...prev, { ...msg, status: "sent" }];
          });

          scrollToBottom();
          return;
        }

        if (payload.type === "reaction:update") {
          const { messageId, emoji, action } = payload.payload;

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;

              const reactions = m.reactions ? [...m.reactions] : [];
              const idx = reactions.findIndex((r) => r.emoji === emoji);

              if (idx === -1 && action === "added") {
                reactions.push({ emoji, count: 1 });
              } else if (idx !== -1) {
                const current = reactions[idx];
                const nextCount = action === "added" ? current.count + 1 : current.count - 1;

                if (nextCount <= 0) reactions.splice(idx, 1);
                else reactions[idx] = { ...current, count: nextCount };
              }

              return { ...m, reactions };
            })
          );
          return;
        }

        if (payload.type === "typing:update") {
          const { name, isTyping } = payload.payload;

          setTypingUsers((prev) =>
            isTyping ? [...new Set([...prev, name])] : prev.filter((n) => n !== name)
          );
          return;
        }

        if (payload.type === "message:delete") {
          const { messageId, deletedAt } = payload.payload;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    deletedAt: deletedAt || new Date().toISOString(),
                    text: "",
                    attachments: [],
                    reactions: [],
                    myReaction: null,
                  }
                : m
            )
          );
          return;
        }

        if (payload.type === "message:edit") {
          const edited = payload.payload;
          setMessages((prev) => prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m)));
          return;
        }
      } catch {}
    };

    ws.onclose = () => {
      setTypingUsers([]);
      wsRef.current = null;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [threadId, adapter]);

  /* ================= Typing ================= */

  const handleTyping = (value: string) => {
    setInput(value);

    if (!adapter.features.typing) return;

    try {
      wsRef.current?.send(JSON.stringify({ type: "typing:start", payload: {} }));
    } catch {}

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      try {
        wsRef.current?.send(JSON.stringify({ type: "typing:stop", payload: {} }));
      } catch {}
    }, 800);
  };

  /* ================= Upload ================= */

  async function uploadAttachmentsToBackend(files: File[]) {
    if (!files.length) return [];

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    const res = await authFetch(adapter.upload(), {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Upload failed");

    return data.attachments || [];
  }

  /* ================= Message Actions ================= */

  async function reactToMessage(msg: Message, emoji: string) {
    if (!adapter.features.reactions) return;

    saveRecentEmoji(emoji);
    setRecentEmojis(getRecentEmojis());

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msg.id) return m;

        const old = m.myReaction || null;
        let reactions = m.reactions ? [...m.reactions] : [];

        const inc = (e: string) => {
          const idx = reactions.findIndex((r) => r.emoji === e);
          if (idx === -1) reactions.push({ emoji: e, count: 1 });
          else reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1 };
        };

        const dec = (e: string) => {
          const idx = reactions.findIndex((r) => r.emoji === e);
          if (idx === -1) return;
          const next = reactions[idx].count - 1;
          if (next <= 0) reactions.splice(idx, 1);
          else reactions[idx] = { ...reactions[idx], count: next };
        };

        if (old === emoji) {
          dec(emoji);
          return { ...m, reactions, myReaction: null };
        }

        if (old) dec(old);
        inc(emoji);

        return { ...m, reactions, myReaction: emoji };
      })
    );

    try {
      await authFetch(adapter.react(msg.id), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch {}
  }

  async function sendVoiceFile(file: File) {
    const clientTempId = `tmp-voice-${Date.now()}`;

    const optimistic: Message = {
      id: clientTempId,
      clientTempId,
      hubId: threadId,
      messageType: "MEDIA",
      text: "",
      sender: { id: "me", name: "You" },
      createdAt: new Date().toISOString(),
      isMine: true,
      status: "sending",
      replyTo: replyTo ? buildReplyPreview(replyTo) : null,
      attachments: [
        {
          id: `${clientTempId}-0`,
          type: "AUDIO",
          url: URL.createObjectURL(file),
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
      ],
      reactions: [],
    };

    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);
    scrollToBottom();

    try {
      setSending(true);

      const uploaded = await uploadAttachmentsToBackend([file]);

      const res = await authFetch(adapter.sendMessage(threadId), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientTempId,
          text: "",
          messageType: "MEDIA",
          replyToId: replyTo?.id ?? null,
          attachments: uploaded,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");

      setMessages((prev) =>
        prev.map((m) =>
          m.clientTempId === clientTempId
            ? {
                ...data,
                isMine: true,
                status: "sent",
                replyTo: replyTo ? buildReplyPreview(replyTo) : null,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientTempId === clientTempId ? { ...m, status: "failed" } : m
        )
      );

      notify({
        type: "error",
        title: "Voice send failed",
        message: "Voice note could not be sent.",
        duration: 2500,
      });
    } finally {
      setSending(false);
    }
  }

  // ✅ sendMessage() stays same except routes -> adapter.*
  async function sendMessage() {
    const replyTarget = replyTo ? { ...replyTo } : null;

    if (editingMessageId) {
      const newText = input.trim();
      if (!newText) return;

      const msgId = editingMessageId;

      setEditingMessageId(null);
      setInput("");

      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: newText } : m)));

      const res = await authFetch(adapter.edit(msgId), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      });

      if (!res.ok) {
        notify({
          type: "warning",
          title: "Edit failed",
          message: "Unable to edit message (refresh needed)",
          duration: 2500,
        });
      }

      return;
    }

    const text = input.trim();
    const hasText = Boolean(text);
    const hasFiles = pickedFiles.length > 0;

    if (!hasText && !hasFiles) return;

    const clientTempId = `tmp-${Date.now()}`;

    const optimistic: Message = {
      id: clientTempId,
      clientTempId,
      hubId: threadId,
      messageType: hasFiles ? "MEDIA" : "TEXT",
      text: hasText ? text : "",
      sender: { id: "me", name: "You" },
      createdAt: new Date().toISOString(),
      isMine: true,
      status: "sending",
      replyTo: replyTarget ? buildReplyPreview(replyTarget) : null,
      attachments: hasFiles
        ? pickedFiles.map((f, idx) => ({
            id: `${clientTempId}-${idx}`,
            type: f.type.startsWith("image/")
              ? "IMAGE"
              : f.type.startsWith("video/")
              ? "VIDEO"
              : f.type.startsWith("audio/")
              ? "AUDIO"
              : "FILE",
            url: URL.createObjectURL(f),
            fileName: f.name,
            mimeType: f.type,
            fileSize: f.size,
          }))
        : [],
      reactions: [],
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setPickedFiles([]);
    setReplyTo(null);
    scrollToBottom();

    try {
      setSending(true);

      let uploadedAttachments: any[] = [];
      if (hasFiles) uploadedAttachments = await uploadAttachmentsToBackend(pickedFiles);

      const res = await authFetch(adapter.sendMessage(threadId), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientTempId,
          text: hasText ? text : "",
          messageType: hasFiles ? "MEDIA" : "TEXT",
          replyToId: replyTarget?.id ?? null,
          attachments: uploadedAttachments,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");

      setMessages((prev) =>
        prev.map((m) =>
          m.clientTempId === clientTempId
            ? {
                ...data,
                isMine: true,
                status: "sent",
                replyTo: replyTarget ? buildReplyPreview(replyTarget) : null,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientTempId === clientTempId ? { ...m, status: "failed" } : m))
      );

      notify({
        type: "error",
        title: "Send failed",
        message: "Message could not be sent.",
        duration: 2500,
      });
    } finally {
      setSending(false);
    }
  }

  /* ================= Info Modal Fetch ================= */

  useEffect(() => {
    if (!infoModal.open || !infoModal.messageId) return;

    (async () => {
      setInfoModal((p) => ({ ...p, loading: true }));

      const res = await authFetch(adapter.messageInfo(infoModal.messageId!), {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setInfoModal((p) => ({ ...p, loading: false, data: null }));
        return;
      }

      setInfoModal((p) => ({ ...p, loading: false, data }));
    })();
  }, [infoModal.open, infoModal.messageId, adapter]);

  /* ================= Forward targets fetch ================= */

  useEffect(() => {
    if (!forwardSheet.open || !adapter.features.forward) return;

    (async () => {
      try {
        setForwardLoading(true);

        const res = await authFetch(adapter.forwardTargets(), {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();

        setForwardTargets(data.targets || []);
        setForwardSearch("");
        setForwardSelectedIds([]);
      } catch {
        setForwardTargets([]);
      } finally {
        setForwardLoading(false);
      }
    })();
  }, [forwardSheet.open, adapter]);

  /* ================= RENDER ================= */

  return (
    <div className={styles.chat}>
      {/* ✅ Header */}
      <ChatHeader
          selectionMode={selectionMode}
          selectedCount={selectedCount}
          onExitSelection={clearSelection}
          onUnselectAll={unselectAllMessages}
          onForwardSelected={() =>
            setForwardSheet({ open: true, messages: selectedMessages })
          }
          onShareSelected={async () => {
            await shareExternallyBulk(selectedMessages);
            clearSelection();
          }}
          onDeleteSelectedForMe={deleteSelectedForMe}
          onReplySelected={() => {
            // ✅ reply only if one message
            if (selectedMessages.length !== 1) return;
            startReply(selectedMessages[0]);
            clearSelection();
          }}
        />


      {/* ✅ Messages */}
      <ChatMessages
  messages={messages}
  loading={loading}
  error={error}
  selectionMode={selectionMode}
  isSelected={isSelected}
  onMessageClick={onMessageClick}
  toggleSelectMessage={toggleSelectMessage}
  hoverMsgId={hoverMsgId}
  setHoverMsgId={setHoverMsgId}
  startReply={startReply}
  scrollToMessage={scrollToMessage}
  highlightMsgId={highlightMsgId}
  loadOlder={loadOlder}
  reactToMessage={reactToMessage}
  recentEmojis={recentEmojis}
  setReactionPicker={setReactionPicker}
  onOpenFullEmojiPicker={(msg, pos) => {
    setEmojiMart({
      open: true,
      message: msg,
      x: pos.x,
      y: pos.y,
    });
  }}
  onOpenContextMenu={(pos, msg) => {
    setMenu({
      open: true,
      x: pos.x,
      y: pos.y,
      message: msg,
    });
  }}
  bottomRef={bottomRef}
/>


      {/* ✅ Typing */}
      <ChatTypingBar typingUsers={typingUsers} />

      {/* ✅ Reply Bar */}
      {replyTo && (
        <ReplyBar
          replyTo={replyTo}
          onJump={(id) => scrollToMessage(id)}
          onCancel={() => {
            setReplyTo(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        />
      )}

      {/* ✅ Camera modal */}
      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onSend={({ files, caption }) => {
          if (caption?.trim()) setInput((p) => (p ? `${p}\n${caption}` : caption));
          setPickedFiles((prev) => [...prev, ...files]);

          setTimeout(() => {
            inputBarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            inputRef.current?.focus();
          }, 50);
        }}
      />


{/* ================= FOOTER STACK (WhatsApp Style) ================= */}
<div className={`${styles.footerStack} ${audioActive ? styles.audioActive : ""}`}>
  {/* ✅ Hide footer while recording */}
  {!audioActive && (
    <ChatFooter
    input={input}
    setInput={setInput}
    sending={sending}
    disabled={disabledInput}
    pickedFiles={pickedFiles}
    setPickedFiles={setPickedFiles}
    sendMessage={sendMessage}
    handleTyping={handleTyping}
    inputRef={inputRef}
    inputBarRef={inputBarRef}
    onOpenCamera={() => setCameraOpen(true)}
    showSendButton={canSend}
    emojiOpen={footerEmojiOpen}
    onToggleEmoji={() => setFooterEmojiOpen((p) => !p)}
  />  
  )}

  {/* ✅ Only show audio when there's nothing to send */}
  {!canSend && (
    <ChatAudioRecorder
      disabled={disabledInput}
      sending={sending}
      minMs={500}
      maxMs={60 * 60 * 1000}
      onSend={(file) => sendVoiceFile(file)}
      onError={(msg) => {
        notify({
          type: "error",
          title: "Recorder error",
          message: msg,
          duration: 2500,
        });
      }}
      onActiveChange={(active) => setAudioActive(active)}
    />
  )}

{footerEmojiOpen && !audioActive && (
  <div className={styles.footerEmojiPopup} onClick={(e) => e.stopPropagation()}>
    <Picker
      data={data}
      theme="light"
      previewPosition="none"
      searchPosition="none"
      onEmojiSelect={(e: any) => {
        const chosen = e?.native;
        if (!chosen) return;

        setInput((prev) => prev + chosen);
        setFooterEmojiOpen(false);

        setTimeout(() => inputRef.current?.focus(), 0);
      }}
    />
  </div>
)}

</div>

      <ChatContextMenu
        menu={{
          open: menu.open,
          x: menu.x,
          y: menu.y,
          message: menu.message
            ? {
                id: menu.message.id,
                text: menu.message.text,
                isMine: menu.message.isMine,
                deletedAt: menu.message.deletedAt,
                messageType: menu.message.messageType,
              }
            : null,
        }}
        notify={notify}
        canEdit={() => canEdit(menu.message as any)}
        onClose={closeMenu}
        onReply={() => {
          if (!menu.message) return;
          setReplyTo(menu.message);
          closeMenu();
        }}
        onInfo={(m) => {
          setInfoModal({ open: true, messageId: m.id });
          closeMenu();
        }}
        onCopy={async () => {
          if (!menu.message) return;
          await copyMessage(menu.message);
          closeMenu();
        }}
        onForward={() => {
          if (!menu.message) return;
          setForwardSheet({ open: true, messages: [menu.message] });
          closeMenu();
        }}
        onReact={(pos) => {
          if (!menu.message) return;
          setReactionPicker({
            open: true,
            message: menu.message,
            x: pos.x,
            y: Math.max(12, pos.y - 70),
          });
          closeMenu();
        }}
        onEdit={(m) => {
          if (!menu.message) return;
          setInput(menu.message.text || "");
          setEditingMessageId(m.id);
          closeMenu();
        }}
        onDelete={() => {
          if (!menu.message) return;
          setDeleteSheet({ open: true, message: menu.message });
          closeMenu();
        }}
      />

      {/* ✅ Quick reaction row */}
      <ChatReactionQuickRow
        picker={{
          open: reactionPicker.open,
          message: reactionPicker.message
            ? { id: reactionPicker.message.id, myReaction: reactionPicker.message.myReaction }
            : null,
          x: reactionPicker.x,
          y: reactionPicker.y,
        }}
        emojis={recentEmojis}
        onReact={(msg, emoji) => {
          if (!reactionPicker.message) return;
          reactToMessage(reactionPicker.message, emoji);
        }}
        onOpenEmojiMart={({ message, x, y }) => {
          if (!reactionPicker.message) return;
          setEmojiMart({
            open: true,
            message: reactionPicker.message,
            x,
            y,
          });
        }}
        onClose={() => setReactionPicker({ open: false, message: null, x: 0, y: 0 })}
      />

      {/* ✅ Emoji mart popup */}
      <ChatEmojiMartPopup
        mart={{
          open: emojiMart.open,
          message: emojiMart.message ? { id: emojiMart.message.id } : null,
          x: emojiMart.x,
          y: emojiMart.y,
        }}
        onClose={() => setEmojiMart({ open: false, message: null, x: 0, y: 0 })}
      >
        <Picker
          data={data}
          theme="light"
          previewPosition="none"
          onEmojiSelect={(emoji: any) => {
            const chosen = emoji?.native;
            if (!chosen || !emojiMart.message) return;

            reactToMessage(emojiMart.message, chosen);
            setEmojiMart({ open: false, message: null, x: 0, y: 0 });
          }}
        />
      </ChatEmojiMartPopup>

      {/* ✅ Message Info Modal */}
      <ChatMessageInfoModal
        modal={{
          open: infoModal.open,
          messageId: infoModal.messageId,
          loading: infoModal.loading,
          data: infoModal.data ?? null,
        }}
        onClose={() => setInfoModal({ open: false, messageId: null })}
      />

      {/* ✅ Delete Sheet */}
      <ChatDeleteSheet
        sheet={{
          open: deleteSheet.open,
          message: deleteSheet.message
            ? {
                id: deleteSheet.message.id,
                text: deleteSheet.message.text,
                isMine: deleteSheet.message.isMine,
                deletedAt: deleteSheet.message.deletedAt,
              }
            : null,
        }}
        notify={notify}
        onClose={() => setDeleteSheet({ open: false, message: null })}
        onDeleteForMe={async () => {
          const msg = deleteSheet.message!;
          if (!msg) return;

          // optimistic remove
          setMessages((prev) => prev.filter((x) => x.id !== msg.id));

          await authFetch(adapter.deleteForMe(msg.id), {
            method: "POST",
            credentials: "include",
          });

          markDeletedForMe(msg.id);
          setDeleteSheet({ open: false, message: null });
        }}
        canDeleteForEveryone={() => canDeleteForEveryone(deleteSheet.message as any)}
        onDeleteForEveryone={async () => {
          const msg = deleteSheet.message!;
          if (!msg) return;

          // optimistic soft delete
          setMessages((prev) =>
            prev.map((x) =>
              x.id === msg.id
                ? {
                    ...x,
                    deletedAt: new Date().toISOString(),
                    text: "",
                    attachments: [],
                    reactions: [],
                    myReaction: null,
                  }
                : x
            )
          );

          await authFetch(adapter.deleteForEveryone(msg.id), {
            method: "DELETE",
            credentials: "include",
          });

          setDeleteSheet({ open: false, message: null });
        }}
      />

      {/* ✅ Forward Sheet */}
      <ChatForwardSheet
        sheet={{
          open: forwardSheet.open,
          messages: forwardSheet.messages.map((m) => ({
            id: m.id,
            text: m.text,
            deletedAt: m.deletedAt,
            attachments: m.attachments,
          })),
        }}
        currentThreadId={threadId}
        targets={filteredForwardTargets}
        loading={forwardLoading}
        selectedIds={forwardSelectedIds}
        setSelectedIds={setForwardSelectedIds}
        notify={notify}
        onClose={() => setForwardSheet({ open: false, messages: [] })}
        onForward={async () => {
          await forwardSelectedMessagesToHubs();
          setForwardSheet({ open: false, messages: [] });
          setForwardSelectedIds([]);
          setForwardSearch("");
        }}
      />
    </div>
  );
}
