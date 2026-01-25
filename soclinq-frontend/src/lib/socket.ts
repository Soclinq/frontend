"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let hasLoggedError = false;

interface SocketAuth {
  token?: string;
}

/**
 * Get or create a singleton Socket.IO connection
 * Errors are handled gracefully without crashing the app
 */
export function getSocket(token?: string): Socket {
  if (socket) return socket;

  const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"], // fallback-safe
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: { token } as SocketAuth,
  });

  /* ================= LIFECYCLE ================= */

  socket.on("connect", () => {
    hasLoggedError = false; // reset error state
    console.log("🟢 Socket connected:", socket?.id);
  });

  socket.on("disconnect", reason => {
    console.warn("🔴 Socket disconnected:", reason);
  });

  socket.on("connect_error", err => {
    // 🛑 Log only once to avoid console spam
    if (!hasLoggedError) {
      hasLoggedError = true;

      console.warn(
        "⚠️ Socket unavailable (backend not ready or offline):",
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unknown socket error"
      );
    }
  });

  return socket;
}
