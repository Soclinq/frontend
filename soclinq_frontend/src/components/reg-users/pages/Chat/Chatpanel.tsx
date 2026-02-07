"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/ChatPanel.module.css";
import { useChatThreadWS } from "@/hooks/useChatThreadWS";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { queueOfflineMessage } from "@/lib/chatOfflineQueue";
import { authFetch } from "@/lib/authFetch";
import { useNotify } from "@/components/utils/NotificationContext";
import { useUser } from "@/context/UserContext";

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
import ChatForwardPicker from "./ChatForwardPicker";
import CameraModal from "./CameraModal";
import ChatAudioRecorder from "./ChatAudioRecorder";



import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { ChatAttachmentType, ChatAttachment, Sender, ChatReaction, ChatMessage, ForwardTarget, SendMessagePayload } from "@/types/chat";
/* ================= TYPES ================= */

import { useChatThreadWS } from "@/hooks/useChatThreadWS";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useChatRetry } from "@/hooks/useChatRetry";
import { useChatUploads } from "@/hooks/useChatUploads";
import { useChatReactions } from "@/hooks/useChatReactions";
import { useChatSelection } from "@/hooks/useChatSelection";
import { useMessageHighlight } from "@/hooks/useMessageHighlight";
import { useChatOverlays } from "@/hooks/useChatOverlays";

