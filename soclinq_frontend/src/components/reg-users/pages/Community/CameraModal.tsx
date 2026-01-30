"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiX,
  FiRefreshCw,
  FiZap,
  FiZapOff,
  FiImage,
  FiTrash2,
  FiStopCircle,
  FiPlus,
  FiSmile,
  FiSend,
} from "react-icons/fi";
import styles from "./styles/CameraModal.module.css";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useNotify } from "@/components/utils/NotificationContext"; 

type Props = {
  open: boolean;
  onClose: () => void;
  onSend: (payload: { files: File[]; caption: string }) => void;
};

type PreviewItem = {
  id: string;
  type: "image" | "video";
  url: string;
  file: File;
};

type CaptureMode = "photo" | "video";

const MAX_ATTACHMENTS = 10; // ✅ change as you like
const MAX_VIDEO_SECONDS = 60 * 60; // ✅ 1 hour

function safeRevoke(url?: string) {
  try {
    if (url) URL.revokeObjectURL(url);
  } catch {}
}

function blobToFile(blob: Blob, name: string) {
  return new File([blob], name, { type: blob.type });
}

function getBestRecorderMimeType() {
  if (typeof window === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    // @ts-ignore
    if (window.MediaRecorder?.isTypeSupported?.(c)) return c;
  }
  return "";
}

