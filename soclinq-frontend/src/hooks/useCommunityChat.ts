"use client";

import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";

export interface ChatMessage {
  sender: string;
  text: string;
  ts: string;
}

export function useCommunityChat(groupId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socket = getSocket("demo-user-token");

  useEffect(() => {
    if (!groupId) return;

    const room = `community:${groupId}`;

    socket.emit("join_room", room);

    const onMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };

    socket.on("chat_message", onMessage);

    return () => {
      socket.emit("leave_room", room);
      socket.off("chat_message", onMessage);
    };
  }, [groupId, socket]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    socket.emit("chat_message", {
      room: `community:${groupId}`,
      text,
    });
  };

  const sendAnnouncement = (text: string) => {
    if (!text.trim()) return;
    socket.emit("announcement", {
      room: `community:${groupId}`,
      text,
    });
  };

  return {
    messages,
    sendMessage,
    sendAnnouncement,
  };
}
