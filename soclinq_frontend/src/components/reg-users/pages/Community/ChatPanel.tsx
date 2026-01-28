"use client";

import { useEffect, useRef, useState } from "react";
import { FiSend, FiLoader, FiAlertCircle } from "react-icons/fi";
import styles from "./styles/ChatPanel.module.css";
import { authFetch } from "@/lib/authFetch";
/* ================= TYPES ================= */

type Message = {
  id: string;
  tempId?: string;
  text: string;
  sender: {
    id: string;
    name: string;
    photo?: string | null;
  };
  createdAt: string;
  isMine: boolean;
  seenBy?: string[];
  status?: "sending" | "sent" | "failed";
};

type Presence = {
  online: boolean;
  lastSeen?: string;
};

type WSIncoming =
  | { type: "message:new"; payload: any }
  | { type: "message:delivered"; payload: { tempId?: string; messageId?: string } }
  | { type: "message:seen:update"; payload: { messageId: string; userId: string } }
  | { type: "typing:update"; payload: { user: { id: string; name: string }; isTyping: boolean } }
  | { type: "presence:update"; payload: { userId: string; online: boolean; lastSeen?: string } }
  | { type: "ERROR"; message: string };

interface Props {
  groupId: string;
}

/* ================= HELPERS ================= */

function buildWsUrl(path: string) {
  const raw = process.env.NEXT_PUBLIC_WS_URL;

  // fallback: same host (works when frontend served behind same domain)
  if (!raw) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${path}`;
  }

  // if user set http(s), convert to ws(s)
  if (raw.startsWith("http://")) return raw.replace("http://", "ws://") + path;
  if (raw.startsWith("https://")) return raw.replace("https://", "wss://") + path;

  // already ws(s)
  return raw + path;
}

/* ================= COMPONENT ================= */

export default function ChatPanel({ groupId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [presence, setPresence] = useState<Record<string, Presence>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const retryQueue = useRef<Message[]>([]);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  /* ================= HELPERS ================= */

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  /* ================= LOAD INITIAL (REST) ================= */

  useEffect(() => {
    if (!groupId) return;

    let cancelled = false;

    async function loadInitial() {
      try {
        setLoading(true);
        setError(null);

        setMessages([]);
        setCursor(null);
        setHasMore(true);

        const res = await authFetch(`/communities/chat/groups/${groupId}/messages/`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        if (cancelled) return;

        setMessages(data.messages || []);
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
  }, [groupId]);

  /* ================= WEBSOCKET ================= */

  useEffect(() => {
    if (!groupId) return;

    const wsUrl = buildWsUrl(`/ws/chat/${groupId}/`);
    const ws = new WebSocket(wsUrl);

    wsRef.current = ws;

    ws.onopen = () => {
      // ✅ retry any failed messages when socket reconnects
      if (retryQueue.current.length) {
        retryQueue.current.forEach((msg) => {
          ws.send(
            JSON.stringify({
              type: "message:send",
              payload: { tempId: msg.tempId, text: msg.text },
            })
          );
        });
        retryQueue.current = [];
      }
    };

    ws.onmessage = (event) => {
      try {
        const data: WSIncoming = JSON.parse(event.data);

        // ✅ server error
        if (data.type === "ERROR") {
          console.warn("WS ERROR:", data.message);
          return;
        }

        if (data.type === "message:new") {
          const msg = data.payload;

          setMessages((prev) => [
            ...prev,
            {
              ...msg,
              isMine: false,
              status: "sent",
            },
          ]);

          scrollToBottom();
          return;
        }

        if (data.type === "message:delivered") {
          const { tempId, messageId } = data.payload || {};

          if (!tempId) return;

          setMessages((prev) =>
            prev.map((m) =>
              m.tempId === tempId
                ? {
                    ...m,
                    id: messageId || m.id,
                    status: "sent",
                  }
                : m
            )
          );

          return;
        }

        if (data.type === "message:seen:update") {
          const { messageId, userId } = data.payload;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    seenBy: [...new Set([...(m.seenBy || []), userId])],
                  }
                : m
            )
          );

          return;
        }

        if (data.type === "typing:update") {
          const { user, isTyping } = data.payload;

          setTypingUsers((prev) =>
            isTyping
              ? [...new Set([...prev, user.name])]
              : prev.filter((u) => u !== user.name)
          );

          return;
        }

        if (data.type === "presence:update") {
          const { userId, online, lastSeen } = data.payload;

          setPresence((prev) => ({
            ...prev,
            [userId]: { online, lastSeen },
          }));

          return;
        }
      } catch (err) {
        console.error("Invalid WS message:", err);
      }
    };

    ws.onerror = () => {
      // You can show an indicator if needed
      console.warn("WebSocket error");
    };

    ws.onclose = () => {
      // optional: show connection state
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [groupId]);

  /* ================= LOAD OLDER ================= */

  async function loadOlder() {
    if (!hasMore || !cursor) return;

    try {
      const res = await fetch(
        `/chat/groups/${groupId}/messages/?cursor=${cursor}`,
        { credentials: "include" }
      );

      if (!res.ok) return;

      const data = await res.json();

      setMessages((prev) => [...(data.messages || []), ...prev]);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {}
  }

  /* ================= SEND MESSAGE ================= */

  async function sendMessage() {
    if (!input.trim()) return;
  
    const tempId = `tmp-${Date.now()}`;
    const text = input.trim();
  
    const optimistic: Message = {
      id: tempId,
      tempId,
      text,
      sender: { id: "me", name: "You" },
      createdAt: new Date().toISOString(),
      isMine: true,
      status: "sending",
    };
  
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    scrollToBottom();
  
    try {
      setSending(true);
  
      // ✅ 1) Send socket ACK (instant UI)
      wsRef.current?.send(
        JSON.stringify({
          type: "message:send",
          payload: { tempId, text },
        })
      );
  
      // ✅ 2) Persist via REST (returns DB message ID)
      const res = await fetch(`/chat/groups/${groupId}/messages/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tempId }),
      });
  
      const data = await res.json().catch(() => ({}));
  
      if (!res.ok) throw new Error(data?.error || "Failed");
  
      // ✅ Replace optimistic temp with DB message id
      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === tempId
            ? {
                ...m,
                id: data.id,
                status: "sent",
                createdAt: data.createdAt,
              }
            : m
        )
      );
    } catch {
      retryQueue.current.push(optimistic);
  
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setSending(false);
    }
  }
  

  /* ================= TYPING ================= */

  const handleTyping = (value: string) => {
    setInput(value);

    try {
      wsRef.current?.send(
        JSON.stringify({
          type: "typing:start",
          payload: {},
        })
      );
    } catch {}

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      try {
        wsRef.current?.send(
          JSON.stringify({
            type: "typing:stop",
            payload: {},
          })
        );
      } catch {}
    }, 800);
  };

  /* ================= SEEN ================= */

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.isMine) return;

    try {
      wsRef.current?.send(
        JSON.stringify({
          type: "message:seen",
          payload: {
            messageId: last.id,
          },
        })
      );
    } catch {}
  }, [messages]);

  /* ================= RENDER ================= */

  return (
    <div className={styles.chat}>
      <header className={styles.header}>
        <h3 className={styles.title}>Community Chat</h3>
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
              className={`${styles.message} ${
                msg.isMine ? styles.mine : styles.theirs
              }`}
            >
              {!msg.isMine && (
                <span className={styles.sender}>{msg.sender.name}</span>
              )}

              <p>{msg.text}</p>

              <span className={styles.time}>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

              {msg.status === "failed" && (
                <FiAlertCircle
                  className={styles.failed}
                  title="Will retry when online"
                />
              )}

              {msg.isMine && msg.seenBy?.length ? (
                <span className={styles.seen}>Seen</span>
              ) : null}
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className={styles.typing}>
          {typingUsers.join(", ")} typing…
        </div>
      )}

      <footer className={styles.inputBar}>
        <input
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message"
        />

        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          title={sending ? "Sending..." : "Send"}
        >
          <FiSend />
        </button>
      </footer>
    </div>
  );
}