export default function CameraModal({ open, onClose, onSend }: Props) {
  const notify = useNotify();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const captionRef = useRef<HTMLInputElement | null>(null);

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const activePreview = previewItems[activeIndex] || null;

  const [caption, setCaption] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<CaptureMode>("photo");

  // ✅ "Live camera view" vs "Preview view"
  const [liveMode, setLiveMode] = useState(true);

  // 🔦 Torch
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // 🔍 Zoom
  const [zoom, setZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);

  // ✅ Recording timer
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ press/hold logic
  const holdingRef = useRef(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hasPreview = previewItems.length > 0;

  const canRecord = useMemo(() => {
    return typeof window !== "undefined" && "MediaRecorder" in window;
  }, []);

  const formattedTimer = useMemo(() => {
    const mm = String(Math.floor(recordSeconds / 60)).padStart(2, "0");
    const ss = String(recordSeconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [recordSeconds]);

  const canAddMore = previewItems.length < MAX_ATTACHMENTS;

  /* ---------------- Timers ---------------- */

  function startTimer() {
    setRecordSeconds(0);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);

    recordTimerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  }

  function stopTimer() {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
  }

  /* ---------------- Cleanup ---------------- */

  async function stopStream() {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}

    streamRef.current = null;
    videoTrackRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function cleanupRecorder() {
    try {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdingRef.current = false;

      stopTimer();

      const rec = recorderRef.current;
      if (rec) {
        try {
          if (rec.state !== "inactive") rec.stop();
        } catch {}
      }

      recorderRef.current = null;
      chunksRef.current = [];

      setRecording(false);
    } catch {}
  }

  async function cleanupCamera(reason = "cleanup-camera") {
    try {
      await cleanupRecorder();
      await stopStream();

      setTorchOn(false);
      setZoom(1);
    } catch {}
  }

  function cleanupPreviews() {
    previewItems.forEach((p) => safeRevoke(p.url));
  }

  /* ---------------- Camera Setup ---------------- */

  async function detectTorchAndZoomSupport(track: MediaStreamTrack | null) {
    try {
      if (!track) {
        setTorchSupported(false);
        setZoomSupported(false);
        return;
      }

      const caps: any = track.getCapabilities ? track.getCapabilities() : null;

      setTorchSupported(Boolean(caps?.torch));

      if (caps?.zoom) {
        setZoomSupported(true);
        setZoomMin(caps.zoom.min ?? 1);
        setZoomMax(caps.zoom.max ?? 1);
        setZoom(caps.zoom.min ?? 1);
      } else {
        setZoomSupported(false);
        setZoomMin(1);
        setZoomMax(1);
        setZoom(1);
      }
    } catch {
      setTorchSupported(false);
      setZoomSupported(false);
    }
  }

  async function startStream() {
    try {
      setEmojiOpen(false);
      setLoading(true);

      await cleanupCamera("restart-stream");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0] || null;
      videoTrackRef.current = videoTrack;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      await detectTorchAndZoomSupport(videoTrack);

      setTorchOn(false);
    } catch (err) {
      console.error("Camera start error:", err);
      notify({
        type: "error",
        title: "Camera Error",
        message: "Unable to access camera. Please allow camera permission.",
        duration: 3500,
      });
    } finally {
      setLoading(false);
    }
  }

  async function applyTorch(on: boolean) {
    try {
      const track = videoTrackRef.current;
      if (!track) return;

      await track.applyConstraints({
        advanced: [{ torch: on as any }],
      } as any);

      setTorchOn(on);
    } catch {
      setTorchOn(false);
      notify({
        type: "warning",
        title: "Torch",
        message: "Torch is not available on this device/browser.",
        duration: 2500,
      });
    }
  }

  async function applyZoom(value: number) {
    try {
      const track = videoTrackRef.current;
      if (!track) return;

      await track.applyConstraints({
        advanced: [{ zoom: value as any }],
      } as any);

      setZoom(value);
    } catch {}
  }

  function closeNow() {
    setEmojiOpen(false);

    cleanupCamera("close-modal");
    cleanupPreviews();

    setPreviewItems([]);
    setActiveIndex(0);
    setCaption("");
    setMode("photo");
    setLiveMode(true);

    onClose();
  }

  /* ---------------- Limits Guard ---------------- */

  function ensureCanAddOneMore(): boolean {
    if (previewItems.length >= MAX_ATTACHMENTS) {
      notify({
        type: "warning",
        title: "Limit reached",
        message: `You can only attach up to ${MAX_ATTACHMENTS} files.`,
        duration: 3000,
      });
      return false;
    }
    return true;
  }

  /* ---------------- Photo ---------------- */

  async function takePhoto() {
    try {
      if (!ensureCanAddOneMore()) return;
      if (!videoRef.current || !streamRef.current) return;

      const video = videoRef.current;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );

      if (!blob) return;

      const file = blobToFile(blob, `photo-${Date.now()}.jpg`);
      const url = URL.createObjectURL(file);

      await cleanupCamera("photo-preview");

      const newItem: PreviewItem = {
        id: crypto.randomUUID(),
        type: "image",
        url,
        file,
      };

      setPreviewItems((prev) => {
        const next = [...prev, newItem];
        setActiveIndex(next.length - 1);
        return next;
      });

      setLiveMode(false);
      setTimeout(() => captionRef.current?.focus(), 50);
    } catch (err) {
      console.error(err);
      notify({
        type: "error",
        title: "Photo Error",
        message: "Unable to take photo.",
        duration: 3000,
      });
    }
  }

  /* ---------------- Video Recording ---------------- */

  async function startRecording() {
    if (!streamRef.current) return;

    if (!ensureCanAddOneMore()) return;

    if (!canRecord) {
      notify({
        type: "warning",
        title: "Not Supported",
        message: "Video recording is not supported in this browser.",
        duration: 3000,
      });
      return;
    }

    try {
      if (recording) return;

      setEmojiOpen(false);
      chunksRef.current = [];

      const mimeType = getBestRecorderMimeType();

      const recorder = new MediaRecorder(
        streamRef.current,
        mimeType ? { mimeType } : undefined
      );

      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecording(false);
        stopTimer();

        if (!chunksRef.current.length) return;

        const blob = new Blob(chunksRef.current, {
          type: mimeType || "video/webm",
        });

        const file = blobToFile(blob, `video-${Date.now()}.webm`);
        const url = URL.createObjectURL(file);

        await cleanupCamera("video-preview");

        const newItem: PreviewItem = {
          id: crypto.randomUUID(),
          type: "video",
          url,
          file,
        };

        setPreviewItems((prev) => {
          const next = [...prev, newItem];
          setActiveIndex(next.length - 1);
          return next;
        });

        setLiveMode(false);
        setTimeout(() => captionRef.current?.focus(), 50);
      };

      recorder.start();
      setRecording(true);
      startTimer();

      notify({
        type: "info",
        title: "Recording",
        message: "Recording started…",
        duration: 1200,
      });
    } catch (err) {
      console.error("record start error:", err);
      notify({
        type: "error",
        title: "Recording Error",
        message: "Unable to start recording.",
        duration: 3000,
      });
      setRecording(false);
      stopTimer();
    }
  }

  async function stopRecording() {
    try {
      recorderRef.current?.stop();
    } catch {}
    recorderRef.current = null;

    setRecording(false);
    stopTimer();
  }

  // ✅ auto-stop recording when reaching 1 hour
  useEffect(() => {
    if (!recording) return;
    if (recordSeconds < MAX_VIDEO_SECONDS) return;

    notify({
      type: "warning",
      title: "Max duration reached",
      message: "Video recording stopped (1 hour max).",
      duration: 3000,
    });

    stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordSeconds, recording]);

  /* ---------------- Tap / Hold capture ---------------- */

  function onCaptureDown() {
    if (!liveMode) return;
    if (loading) return;
    if (!streamRef.current) return;
    if (recording) return; // ✅ no capture while recording

    holdingRef.current = true;

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    holdTimerRef.current = setTimeout(() => {
      if (!holdingRef.current) return;
      startRecording();
    }, 220);
  }

  async function onCaptureUp() {
    if (!liveMode) return;
    if (loading) return;

    holdingRef.current = false;

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    // ✅ if recording -> do nothing here (stop button handles stopping)
    if (recording) return;

    if (mode === "photo") {
      await takePhoto();
      return;
    }

    await startRecording();
  }

  /* ---------------- Gallery ---------------- */

  function openGalleryPicker() {
    if (recording) return;

    if (!canAddMore) {
      notify({
        type: "warning",
        title: "Limit reached",
        message: `You can only attach up to ${MAX_ATTACHMENTS} files.`,
        duration: 3000,
      });
      return;
    }

    setEmojiOpen(false);
    fileInputRef.current?.click();
  }

  function onGalleryPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_ATTACHMENTS - previewItems.length;
    const allowedFiles = files.slice(0, remaining);

    if (allowedFiles.length < files.length) {
      notify({
        type: "warning",
        title: "Some files skipped",
        message: `Only ${MAX_ATTACHMENTS} files allowed.`,
        duration: 3000,
      });
    }

    const items: PreviewItem[] = allowedFiles.map((file) => {
      const type = file.type.startsWith("video") ? "video" : "image";
      return {
        id: crypto.randomUUID(),
        type,
        url: URL.createObjectURL(file),
        file,
      };
    });

    cleanupCamera("gallery-picked");

    setPreviewItems((prev) => {
      const next = [...prev, ...items];
      setActiveIndex(next.length - 1);
      return next;
    });

    setLiveMode(false);

    e.currentTarget.value = "";
    setTimeout(() => captionRef.current?.focus(), 50);
  }

  /* ---------------- Preview Actions ---------------- */

  async function addMore() {
    if (!canAddMore) {
      notify({
        type: "warning",
        title: "Limit reached",
        message: `You can only attach up to ${MAX_ATTACHMENTS} files.`,
        duration: 3000,
      });
      return;
    }

    setEmojiOpen(false);
    setLiveMode(true);
    await startStream();
  }

  function removeActive() {
    setEmojiOpen(false);

    const item = activePreview;
    if (!item) return;

    safeRevoke(item.url);

    setPreviewItems((prev) => {
      const next = prev.filter((p) => p.id !== item.id);
      const newIndex = Math.max(0, Math.min(activeIndex, next.length - 1));
      setActiveIndex(newIndex);

      if (next.length === 0) {
        setLiveMode(true);
        startStream();
      }

      return next;
    });
  }

  async function confirmSend() {
    setEmojiOpen(false);

    if (!previewItems.length) {
      notify({
        type: "info",
        title: "Nothing to send",
        message: "Capture a photo/video or pick from gallery first.",
        duration: 2500,
      });
      return;
    }

    const files = previewItems.map((p) => p.file);

    notify({
      type: "loading",
      title: "Sending",
      message: "Uploading media...",
      duration: 1200,
    });

    try {
      onSend({ files, caption });

      notify({
        type: "success",
        title: "Sent",
        message: "Your media has been sent successfully.",
        duration: 2000,
      });

      closeNow();
    } catch (err) {
      console.error(err);
      notify({
        type: "error",
        title: "Send Failed",
        message: "Unable to send media. Please try again.",
        duration: 3500,
      });
    }
  }

  function toggleEmoji() {
    setEmojiOpen((p) => {
      const next = !p;
      setTimeout(() => captionRef.current?.focus(), 30);
      return next;
    });
  }

  function switchCamera() {
    if (recording) return;
    if (!liveMode) return;

    setEmojiOpen(false);
    setFacingMode((p) => (p === "user" ? "environment" : "user"));
  }

  /* ---------------- Effects ---------------- */

  useEffect(() => {
    return () => cleanupPreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;

    setPreviewItems([]);
    setActiveIndex(0);
    setCaption("");
    setEmojiOpen(false);

    setRecording(false);
    setTorchOn(false);
    setRecordSeconds(0);

    setMode("photo");
    setLiveMode(true);

    startStream();

    return () => {
      cleanupCamera("unmount");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!liveMode) return;
    if (recording) return;

    startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={closeNow}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.iconBtn} onClick={closeNow} title="Close">
            <FiX />
          </button>

          <div className={styles.title}>
            {!liveMode
              ? `${activeIndex + 1}/${previewItems.length}`
              : recording
              ? `Recording… ${formattedTimer}`
              : "Camera"}
          </div>

          <button
            className={styles.iconBtn}
            onClick={switchCamera}
            title="Switch camera"
            disabled={!liveMode || recording}
          >
            <FiRefreshCw />
          </button>
        </div>

        <div className={styles.body}>
          {liveMode ? (
            <div className={styles.videoWrap}>
              {loading && <div className={styles.loading}>Opening camera…</div>}

              <video
                ref={videoRef}
                className={styles.video}
                playsInline
                muted
                autoPlay
              />

              {/* tools */}
              <div className={styles.toolsOverlay}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={openGalleryPicker}
                  title="Pick from gallery"
                  disabled={recording || !canAddMore}
                >
                  <FiImage />
                </button>

                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => applyTorch(!torchOn)}
                  title={!torchSupported ? "Torch not supported" : "Flash"}
                  disabled={!torchSupported || recording}
                >
                  {torchOn ? <FiZap /> : <FiZapOff />}
                </button>
              </div>

              {/* zoom */}
              {zoomSupported && (
                <div className={styles.zoomRow}>
                  <input
                    type="range"
                    min={zoomMin}
                    max={zoomMax}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => applyZoom(Number(e.target.value))}
                    disabled={recording}
                  />
                </div>
              )}

              {/* capture overlay */}
              <div className={styles.captureOverlay}>
                {/* mode row */}
                <div className={styles.modeRow}>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${
                      mode === "photo" ? styles.modeActive : ""
                    }`}
                    onClick={() => {
                      setEmojiOpen(false);
                      setMode("photo");
                    }}
                    disabled={recording}
                  >
                    PHOTO
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${
                      mode === "video" ? styles.modeActive : ""
                    }`}
                    onClick={() => {
                      setEmojiOpen(false);
                      setMode("video");
                    }}
                    disabled={recording}
                  >
                    VIDEO
                  </button>
                </div>

                {/* ✅ Capture row */}
                <div className={styles.captureRow}>
                  {!recording ? (
                    // ✅ Only show Capture when NOT recording
                    <button
                      type="button"
                      className={styles.captureBtn}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onCaptureDown();
                      }}
                      onMouseUp={(e) => {
                        e.preventDefault();
                        onCaptureUp();
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        onCaptureDown();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        onCaptureUp();
                      }}
                      title="Capture"
                      disabled={!canAddMore}
                    >
                      <span className={styles.captureDot} />
                    </button>
                  ) : (
                    // ✅ Only show Stop when recording
                    <button
                      type="button"
                      className={styles.stopBtn}
                      onClick={(e) => {
                        e.preventDefault();
                        stopRecording();
                      }}
                      title="Stop recording"
                    >
                      <FiStopCircle />
                    </button>
                  )}
                </div>

                {/* timer overlay */}
                {recording && (
                  <div className={styles.recTimerOverlay}>
                    <span className={styles.recDot} />
                    <span className={styles.recTime}>
                      {formattedTimer} / 60:00
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={onGalleryPicked}
              />
            </div>
          ) : (
            <div
              className={styles.previewWrap}
              onClick={() => setEmojiOpen(false)}
            >
              {activePreview?.type === "image" ? (
                <img
                  src={activePreview.url}
                  className={styles.previewMedia}
                  alt="preview"
                />
              ) : (
                <video
                  src={activePreview?.url}
                  className={styles.previewMedia}
                  controls
                  autoPlay
                  playsInline
                />
              )}

              {/* tray */}
              <div
                className={styles.previewTray}
                onClick={(e) => e.stopPropagation()}
              >
                {previewItems.map((p, idx) => (
                  <button
                    key={p.id}
                    className={`${styles.trayItem} ${
                      idx === activeIndex ? styles.trayItemActive : ""
                    }`}
                    onClick={() => {
                      setEmojiOpen(false);
                      setActiveIndex(idx);
                    }}
                    type="button"
                  >
                    {p.type === "image" ? (
                      <img
                        src={p.url}
                        className={styles.trayThumb}
                        alt="thumb"
                      />
                    ) : (
                      <div className={styles.trayVideoBadge}>VIDEO</div>
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  className={styles.trayAddBtn}
                  onClick={addMore}
                  title={
                    canAddMore
                      ? "Add more"
                      : `Max ${MAX_ATTACHMENTS} attachments`
                  }
                  disabled={!canAddMore}
                >
                  <FiPlus />
                </button>
              </div>

              {/* caption bar */}
              <div
                className={styles.captionBar}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.captionIconBtn}
                  onClick={toggleEmoji}
                  title="Emoji"
                >
                  <FiSmile />
                </button>

                <input
                  ref={captionRef}
                  className={styles.captionInput}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption…"
                />

                <button
                  type="button"
                  className={styles.captionIconBtn}
                  onClick={removeActive}
                  title="Remove"
                >
                  <FiTrash2 />
                </button>

                <button
                  type="button"
                  className={styles.sendBtn}
                  onClick={confirmSend}
                  title="Send"
                >
                  <FiSend />
                </button>

                {emojiOpen && (
                  <div
                    className={styles.emojiPopup}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Picker
                      data={data}
                      theme="light"
                      previewPosition="none"
                      onEmojiSelect={(emoji: any) => {
                        const chosen = emoji?.native;
                        if (!chosen) return;
                        setCaption((p) => p + chosen);
                        setTimeout(() => captionRef.current?.focus(), 30);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
