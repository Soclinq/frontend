"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WsEvent = {
  type: string;
  payload?: any;
};



type ConnectionState =
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "UNSTABLE"
  | "DISCONNECTED";

type PendingItem = {
  id: string; // client id for tracking
  event: WsEvent;
  tries: number;
  createdAt: number;
  lastTryAt?: number;
};

type Options = {
  wsUrl: string; // wss://.../ws/chat/<group_id>/
  onEvent?: (evt: WsEvent) => void;

  /** Heartbeat */
  heartbeatMs?: number; // ping interval
  serverTimeoutMs?: number; // if no activity, mark unstable

  /** Reconnect */
  reconnectMinMs?: number;
  reconnectMaxMs?: number;

  /** Offline queue */
  maxQueue?: number;

  /** Debug */
  debug?: boolean;
};

function now() {
  return Date.now();
}

function makeId(prefix = "evt") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function jitter(ms: number) {
  // +- 20% jitter
  const j = ms * 0.2;
  return ms + (Math.random() * 2 - 1) * j;
}

export function useWebSocketChat({
  wsUrl,
  onEvent,

  heartbeatMs = 15000,
  serverTimeoutMs = 30000,

  reconnectMinMs = 800,
  reconnectMaxMs = 12000,

  maxQueue = 60,
  debug = false,
}: Options) {
  const wsRef = useRef<WebSocket | null>(null);

  const heartbeatTimer = useRef<any>(null);
  const watchdogTimer = useRef<any>(null);
  const reconnectTimer = useRef<any>(null);

  const reconnectTries = useRef(0);

  const lastServerActivityAt = useRef<number>(0);

  const pendingQueue = useRef<PendingItem[]>([]);
  const awaitingAck = useRef<Map<string, PendingItem>>(new Map());

  const [state, setState] = useState<ConnectionState>("CONNECTING");

  const connected = state === "CONNECTED";
  const unstable = state === "UNSTABLE";

  const log = useCallback(
    (...args: any[]) => {
      if (!debug) return;
      console.log("[useWebSocketChat]", ...args);
    },
    [debug]
  );

  const cleanupTimers = useCallback(() => {
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    if (watchdogTimer.current) clearInterval(watchdogTimer.current);
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

    heartbeatTimer.current = null;
    watchdogTimer.current = null;
    reconnectTimer.current = null;
  }, []);

  const safeClose = useCallback(() => {
    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;
  }, []);

  const scheduleReconnect = useCallback(() => {
    cleanupTimers();

    reconnectTries.current += 1;
    setState((prev) => (prev === "CONNECTED" ? "RECONNECTING" : "RECONNECTING"));

    const base = reconnectMinMs * Math.pow(1.6, reconnectTries.current - 1);
    const delay = clamp(jitter(base), reconnectMinMs, reconnectMaxMs);

    log("Reconnecting in", Math.round(delay), "ms");

    reconnectTimer.current = setTimeout(() => {
      connect();
    }, delay);
  }, [cleanupTimers, log, reconnectMaxMs, reconnectMinMs]);

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // send queued events in order
    while (pendingQueue.current.length > 0) {
      const item = pendingQueue.current.shift()!;
      const outgoing = {
        ...item.event,
        payload: {
          ...(item.event.payload || {}),
          clientId: item.id, // ✅ important: track message like WhatsApp tempId
        },
      };

      try {
        ws.send(JSON.stringify(outgoing));
        item.lastTryAt = now();
        item.tries += 1;

        // ✅ we keep it for ACK tracking if it is message:send
        // (you can add ack support for other event types too)
        if (outgoing.type === "message:send") {
          awaitingAck.current.set(item.id, item);
        }
      } catch (e) {
        // put it back to queue if send fails
        pendingQueue.current.unshift(item);
        break;
      }
    }
  }, []);

  const sendRaw = useCallback(
    (evt: WsEvent, options?: { requireAck?: boolean }) => {
      const ws = wsRef.current;

      const clientId = (evt.payload?.clientId as string) || makeId("client");

      const outgoing: WsEvent = {
        type: evt.type,
        payload: {
          ...(evt.payload || {}),
          clientId,
        },
      };

      // ✅ If offline, queue it
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // keep queue size reasonable
        if (pendingQueue.current.length >= maxQueue) {
          pendingQueue.current.shift();
        }

        pendingQueue.current.push({
          id: clientId,
          event: outgoing,
          tries: 0,
          createdAt: now(),
        });

        log("Queued event (offline):", outgoing.type);
        return clientId;
      }

      // ✅ Send immediately if online
      try {
        ws.send(JSON.stringify(outgoing));
        log("Sent event:", outgoing.type);

        if (options?.requireAck || outgoing.type === "message:send") {
          awaitingAck.current.set(clientId, {
            id: clientId,
            event: outgoing,
            tries: 1,
            createdAt: now(),
            lastTryAt: now(),
          });
        }
      } catch {
        // fallback: queue it
        if (pendingQueue.current.length >= maxQueue) {
          pendingQueue.current.shift();
        }

        pendingQueue.current.push({
          id: clientId,
          event: outgoing,
          tries: 0,
          createdAt: now(),
        });
      }

      return clientId;
    },
    [log, maxQueue]
  );

  const heartbeatPing = useCallback(() => {
    // ✅ lightweight ping event (your backend can ignore or reply)
    sendRaw({ type: "ping", payload: {} }, { requireAck: false });
  }, [sendRaw]);

  const startTimers = useCallback(() => {
    cleanupTimers();

    lastServerActivityAt.current = now();

    // ✅ Heartbeat (keeps NAT alive & detects dead link)
    heartbeatTimer.current = setInterval(() => {
      heartbeatPing();
    }, heartbeatMs);

    // ✅ Watchdog: if no server activity, mark unstable
    watchdogTimer.current = setInterval(() => {
      const silentFor = now() - lastServerActivityAt.current;

      if (state === "CONNECTED" && silentFor > serverTimeoutMs) {
        setState("UNSTABLE");
        log("Connection unstable, silent for", silentFor, "ms");
      }

      if ((state === "UNSTABLE" || state === "CONNECTED") && silentFor > serverTimeoutMs * 2) {
        log("Connection seems dead, forcing reconnect...");
        safeClose();
        scheduleReconnect();
      }
    }, 1000);
  }, [
    cleanupTimers,
    heartbeatMs,
    heartbeatPing,
    log,
    safeClose,
    scheduleReconnect,
    serverTimeoutMs,
    state,
  ]);

  const connect = useCallback(() => {
    if (!wsUrl) return;

    // cleanup previous
    cleanupTimers();
    safeClose();

    setState((prev) => (prev === "CONNECTED" ? "RECONNECTING" : "CONNECTING"));

    log("Connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectTries.current = 0;
      setState("CONNECTED");
      lastServerActivityAt.current = now();

      log("Connected ✅");

      startTimers();
      flushQueue();

      // ✅ optional "hello" event (useful for SOS apps / identity)
      sendRaw({ type: "client:hello", payload: { ts: new Date().toISOString() } });
    };

    ws.onerror = () => {
      log("WS error ❌");
      setState("DISCONNECTED");
      safeClose();
      scheduleReconnect();
    };

    ws.onclose = () => {
      log("WS closed ❌");
      setState("DISCONNECTED");
      safeClose();
      scheduleReconnect();
    };

    ws.onmessage = (e) => {
      lastServerActivityAt.current = now();

      try {
        const data: WsEvent = JSON.parse(e.data);

        // ✅ handle ACK (WhatsApp-like delivery confirmation)
        // Your backend should send something like:
        // { type: "message:delivered", payload: { clientId, messageId } }
        if (data.type === "message:delivered") {
          const clientId = data.payload?.clientId || data.payload?.tempId;
          if (clientId && awaitingAck.current.has(clientId)) {
            awaitingAck.current.delete(clientId);
          }
        }

        // ✅ pong support (optional)
        if (data.type === "pong") {
          return;
        }

        // forward to app
        onEvent?.(data);
      } catch {
        // ignore
      }
    };
  }, [cleanupTimers, flushQueue, log, onEvent, safeClose, scheduleReconnect, sendRaw, startTimers, wsUrl]);

  useEffect(() => {
    connect();

    const onOnline = () => {
      log("Browser online ✅");
      if (state === "DISCONNECTED") connect();
      flushQueue();
    };

    const onOffline = () => {
      log("Browser offline ❌");
      setState("DISCONNECTED");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      cleanupTimers();
      safeClose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  /* ===========================================
     WhatsApp/Telegram-like helper methods
  =========================================== */

  // ✅ typing: has debounce built in (avoid spamming server)
  const typingTimer = useRef<any>(null);
  const typingStarted = useRef(false);

  const typing = useCallback(() => {
    if (!typingStarted.current) {
      sendRaw({ type: "typing:start", payload: {} });
      typingStarted.current = true;
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(() => {
      sendRaw({ type: "typing:stop", payload: {} });
      typingStarted.current = false;
    }, 800);
  }, [sendRaw]);

  const typingStop = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    sendRaw({ type: "typing:stop", payload: {} });
    typingStarted.current = false;
  }, [sendRaw]);

  const sendMessage = useCallback(
    (payload: any) => {
      // ✅ payload should include text, tempId/clientId, etc.
      return sendRaw({ type: "message:send", payload }, { requireAck: true });
    },
    [sendRaw]
  );

  const seenMessage = useCallback(
    (messageId: string) => {
      sendRaw({ type: "message:seen", payload: { messageId } });
    },
    [sendRaw]
  );

  const requestPresenceSync = useCallback(() => {
    // ✅ optional: ask server for fresh presence list
    sendRaw({ type: "presence:sync", payload: {} });
  }, [sendRaw]);

  const disconnect = useCallback(() => {
    cleanupTimers();
    safeClose();
    setState("DISCONNECTED");
  }, [cleanupTimers, safeClose]);

  const queueSize = pendingQueue.current.length;
  const awaitingAckCount = awaitingAck.current.size;

  return {
    /* state */
    connected,
    state,
    unstable,

    /* send */
    sendRaw,
    sendMessage,

    /* read receipts + seen */
    seenMessage,

    /* typing */
    typing, // call this on every input change
    typingStop, // call on blur / send

    /* presence */
    requestPresenceSync,

    /* debug metrics */
    queueSize,
    awaitingAckCount,

    /* manual control */
    reconnect: connect,
    disconnect,
  };
}
