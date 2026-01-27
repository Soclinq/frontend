"use client";

import { useEffect, useRef } from "react";

type StreamEvent =
  | { type: "STREAM_STARTED" }
  | { type: "STREAM_ENDED" }
  | { type: "SEVERITY_UPDATE" }
  | { type: "RECORDING_READY" };

export function useRealtimeStreams(
  token: string | null,
  onUpdate: () => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/ws/responders/?token=${token}`
    );

    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);

        switch (data.type) {
          case "STREAM_STARTED":
          case "STREAM_ENDED":
          case "SEVERITY_UPDATE":
          case "RECORDING_READY":
            onUpdate();
            break;
          default:
            break;
        }
      } catch {
        // ignore malformed payloads
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [token, onUpdate]);
}
