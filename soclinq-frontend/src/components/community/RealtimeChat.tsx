"use client";

import { useState } from "react";
import { useCommunityChat } from "../../hooks/useCommunityChat";

export default function RealtimeChat({ groupId }: { groupId: string }) {
  const { messages, sendMessage } = useCommunityChat(groupId);
  const [text, setText] = useState("");

  return (
    <div>
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i}>
            <strong>{m.sender}</strong>: {m.text}
            <div style={{ fontSize: 11 }}>{new Date(m.ts).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message"
          style={{ flex: 1 }}
        />
        <button
          onClick={() => {
            sendMessage(text);
            setText("");
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
