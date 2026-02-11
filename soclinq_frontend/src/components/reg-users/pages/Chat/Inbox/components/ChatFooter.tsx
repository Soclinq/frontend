"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiSend,
  FiLoader,
  FiMic,
  FiSmile,
  FiPaperclip,
  FiCamera,
  FiAlertCircle,
  FiChevronLeft,
  FiTrash2,
  FiLock,
} from "react-icons/fi";
import styles from "./styles/ChatFooter.module.css";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

type Props = {
  input: string;
  setInput: (v: string) => void;

  sending: boolean;
  disabled: boolean;

  pickedFiles: File[];
  setPickedFiles: React.Dispatch<React.SetStateAction<File[]>>;

  sendMessage: () => void;
  handleTyping: (v: string) => void;

  inputRef?: React.RefObject<HTMLInputElement | null>;
  inputBarRef?: React.RefObject<HTMLDivElement | null>;

  onOpenCamera?: () => void;

  /** ✅ when voice note is ready */
  onSendVoice?: (file: File) => void;
};

export default function ChatFooter({
  input,
  setInput,
  sending,
  disabled,
  pickedFiles,
  setPickedFiles,
  sendMessage,
  handleTyping,
  inputRef,
  inputBarRef,
  onOpenCamera,
  onSendVoice,
}: Props) {
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const realInputRef = inputRef ?? localInputRef;

  const canSend = useMemo(() => {
    return Boolean(input.trim()) || pickedFiles.length > 0;
  }, [input, pickedFiles]);

  /* =========================
     ✅ Emoji picker
  ========================== */
  const [emojiOpen, setEmojiOpen] = useState(false);

  function toggleEmoji() {
    if (disabled) return;

    setEmojiOpen((prev) => {
      const next = !prev;
      setTimeout(() => realInputRef.current?.focus(), 40);
      return next;
    });
  }

  /* =========================
     ✅ Haptic + Pop Sound
  ========================== */
  const audioCtxRef = useRef<AudioContext | null>(null);

  function vibrate(ms = 25) {
    try {
      if (!navigator.vibrate) return;
      navigator.vibrate(ms);
    } catch {}
  }

  useEffect(() => {
    if (!emojiOpen) return;
  
    const close = () => setEmojiOpen(false);
  
    // close on outside click
    window.addEventListener("mousedown", close);
    window.addEventListener("touchstart", close);
  
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("touchstart", close);
    };
  }, [emojiOpen]);
  

  function ensureAudioCtx(): AudioContext | null {
    try {
      const AudioContextAny =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextAny) return null;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextAny() as AudioContext;
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return null;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      return ctx;
    } catch {
      return null;
    }
  }

  function playPop(freq = 520, duration = 0.06) {
    try {
      const ctx = ensureAudioCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  /* =========================
     ✅ Voice Recording State
  ========================== */
  const [recording, setRecording] = useState(false);
  const [recordLocked, setRecordLocked] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // swipe references
  const pressStartXRef = useRef<number | null>(null);
  const pressStartYRef = useRef<number | null>(null);

  const cancelTriggeredRef = useRef(false);
  const lockTriggeredRef = useRef(false);

  const [slideCancelProgress, setSlideCancelProgress] = useState(0);
  const [lockAnim, setLockAnim] = useState<"idle" | "locking">("idle");
  const [cancelAnim, setCancelAnim] = useState<"idle" | "triggered">("idle");

  const audioSupported = useMemo(() => {
    return typeof window !== "undefined" && "MediaRecorder" in window;
  }, []);

  const formattedTimer = useMemo(() => {
    const mm = String(Math.floor(recordSeconds / 60)).padStart(2, "0");
    const ss = String(recordSeconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [recordSeconds]);

  function startTimer() {
    setRecordSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function stopStream() {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  }

  function blobToFile(blob: Blob, name: string) {
    return new File([blob], name, { type: blob.type });
  }

  function clearPressTracking() {
    pressStartXRef.current = null;
    pressStartYRef.current = null;
    cancelTriggeredRef.current = false;
    lockTriggeredRef.current = false;
    setSlideCancelProgress(0);
    setLockAnim("idle");
    setCancelAnim("idle");
  }

  /* =========================
     ✅ Waveform Canvas
  ========================== */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const waveformDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const waveformPointsRef = useRef<number[]>([]);
  const maxPoints = 160;

  function stopWaveform() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;

    try {
      micSourceRef.current?.disconnect();
    } catch {}
    micSourceRef.current = null;

    try {
      analyserRef.current?.disconnect();
    } catch {}
    analyserRef.current = null;

    waveformDataRef.current = null;
    waveformPointsRef.current = [];

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawWaveform() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const dataArr = waveformDataRef.current;

    if (!canvas || !analyser || !dataArr) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = 220;
    const cssH = 36;

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
    const amp = Math.max(0.08, Math.min(1, rms * 4.5));

    waveformPointsRef.current.push(amp);
    if (waveformPointsRef.current.length > maxPoints) waveformPointsRef.current.shift();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const midY = canvas.height / 2;
    const stepX = canvas.width / (maxPoints - 1);

    ctx.lineWidth = 2 * dpr;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(84, 108, 163, 0.9)";

    ctx.beginPath();

    const pts = waveformPointsRef.current;
    for (let i = 0; i < pts.length; i++) {
      const x = i * stepX;
      const y = midY - pts[i] * (canvas.height * 0.42);

      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = (i - 1) * stepX;
        const prevY = midY - pts[i - 1] * (canvas.height * 0.42);

        const cx = (prevX + x) / 2;
        const cy = (prevY + y) / 2;

        ctx.quadraticCurveTo(prevX, prevY, cx, cy);
      }
    }

    ctx.stroke();
    animFrameRef.current = requestAnimationFrame(drawWaveform);
  }

  function startWaveform() {
    try {
      const ctx = ensureAudioCtx();
      if (!ctx) return;

      const stream = streamRef.current;
      if (!stream) return;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;

      const micSource = ctx.createMediaStreamSource(stream);
      micSource.connect(analyser);

      analyserRef.current = analyser;
      micSourceRef.current = micSource;

      waveformDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      waveformPointsRef.current = [];

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    } catch {}
  }

  /* =========================
     ✅ Recording Controls
  ========================== */
  async function cleanupAudio(reason = "cleanup") {
    try {
      stopWaveform();

      const rec = recorderRef.current;
      if (rec) {
        try {
          if (rec.state !== "inactive") rec.stop();
        } catch {}
      }
      recorderRef.current = null;

      await stopStream();

      chunksRef.current = [];
      waveformPointsRef.current = [];
      waveformDataRef.current = null;

      setRecording(false);
      setRecordLocked(false);
      stopTimer();
      clearPressTracking();

      const ctx = audioCtxRef.current;
      if (ctx) {
        try {
          await ctx.close();
        } catch {}
      }
      audioCtxRef.current = null;

      console.log("✅ audio fully cleaned:", reason);
    } catch (e) {
      console.warn("cleanupAudio error:", e);
    }
  }

  async function startAudioRecording() {
    if (recording) return;

    if (!audioSupported) {
      setAudioError("Audio recording is not supported on this browser.");
      return;
    }

    try {
      setAudioError(null);
      chunksRef.current = [];
      waveformPointsRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.start();
      setRecording(true);
      startTimer();

      setTimeout(() => startWaveform(), 80);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopWaveform();

        const hasAudio = chunksRef.current.length > 0;

        await stopStream();
        recorderRef.current = null;

        const ctx = audioCtxRef.current;
        if (ctx) {
          try {
            await ctx.close();
          } catch {}
        }
        audioCtxRef.current = null;

        if (!hasAudio) return;

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = blobToFile(blob, `voice-${Date.now()}.webm`);

        onSendVoice?.(file);
        chunksRef.current = [];
      };

      playPop(560, 0.06);
    } catch {
      setAudioError("Could not start microphone. Please allow microphone access.");
      setRecording(false);
      stopTimer();
      stopWaveform();
      await stopStream();
    }
  }

  async function stopAudioRecording() {
    try {
      recorderRef.current?.stop();
    } catch {}

    setRecording(false);
    setRecordLocked(false);
    stopTimer();
    clearPressTracking();
    stopWaveform();
  }

  async function cancelAudioRecording() {
    chunksRef.current = [];

    try {
      recorderRef.current?.stop();
    } catch {}

    await cleanupAudio("cancel");
  }

  async function cancelLockedRecording() {
    vibrate(60);
    playPop(240, 0.05);
    await cancelAudioRecording();
  }

  /* =========================
     ✅ Gestures
  ========================== */
  function extractPoint(e: any): { x: number | null; y: number | null } {
    if (!e) return { x: null, y: null };
    if (e.touches?.[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
    return { x: null, y: null };
  }

  async function triggerCancelImmediately() {
    if (cancelTriggeredRef.current) return;
    cancelTriggeredRef.current = true;

    setCancelAnim("triggered");
    setSlideCancelProgress(1);

    vibrate(70);
    playPop(240, 0.05);

    setTimeout(() => {
      cancelAudioRecording();
    }, 220);
  }

  function onMicMove(x: number | null, y: number | null) {
    if (!recording) return;
    if (recordLocked) return;
    if (cancelTriggeredRef.current) return;

    if (x == null || y == null) return;

    const startX = pressStartXRef.current;
    const startY = pressStartYRef.current;
    if (startX == null || startY == null) return;

    const diffX = startX - x;
    const diffY = startY - y;

    const cancelThreshold = 80;
    const progress = Math.max(0, Math.min(1, diffX / cancelThreshold));
    setSlideCancelProgress(progress);

    if (diffX >= cancelThreshold) {
      triggerCancelImmediately();
      return;
    }

    const lockThreshold = 60;
    if (!lockTriggeredRef.current && diffY >= lockThreshold) {
      lockTriggeredRef.current = true;
      setRecordLocked(true);

      vibrate(30);
      playPop(640, 0.06);

      setLockAnim("locking");
      setTimeout(() => setLockAnim("idle"), 520);
    }
  }

  useEffect(() => {
    if (!recording) return;

    const onMove = (e: any) => {
      const { x, y } = extractPoint(e);
      onMicMove(x, y);
    };

    const onUp = async () => {
      // locked => keep recording until cancel
      if (recordLocked) return;
      if (recording) await stopAudioRecording();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });

    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove as any);

      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [recording, recordLocked]);

  async function onMicPressStart(e: any) {
    if (disabled || sending) return;
    if (canSend) return;

    e.preventDefault();

    setAudioError(null);
    setEmojiOpen(false);
    setRecordLocked(false);
    clearPressTracking();

    const { x, y } = extractPoint(e);
    pressStartXRef.current = x;
    pressStartYRef.current = y;

    await startAudioRecording();
  }

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      cleanupAudio("unmount");
    };
  }, []);

  /* =========================
     UI
  ========================== */
  return (
    <footer ref={inputBarRef as any} className={styles.waFooter}>
      {/* ✅ Emoji picker */}
      {emojiOpen && !disabled && !recording && (
          <div className={styles.waEmojiPopup} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <Picker
              data={data}
              theme="dark"
              previewPosition="none"
              onEmojiSelect={(emoji: any) => {
                const chosen = emoji?.native;
                if (!chosen) return;
                setInput(input + chosen);
                setTimeout(() => realInputRef.current?.focus(), 30);
              }}
            />
          </div>
        )}


      {/* ✅ Normal Input Row */}
      {!recording && (
        <div className={styles.waFooterRow}>
          <div className={styles.waInputBox}>
            <button
              type="button"
              className={styles.waIconBtn}
              title={emojiOpen ? "Keyboard" : "Emoji"}
              onClick={toggleEmoji}
              disabled={disabled}
            >
              {emojiOpen ? "⌨️" : <FiSmile />}
            </button>

            <input
              ref={realInputRef}
              className={styles.waInput}
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message"
              disabled={disabled}
            />

            <label className={styles.waIconBtn} title="Attach">
              <FiPaperclip />
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setPickedFiles((prev) => [...prev, ...files]);
                  e.currentTarget.value = "";
                }}
                disabled={disabled}
              />
            </label>

            <button
              type="button"
              className={styles.waIconBtn}
              title="Camera"
              onClick={() => onOpenCamera?.()}
              disabled={disabled}
            >
              <FiCamera />
            </button>
          </div>

          {canSend ? (
            <button
              type="button"
              className={styles.waSendBtn}
              onClick={sendMessage}
              disabled={sending || disabled}
              title="Send"
            >
              {sending ? <FiLoader className={styles.spinMini} /> : <FiSend />}
            </button>
          ) : (
            <button
              type="button"
              className={styles.waMicBtnGreen}
              disabled={disabled || !audioSupported}
              title={!audioSupported ? "Audio not supported" : "Hold to record"}
              onMouseDown={(e) => onMicPressStart(e)}
              onTouchStart={(e) => onMicPressStart(e)}
            >
              <FiMic />
            </button>
          )}
        </div>
      )}

      {/* ✅ Recording UI */}
      {recording && (
        <div className={styles.waMicWrap}>
          <div className={styles.waRecordingHud}>
            <div className={styles.waRecRow}>
              <span className={styles.waRecDot} />
              <span className={styles.waRecTime}>{formattedTimer}</span>
            </div>

            <canvas ref={canvasRef} className={styles.waWaveCanvasLine} />

            {!recordLocked ? (
              <>
                <div className={styles.waCancelHintRow}>
                  <div className={styles.waSlideCancel}>
                    <FiChevronLeft />
                    <span
                      className={styles.waSlideCancelText}
                      style={{
                        opacity: 1 - slideCancelProgress * 0.95,
                        transform: `translateX(-${slideCancelProgress * 55}px)`,
                      }}
                    >
                      slide to cancel
                    </span>
                  </div>

                  {/* keep your trash icon (you can position it via CSS) */}
                  <span className={styles.waTrashIcon} data-cancel={cancelAnim}>
                    <FiTrash2 />
                  </span>
                </div>

                <div className={styles.waLockHintTop}>
                  <div
                    className={`${styles.waLockIcon} ${
                      lockAnim === "locking" ? styles.waLockAnim : ""
                    }`}
                  >
                    <FiLock />
                  </div>
                  <span className={styles.waLockText}>Swipe up to lock</span>
                </div>
              </>
            ) : (
              <div className={styles.waLockedBadge}>
                <FiLock /> Locked
              </div>
            )}
          </div>

          {/* mic icon during recording */}
          <button
            type="button"
            className={`${styles.waMicBtnGreen} ${styles.waMicBtnRecording}`}
            disabled
            title="Recording..."
          >
            <FiMic />
          </button>

          {/* locked cancel only */}
          {recordLocked && (
            <div className={styles.waLockedActions}>
              <button
                type="button"
                className={styles.waLockedCancelBtn}
                title="Cancel recording"
                onClick={cancelLockedRecording}
              >
                <FiTrash2 />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ✅ Audio error */}
      {audioError && (
        <div className={styles.waAudioError}>
          <FiAlertCircle /> {audioError}
        </div>
      )}
    </footer>
  );
}
