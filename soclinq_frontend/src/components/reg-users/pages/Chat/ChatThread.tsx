"use client";

import React from "react";
import { ChatThreadProps } from "@/types/chatThreadProps";

export default function ChatThread({ threadId, adapter }: ChatThreadProps) {
  return (
    <div>
      <h2>Thread: {threadId}</h2>
      <p>Mode: {adapter.mode}</p>
    </div>
  );
}
