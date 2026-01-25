"use client";

import styles from "./styles/PreSosPanel.module.css";
import {
  FaMicrophone,
  FaVideo,
  FaImage,
  FaTrash,
  FaBrain,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { haptic } from "@/lib/haptics";
import { useLiveAudio } from "@/hooks/useLiveAudio";
import { useLiveVideo } from "@/hooks/useLiveVideo";
import { useLiveCamera } from "@/hooks/useLiveCamera";

/* ================= TYPES ================= */

type CaptureMode = "NONE" | "AUDIO" | "VIDEO" | "IMAGE";

type SosSeverity = "LOW" | "MEDIUM" | "HIGH";
type SignalQuality = "STRONG" | "WEAK" | "LOW";

export interface PreSosData {
  message: string;
  audios: File[];
  videos: File[];
  images: File[];
  aiSeverity: {
    level: SosSeverity;
    score: number;
    reason: string;
  } | null;
  signal: SignalQuality;

  meta?: {
    userId?: string;
    fullName?: string;
    phone?: string;
  };
}

/* ================= CONSTANTS ================= */

const MAX_MESSAGE = 300;
const MAX_IMAGES = 10;
const MAX_VIDEOS = 3;
const MAX_AUDIOS = 3;

/* ================= USER CONTEXT PLACEHOLDER ================= */

function useUser() {
  return {
    user: {
      id: "demo-user-id",
      fullName: "Demo User",
      phone: "+2340000000000",
    },
  };
}

/* ================= PLACEHOLDER FETCH FUNCTIONS ================= */

async function fetchAnalyzeSos(payload: PreSosData) {
  console.log("📡 [fetchAnalyzeSos] payload:", payload);
  await new Promise(r => setTimeout(r, 400));
  return { ok: true };
}

async function fetchUploadSosMedia(files: {
  audios: File[];
  videos: File[];
  images: File[];
}) {
  console.log("📤 [fetchUploadSosMedia] files:", files);
  await new Promise(r => setTimeout(r, 500));
  return { ok: true };
}

async function fetchCreateSosCase(payload: PreSosData) {
  console.log("🚨 [fetchCreateSosCase] payload:", payload);
  await new Promise(r => setTimeout(r, 700));
  return { ok: true, sosId: `SOS-${Date.now()}` };
}

/* ================= AI SEVERITY ================= */

function analyzeSeverity(input: {
  message: string;
  audios: File[];
  videos: File[];
  images: File[];
}) {
  let score = 0.15;

  if (input.message.length > 80) score += 0.2;
  if (input.audios.length) score += 0.2;
  if (input.videos.length) score += 0.3;
  if (input.images.length) score += 0.15;

  if (score >= 0.7)
    return {
      level: "HIGH" as const,
      score,
      reason: "Multiple strong distress indicators detected",
    };

  if (score >= 0.4)
    return {
      level: "MEDIUM" as const,
      score,
      reason: "Moderate risk indicators present",
    };

  return {
    level: "LOW" as const,
    score,
    reason: "Weak or unreliable emergency signal",
  };
}

/* ================= HELPERS ================= */

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function MediaDuration({
  src,
  type,
  className,
}: {
  src: string;
  type: "audio" | "video";
  className?: string;
}) {
  const [dur, setDur] = useState<string>("--:--");

  useEffect(() => {
    let cancelled = false;

    const el = document.createElement(type);
    el.preload = "metadata";
    el.src = src;

    const cleanup = () => {
      try {
        el.src = "";
      } catch {}
    };

    const finalize = (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setDur(`${mm}:${ss}`);
    };

    el.onloadedmetadata = async () => {
      if (cancelled) return;

      // Many webm recordings return Infinity first
      if (Number.isFinite(el.duration) && el.duration > 0) {
        finalize(el.duration);
        cleanup();
        return;
      }

      // ✅ Force duration calculation by seeking
      try {
        el.currentTime = 999999; // jump far
      } catch {}

      el.ontimeupdate = () => {
        if (cancelled) return;

        if (Number.isFinite(el.duration) && el.duration > 0) {
          finalize(el.duration);
        } else {
          setDur("--:--");
        }

        el.ontimeupdate = null;
        cleanup();
      };
    };

    el.onerror = () => {
      if (cancelled) return;
      setDur("--:--");
      cleanup();
    };

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [src, type]);

  return <span className={className}>{dur}</span>;
}

interface PreSosPanelProps {
  onClose: () => void;
  onStart: () => void;     // move to ACTIVE step
}

/* ================= COMPONENT ================= */

export default function PreSosPanel({ onClose, onStart }: PreSosPanelProps) {
  const { user } = useUser();

  /* ---------- STATE ---------- */
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [audios, setAudios] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [audioPreviews, setAudioPreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);

  const [mode, setMode] = useState<CaptureMode>("NONE");
  const [liveEnabled, setLiveEnabled] = useState(false);

  /* ---------- LIVE HOOKS ---------- */
  const liveAudio = useLiveAudio(liveEnabled ? () => {} : undefined);
  const liveVideo = useLiveVideo(liveEnabled ? () => {} : undefined);
  const camera = useLiveCamera();

  /* ---------- LIMITS ---------- */
  const audioFull = audios.length >= MAX_AUDIOS;
  const videoFull = videos.length >= MAX_VIDEOS;
  const imageFull = images.length >= MAX_IMAGES;

  /* ---------- NOTIFICATION (placeholder) ---------- */
  const notify = (msg: string) => {
    // TODO: replace with your Notification component
    alert(msg);
  };

  const [audioDurations, setAudioDurations] = useState<number[]>([]);
  const [videoDurations, setVideoDurations] = useState<number[]>([]);


  /* ---------- AUDIO METER ---------- */
  const [audioLevel, setAudioLevel] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  /* ---------- DURATION TIMERS ---------- */
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [videoSeconds, setVideoSeconds] = useState(0);

  const audioTimerRef = useRef<number | null>(null);
  const videoTimerRef = useRef<number | null>(null);

  const audioSecondsRef = useRef(0);
  const videoSecondsRef = useRef(0);


  const startAudioTimer = () => {
    stopAudioTimer();
    setAudioSeconds(0);

    audioSecondsRef.current = 0;

    audioTimerRef.current = window.setInterval(() => {
      setAudioSeconds(s => {
        const next = s + 1;
        audioSecondsRef.current = next;
        return next;
      });      
    }, 1000);
  };

  const stopAudioTimer = () => {
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
  };

  const startVideoTimer = () => {
    stopVideoTimer();
    setVideoSeconds(0);
    videoSecondsRef.current = 0;


    videoTimerRef.current = window.setInterval(() => {
      setVideoSeconds(s => {
        const next = s + 1;
        videoSecondsRef.current = next;
        return next;
      });
      
    }, 1000);
  };

  const stopVideoTimer = () => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
  };



  /* ---------- AUDIO METER CONTROL ---------- */
  const startAudioMeter = async () => {
    try {
      const stream = liveAudio.streamRef?.current;
      if (!stream) return;

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;

        setAudioLevel(Math.min(1, avg / 180));
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (e) {
      console.error("Audio meter error:", e);
    }
  };

  const stopAudioMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    analyserRef.current = null;
    setAudioLevel(0);

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  /* ================= HELPERS ================= */

  const stopAndReset = async () => {
    stopAudioMeter();
    stopAudioTimer();
    stopVideoTimer();

    if (liveAudio.recording) {
      try {
        await liveAudio.stop();
      } catch {}
    }

    // prefer stopRecording if you updated useLiveVideo to split preview/record
    if (liveVideo.recording) {
      try {
        if (typeof (liveVideo as any).stopRecording === "function") {
          await (liveVideo as any).stopRecording();
        } else if (typeof (liveVideo as any).stop === "function") {
          await (liveVideo as any).stop();
        }
      } catch {}
    } else {
      // stop preview (if available)
      if (typeof (liveVideo as any).stopPreview === "function") {
        try {
          (liveVideo as any).stopPreview();
        } catch {}
      }
    }

    camera.stopCamera();

    setLiveEnabled(false);
    setMode("NONE");
  };

  const addFiles = (
    files: File[],
    current: File[],
    max: number,
    setter: Dispatch<SetStateAction<File[]>>,
    previewSetter: Dispatch<SetStateAction<string[]>>,
    type: "audio" | "video" | "image"
  ) => {
    if (current.length >= max) {
      notify(`Maximum ${type} limit reached (${max}). Remove one to add more.`);
      haptic("heavy");
      return;
    }

    const valid = files.filter(f => f.type.startsWith(`${type}/`));
    if (!valid.length) {
      notify(`Invalid ${type} file selected.`);
      return;
    }

    const available = max - current.length;
    const accepted = valid.slice(0, available);

    if (valid.length > accepted.length) {
      notify(`You can only add ${available} more ${type}(s).`);
    }

    if (!accepted.length) return;

    setter(prev => {
      const existing = new Set(
        prev.map(f => `${f.name}-${f.size}-${f.lastModified}`)
      );

      return [
        ...prev,
        ...accepted.filter(
          f => !existing.has(`${f.name}-${f.size}-${f.lastModified}`)
        ),
      ];
    });

    previewSetter(prev => [...prev, ...accepted.map(f => URL.createObjectURL(f))]);

    haptic("light");
  };

  const capturePhoto = async () => {
    if (imageFull) {
      notify(`Photo limit reached (${MAX_IMAGES}).`);
      haptic("heavy");
      return;
    }

    const file = await camera.takePhoto();

    addFiles([file], images, MAX_IMAGES, setImages, setImagePreviews, "image");

    camera.stopCamera();
    setMode("NONE");
  };

  const switchMode = async (next: CaptureMode) => {
    await stopAndReset();
  
    // ✅ reset timers always when switching
    setAudioSeconds(0);
    setVideoSeconds(0);
  
    setMode(next);
  };
  

  /* ================= DERIVED ================= */

  const hasSignal =
    message.trim().length > 0 ||
    images.length > 0 ||
    audios.length > 0 ||
    videos.length > 0;

  const severity = useMemo(() => {
    if (!hasSignal) return null;
    return analyzeSeverity({ message, audios, videos, images });
  }, [message, audios, videos, images, hasSignal]);

  const signal: SignalQuality = useMemo(() => {
    if (!severity) return "LOW";
    if (severity.level === "HIGH") return "STRONG";
    if (severity.level === "MEDIUM") return "WEAK";
    return "LOW";
  }, [severity]);

  const payload: PreSosData = useMemo(() => {
    return {
      message,
      audios,
      videos,
      images,
      aiSeverity: severity,
      signal,
      meta: {
        userId: user?.id,
        fullName: user?.fullName,
        phone: user?.phone,
      },
    };
  }, [
    message,
    audios,
    videos,
    images,
    severity,
    signal,
    user?.id,
    user?.fullName,
    user?.phone,
  ]);

  /* ================= EFFECTS ================= */

  useEffect(() => {
    return () => {
      imagePreviews.forEach(URL.revokeObjectURL);
      audioPreviews.forEach(URL.revokeObjectURL);
      videoPreviews.forEach(URL.revokeObjectURL);

      stopAudioMeter();
      stopAudioTimer();
      stopVideoTimer();
      stopAndReset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (severity?.level === "HIGH") haptic("heavy");
  }, [severity?.level]);

  /* ================= ACTIONS ================= */

  const handleStartStopAudio = async () => {
    if (audioFull && !liveAudio.recording) {
      notify(`Audio limit reached (${MAX_AUDIOS}).`);
      haptic("heavy");
      return;
    }

    if (!liveAudio.recording) {
      await liveAudio.start();
      await startAudioMeter();
      startAudioTimer();
      return;
    }

    stopAudioTimer();
    stopAudioMeter();

    const file = await liveAudio.stop();

    const recordedDuration = audioSecondsRef.current;
    setAudioDurations(prev => [...prev, recordedDuration]);
    
    addFiles([file], audios, MAX_AUDIOS, setAudios, setAudioPreviews, "audio");
    await stopAndReset();
  };

  const handleStartStopVideo = async () => {
    if (videoFull && !liveVideo.recording) {
      notify(`Video limit reached (${MAX_VIDEOS}).`);
      haptic("heavy");
      return;
    }

    const hasStartRecording = typeof (liveVideo as any).startRecording === "function";
    const hasStopRecording = typeof (liveVideo as any).stopRecording === "function";

    if (!liveVideo.recording) {
      startVideoTimer();

      if (hasStartRecording) {
        await (liveVideo as any).startRecording();
      } else {
        await liveVideo.startRecording(); // fallback: preview+record together
      }

      return;
    }

    stopVideoTimer();

    const file = hasStopRecording
      ? await (liveVideo as any).stopRecording()
      : await liveVideo.stopRecording();

    const recordedDuration = videoSecondsRef.current;
    setVideoDurations(prev => [...prev, recordedDuration]);

    addFiles([file], videos, MAX_VIDEOS, setVideos, setVideoPreviews, "video");

    await stopAndReset();
  };

  const handleSubmitPreSos = async () => {
    if (!hasSignal) {
      notify("Add a message or attach evidence first.");
      return;
    }
  
    await fetchUploadSosMedia({ audios, videos, images });
    await fetchAnalyzeSos(payload);
    await fetchCreateSosCase(payload);
  
    haptic("medium");
  
    // ✅ MOVE TO ACTIVE STEP
    onStart();
  };
  

  /* ================= UI HELPERS ================= */

  const attachDisabled =
    (mode === "AUDIO" && audioFull) ||
    (mode === "VIDEO" && videoFull) ||
    (mode === "IMAGE" && imageFull);

  const isVideoRecording = !!liveVideo.recording;
  const isAudioRecording = !!liveAudio.recording;

  /* ================= UI ================= */

  return (
    <>
      <textarea
        placeholder="Describe the emergency (optional)…"
        value={message}
        onChange={e => setMessage(e.target.value)}
        maxLength={MAX_MESSAGE}
      />

      <div className={styles.media}>
        <button
          disabled={audioFull}
          onClick={async () => {
            if (audioFull) return notify(`Audio limit reached (${MAX_AUDIOS}).`);
            await switchMode("AUDIO");
          }}
        >
          <FaMicrophone /> Audio
        </button>

        <button
          disabled={videoFull}
          onClick={async () => {
            if (videoFull) return notify(`Video limit reached (${MAX_VIDEOS}).`);
            await switchMode("VIDEO");

            // ✅ auto-start preview when entering video mode
            if (typeof (liveVideo as any).startPreview === "function") {
              await (liveVideo as any).startPreview();
            }
          }}
        >
          <FaVideo /> Video
        </button>

        <button
          disabled={imageFull}
          onClick={async () => {
            if (imageFull) return notify(`Photo limit reached (${MAX_IMAGES}).`);
            await switchMode("IMAGE");
            await camera.startCamera();
          }}
        >
          <FaImage /> Photo
        </button>
      </div>

      {mode !== "NONE" && (
        <div className={styles.capturePanel}>
          <header>
            <strong>
              {mode === "AUDIO" && "Audio Capture"}
              {mode === "VIDEO" && "Video Capture"}
              {mode === "IMAGE" && "Camera"}
            </strong>

            <button onClick={stopAndReset}>✕</button>
          </header>

          {/* ===== VIDEO PREVIEW + RECORDING BADGE ===== */}
          {mode === "VIDEO" && (
            <div className={styles.videoStage}>
              <video ref={liveVideo.videoRef} autoPlay muted playsInline />

              <div className={styles.recordBadge}>
                <span
                  className={`${styles.recDot} ${
                    isVideoRecording ? styles.recDotOn : ""
                  }`}
                />
                <span className={styles.recText}>
                  {isVideoRecording ? "REC" : "LIVE"}
                </span>
                <span className={styles.recTime}>
                  {formatDuration(videoSeconds)}
                </span>
              </div>
            </div>
          )}

          {/* ===== AUDIO METER + TIME ===== */}
          {mode === "AUDIO" && (
            <div className={styles.meterWrap}>
              <div className={styles.audioTopRow}>
                <div className={styles.audioStatus}>
                  <span
                    className={`${styles.recDot} ${
                      isAudioRecording ? styles.recDotOn : ""
                    }`}
                  />
                  <span className={styles.audioLabel}>
                    {isAudioRecording ? "Recording…" : "Mic Ready"}
                  </span>
                </div>

                <div className={styles.audioTime}>
                  {formatDuration(audioSeconds)}
                </div>
              </div>

              <div className={styles.meterBar}>
                <div
                  className={styles.meterFill}
                  style={{ width: `${Math.round(audioLevel * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* ===== IMAGE PREVIEW ===== */}
          {mode === "IMAGE" && (
            <video
              ref={camera.videoRef}
              autoPlay
              playsInline
              muted
              className={styles.cameraPreview}
            />
          )}

          <div className={styles.actions}>
            {mode === "AUDIO" && (
              <button onClick={handleStartStopAudio}>
                {liveAudio.recording ? "Stop Recording" : "Start Recording"}
              </button>
            )}

            {mode === "VIDEO" && (
              <button
                disabled={videoFull && !liveVideo.recording}
                onClick={handleStartStopVideo}
              >
                {liveVideo.recording ? "Stop Recording" : "Record"}
              </button>
            )}

            {mode === "IMAGE" && (
              <button disabled={imageFull} onClick={capturePhoto}>
                Capture Photo
              </button>
            )}

            <label
              className={`${styles.attach} ${attachDisabled ? styles.disabled : ""}`}
              onClick={() => {
                if (attachDisabled) {
                  notify(
                    `Limit reached. Remove a file to attach more ${
                      mode === "AUDIO"
                        ? "audio"
                        : mode === "VIDEO"
                        ? "video"
                        : "images"
                    }.`
                  );
                  haptic("heavy");
                }
              }}
            >
              Attach file
              <input
                type="file"
                hidden
                disabled={attachDisabled}
                accept={
                  mode === "AUDIO"
                    ? "audio/*"
                    : mode === "VIDEO"
                    ? "video/*"
                    : "image/*"
                }
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (mode === "AUDIO") {
                    addFiles([file], audios, MAX_AUDIOS, setAudios, setAudioPreviews, "audio");
                    setAudioDurations(prev => [...prev, 0]);
                  }
                  
                  if (mode === "VIDEO") {
                    addFiles([file], videos, MAX_VIDEOS, setVideos, setVideoPreviews, "video");
                    setVideoDurations(prev => [...prev, 0]);
                  }
                  
                  if (mode === "IMAGE") {
                    addFiles([file], images, MAX_IMAGES, setImages, setImagePreviews, "image");
                  }
                  stopAndReset();
                }}
              />
            </label>

            {mode !== "IMAGE" && (
              <label>
                <input
                  type="checkbox"
                  checked={liveEnabled}
                  onChange={e => setLiveEnabled(e.target.checked)}
                />
                Go Live
              </label>
            )}
          </div>
        </div>
      )}

      {/* ======= PREVIEWS ======= */}

{audioPreviews.length > 0 && (
  <div className={styles.audioList}>
    {audioPreviews.map((src, i) => {
      const f = audios[i];
      const ext = (f?.name?.split(".").pop() || "AUDIO").toUpperCase();

      return (
        <div key={`audio-${i}`} className={styles.audioCard}>
          <div className={styles.mediaHeader}>
          <div className={styles.badgeRow}>
            <span>
            <span className={styles.extBadge}>{ext}</span> 
              {audioDurations[i] ? (
                <span className={styles.badgeDuration}>{formatDuration(audioDurations[i])}</span>
              ) : (
                <MediaDuration key={src} src={src} type="audio" className={styles.badgeDuration} />
              )}
            </span>
            
          </div>

          <button
            className={styles.deleteBtn}
            onClick={() => {
              setAudios(a => a.filter((_, x) => x !== i));
              setAudioPreviews(p => p.filter((_, x) => x !== i));
              setAudioDurations(d => d.filter((_, x) => x !== i)); // ✅ add this

            }}
          >
            <FaTrash />
            <span>Remove</span>
          </button>
          </div>

          <audio controls src={src} className={styles.audioPlayer} />

          <p className={styles.fileName} title={f?.name}>
            {f?.name || "audio-file"}
          </p>

          
        </div>
      );
    })}
  </div>
)}

{/* ===== VIDEO + IMAGES (GRID) ===== */}
{(videoPreviews.length > 0 || imagePreviews.length > 0) && (
  <div className={styles.previewGrid}>
    {/* VIDEO */}
    {videoPreviews.map((src, i) => {
      const f = videos[i];
      const ext = (f?.name?.split(".").pop() || "VIDEO").toUpperCase();

      return (
        <div key={`video-${i}`} className={styles.mediaCard}>
          <div className={styles.mediaHeader}>
          <div className={styles.badgeRow}>
            <span className={styles.extBadge}>{ext}</span>
              {videoDurations[i] ? (
                <span className={styles.badgeDuration}>{formatDuration(videoDurations[i])}</span>
              ) : (
                <MediaDuration key={src} src={src} type="video" className={styles.badgeDuration} />
              )}
            </div>
          <button
            className={styles.deleteBtn}
            onClick={() => {
              setVideos(v => v.filter((_, x) => x !== i));
              setVideoPreviews(p => p.filter((_, x) => x !== i));
              setVideoDurations(d => d.filter((_, x) => x !== i));

            }}
          >
            <FaTrash />
            <span>Remove</span>
          </button>
          </div>

          <div className={styles.mediaBody}>
            <video controls src={src} className={styles.videoPlayer} />
            <p className={styles.fileName} title={f?.name}>
              {f?.name || "video-file"}
            </p>
          </div>

          
        </div>
      );
    })}

    {/* IMAGES */}
    {imagePreviews.map((src, i) => {
      const f = images[i];
      const ext = (f?.name?.split(".").pop() || "IMG").toUpperCase();

      return (
        <div key={`img-${i}`} className={styles.mediaCard}>
          <div className={styles.mediaHeader}>
          <div className={styles.badgeRow}>
            <span className={styles.extBadge}>{ext}</span>
            {/* images don’t have duration */}
            <span className={styles.badgeDurationPlaceholder}>—</span>
          </div>
          
          <button
            className={styles.deleteBtn}
            onClick={() => {
              setImages(im => im.filter((_, x) => x !== i));
              setImagePreviews(p => p.filter((_, x) => x !== i));
            }}
          >

              <FaTrash />
            <span>Remove</span>
          </button>
            
          </div>

          <div className={styles.mediaBody}>
            <img src={src} alt="preview" className={styles.imagePlayer} />
            <p className={styles.fileName} title={f?.name}>
              {f?.name || "image-file"}
            </p>
          </div>

          
        </div>
      );
    })}
  </div>
)}

      {/* ======= AI / SIGNAL ======= */}
      {severity && (
        <div className={styles.ai}>
          <FaBrain />
          <span>
            {severity.level} RISK — {severity.reason}
          </span>
        </div>
      )}

      {signal === "LOW" && (
        <div className={styles.warning}>
          <FaExclamationTriangle />
          <p>SOS signal is weak. Add evidence for higher priority.</p>
        </div>
      )}

      {/* ======= SUBMIT ======= */}
      <div className={styles.navRow}>
        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>

        <button
          className={styles.confirm}
          disabled={!hasSignal}
          onClick={handleSubmitPreSos}
        >
          Continue
        </button>
      </div>

    </>
  );
}
