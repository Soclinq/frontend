"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiMic,
  FiTrash2,
  FiChevronLeft,
  FiAlertCircle,
  FiLock,
  FiSend,
  FiPause,
  FiPlay,
} from "react-icons/fi";
import styles from "./styles/ChatAudioRecorder.module.css";

type Props = {
  disabled?: boolean;
  sending?: boolean;
  minMs?: number;
  maxMs?: number;

  onSend: (file: File, meta: { durationMs: number }) => void;
  onError?: (message: string) => void;

  /** ✅ tells parent when recorder UI is active */
  onActiveChange?: (active: boolean) => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

function pickBestAudioMime(): string | undefined {
  const MR = typeof window !== "undefined" ? (window as any).MediaRecorder : undefined;
  if (!MR || !MR.isTypeSupported) return undefined;

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];

  for (const c of candidates) {
    try {
      if (MR.isTypeSupported(c)) return c;
    } catch {}
  }
  return undefined;
}

function pickExtensionFromMime(mime: string) {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("webm")) return "webm";
  return "webm";
}

export default function ChatAudioRecorder({
  disabled = false,
  sending = false,
  minMs = 500,
  maxMs = 60 * 60 * 1000,
  onSend,
  onError,
  onActiveChange,
}: Props) {
  /* =========================
     Support detection
  ========================== */
  const audioSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(navigator.mediaDevices?.getUserMedia) && "MediaRecorder" in window;
  }, []);

  /* =========================
     UI state
  ========================== */
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const recordingRef = useRef(false);
  const lockedRef = useRef(false);
  const stoppingRef = useRef(false);
  const canceledRef = useRef(false);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    onActiveChange?.(open);
  }, [open, onActiveChange]);

  /* =========================
     Recorder refs
  ========================== */
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);

  // pause tracking (exclude paused time from duration)
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef<number>(0);

  /* =========================
     Timer
  ========================== */
  const [durationMsLive, setDurationMsLive] = useState(0);
  const rafTimerRef = useRef<number | null>(null);

  function startTimer() {
    const tick = () => {
      // freeze time when paused
      if (pausedAtRef.current !== null) {
        rafTimerRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed = Date.now() - startedAtRef.current - pausedTotalRef.current;
      setDurationMsLive(Math.max(0, elapsed));
      rafTimerRef.current = requestAnimationFrame(tick);
    };

    if (rafTimerRef.current) cancelAnimationFrame(rafTimerRef.current);
    rafTimerRef.current = requestAnimationFrame(tick);
  }

  function stopTimer() {
    if (rafTimerRef.current) cancelAnimationFrame(rafTimerRef.current);
    rafTimerRef.current = null;
  }

  const timeText = useMemo(() => formatTime(durationMsLive), [durationMsLive]);

  /* =========================
     Waveform
  ========================== */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const waveRafRef = useRef<number | null>(null);
  const waveDataRef = useRef<Uint8Array | null>(null);

  const pointsRef = useRef<number[]>([]);
  const MAX_POINTS = 140;

  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx2d = c.getContext("2d");
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, c.width, c.height);
  }

  function stopWave() {
    if (waveRafRef.current) cancelAnimationFrame(waveRafRef.current);
    waveRafRef.current = null;

    try {
      sourceRef.current?.disconnect();
    } catch {}
    sourceRef.current = null;

    try {
      analyserRef.current?.disconnect();
    } catch {}
    analyserRef.current = null;

    waveDataRef.current = null;
    pointsRef.current = [];
    clearCanvas();
  }

  function resumeAudioContextIfNeeded() {
    try {
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch {}
  }

  function drawWave() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const dataArr = waveDataRef.current;

    if (!canvas || !analyser || !dataArr) return;

    // keep loop alive even paused (so resume is instant)
    if (paused) {
      waveRafRef.current = requestAnimationFrame(drawWave);
      return;
    }

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) {
      waveRafRef.current = requestAnimationFrame(drawWave);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const cssW = 220;
    const cssH = 30;

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    analyser.getByteTimeDomainData(dataArr);

    let sum = 0;
    for (let i = 0; i < dataArr.length; i += 6) {
      const v = (dataArr[i] - 128) / 128;
      sum += v * v;
    }

    const rms = Math.sqrt(sum / (dataArr.length / 6));
    const amp = Math.max(0.06, Math.min(1, rms * 5.0));

    pointsRef.current.push(amp);
    if (pointsRef.current.length > MAX_POINTS) pointsRef.current.shift();

    ctx2d.clearRect(0, 0, canvas.width, canvas.height);

    const midY = canvas.height / 2;
    const stepX = canvas.width / (MAX_POINTS - 1);

    ctx2d.lineWidth = 2 * dpr;
    ctx2d.lineJoin = "round";
    ctx2d.lineCap = "round";
    ctx2d.strokeStyle = "rgba(37, 211, 102, 0.95)";

    ctx2d.beginPath();
    const pts = pointsRef.current;

    for (let i = 0; i < pts.length; i++) {
      const x = i * stepX;
      const y = midY - pts[i] * (canvas.height * 0.42);

      if (i === 0) ctx2d.moveTo(x, y);
      else {
        const prevX = (i - 1) * stepX;
        const prevY = midY - pts[i - 1] * (canvas.height * 0.42);
        const cx = (prevX + x) / 2;
        const cy = (prevY + y) / 2;
        ctx2d.quadraticCurveTo(prevX, prevY, cx, cy);
      }
    }

    ctx2d.stroke();
    waveRafRef.current = requestAnimationFrame(drawWave);
  }

  function startWave() {
    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext || null;
      if (!Ctx) return;

      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;

      const stream = streamRef.current;
      if (!ctx || !stream) return;

      resumeAudioContextIfNeeded();

      // ✅ IMPORTANT: always rebuild analyser/source cleanly (fix resume bug)
      stopWave();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceRef.current = source;

      waveDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      pointsRef.current = [];

      if (waveRafRef.current) cancelAnimationFrame(waveRafRef.current);
      waveRafRef.current = requestAnimationFrame(drawWave);
    } catch {}
  }

  /* =========================
     Cleanup + reset
  ========================== */
  const maxStopTimerRef = useRef<number | null>(null);

  async function stopStream() {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  }

  async function fullReset(close = true) {
    stopTimer();
    stopWave();

    if (maxStopTimerRef.current) {
      clearTimeout(maxStopTimerRef.current);
      maxStopTimerRef.current = null;
    }

    try {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.ondataavailable = null;
        } catch {}
        try {
          rec.onstop = null;
        } catch {}
        try {
          rec.stop();
        } catch {}
      }
    } catch {}

    recorderRef.current = null;
    await stopStream();

    chunksRef.current = [];
    stoppingRef.current = false;
    canceledRef.current = false;

    recordingRef.current = false;
    lockedRef.current = false;

    pausedAtRef.current = null;
    pausedTotalRef.current = 0;

    setRecording(false);
    setLocked(false);
    setPaused(false);
    setDurationMsLive(0);
    setAudioError(null);

    if (close) setOpen(false);
  }

  function blobToFile(blob: Blob, name: string) {
    return new File([blob], name, { type: blob.type });
  }

  /* =========================
     UX feedback helpers
  ========================== */
  function vibrate(ms = 18) {
    try {
      if (!navigator.vibrate) return;
      navigator.vibrate(ms);
    } catch {}
  }

  function playPop(freq = 560, duration = 0.06) {
    try {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext || null;
      if (!Ctx) return;

      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;

      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.24, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  /* =========================
     Recording logic
  ========================== */
  async function startRecording() {
    if (disabled || sending) return;

    if (!audioSupported) {
      const msg = "Audio recording is not supported in this browser.";
      setAudioError(msg);
      onError?.(msg);
      return;
    }

    if (recordingRef.current) return;

    try {
      setAudioError(null);

      setOpen(true);
      setLocked(false);
      lockedRef.current = false;
      setPaused(false);

      chunksRef.current = [];
      stoppingRef.current = false;
      canceledRef.current = false;

      pausedAtRef.current = null;
      pausedTotalRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
      });

      streamRef.current = stream;

      const mime = pickBestAudioMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (canceledRef.current) return;
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        const wasCanceled = canceledRef.current;

        const durationMs = Math.max(
          0,
          Date.now() - startedAtRef.current - pausedTotalRef.current
        );

        await stopStream();
        recorderRef.current = null;

        stopWave();
        stopTimer();

        recordingRef.current = false;
        lockedRef.current = false;

        setRecording(false);
        setLocked(false);
        setPaused(false);

        if (wasCanceled) {
          chunksRef.current = [];
          stoppingRef.current = false;
          setOpen(false);
          return;
        }

        if (durationMs < minMs || chunksRef.current.length === 0) {
          chunksRef.current = [];
          stoppingRef.current = false;
          setOpen(false);
          return;
        }

        const mime = pickBestAudioMime();
        const finalMime = mime?.split(";")[0] || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });

        const ext = pickExtensionFromMime(finalMime);
        const file = blobToFile(blob, `voice-${Date.now()}.${ext}`);

        chunksRef.current = [];
        stoppingRef.current = false;

        onSend(file, { durationMs });
        setOpen(false);
      };

      startedAtRef.current = Date.now();
      rec.start(200);

      recordingRef.current = true;
      setRecording(true);
      setDurationMsLive(0);

      startTimer();

      // ✅ ensure stream is ready before creating analyser
      setTimeout(() => {
        startWave();
      }, 80);

      if (maxStopTimerRef.current) clearTimeout(maxStopTimerRef.current);
      maxStopTimerRef.current = window.setTimeout(() => {
        const r = recorderRef.current;
        if (r && r.state === "recording") stopRecording().catch(() => {});
      }, maxMs);
    } catch (err) {
      const msg = "Microphone blocked. Please allow microphone access.";
      setAudioError(msg);
      onError?.(msg);
      await fullReset(true);
    }
  }

  async function stopRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "inactive") return;
    if (stoppingRef.current) return;

    stoppingRef.current = true;

    const elapsed = Math.max(
      0,
      Date.now() - startedAtRef.current - pausedTotalRef.current
    );

    const doStop = () => {
      try {
        try {
          rec.requestData();
        } catch {}
        rec.stop();
      } catch {
        fullReset(true);
      }
    };

    if (elapsed < minMs) {
      setTimeout(doStop, minMs - elapsed);
      return;
    }

    doStop();
  }

  async function cancelRecording() {
    canceledRef.current = true;
    chunksRef.current = [];

    stopTimer();
    stopWave();

    try {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.ondataavailable = null;
        } catch {}
        try {
          rec.stop();
        } catch {}
      }
    } catch {}

    await stopStream();

    recorderRef.current = null;
    stoppingRef.current = false;
    recordingRef.current = false;
    lockedRef.current = false;

    pausedAtRef.current = null;
    pausedTotalRef.current = 0;

    setRecording(false);
    setLocked(false);
    setPaused(false);
    setDurationMsLive(0);
    setAudioError(null);
    setOpen(false);
  }

  async function pauseRecording() {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "recording") return;

    try {
      rec.pause();
      setPaused(true);

      pausedAtRef.current = Date.now();

      // ✅ stop drawing while paused
      stopWave();
    } catch {}
  }

  async function resumeRecording() {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "paused") return;

    try {
      resumeAudioContextIfNeeded();

      rec.resume();
      setPaused(false);

      // ✅ exclude pause time
      if (pausedAtRef.current !== null) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }

      // ✅ IMPORTANT: rebuild analyser/source after resume (fix waveform resume)
      setTimeout(() => {
        startWave();
      }, 120);
    } catch {}
  }

  /* =========================
     WhatsApp gestures (hold, slide left to cancel, slide up to lock)
  ========================== */
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const cancelTriggeredRef = useRef(false);
  const lockTriggeredRef = useRef(false);

  const [slideProgress, setSlideProgress] = useState(0);
  const [lockProgress, setLockProgress] = useState(0);

  function resetGestures() {
    cancelTriggeredRef.current = false;
    lockTriggeredRef.current = false;
    setSlideProgress(0);
    setLockProgress(0);
  }

  function handleMove(x: number, y: number) {
    if (!recordingRef.current) return;
    if (lockedRef.current) return;
    if (cancelTriggeredRef.current) return;

    const diffX = startXRef.current - x; // left = positive
    const diffY = startYRef.current - y; // up = positive

    const cancelThreshold = 110;
    const lockThreshold = 85;

    const p = Math.max(0, Math.min(1, diffX / cancelThreshold));
    setSlideProgress(p);

    const pv = Math.max(0, Math.min(1, diffY / lockThreshold));
    setLockProgress(pv);

    if (diffX >= cancelThreshold) {
      cancelTriggeredRef.current = true;
      cancelRecording();
      vibrate(30);
      playPop(240, 0.05);
      return;
    }

    if (!lockTriggeredRef.current && diffY >= lockThreshold) {
      lockTriggeredRef.current = true;
      setLocked(true);
      lockedRef.current = true;
      setLockProgress(1);
      vibrate(18);
      playPop(650, 0.06);
    }
  }

  async function onMicPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || sending) return;

    e.preventDefault();
    e.stopPropagation();

    resetGestures();

    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    await startRecording();
  }

  function onMicPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    handleMove(e.clientX, e.clientY);
  }

  async function onMicPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (pointerIdRef.current !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    pointerIdRef.current = null;

    // locked => keep recording until manual send/delete
    if (lockedRef.current) return;

    await stopRecording();
  }

  async function onMicPointerCancel(e: React.PointerEvent<HTMLButtonElement>) {
    if (pointerIdRef.current !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    pointerIdRef.current = null;
    await cancelRecording();
  }

  /* =========================
     Cleanup
  ========================== */
  useEffect(() => {
    return () => {
      fullReset(false);
      try {
        audioCtxRef.current?.close();
      } catch {}
      audioCtxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     UI
  ========================== */
  return (
    <div className={styles.wrap} aria-live="polite">
      {/* =========================
         Recorder bar (when open)
      ========================== */}
      {open && (
        <div className={styles.inlineWrap}>
          <div
            className={`${styles.inlineBar} ${
              locked ? styles.inlineBarLocked : ""
            }`}
            role="region"
            aria-label="Audio recorder"
          >
            {/* left: delete (visible when locked) */}
            {locked && (
              <button
                className={styles.grayBtn}
                onClick={cancelRecording}
                disabled={disabled || sending}
                title="Delete"
              >
                <FiTrash2 />
              </button>
            )}

            <div className={styles.center}>
              {/* timer row */}
              <div className={styles.timerRow}>
                <span
                  className={styles.redDot}
                  data-paused={paused ? "1" : "0"}
                />
                <span className={styles.time}>{timeText}</span>
                {paused && <span className={styles.badge}>Paused</span>}

                {locked &&
                    <span className={styles.lockPill}>
                      <FiLock />
                    </span>
                }
              </div>

              {/* ✅ Wave ABOVE slide to cancel */}
              <div className={styles.waveTopRow}>
                <canvas ref={canvasRef} className={styles.wave} />
              </div>

              {/* slide helpers (only when not locked) */}
              {!locked && (
                <div className={styles.slideRow}>
                  <div className={styles.slideLeft}>
                    <FiChevronLeft />
                    <span
                      className={styles.slideText}
                      style={{
                        opacity: 1 - slideProgress * 0.92,
                        transform: `translateX(-${slideProgress * 46}px)`,
                      }}
                    >
                      slide to cancel
                    </span>
                    <FiTrash2 className={styles.trash} />
                  </div>
                </div>
              )}
            </div>

            {/* right: locked controls */}
            <div className={styles.right}>
              {locked && (
                <>
                  <div className={styles.lockRightRow}>
                    <button
                      className={styles.grayBtn}
                      onClick={paused ? resumeRecording : pauseRecording}
                      disabled={disabled || sending}
                      title={paused ? "Resume" : "Pause"}
                    >
                      {paused ? <FiPlay /> : <FiPause />}
                    </button>
                  </div>

                  <button
                    className={styles.sendBtn}
                    onClick={stopRecording}
                    disabled={disabled || sending}
                    title="Send"
                  >
                    <FiSend />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================
         Mic zone + Slide up lock indicator
      ========================== */}
      {!locked && (
        <div className={styles.micZone}>
          {/* ✅ Swipe-up lock indicator ABOVE mic button */}
          {recording && !locked && (
            <div
              className={styles.lockHintZone}
              style={{
                transform: `translateY(${lockProgress * -10}px)`,
                opacity: 0.5 + lockProgress * 0.5,
              }}
            >
              <div
                className={styles.lockHintBubble}
                style={{
                  transform: `scale(${0.96 + lockProgress * 0.08})`,
                }}
              >
                <FiLock
                  className={styles.lockHintIcon}
                  style={{
                    transform: `translateY(${lockProgress * -6}px)`,
                  }}
                />
                <span className={styles.lockHintText}>
                  slide up to lock
                </span>

                <div
                  className={styles.lockProgressBar}
                  style={{
                    transform: `scaleY(${Math.max(0.12, lockProgress)})`,
                    opacity: Math.max(0.18, lockProgress),
                  }}
                />
              </div>
            </div>
          )}

          {/* ✅ the only mic button */}
          <button
            className={`${styles.micMainBtn} ${
              recording ? styles.micMainBtnActive : ""
            }`}
            disabled={disabled || sending || !audioSupported}
            onPointerDown={onMicPointerDown}
            onPointerMove={onMicPointerMove}
            onPointerUp={onMicPointerUp}
            onPointerCancel={onMicPointerCancel}
            style={{ touchAction: "none" }}
            title={!audioSupported ? "Audio not supported" : "Hold to record"}
            aria-pressed={recording}
          >
            <FiMic />
          </button>
        </div>
      )}

      {audioError && (
        <div className={styles.error}>
          <FiAlertCircle />
          <span>{audioError}</span>
        </div>
      )}
    </div>
  );
}
