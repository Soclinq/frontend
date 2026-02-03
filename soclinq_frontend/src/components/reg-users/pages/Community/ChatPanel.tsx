"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSend,
  FiLoader,
  FiAlertCircle,
  FiImage,
  FiMic,
  FiVideo,
  FiX,
  FiCopy,
  FiCornerUpLeft,
  FiSmile,
  FiTrash2,
  FiCheck,
  FiCheckSquare,
  FiSquare,

} from "react-icons/fi";
import type { ChatMessage as Message } from "@/types/chat";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import styles from "./styles/ChatPanel.module.css";
import { authFetch } from "@/lib/authFetch";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import ChatFooter from "./ChatFooter";
import CameraModal from "./CameraModal";
/* ================= TYPES ================= */


type ForwardTarget = {
  id: string;
  name: string;
  type?: string;
  photo?: string | null;
};

type WSIncoming =
  | { type: "message:new"; payload: Message }
  | { type: "reaction:update"; payload: { messageId: string; emoji: string; userId: string; action: "added" | "removed" } }
  | { type: "typing:update"; payload: { userId: string; name: string; isTyping: boolean } }
  | { type: "ERROR"; message: string }
  | { type: "message:delete"; payload: { messageId: string; deletedAt?: string } }
  | { type: "message:edit"; payload: Message }



  type Props = {
    threadId: string;
    adapter: ChatAdapter;
  
    onSelectionChange?: (payload: {
      active: boolean;
      count: number;
  
      exit: () => void;
      selectAll: () => void;
      unselectAll: () => void;
  
      forward: () => void;
      share: () => void;
      del: () => void;
    }) => void;
  };
  

/* ================= HELPERS ================= */

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

function isMediaMessage(msg: Message) {
  return msg.messageType === "MEDIA" && (msg.attachments?.length ?? 0) > 0;
}

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


async function shareExternallyBulk(msgs: Message[]) {
  try {
    if (!navigator.share) return;

    const alive = msgs.filter((m) => !m.deletedAt);
    if (!alive.length) return;

    // Combine all text messages into one text
    const combinedText = alive
      .map((m) => m.text?.trim())
      .filter(Boolean)
      .join("\n\n");

    // Collect attachments (limit for safety)
    const allAttachments = alive
      .flatMap((m) => m.attachments || [])
      .slice(0, 5); // ✅ keep small (some browsers fail on many files)

    // ✅ Try share files if possible
    if (navigator.canShare && allAttachments.length > 0) {
      const files: File[] = [];

      for (const a of allAttachments) {
        try {
          const resp = await fetch(a.url);
          const blob = await resp.blob();

          const file = new File(
            [blob],
            a.fileName || `attachment.${blob.type.split("/")[1] || "bin"}`,
            { type: blob.type || a.mimeType || "application/octet-stream" }
          );

          files.push(file);
        } catch {}
      }

      if (files.length > 0 && navigator.canShare({ files })) {
        await navigator.share({
          text: combinedText || "",
          files,
        });
        return;
      }
    }

    // ✅ fallback: share text only
    if (combinedText) {
      await navigator.share({ text: combinedText });
      return;
    }

    // ✅ final fallback: share first link
    const firstMedia = allAttachments[0];
    if (firstMedia) {
      await navigator.share({
        text: "",
        url: firstMedia.url,
      });
    }
  } catch (err) {
    console.log("Bulk share failed:", err);
  }
}




const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

/* ================= COMPONENT ================= */

export default function ChatPanel({ threadId, adapter, onSelectionChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(QUICK_REACTIONS.slice(0, 5));
  const [forwardSheet, setForwardSheet] = useState<{
    open: boolean;
    messages: Message[];
  }>({ open: false, messages: [] });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputBarRef = useRef<HTMLDivElement | null>(null);

  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null);

  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);

  const [emojiMart, setEmojiMart] = useState<{
    open: boolean;
    message: Message | null;
    x: number;
    y: number;
  }>({ open: false, message: null, x: 0, y: 0 });

  function startReply(msg: Message) {
    setReplyTo(msg);
  
    // scroll to input bar
    setTimeout(() => {
      inputBarRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
  
      // focus input
      inputRef.current?.focus();
    }, 50);
  }

  
  
  
  const [forwardTargets, setForwardTargets] = useState<ForwardTarget[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardSelectedId, setForwardSelectedId] = useState<string | null>(null);
  const [forwardSelectedIds, setForwardSelectedIds] = useState<string[]>([]);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  const lastSelectedMsgIdRef = useRef<string | null>(null);
  const dragStartX = useRef<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);


const selectedCount = selectedMsgIds.length;

function isSelected(id: string) {
  return selectedMsgIds.includes(id);
}

