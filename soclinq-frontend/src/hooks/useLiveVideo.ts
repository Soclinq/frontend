"use client";

import { useRef, useState } from "react";

export function useLiveVideo(onChunk?: (blob: Blob) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [previewing, setPreviewing] = useState(false);
  const [recording, setRecording] = useState(false);

  // ✅ 1) Start camera preview only
  const startPreview = async () => {
    if (streamRef.current) {
      setPreviewing(true);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true,
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }

    setPreviewing(true);
  };

  // ✅ 2) Start recording (camera must already be running)
  const startRecording = async () => {
    if (!streamRef.current) {
      await startPreview();
    }

    const stream = streamRef.current!;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
        onChunk?.(e.data);
      }
    };

    recorder.start(400);
    recorderRef.current = recorder;

    setRecording(true);
  };

  // ✅ 3) Stop recording (DO NOT force stop preview unless you want camera off)
  const stopRecording = async (): Promise<File> => {
    const recorder = recorderRef.current;
    const stream = streamRef.current;

    if (!recorder || !stream) {
      throw new Error("Nothing recording.");
    }

    return new Promise(resolve => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });

        // ✅ stop all tracks (camera OFF)
        stream.getTracks().forEach(t => t.stop());

        // ✅ detach preview
        if (videoRef.current) videoRef.current.srcObject = null;

        // cleanup
        recorderRef.current = null;
        streamRef.current = null;
        chunksRef.current = [];

        setRecording(false);
        setPreviewing(false);

        resolve(
          new File([blob], `video-${Date.now()}.webm`, {
            type: blob.type || "video/webm",
          })
        );
      };

      recorder.stop();
    });
  };

  // ✅ Stop preview without recording
  const stopPreview = async () => {
    // 🔒 if recording, stop recording first (safe)
    if (recording) {
      try {
        await stopRecording();
      } catch {}
      return;
    }

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setPreviewing(false);
    setRecording(false);
  };

  // ✅ helper: stop everything (ActiveSosPanel likes this)
  const stop = async () => {
    if (recording) {
      try {
        await stopRecording();
      } catch {}
      return;
    }

    await stopPreview();
  };

  // ✅ helper: toggle tracks easily (audio/video cancel buttons)
  const setTrackEnabled = (opts: { audio?: boolean; video?: boolean }) => {
    const stream = streamRef.current;
    if (!stream) return;
  
    if (opts.audio !== undefined) {
      const audioEnabled = !!opts.audio; // ✅ always boolean
      stream.getAudioTracks().forEach(t => {
        t.enabled = audioEnabled;
      });
    }
  
    if (opts.video !== undefined) {
      const videoEnabled = !!opts.video; // ✅ always boolean
      stream.getVideoTracks().forEach(t => {
        t.enabled = videoEnabled;
      });
    }
  };
  
  return {
    videoRef,
    streamRef,

    startPreview,
    stopPreview,

    startRecording,
    stopRecording,

    stop,

    setTrackEnabled,

    previewing,
    recording,
  };
}