type Props = {
  threadId: string; // groupId OR conversationId
  adapter: ChatAdapter;
  onSelectionChange?: (payload: {
    active: boolean;
    count: number;

    onExit: () => void;
    onSelectAll: () => void;
    onUnselectAll: () => void;

    onForward: () => void;
    onShare: () => void;
    onDelete: () => void;
  }) => void;
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

function canEdit(msg: ChatMessage | null | undefined) {
  if (!msg) return false;
  if (!msg.isMine) return false;
  if (msg.deletedAt) return false;
  if (msg.messageType !== "TEXT") return false;

  const created = new Date(msg.createdAt).getTime();
  return Date.now() - created <= 20 * 60 * 1000;
}

function canDeleteForEveryone(msg: ChatMessage | null | undefined) {
  if (!msg) return false;
  if (!msg.isMine) return false;
  if (msg.deletedAt) return false;

  const created = new Date(msg.createdAt).getTime();
  return Date.now() - created <= 60 * 60 * 1000;
}

/* ================= COMPONENT ================= */

export default function ChatThread({ threadId, adapter, onSelectionChange }: Props) {
  const notify = useNotify();
  const { user, loading: userLoading } = useUser();
  const currentUserId = user?.id;

  /* ---------- Primary State ---------- */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastSelectionPayloadRef = useRef<{ active: boolean; count: number } | null>(null);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [audioActive, setAudioActive] = useState(false);

  const [input, setInput] = useState("");
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const hideScrollBtnTimer = useRef<number | null>(null);

  /* ---------- UI refs ---------- */
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputBarRef = useRef<HTMLDivElement | null>(null);

  // local deletion key
  const LOCAL_DELETE_KEY = `soclinq_deleted_for_me_${adapter.mode}_${threadId}`;

  /* ---------- Hover + highlight ---------- */
  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null);
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);

  const [footerEmojiOpen, setFooterEmojiOpen] = useState(false);

  /* ---------- Selection Mode ---------- */
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  const lastSelectedMsgIdRef = useRef<string | null>(null);

  const messages = useChatMessages({
    threadId,
    adapter,
    ws,
  });

  /* ================= SIDE EFFECTS ================= */
  useChatRetry(messages, ws);
  useChatUploads(messages, ws, notify);

  /* ================= UI STATE ================= */
  const selection = useChatSelection(messages, adapter, notify);
  const reactions = useChatReactions(messages, adapter, currentUserId);
  const highlight = useMessageHighlight();
  const overlays = useChatOverlays();
  /* ---------- Overlays ---------- */
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; message: ChatMessage | null }>({
    open: false,
    x: 0,
    y: 0,
    message: null,
  });

  const [reactionPicker, setReactionPicker] = useState<{ open: boolean; message: ChatMessage | null; x: number; y: number }>(
    { open: false, message: null, x: 0, y: 0 }
  );

  const [emojiMart, setEmojiMart] = useState<{ open: boolean; message: ChatMessage | null; x: number; y: number }>(
    { open: false, message: null, x: 0, y: 0 }
  );

  const [infoModal, setInfoModal] = useState<{ open: boolean; messageId: string | null; data?: any; loading?: boolean }>(
    { open: false, messageId: null }
  );

  const [deleteSheet, setDeleteSheet] = useState<{ open: boolean; message: ChatMessage | null }>({ open: false, message: null });

  const [forwardSheet, setForwardSheet] = useState<{ open: boolean; messages: ChatMessage[] }>({ open: false, messages: [] });

  const [forwardTargets, setForwardTargets] = useState<ForwardTarget[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardSelectedIds, setForwardSelectedIds] = useState<string[]>([]);

  const [cameraOpen, setCameraOpen] = useState(false);

  const [recentEmojis, setRecentEmojis] = useState<string[]>(QUICK_REACTIONS.slice(0, 5));

  /* ================= Derived ================= */
  const disabledInput = loading || sending;
  const selectedCount = selectedMsgIds.length;
  function isSelected(id: string) {
    return selectedMsgIds.includes(id);
  }

  /* ---------- WebSocket adapter (existing hook) ---------- */
  const {
    containerRef,
    connected,
    typingUsers,
    bottomRef,
    scrollToBottom,
    typing,
    typingStop,
    sendMessageWS,
  } = useChatThreadWS({
    threadId,
    adapter,
    setMessages,
    currentUserId,
  });

  /* ---------- Optional helpers (safe fallbacks) ----------
     These helpers may live in other modules in your repo.
     We prefer not to import them directly here to avoid runtime errors
     if the file isn't present. Instead we use globalThis fallbacks
     (your environment can still expose them) or noop versions.
  */
  const _getOfflineMessages = (globalThis as any).getOfflineMessages ?? (async (_threadId: string) => []);
  const _removeOfflineMessage = (globalThis as any).removeOfflineMessage ?? (async (_id: string) => {});
  const _enqueueUpload = (globalThis as any).enqueueUpload ?? null;
  const _saveThreadCache = (globalThis as any).saveThreadCache ?? (() => {});
  const _loadThreadCache = (globalThis as any).loadThreadCache ?? (() => []);

  /* ---------- E2EE (optional) ----------
     Provide a safe default object if your E2EE module isn't loaded.
  */
  const e2ee = (globalThis as any).SOC_E2EE ?? {
    enabled: false,
    encrypt: async (t: string) => t,
    decrypt: async (t: string) => t,
  };

  /* ---------- Inflight tracking & retries ---------- */
  const inflightClientTempIdsRef = useRef<Set<string>>(new Set());
  const MAX_RETRIES = 3;
  const BASE_RETRY_DELAY = 700; // ms

  function markInflight(clientTempId: string) {
    if (!clientTempId) return;
    inflightClientTempIdsRef.current.add(clientTempId);
    // safety remove after 10 minutes to avoid memory leaks in worst case
    window.setTimeout(() => inflightClientTempIdsRef.current.delete(clientTempId), 1000 * 60 * 10);
  }

  function clearInflight(clientTempId: string) {
    if (!clientTempId) return;
    inflightClientTempIdsRef.current.delete(clientTempId);
  }

  function scheduleRetry(msg: ChatMessage) {
    const retries = (msg.retryCount ?? 0) + 1;
    const delay = Math.round(BASE_RETRY_DELAY * Math.pow(1.6, retries - 1));
    setTimeout(() => retrySendMessage(msg), delay);
  }

  /* ---------- Messages ref + persisted cache ---------- */
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // persist cache on change (best-effort)
    try {
      if (messages.length) _saveThreadCache(threadId, messages);
    } catch {}
  }, [messages, threadId]);

  /* ---------- seen batching ---------- */
  const seenQueueRef = useRef<string[]>([]);
  const seenTimerRef = useRef<number | null>(null);
  function sendSeenBatch(id: string) {
    try {
      seenQueueRef.current.push(id);
      if (seenTimerRef.current) return;
      seenTimerRef.current = window.setTimeout(() => {
        const ids = Array.from(new Set(seenQueueRef.current.splice(0)));
        seenTimerRef.current = null;
        if (ids.length === 0) return;
        if (typeof adapter.markSeenBulk === "function") {
          try {
            adapter.markSeenBulk(ids);
          } catch {}
        }
      }, 350);
    } catch {}
  }

  useEffect(() => {
    // flush seen queue on unmount
    return () => {
      try {
        if (seenQueueRef.current.length && typeof adapter.markSeenBulk === "function") {
          adapter.markSeenBulk(Array.from(new Set(seenQueueRef.current)));
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- emoji init ---------- */
  useEffect(() => {
    const local = getRecentEmojis();
    if (local.length) setRecentEmojis(local);
  }, []);

  /* ---------- overlay close on click outside ---------- */
  useEffect(() => {
    function close() {
      setFooterEmojiOpen(false);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  /* ---------- selection onSelectionChange callback ---------- */
  const selectableMessages = useMemo(() => messages.filter((m) => m.messageType !== "SYSTEM" && !m.deletedAt), [messages]);
  const selectableMessageIds = useMemo(() => selectableMessages.map((m) => m.id), [selectableMessages]);
  const selectedMessages = useMemo(() => messages.filter((m) => selectedMsgIds.includes(m.id)), [messages, selectedMsgIds]);
  const filteredForwardTargets = useMemo(() => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return forwardTargets;
    return forwardTargets.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [forwardTargets, forwardSearch]);

  useEffect(() => {
    if (!onSelectionChange) return;
    const active = selectionMode && selectedCount > 0;
    const prev = lastSelectionPayloadRef.current;
    if (prev && prev.active === active && prev.count === selectedCount) return;
    lastSelectionPayloadRef.current = { active, count: selectedCount };
    onSelectionChange({
      active,
      count: selectedCount,
      onExit: clearSelection,
      onSelectAll: () => {
        setSelectionMode(true);
        setSelectedMsgIds(selectableMessageIds);
      },
      onUnselectAll: unselectAllMessages,
      onForward: () => setForwardSheet({ open: true, messages: selectedMessages }),
      onShare: async () => {
        await shareExternallyBulk(selectedMessages);
        clearSelection();
      },
      onDelete: deleteSelectedForMe,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectionChange, selectionMode, selectedCount, selectableMessageIds, selectedMessages]);

  useEffect(() => {
    if (selectedMsgIds.length === 0) {
      setSelectionMode(false);
      lastSelectedMsgIdRef.current = null;
    }
  }, [selectedMsgIds]);

  /* ---------- helper: deleted for me set ---------- */
  function getDeletedForMeSet(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_DELETE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.filter((x: any) => typeof x === "string"));
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

  /* ---------- click handler for message (selection mode) ---------- */
  function onMessageClick(e: React.MouseEvent, msg: ChatMessage) {
    if (selectionMode) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelectMessage(msg.id);
    }
  }

  const { highlightedId, highlight } = useMessageHighlight();

function scrollToMessage(messageId: string) {
  const el = document.getElementById(`msg-${messageId}`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  highlight(messageId);
}

  /* ---------- copy/share helpers ---------- */
  async function copyMessage(msg: ChatMessage) {
    const text = msg.text || "";
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      notify({ type: "success", title: "Copied", message: "Message copied to clipboard", duration: 1500 });
    } catch {
      notify({ type: "error", title: "Copy failed", message: "Unable to copy message", duration: 1800 });
    }
  }

  async function shareExternallyBulk(msgs: ChatMessage[]) {
    const text = msgs.filter((m) => !m.deletedAt).map((m) => m.text).filter(Boolean).join("\n\n");
    if (!text.trim()) return;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        notify({ type: "info", title: "Copied", message: "Share not supported. Copied instead.", duration: 2000 });
      }
    } catch {
      notify({ type: "warning", title: "Share failed", message: "Could not share messages", duration: 1800 });
    }
  }

  /* ---------- forward / delete ---------- */
  async function forwardSelectedMessagesToHubs() {
    if (!adapter.features.forward) return;
    if (forwardSelectedIds.length === 0) {
      notify({ type: "warning", title: "No target selected", message: "Select at least one target.", duration: 2000 });
      return;
    }
    // implement backend forwarding here
    notify({ type: "info", title: "Forwarding", message: "Forward endpoint not wired yet.", duration: 2000 });
  }

  async function deleteSelectedForMe() {
    if (selectedMsgIds.length === 0) return;
    setMessages((prev) => prev.filter((m) => !selectedMsgIds.includes(m.id)));
    selectedMsgIds.forEach((id) => markDeletedForMe(id));
    try {
      await Promise.all(
        selectedMsgIds.map((id) =>
          authFetch(adapter.deleteForMe(id), {
            method: "POST",
            credentials: "include",
          })
        )
      );
    } catch {
      notify({ type: "warning", title: "Delete may not sync", message: "Deleted locally, but server sync failed.", duration: 2500 });
    }
    clearSelection();
  }

  /* ---------- selection helpers ---------- */
  function toggleSelectMessage(id: string) {
    setSelectionMode(true);
    setSelectedMsgIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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

  /* ---------- reply helpers ---------- */
  function startReply(msg: ChatMessage) {
    setReplyTo(msg);
    setTimeout(() => {
      inputBarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      inputRef.current?.focus();
    }, 50);
  }
  function buildReplyPreview(target: ChatMessage) {
    return {
      id: target.id,
      senderName: target.isMine ? "You" : target.sender.name,
      text: target.deletedAt ? "This message was deleted" : target.text ? target.text : target.attachments?.length ? "Media" : "ChatMessage",
    };
  }

  function openReactionForMessage(msg: ChatMessage) {
    const el = document.getElementById(`msg-${msg.id}`);
    if (!el) return;
  
    const rect = el.getBoundingClientRect();
  
    setReactionPicker({
      open: true,
      message: msg,
      x: rect.left + rect.width / 2,
      y: rect.top - 12,
    });
  }
  

  /* ---------- overlay close ---------- */
  function closeMenu() {
    setMenu({ open: false, x: 0, y: 0, message: null });
    setReactionPicker({ open: false, message: null, x: 0, y: 0 });
    setEmojiMart({ open: false, message: null, x: 0, y: 0 });
  }

  useEffect(() => {
    function onGlobalClick() {
      if (selectionMode) return;
      if (menu.open || reactionPicker.open || emojiMart.open) closeMenu();
    }
    window.addEventListener("click", onGlobalClick);
    return () => window.removeEventListener("click", onGlobalClick);
  }, [menu.open, reactionPicker.open, emojiMart.open, selectionMode]);

  /* ================== Load initial messages (robust) ================== */
  useEffect(() => {
    if (!threadId || userLoading || !currentUserId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // attempt to load cache first (best-effort)
        try {
          const cached = await Promise.resolve(_loadThreadCache(threadId));
          if (Array.isArray(cached) && cached.length) {
            setMessages(cached);
            setLoading(false);
          }
        } catch {}

        const res = await authFetch(adapter.listMessages(threadId), { method: "GET", credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load messages");
        if (cancelled) return;

        const deletedSet = getDeletedForMeSet();
        const cleaned: ChatMessage[] = (data.messages || [])
          .filter((m: ChatMessage) => !deletedSet.has(m.id))
          .map((m: any) => ({ ...m, isMine: String(m.sender?.id) === String(currentUserId) }));

        // replace with server results (you may merge with cache if needed)
        setMessages(cleaned);
        setCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
      } catch {
        setError("Unable to load messages");
      } finally {
        if (!cancelled) {
          setLoading(false);
          try {
            scrollToBottom(false);
          } catch {}
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, adapter, userLoading, currentUserId]);

  /* ================== Load older ================== */
  async function loadOlder() {
    if (!hasMore || !cursor || loading) return;
    try {
      const res = await authFetch(adapter.listMessagesOlder(threadId, cursor), { method: "GET", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const deletedSet = getDeletedForMeSet();
      const older = (data.messages || []).filter((m: ChatMessage) => !deletedSet.has(m.id)).map((m: any) => ({ ...m, isMine: String(m.sender?.id) === String(currentUserId) }));
      setMessages((prev) => [...older, ...prev]);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      // ignore load older errors
    }
  }

  /* ================== Offline flush on reconnect ================== */
  useEffect(() => {
    if (!connected || !threadId) return;
    (async () => {
      try {
        const queued = await _getOfflineMessages(threadId);
        for (const q of queued) {
          try {
            if (!q?.clientTempId || !q?.payload) continue;
            if (inflightClientTempIdsRef.current.has(q.clientTempId)) continue;
            markInflight(q.clientTempId);
            sendMessageWS(q.payload);
            // best-effort removal
            await _removeOfflineMessage(q.clientTempId);
          } catch {
            // leave in queue
          }
        }
      } catch {
        // ignore offline flush errors
      }
    })();
  }, [connected, threadId, _getOfflineMessages, _removeOfflineMessage, sendMessageWS]);

  /* ================== Typing ================== */
  const handleTyping = (value: string) => {
    setInput(value);
    if (adapter.features.typing) typing();
  };

  /* ================== Upload helpers ================== */
  async function uploadAttachmentsToBackend(files: File[]) {
    if (!files.length) return [];
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const res = await authFetch(adapter.upload(), { method: "POST", body: form, credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    return data.attachments || [];
  }

  async function backgroundUpload(files: File[]) {
    if (!files || files.length === 0) return [];
    // if an enqueueUpload worker exists, use it, otherwise fallback to direct upload
    if (typeof _enqueueUpload === "function") {
      // enqueueUpload should accept a job and worker callback
      try {
        await _enqueueUpload({ id: `upl-${Date.now()}`, files, threadId }, async ({ files: workerFiles }: any) => {
          return await uploadAttachmentsToBackend(workerFiles);
        });
        // worker is expected to call sendMessageWS when done
        return [];
      } catch {
        // fallback to direct upload
      }
    }
    return await uploadAttachmentsToBackend(files);
  }



  /* ================== React to message ================== */
  function toggleReactionLocal(
    msg: ChatMessage,
    emoji: string,
    myUserId: string
  ): ChatReaction[] {
    const prev = msg.reactions ?? [];
  
    // remove my old reaction
    const cleaned = prev
      .map((r) => ({
        ...r,
        userIds: r.userIds.filter((id) => id !== myUserId),
      }))
      .filter((r) => r.userIds.length > 0);
  
    // undo if same emoji
    if (msg.myReaction === emoji) {
      return cleaned;
    }
  
    // add new
    const found = cleaned.find((r) => r.emoji === emoji);
    if (found) found.userIds.push(myUserId);
    else cleaned.push({ emoji, userIds: [myUserId] });
  
    return cleaned;
  }
  

  useEffect(() => {
    return () => typingStop();
  }, []);
  
  /* ================== External seen events ================== */
  useEffect(() => {
    function onSeen(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      sendSeenBatch(id);
    }
    window.addEventListener("chat:seen", onSeen);
    return () => window.removeEventListener("chat:seen", onSeen);
  }, []);

  /* ================== Retry single message ================== */
  async function retrySendMessage(msg: ChatMessage) {
    if (msg.status !== "failed") return;
    if (!msg || (msg.retryCount ?? 0) >= MAX_RETRIES) return;
    if (msg.status !== "failed") return;
    if (msg.messageType === "MEDIA") return; // media uses upload queue

    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: "sending", retryCount: (m.retryCount ?? 0) + 1 } : m)));

    try {
      
      const payload: SendMessagePayload = {
        clientTempId: msg.clientTempId ?? msg.id,
        text: msg.text || "",
        messageType: "TEXT",
        replyToId: msg.replyTo?.id ?? null,
        attachments: msg.attachments || [],
      };
      
      if (inflightClientTempIdsRef.current.has(payload.clientTempId)) {
        // already in-flight
        return;
      }
      markInflight(payload.clientTempId);
      sendMessageWS(payload);
      // rely on message arrival to clear inflight
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: "failed" } : m)));
      scheduleRetry(msg);
    }
  }

  /* ================== send voice file (robust) ================== */
  async function sendVoiceFile(file: File) {
    const clientTempId = `tmp-voice-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: clientTempId,
      clientTempId,
      hubId: threadId,
      messageType: "MEDIA",
      text: "",
      sender: { id: currentUserId!, name: "You" },
      isMine: true,
      createdAt: new Date().toISOString(),
      status: "sending",
      replyTo: replyTo ? buildReplyPreview(replyTo) : null,
      attachments: [{ id: `${clientTempId}-0`, type: "AUDIO", url: URL.createObjectURL(file), fileName: file.name, mimeType: file.type, fileSize: file.size }],
      reactions: [],
    };

    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);
    scrollToBottom();

    try {
      setSending(true);

      // try background upload (worker) or direct upload fallback
      const uploaded = await backgroundUpload([file]);
      

      const payload: SendMessagePayload = {
        clientTempId,
        messageType: "MEDIA",
        attachments: uploaded,
      };
      
      markInflight(clientTempId);
      sendMessageWS(payload);
      // server ACK/update will update optimistic entry
    } catch {
      setMessages((prev) => prev.map((m) => (m.clientTempId === clientTempId ? { ...m, status: "failed" } : m)));
      notify({ type: "error", title: "Voice send failed", message: "Voice note could not be sent.", duration: 2500 });
    } finally {
      setSending(false);
    }
  }

  /* ================== sendMessage (core) ================== */
  async function sendMessage() {
    // edit flow
    if (editingMessageId) {
      const newText = input.trim();
      if (!newText) return;
      const msgId = editingMessageId;
      setEditingMessageId(null);
      setInput("");
      typingStop();
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: newText } : m)));
      try {
        await authFetch(adapter.edit(msgId), { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: newText }) });
      } catch {
        notify({ type: "warning", title: "Edit failed", message: "Could not update message on server", duration: 2000 });
      }
      return;
    }

    const rawText = input.trim();
    const hasText = Boolean(rawText);
    const hasFiles = pickedFiles.length > 0;
    if (!hasText && !hasFiles) return;

    const clientTempId = `tmp-${Date.now()}`;
    const replyPreview = replyTo ? buildReplyPreview(replyTo) : null;

    // optimistic local text should be plaintext for good UX; encrypt only on-wire
    let encryptedText = rawText;
    try {
      if (e2ee.enabled && rawText) encryptedText = await e2ee.encrypt(rawText);
    } catch {
      encryptedText = rawText; // fallback
    }

    const optimistic: ChatMessage = {
      id: clientTempId,
      clientTempId,
      hubId: threadId,
      messageType: hasFiles ? "MEDIA" : "TEXT",
      // show plaintext locally
      text: hasText ? rawText : "",
      sender: { id: currentUserId!, name: "You" },
      createdAt: new Date().toISOString(),
      isMine: true,
      status: "sending",
      replyTo: replyPreview,
      attachments: hasFiles ? pickedFiles.map((f, idx) => ({ id: `${clientTempId}-${idx}`, url: URL.createObjectURL(f), fileName: f.name, mimeType: f.type, fileSize: f.size, type: f.type.startsWith("image/") ? "IMAGE" : f.type.startsWith("video/") ? "VIDEO" : f.type.startsWith("audio/") ? "AUDIO" : "FILE" })) : [],
      reactions: [],
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setPickedFiles([]);
    setReplyTo(null);
    typingStop();
    scrollToBottom();

    // offline: queue and return (best-effort)
    if (!connected) {
      try {
        if (typeof queueOfflineMessage === "function") {
          await queueOfflineMessage({
            clientTempId,
            threadId,
            payload: { clientTempId, text: encryptedText, messageType: optimistic.messageType, replyToId: replyTo?.id ?? null, attachments: [] },
            createdAt: Date.now(),
          });
        } else {
          // no queue available -> mark as failed so user can retry
          setMessages((prev) => prev.map((m) => (m.clientTempId === clientTempId ? { ...m, status: "failed" } : m)));
        }
      } catch {
        setMessages((prev) => prev.map((m) => (m.clientTempId === clientTempId ? { ...m, status: "failed" } : m)));
      }
      return;
    }

    try {
      setSending(true);

      // upload attachments if present (worker or direct)
      let uploadedAttachments: any[] = [];
      if (hasFiles) {
        uploadedAttachments = await backgroundUpload(pickedFiles);
      }

      if (inflightClientTempIdsRef.current.has(clientTempId)) {
        // already in-flight
        return;
      }

      // mark inflight and send via WS (server expected to ACK/update)
      markInflight(clientTempId);
      const payload: SendMessagePayload = {
        clientTempId,
        text: encryptedText,
        messageType: hasFiles ? "MEDIA" : "TEXT",
        replyToId: replyTo?.id ?? null,
        attachments: uploadedAttachments,
      };
      
      sendMessageWS(payload);
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.clientTempId === clientTempId ? { ...m, status: "failed" } : m)));
      // schedule retry for text messages
      if (!hasFiles) scheduleRetry({ ...(optimistic as ChatMessage), retryCount: 0 });
      notify({ type: "error", title: "Send failed", message: "Message could not be sent.", duration: 2500 });
    } finally {
      setSending(false);
    }
  }

  /* ================== Info modal & forward targets ================== */
  useEffect(() => {
    if (!infoModal.open || !infoModal.messageId) return;
    let cancelled = false;
    (async () => {
      setInfoModal((p) => ({ ...p, loading: true }));
      try {
        const res = await authFetch(adapter.messageInfo(infoModal.messageId!), { method: "GET", credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        if (cancelled) return;
        setInfoModal((p) => ({ ...p, loading: false, data }));
      } catch {
        if (!cancelled) setInfoModal((p) => ({ ...p, loading: false, data: null }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [infoModal.open, infoModal.messageId, adapter]);

  useEffect(() => {
    if (!forwardSheet.open || !adapter.features.forward) return;
    let cancelled = false;
    (async () => {
      try {
        setForwardLoading(true);
        const res = await authFetch(adapter.forwardTargets(), { method: "GET", credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        if (cancelled) return;
        setForwardTargets(data.targets || []);
        setForwardSearch("");
        setForwardSelectedIds([]);
      } catch {
        if (!cancelled) setForwardTargets([]);
      } finally {
        if (!cancelled) setForwardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forwardSheet.open, adapter]);

  /* ================== Cleanup created object URLs on unmount ================== */
  useEffect(() => {
    return () => {
      messagesRef.current.forEach((m) => {
        m.attachments?.forEach((a) => {
          try {
            if (a.url?.startsWith("blob:")) URL.revokeObjectURL(a.url);
          } catch {}
        });
      });
    };
  }, []);

  /* ================== External retry event ================== */
  useEffect(() => {
    function onRetry(e: Event) {
      try {
        const msg = (e as CustomEvent<ChatMessage>).detail;
        setTimeout(() => retrySendMessage(msg), 500);
      } catch {}
    }
    window.addEventListener("chat:retry", onRetry);
    return () => window.removeEventListener("chat:retry", onRetry);
  }, []);

  /* ================== Clear inflight when server returns message updates ==================
     We watch messages array for server-updated messages that either:
      - have the same clientTempId but now have a server id (id !== clientTempId), or
      - have a status other than 'sending' (e.g. 'sent', 'delivered')
  */
  useEffect(() => {
    try {
      messages.forEach((m) => {
        if (!m.clientTempId) return;
        // if server assigned an id different than clientTempId OR status moved off sending, clear inflight
        if (m.id && m.id !== m.clientTempId) clearInflight(m.clientTempId);
        else if (m.status && m.status !== "sending") clearInflight(m.clientTempId);
      });
    } catch {}
  }, [messages]);

  /* ================== Retry failed messages when reconnect ================== */
  useEffect(() => {
    if (!connected) return;
    const failed = messagesRef.current.filter((m) => m.isMine && m.status === "failed" && m.messageType === "TEXT" && (m.retryCount ?? 0) < MAX_RETRIES);
    failed.forEach((m, i) => setTimeout(() => retrySendMessage(m), 300 + i * 500));
  }, [connected]);

  /* ================== focus-based retries (duplicate guard above) ================== */
  useEffect(() => {
    function onWindowFocus() {
      if (!connected) return;
      messagesRef.current
        .filter((m) => m.isMine && m.status === "failed" && m.messageType === "TEXT" && (m.retryCount ?? 0) < MAX_RETRIES)
        .forEach((m) => setTimeout(() => retrySendMessage(m), 800));
    }
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [connected]);

  /* ================== UI render ================== */

  return (
    <div className={styles.chat}>
      {/* Header (selection mode) */}
      {selectionMode && selectedCount > 0 && (
        <ChatHeader
          selectionMode={selectionMode}
          selectedCount={selectedCount}
          onExitSelection={clearSelection}
          onUnselectAll={unselectAllMessages}
          onForwardSelected={() => setForwardSheet({ open: true, messages: selectedMessages })}
          onShareSelected={async () => {
            await shareExternallyBulk(selectedMessages);
            clearSelection();
          }}
          onDeleteSelectedForMe={deleteSelectedForMe}
          onReplySelected={() => {
            if (selectedMessages.length !== 1) return;
            startReply(selectedMessages[0]);
            clearSelection();
          }}
        />
      )}

      {/* Messages list */}
      <ChatMessages
        messages={messages}
        loading={loading}
        error={error}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onMessageClick={onMessageClick}
        toggleSelectMessage={toggleSelectMessage}
        startReply={startReply}
        scrollToMessage={scrollToMessage}
        highlightMsgId={highlightMsgId}
        loadOlder={loadOlder}
        reactToMessage={reactToMessage}
        recentEmojis={recentEmojis}
        setReactionPicker={setReactionPicker}
        onOpenFullEmojiPicker={(msg, pos) => {
          setEmojiMart({ open: true, message: msg, x: pos.x, y: pos.y });
        }}
        onOpenContextMenu={(pos, msg) => {
          setMenu({ open: true, x: pos.x, y: pos.y, message: msg });
        }}
        bottomRef={bottomRef}
        containerRef={containerRef}
        notify={notify}
      />

      {/* Typing bar */}
      <ChatTypingBar typingUsers={typingUsers} />

      {/* Reply preview */}
      {replyTo && <ReplyBar replyTo={replyTo} onJump={(id) => scrollToMessage(id)} onCancel={() => { setReplyTo(null); setTimeout(() => inputRef.current?.focus(), 50); }} />}

      {/* Camera modal */}
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

      {/* Footer */}
      <div className={`${styles.footerStack} ${audioActive ? styles.audioActive : ""}`}>
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
            showSendButton={Boolean(input.trim()) || pickedFiles.length > 0}
            emojiOpen={footerEmojiOpen}
            onToggleEmoji={() => setFooterEmojiOpen((p) => !p)}
          />
        )}

        {!Boolean(input.trim()) && pickedFiles.length === 0 && (
          <ChatAudioRecorder
            disabled={disabledInput}
            sending={sending}
            minMs={500}
            maxMs={60 * 60 * 1000}
            onSend={(file) => sendVoiceFile(file)}
            onError={(msg) => {
              notify({ type: "error", title: "Recorder error", message: msg, duration: 2500 });
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

      {/* Context menu */}
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
        canEdit={() => canEdit(menu.message)}
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
          setReactionPicker({ open: true, message: menu.message, x: pos.x, y: Math.max(12, pos.y - 70) });
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

      {/* Quick reaction row */}
      <ChatReactionQuickRow
        picker={{
          open: reactionPicker.open,
          message: reactionPicker.message ? { id: reactionPicker.message.id, myReaction: reactionPicker.message.myReaction } : null,
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
          setEmojiMart({ open: true, message: reactionPicker.message, x, y });
        }}
        onClose={() => setReactionPicker({ open: false, message: null, x: 0, y: 0 })}
      />

      {/* Emoji mart popup */}
      <ChatEmojiMartPopup mart={{ open: emojiMart.open, message: emojiMart.message ? { id: emojiMart.message.id } : null, x: emojiMart.x, y: emojiMart.y }} onClose={() => setEmojiMart({ open: false, message: null, x: 0, y: 0 })}>
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

      {/* Message info modal */}
      <ChatMessageInfoModal modal={{ open: infoModal.open, messageId: infoModal.messageId, loading: infoModal.loading, data: infoModal.data ?? null }} onClose={() => setInfoModal({ open: false, messageId: null })} />

      {/* Delete sheet */}
      <ChatDeleteSheet
        sheet={{
          open: deleteSheet.open,
          message: deleteSheet.message ? { id: deleteSheet.message.id, text: deleteSheet.message.text, isMine: deleteSheet.message.isMine, deletedAt: deleteSheet.message.deletedAt } : null,
        }}
        notify={notify}
        onClose={() => setDeleteSheet({ open: false, message: null })}
        onDeleteForMe={async () => {
          const msg = deleteSheet.message!;
          if (!msg) return;
          setMessages((prev) => prev.filter((x) => x.id !== msg.id));
          try {
            await authFetch(adapter.deleteForMe(msg.id), { method: "POST", credentials: "include" });
          } catch {}
          markDeletedForMe(msg.id);
          setDeleteSheet({ open: false, message: null });
        }}
        canDeleteForEveryone={() => canDeleteForEveryone(deleteSheet.message)}
        onDeleteForEveryone={async () => {
          const msg = deleteSheet.message!;
          if (!msg) return;
          setMessages((prev) => prev.map((x) => (x.id === msg.id ? { ...x, deletedAt: new Date().toISOString(), text: "", attachments: [], reactions: [], myReaction: null } : x)));
          try {
            await authFetch(adapter.deleteForEveryone(msg.id), { method: "DELETE", credentials: "include" });
          } catch {}
          setDeleteSheet({ open: false, message: null });
        }}
      />

      {/* Forward sheet */}
      <ChatForwardPicker
        open={forwardSheet.open}
        onClose={() => setForwardSheet({ open: false, messages: [] })}
        mode="FORWARD"
        adapter={adapter}
        currentThreadId={threadId}
        forwardMessages={forwardSheet.messages.map((m) => ({ id: m.id, text: m.text || "", deletedAt: m.deletedAt, attachments: m.attachments || [] }))}
        onForwardDone={() => {
          setForwardSheet({ open: false, messages: [] });
          setForwardSelectedIds([]);
          setForwardSearch("");
        }}
      />
    </div>
  );
}