function toggleSelectMessage(id: string) {
  setSelectedMsgIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );
}

function clearSelection() {
  setSelectionMode(false);
  setSelectedMsgIds([]);
}

const selectableMessages = useMemo(() => {
  return messages.filter((m) => m.messageType !== "SYSTEM" && !m.deletedAt);
}, [messages]);

const selectableMessageIds = useMemo(() => {
  return selectableMessages.map((m) => m.id);
}, [selectableMessages]);

function getIndexById(id: string) {
  return selectableMessageIds.indexOf(id);
}


const selectedMessages = useMemo(() => {
  return messages.filter((m) => selectedMsgIds.includes(m.id));
}, [messages, selectedMsgIds]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteSheet, setDeleteSheet] = useState<{
    open: boolean;
    message: Message | null;
  }>({ open: false, message: null });

  const LOCAL_DELETE_KEY = `soclinq_deleted_for_me_${threadId}`;

  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    messageId: string | null;
    data?: any;
    loading?: boolean;
  }>({ open: false, messageId: null });
  

  
  
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // ✅ message interactions
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);

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

  const filteredForwardTargets = useMemo(() => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return forwardTargets;
  
    return forwardTargets.filter((t) =>
      (t.name || "").toLowerCase().includes(q)
    );
  }, [forwardTargets, forwardSearch]);

  
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // hold/long press
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  // swipe-to-reply
  const touchStartX = useRef<number | null>(null);

  const disabledInput = loading || sending;

  /* ================= SCROLL ================= */

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  /* ================= LOAD INITIAL ================= */

  function selectAllMessages() {
    if (!selectableMessageIds.length) return;
    setSelectionMode(true);
    setSelectedMsgIds(selectableMessageIds);
  }

  function selectRange(fromId: string, toId: string) {
    const fromIdx = getIndexById(fromId);
    const toIdx = getIndexById(toId);
  
    if (fromIdx === -1 || toIdx === -1) return;
  
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
  
    const rangeIds = selectableMessageIds.slice(start, end + 1);
  
    setSelectedMsgIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
  }

  function onMessageClick(e: React.MouseEvent, msg: Message) {
    // if normal mode, do nothing
    if (!selectionMode) return;
  
    e.stopPropagation();
  
    const isShift = e.shiftKey;
  
    // if shift + we already have a previous anchor -> range select
    if (isShift && lastSelectedMsgIdRef.current) {
      selectRange(lastSelectedMsgIdRef.current, msg.id);
      return;
    }
  
    // normal toggle
    toggleSelectMessage(msg.id);
    lastSelectedMsgIdRef.current = msg.id;
  }
  
  
  
  function unselectAllMessages() {
    setSelectedMsgIds([]);
    clearSelection();
    // keep selectionMode ON, WhatsApp style
    // if you want it to exit selection mode, call clearSelection() instead
  }
  
  useEffect(() => {
    const local = getRecentEmojis();
    if (local.length) setRecentEmojis(local);
  }, []);

  useEffect(() => {
    if (!onSelectionChange) return;
  
    onSelectionChange({
      active: selectionMode && selectedCount > 0,
      count: selectedCount,
  
      exit: clearSelection,
      selectAll: selectAllMessages,
      unselectAll: unselectAllMessages,
  
      forward: () => setForwardSheet({ open: true, messages: selectedMessages }),
      share: async () => {
        await shareExternallyBulk(selectedMessages);
        clearSelection();
      },
      del: deleteSelectedForMe,
    });
  }, [
    onSelectionChange,
    selectionMode,
    selectedCount,
    selectedMessages,
  ]);
  
  useEffect(() => {
    if (!forwardSheet.open) return;
  
    (async () => {
      try {
        setForwardLoading(true);
  
        const res = await authFetch(`/communities/chat/forward-targets/`, {
          method: "GET",
          credentials: "include",
        });
  
        const data = await res.json().catch(() => ({}));
  
        if (!res.ok) throw new Error(data?.error || "Failed to load targets");
  
        setForwardTargets(data.targets || []);
        setForwardSelectedId(null);
        setForwardSelectedIds([]);
        setForwardSearch("");
      } catch {
        setForwardTargets([]);
      } finally {
        setForwardLoading(false);
      }
    })();
  }, [forwardSheet.open]);
  
  useEffect(() => {
    if (!infoModal.open || !infoModal.messageId) return;
  
    (async () => {
      setInfoModal((p) => ({ ...p, loading: true }));
  
      const res = await authFetch(`/communities/chat/messages/${infoModal.messageId}/info/`, {
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
  }, [infoModal.open, infoModal.messageId]);
  

  function closeMenu() {
    setMenu({ open: false, x: 0, y: 0, message: null });
    setReactionPicker({ open: false, message: null, x: 0, y: 0 });
    setEmojiMart({ open: false, message: null, x: 0, y: 0 });
    setDeleteSheet({ open: false, message: null }); // ✅ NEW
    setActiveMsgId(null);
  }
  

  async function deleteSelectedForMe() {
    const ids = [...selectedMsgIds];
    if (ids.length === 0) return;
  
    // ✅ optimistic remove
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
  
    // ✅ store locally
    ids.forEach((id) => markDeletedForMe(id));
  
    // ✅ call backend (one by one)
    await Promise.allSettled(
      ids.map((id) =>
        authFetch(`/communities/chat/messages/${id}/delete-for-me/`, {
          method: "POST",
          credentials: "include",
        })
      )
    );
  
    clearSelection();
  }


  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) {
      loadOlder();
      return;
    }
  
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  
    setHighlightMsgId(messageId);
    setTimeout(() => {
      setHighlightMsgId((prev) => (prev === messageId ? null : prev));
    }, 900);
  }
  

  function buildReplyPreview(target: Message) {
    return {
      id: target.id,
      senderName: target.isMine ? "You" : target.sender.name,
      text: target.deletedAt
        ? "🚫 This message was deleted"
        : target.text
        ? target.text
        : target.attachments?.length
        ? "[Media]"
        : "[Message]",
    };
  }
  
  
  
  
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

        const res = await authFetch(`/communities/chat/groups/${threadId}/messages/`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error();
        const data = await res.json();

        if (cancelled) return;

        setMessages(data.messages || []);
        setCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
        const deletedSet = getDeletedForMeSet();
        setMessages((data.messages || []).filter((m: Message) => !deletedSet.has(m.id)));

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
  }, [threadId]);

  /* ================= WS ================= */

  useEffect(() => {
    if (!threadId) return;

    const wsUrl = buildWsUrl(`/ws/chat/${threadId}/`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data: WSIncoming = JSON.parse(event.data);

        if (data.type === "ERROR") return;

        if (data.type === "message:new") {
          const msg = data.payload;

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

        if (data.type === "reaction:update") {
          const { messageId, emoji, action } = data.payload;

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;

              const reactions = m.reactions ? [...m.reactions] : [];
              const idx = reactions.findIndex((r) => r.emoji === emoji);

              if (idx === -1 && action === "added") {
                reactions.push({ emoji, count: 1 });
              } else if (idx !== -1) {
                const current = reactions[idx];
                const nextCount =
                  action === "added" ? current.count + 1 : current.count - 1;

                if (nextCount <= 0) reactions.splice(idx, 1);
                else reactions[idx] = { ...current, count: nextCount };
              }

              return { ...m, reactions };
            })
          );
          return;
        }

        if (data.type === "typing:update") {
          const { name, isTyping } = data.payload;

          setTypingUsers((prev) =>
            isTyping ? [...new Set([...prev, name])] : prev.filter((n) => n !== name)
          );
          return;
        }

        if (data.type === "message:delete") {
          const { messageId, deletedAt } = data.payload;
        
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
        

        if (data.type === "message:edit") {
          const edited = data.payload;
        
          setMessages((prev) =>
            prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
          );
        
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
  }, [threadId]);

  /* ================= LOAD OLDER ================= */

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

  
  
  async function shareExternally(msg: Message) {
    try {
      if (!navigator.share) return;
  
      // ✅ TEXT ONLY
      if (msg.text && !msg.attachments?.length) {
        await navigator.share({ text: msg.text });
        return;
      }
  
      // ✅ MEDIA MESSAGE
      if (msg.attachments?.length) {
        const first = msg.attachments[0];
  
        // Try share as FILE (best)
        if (navigator.canShare && first.url) {
          const resp = await fetch(first.url);
          const blob = await resp.blob();
  
          const file = new File(
            [blob],
            first.fileName || `attachment.${blob.type.split("/")[1] || "bin"}`,
            { type: blob.type || first.mimeType || "application/octet-stream" }
          );
  
          // ✅ If browser supports file sharing
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              text: msg.text || "",
              files: [file],
            });
            return;
          }
        }
  
        // Fallback: share URL only
        await navigator.share({
          text: msg.text || "",
          url: first.url,
        });
      }
    } catch (err) {
      console.log("Share failed:", err);
    }
  }
  
  async function forwardSelectedMessagesToHubs() {
    if (!forwardSheet.messages.length || forwardSelectedIds.length === 0) return;
  
    try {
      // send each message forward request (backend: 1 message -> many hubs)
      await Promise.allSettled(
        forwardSheet.messages.map((msg) =>
          authFetch(`/communities/chat/messages/${msg.id}/forward/`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetHubIds: forwardSelectedIds,
            }),
          })
        )
      );
  
      // ✅ close + reset
      setForwardSheet({ open: false, messages: [] });
      setForwardSelectedIds([]);
      setForwardSearch("");
    } catch (err) {
      console.error(err);
    }
  }
  
  async function loadOlder() {
    if (!hasMore || !cursor || loading) return;

    try {
      const res = await authFetch(
        `/communities/chat/groups/${threadId}/messages/?cursor=${encodeURIComponent(cursor)}`,
        { method: "GET", credentials: "include" }
      );

      if (!res.ok) return;
      const data = await res.json();

      setMessages((prev) => [...(data.messages || []), ...prev]);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {}
  }

  /* ================= UPLOAD ================= */

  async function uploadAttachmentsToBackend(files: File[]) {
    if (!files.length) return [];

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    const res = await authFetch(`/communities/chat/uploads/`, {
      method: "POST",
      body: form,
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Upload failed");

    return data.attachments || [];
  }

  /* ================= ACTIONS ================= */

  function openMenu(e: { clientX: number; clientY: number }, msg: Message) {
    // ✅ if already selecting, just toggle selection
    if (selectionMode) {
      toggleSelectMessage(msg.id);
      return;
    }
  
    // ✅ start multi-select mode and select this message
    setSelectionMode(true);
    setSelectedMsgIds([msg.id]);
  
    // ✅ close any context menu UI
    setMenu({ open: false, x: 0, y: 0, message: null });
    setReactionPicker({ open: false, message: null, x: 0, y: 0 });
    setEmojiMart({ open: false, message: null, x: 0, y: 0 });
    setDeleteSheet({ open: false, message: null });
    setActiveMsgId(null);
  }
  
  async function copyMessage(msg: Message) {
    try {
      await navigator.clipboard.writeText(msg.text || "");
    } catch {}
  }

  async function reactToMessage(msg: Message, emoji: string) {
    // ✅ save recent emojis like WhatsApp
    saveRecentEmoji(emoji);
    setRecentEmojis(getRecentEmojis());
  
    // ✅ optimistic update with "one reaction per message per user"
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
  
        // ✅ clicking same emoji again => remove reaction
        if (old === emoji) {
          dec(emoji);
          return { ...m, reactions, myReaction: null };
        }
  
        // ✅ switching emoji
        if (old) dec(old);
        inc(emoji);
  
        return { ...m, reactions, myReaction: emoji };
      })
    );
  
    try {
      await authFetch(`/communities/chat/messages/${msg.id}/reactions/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch {
      // optional rollback
    }
  }
  
  /* ================= SEND ================= */

  async function sendMessage() {
    const replyTarget = replyTo ? { ...replyTo } : null;

    if (editingMessageId) {
      const newText = input.trim();
      if (!newText) return;
    
      const msgId = editingMessageId;
    
      setEditingMessageId(null);
      setInput("");
    
      // optimistic edit
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: newText } : m))
      );
    
      const res = await authFetch(`/communities/chat/messages/${msgId}/edit/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText }),
      });
    
      if (!res.ok) {
        // optional reload or revert
      }
    
      return; // ✅ stop normal send
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
      replyTo: replyTo ? buildReplyPreview(replyTo) : null,
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

      const res = await authFetch(`/communities/chat/groups/${threadId}/messages/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientTempId,
          text: hasText ? text : "",
          messageType: hasFiles ? "MEDIA" : "TEXT",
          replyToId: replyTo?.id ?? null,
          attachments: uploadedAttachments,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");

      setMessages((prev) =>
        prev.map((m) => {
          if (m.clientTempId !== clientTempId) return m;
      
          return {
            ...data,
            isMine: true,
            status: "sent",
            replyTo: replyTo ? buildReplyPreview(replyTo) : null,
          };
        })
      );
      
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientTempId === clientTempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setSending(false);
    }
  }

  /* ================= TYPING ================= */

  const handleTyping = (value: string) => {
    setInput(value);

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

  /* ================= MENU CLOSE ON OUTSIDE CLICK ================= */

  function toggleForwardHub(hubId: string) {
    setForwardSelectedIds((prev) =>
      prev.includes(hubId) ? prev.filter((x) => x !== hubId) : [...prev, hubId]
    );
  }
  
  useEffect(() => {
    function onGlobal() {
      if (menu.open || reactionPicker.open || emojiMart.open) closeMenu();
    }
    window.addEventListener("click", onGlobal);
    return () => window.removeEventListener("click", onGlobal);
  }, [menu.open, reactionPicker.open, emojiMart.open]);
  
  /* ================= RENDER ================= */

  const canSend = useMemo(() => Boolean(input.trim()) || pickedFiles.length > 0, [input, pickedFiles]);

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        {selectionMode ? (
          <div className={styles.multiSelectHeader}>
            <button
              type="button"
              className={styles.multiSelectClose}
              onClick={clearSelection}
              title="Exit selection"
            >
              <FiX />
            </button>

            <span className={styles.multiSelectCount}>{selectedCount} selected</span>

            {/* ✅ Select All */}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={selectAllMessages}
              disabled={selectableMessageIds.length === 0 || selectedCount === selectableMessageIds.length}
              title="Select all"
            >
              <FiCheckSquare />
            </button>

            {/* ✅ Unselect All */}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={unselectAllMessages}
              disabled={selectedCount === 0}
              title="Unselect all"
            >
              <FiSquare />
            </button>

            <div className={styles.multiSelectActions}>
              {/* ✅ Forward */}
              <button
                type="button"
                className={styles.iconBtn}
                disabled={selectedMessages.length === 0}
                title="Forward"
                onClick={() => {
                  setForwardSheet({ open: true, messages: selectedMessages });
                }}
              >
                <FiSend />
              </button>

              {/* ✅ Share */}
              <button
                type="button"
                className={styles.iconBtn}
                disabled={selectedMessages.length === 0}
                title="Share"
                onClick={async () => {
                  await shareExternallyBulk(selectedMessages);
                  clearSelection();
                }}
              >
                📤
              </button>

              {/* ✅ Delete */}
              <button
                type="button"
                className={styles.iconBtn}
                disabled={selectedMessages.length === 0}
                title="Delete"
                onClick={deleteSelectedForMe}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ) : (
          <h3 className={styles.title}>Community Chat</h3>
        )}
      </header>


      <div
        className={styles.messages}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop === 0) loadOlder();
        }}
      >
        {loading ? (
          <div className={styles.center}>
            <FiLoader className={styles.spin} />
          </div>
        ) : error ? (
          <div className={styles.center}>{error}</div>
        ) : (
          messages.map((msg) => (
            
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`${styles.message} ${msg.isMine ? styles.mine : styles.theirs} ${
                selectionMode && isSelected(msg.id) ? styles.selectedMsg : ""
              } ${highlightMsgId === msg.id ? styles.highlightMsg : ""}`}

              onContextMenu={(e) => {
                e.preventDefault();
              
                // ✅ Desktop: right-click should enter selection mode (WhatsApp web style)
                if (!selectionMode) {
                  setSelectionMode(true);
                  setSelectedMsgIds([msg.id]);
                  lastSelectedMsgIdRef.current = msg.id;
                  closeMenu();
                  return;
                }
              
                toggleSelectMessage(msg.id);
                lastSelectedMsgIdRef.current = msg.id;
              }}
              onMouseEnter={() => setHoverMsgId(msg.id)}
              onMouseLeave={() => setHoverMsgId(null)}


              onClick={(e) => onMessageClick(e, msg)}

              
              
              onMouseDown={(e) => {
                if (selectionMode) return;
              
                dragStartX.current = e.clientX;
              
                if (holdTimer.current) clearTimeout(holdTimer.current);
                holdTimer.current = setTimeout(() => {
                  // long press -> selection mode
                  setSelectionMode(true);
                  setSelectedMsgIds([msg.id]);
                  lastSelectedMsgIdRef.current = msg.id;
                }, 350);
              }}
              onMouseMove={(e) => {
                if (selectionMode) return;
                if (dragStartX.current == null) return;
              
                const diff = e.clientX - dragStartX.current;
              
                // ✅ drag right to reply
                if (diff > 80) {
                  startReply(msg);
                  dragStartX.current = null;
                  if (holdTimer.current) clearTimeout(holdTimer.current);
                }
              }}
              onMouseUp={() => {
                dragStartX.current = null;
                if (holdTimer.current) clearTimeout(holdTimer.current);
              }}
              
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;

                if (holdTimer.current) clearTimeout(holdTimer.current);
                holdTimer.current = setTimeout(() => {
                  openMenu(
                    {
                      clientX: window.innerWidth / 2,
                      clientY: window.innerHeight / 2,
                    },
                    msg
                  );
                }, 450);
              }}
              onTouchMove={(e) => {
                const startX = touchStartX.current;
                if (startX == null) return;

                const nowX = e.touches[0].clientX;
                const diff = nowX - startX;

                // swipe right to reply
                if (diff > 60) {
                  startReply(msg);
                  touchStartX.current = null;
                  if (holdTimer.current) clearTimeout(holdTimer.current);
                }
              }}
              onTouchEnd={() => {
                touchStartX.current = null;
                if (holdTimer.current) clearTimeout(holdTimer.current);
              }}
            >
              {selectionMode && isSelected(msg.id) && (
                <div className={styles.selectedOverlay}>
                  <FiCheck className={styles.selectedCheckIcon} />
                </div>
              )}

              {!msg.isMine && <span className={styles.sender}>{msg.sender.name}</span>}

              {/* Reply preview */}
              {msg.replyTo?.id ? (
                  <button
                    type="button"
                    className={styles.replyPreviewBubble}
                    onClick={(e) => {
                      e.stopPropagation();         // ✅ don't trigger message click
                      e.preventDefault();          // ✅ prevent weird longpress behaviors
                      scrollToMessage(msg.replyTo!.id);
                    }}
                    title="Jump to replied message"
                  >
                    <span className={styles.replySender}>
                      {msg.replyTo.senderName || "Reply"}
                    </span>

                    <span className={styles.replyText}>
                      {msg.replyTo.text || "[media]"}
                    </span>
                  </button>
                ) : null}

              {/* Content */}
              {msg.messageType === "SYSTEM" ? (
                <p className={styles.systemText}>{msg.text}</p>
              ) : (
                <>
                  {msg.deletedAt ? (
                    <p className={styles.deletedText}>🚫 This message was deleted</p>
                  ) : msg.text ? (
                    <p>{msg.text}</p>
                  ) : null}


                {!msg.deletedAt && isMediaMessage(msg) ? (
                    <div className={styles.attachments}>
                      {msg.attachments?.map((a) => {
                        if (a.type === "IMAGE") {
                          return <img key={a.id} src={a.url} className={styles.image} alt="" />;
                        }
                        if (a.type === "VIDEO") {
                          return <video key={a.id} className={styles.video} controls src={a.url} />;
                        }
                        if (a.type === "AUDIO") {
                          return <audio key={a.id} className={styles.audio} controls src={a.url} />;
                        }
                        return (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className={styles.file}>
                            {a.fileName || "Download file"}
                          </a>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Reactions row */}
                  {msg.reactions && msg.reactions.length > 0 && (
                        <div className={styles.reactionsRow}>
                          {msg.reactions.map((r) => {
                            const isMine = msg.myReaction === r.emoji;

                            return (
                              <button
                                key={r.emoji}
                                type="button"
                                className={`${styles.reactionChip} ${isMine ? styles.reactionChipMine : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  reactToMessage(msg, r.emoji); // ✅ toggles if same, switches if different
                                }}
                              >
                                <span className={styles.reactionEmoji}>{r.emoji}</span>
                                <span className={styles.reactionCount}>{r.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                </>
              )}

              {!selectionMode && !msg.deletedAt && hoverMsgId === msg.id && (
                <div className={styles.msgHoverActions}>
                  <button
                      type="button"
                      className={styles.msgHoverBtn}
                      title="Reply"
                      onClick={(e) => {
                        e.stopPropagation();
                        startReply(msg);
                      }}
                    >
                      <FiCornerUpLeft />
                    </button>





                  <button
                    type="button"
                    className={styles.msgHoverBtn}
                    title="React"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReactionPicker({
                        open: true,
                        message: msg,
                        x: e.clientX,
                        y: Math.max(12, e.clientY - 70),
                      });
                    }}
                  >
                    <FiSmile />
                  </button>

                  <button
                    type="button"
                    className={styles.msgHoverBtn}
                    title="More"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMenu({ clientX: e.clientX, clientY: e.clientY }, msg);
                    }}
                  >
                    ⋮
                  </button>
                </div>
              )}


              <div className={styles.metaRow}>
                <span className={styles.time}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {!msg.deletedAt && msg.editedAt ? <span className={styles.editedTag}> • Edited</span> : null}
                </span>

                {msg.status === "failed" && <FiAlertCircle className={styles.failed} />}
                {msg.status === "sending" && <span className={styles.sending}>Sending…</span>}
              </div>
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 && <div className={styles.typing}>{typingUsers.join(", ")} typing…</div>}

      {/* Reply bar */}
    {replyTo && (
      <div className={styles.replyBar}>
        <button
          type="button"
          className={styles.replyBarText}
          onClick={() => scrollToMessage(replyTo.id)}
          title="Jump to message"
        >
          <div className={styles.replyTitle}>
            Replying to{" "}
            <strong>{replyTo.isMine ? "You" : replyTo.sender.name}</strong>
          </div>

          <div className={styles.replyBarPreview}>
            {replyTo.deletedAt
              ? "🚫 This message was deleted"
              : replyTo.text
              ? replyTo.text
              : replyTo.attachments?.length
              ? "[Media]"
              : "[Message]"}
          </div>
        </button>

        <button
          type="button"
          className={styles.replyClose}
          onClick={() => {
            setReplyTo(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          title="Cancel reply"
        >
          <FiX />
        </button>
      </div>
    )}

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onSend={(files) => {
          setPickedFiles((prev) => [...prev, ...files]);

          // scroll + focus input after capture
          setTimeout(() => {
            inputBarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            inputRef.current?.focus();
          }, 50);
        }}
      />

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
  onOpenCamera={() => {
    setCameraOpen(true)
  }}
  onSendVoice={() => {
    console.log("start voice recording...");
    // later: open voice recorder modal
  }}
/>


      {menu.open && menu.message && (
        <div
          className={styles.contextMenu}
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.menuItem}
            onClick={() => {
              setReplyTo(menu.message);
              closeMenu();
            }}
          >
            <FiCornerUpLeft /> Reply
          </button>

          <button
            className={styles.menuItem}
            onClick={() => {
              setInfoModal({ open: true, messageId: menu.message!.id });
              closeMenu();
            }}
          >
            ℹ️ Message info
          </button>


          <button
            className={styles.menuItem}
            onClick={() => {
              copyMessage(menu.message!);
              closeMenu();
            }}
          >
            <FiCopy /> Copy
          </button>

          <button
            className={styles.menuItem}
            onClick={() => {
              setForwardSheet({ open: true, messages: [menu.message!] });
              closeMenu();
            }}
          >
            📤 Forward
          </button>


          <button
            className={styles.menuItem}
            onClick={(e) => {
              setReactionPicker({
                open: true,
                message: menu.message,
                x: menu.x,
                y: Math.max(12, menu.y - 70)
              });
              e.stopPropagation();
            }}
          >
            <FiSmile /> React
          </button>
          {menu.message && canEdit(menu.message) && (              <button
                className={styles.menuItem}
                onClick={() => {
                  setInput(menu.message?.text || "");
                  closeMenu();

                  // store edit mode (below)
                  setEditingMessageId(menu.message!.id);
                }}
              >
                ✏️ Edit
              </button>
              
            )}
          {menu.message && (
            <button
              className={`${styles.menuItem} ${styles.danger}`}
              onClick={() => {
                setDeleteSheet({ open: true, message: menu.message });
              }}
            >
              <FiTrash2 /> Delete
            </button>
          )}


        </div>
      )}
      
      {reactionPicker.open && reactionPicker.message && (
        <div
          className={styles.reactionQuickRow}
          style={{ left: reactionPicker.x, top: reactionPicker.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {recentEmojis.map((emoji) => (
            <button
              key={emoji}
              className={`${styles.emojiBtn} ${
                reactionPicker.message?.myReaction === emoji ? styles.emojiActive : ""
              }`}
              onClick={() => {
                reactToMessage(reactionPicker.message!, emoji);
                closeMenu();
              }}
            >
              {emoji}
            </button>
          ))}

          <button
            className={styles.emojiPlus}
            onClick={() => {
              setEmojiMart({
                open: true,
                message: reactionPicker.message,
                x: reactionPicker.x,
                y: reactionPicker.y + 46,
              });
            
              setReactionPicker((p) => ({ ...p, open: false }));
            }}      
          >
            +
          </button>
        </div>
      )}

      {emojiMart.open && emojiMart.message && (
        <div
          className={styles.emojiMartPopup}
          style={{ left: emojiMart.x, top: emojiMart.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <Picker
            data={data}
            theme="dark"
            previewPosition="none"
            onEmojiSelect={(emoji: any) => {
              const chosen = emoji?.native;
              if (!chosen) return;

              reactToMessage(emojiMart.message!, chosen);
              closeMenu();
            }}
          />
        </div>
      )}

      {infoModal.open && (
        <div className={styles.infoOverlay} onClick={() => setInfoModal({ open: false, messageId: null })}>
          <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
            <h3>Message Info</h3>

            {infoModal.loading ? (
              <p>Loading...</p>
            ) : !infoModal.data ? (
              <p>Unable to load info</p>
            ) : (
              <>
                <div className={styles.infoBlock}>
                  <h4>Read</h4>
                  {infoModal.data.read.length ? (
                    infoModal.data.read.map((x: any) => (
                      <div key={x.user.id} className={styles.infoRow}>
                        <span>{x.user.name}</span>
                        <span>{new Date(x.readAt).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p>None</p>
                  )}
                </div>

                <div className={styles.infoBlock}>
                  <h4>Delivered</h4>
                  {infoModal.data.delivered.length ? (
                    infoModal.data.delivered.map((x: any) => (
                      <div key={x.user.id} className={styles.infoRow}>
                        <span>{x.user.name}</span>
                        <span>{new Date(x.deliveredAt).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p>None</p>
                  )}
                </div>

                <div className={styles.infoBlock}>
                  <h4>Reactions</h4>
                  {infoModal.data.reactions.length ? (
                    infoModal.data.reactions.map((x: any, i: number) => (
                      <div key={i} className={styles.infoRow}>
                        <span>
                          {x.emoji} {x.user.name}
                        </span>
                        <span>{new Date(x.createdAt).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p>None</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {deleteSheet.open && deleteSheet.message && (
        <div
          className={styles.deleteOverlay}
          onClick={() => setDeleteSheet({ open: false, message: null })}
        >
          <div
            className={styles.deleteSheet}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className={styles.deleteTitle}>Delete message?</h4>

            <button
              className={styles.deleteBtn}
              onClick={async () => {
                const msg = deleteSheet.message!;
                closeMenu();

                // ✅ optimistic local hide
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));

                await authFetch(`/communities/chat/messages/${msg.id}/delete-for-me/`, {
                  method: "POST",
                  credentials: "include",
                });
                markDeletedForMe(msg.id);
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));

              }}
            >
              Delete for me
            </button>
            {canDeleteForEveryone(deleteSheet.message) && (
              <button
                className={`${styles.deleteBtn} ${styles.deleteDanger}`}
                onClick={async () => {
                  const msg = deleteSheet.message!;
                  closeMenu();

                  // ✅ optimistic soft-delete UI for everyone
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === msg.id
                        ? {
                            ...m,
                            deletedAt: new Date().toISOString(),
                            text: "",
                            attachments: [],
                            reactions: [],
                            myReaction: null,
                          }
                        : m
                    )
                  );

                  await authFetch(`/communities/chat/messages/${msg.id}/`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                }}
              >
                Delete for everyone
              </button>
            )}
            <button
              className={styles.deleteCancel}
              onClick={() => setDeleteSheet({ open: false, message: null })}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

{forwardSheet.open && forwardSheet.messages.length > 0 && (
      <div
        className={styles.forwardOverlay}
        onClick={() => setForwardSheet({ open: false, messages: [] })}
      >
        <div
          className={styles.forwardSheet}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.forwardHeader}>
            <h4 className={styles.forwardTitle}>Forward message</h4>

            <button
              className={styles.forwardClose}
              onClick={() => setForwardSheet({ open: false, messages: [] })}

            >
              <FiX />
            </button>
          </div>

          {/* Message preview */}
          <div className={styles.forwardPreviewBubble}>
              {forwardSheet.messages.slice(0, 2).map((m) => (
                <div key={m.id} className={styles.forwardMiniPreview}>
                  {m.deletedAt ? "🚫 Deleted message" : m.text ? m.text : "[Media]"}
                </div>
              ))}

              {forwardSheet.messages.length > 2 ? (
                <div className={styles.forwardMiniMore}>
                  +{forwardSheet.messages.length - 2} more
                </div>
              ) : null}
            </div>


          {/* Search */}
          <div className={styles.forwardSearchRow}>
            <input
              className={styles.forwardSearch}
              value={forwardSearch}
              onChange={(e) => setForwardSearch(e.target.value)}
              placeholder="Search hubs..."
            />
          </div>

          {/* Targets */}
          <div className={styles.forwardList}>
            {forwardLoading ? (
              <div className={styles.forwardLoading}>Loading hubs…</div>
            ) : filteredForwardTargets.length === 0 ? (
              <div className={styles.forwardEmpty}>No hubs found</div>
            ) : (
              filteredForwardTargets.map((hub) => {
                if (hub.id === threadId) return null;

                return (
                <button
                      key={hub.id}
                      className={`${styles.forwardRow} ${
                        forwardSelectedIds.includes(hub.id) ? styles.forwardRowActive : ""
                      }`}
                      onClick={() => toggleForwardHub(hub.id)}
                    >
                      <div className={styles.forwardAvatar}>
                        {hub.name?.slice(0, 1)?.toUpperCase()}
                      </div>

                      <div className={styles.forwardMeta}>
                        <div className={styles.forwardName}>{hub.name}</div>
                      </div>

                      <div className={styles.forwardCheckbox}>
                        <input
                          type="checkbox"
                          checked={forwardSelectedIds.includes(hub.id)}
                          readOnly
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleForwardHub(hub.id);
                            }}
                        />
                      </div>
                    </button>

              );
            })
          )}
          </div>

          {/* Actions */}
          <div className={styles.forwardActions}>
            <button
              className={styles.forwardCancel}
              onClick={() => setForwardSheet({ open: false, messages: [] })}

            >
              Cancel
            </button>

            <button
              className={styles.forwardSend}
              disabled={forwardSelectedIds.length === 0}
              onClick={forwardSelectedMessagesToHubs}
            >
              Forward to ({forwardSelectedIds.length})
            </button>

            <button
              className={styles.menuItem}
              onClick={async () => {
                await shareExternally(menu.message!);
                closeMenu();
              }}
            >
              📤 Share
            </button>
          </div>
        </div>
      </div>
    )}


    </div>
  );
}
