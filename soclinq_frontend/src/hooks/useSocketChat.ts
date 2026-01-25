"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useSocketChat(
  onMessage: (msg: any) => void
) {
  useEffect(() => {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      withCredentials: true,
    });

    socket.on("new_message", onMessage);

    return () => {
      socket?.disconnect();
    };
  }, []);

  return {
    sendMessage: (payload: any) =>
      socket?.emit("send_message", payload),
  };
}
