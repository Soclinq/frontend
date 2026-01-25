"use client";

import { useRef, useState } from "react";

export function useLiveAudio(onChunk?: (blob: Blob) => void) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  const start = async () => {
    // Clean any old session
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
        onChunk?.(e.data);
      }
    };

    recorder.start(400); // ✅ smaller chunk interval (more reliable)
    recorderRef.current = recorder;
    setRecording(true);
  };

  const stop = async (): Promise<File> => {
    const recorder = recorderRef.current;
    const stream = streamRef.current;

    if (!recorder || !stream) {
      throw new Error("Recorder not started");
    }

    return new Promise(resolve => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });

        // ✅ stop mic
        stream.getTracks().forEach(t => t.stop());

        // cleanup
        recorderRef.current = null;
        streamRef.current = null;
        setRecording(false);

        resolve(
          new File([blob], `audio-${Date.now()}.webm`, {
            type: blob.type || "audio/webm",
          })
        );
      };

      recorder.stop();
    });
  };

  const forceStop = () => {
    try {
      recorderRef.current?.stop();
    } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());

    recorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setRecording(false);
  };

  return { start, stop, forceStop, recording, streamRef };
}
