"use client";

import styles from "./styles/ActiveSosPanel.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { FaMapMarkerAlt } from "react-icons/fa";

import { useLeafletMap } from "@/hooks/useLeafletMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getSocket } from "@/lib/socket";

import { useLiveVideo } from "@/hooks/useLiveVideo";

/* ================= TYPES ================= */

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type Responder = {
  id: string;
  lat: number;
  lng: number;
  role: "POLICE" | "MEDIC" | "VOLUNTEER";
};

/* ================= CONSTANTS ================= */

const DANGER_RADIUS = 300;
const MAX_TEXT = 600;

/* ================= HELPERS ================= */

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function safeVibrate(pattern: number | number[]) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {}
}

/* ================= COMPONENT ================= */

export default function ActiveSosPanel({ onClose }: { onClose?: () => void }) {
  const socket = useRef(getSocket()).current;

  /* ===== MAP ===== */
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
const [hasLocation, setHasLocation] = useState(false);

  const userMarker = useRef<L.Marker | null>(null);
  const dangerCircle = useRef<L.Circle | null>(null);
  const responderMarkers = useRef<Map<string, L.Marker>>(new Map());

  /* ===== GEO ===== */
  const { watchPosition, clearWatch } = useGeolocation();

  /* ===== STATE ===== */
  const [risk, setRisk] = useState<RiskLevel>("LOW");
  const [responders, setResponders] = useState<Responder[]>([]);
  const [elapsed, setElapsed] = useState(0);

  /* ===== LIVE UI ===== */
  const [showLive, setShowLive] = useState(false);
  const [disableVideo, setDisableVideo] = useState(false);
  const [disableAudio, setDisableAudio] = useState(false);

  /* ===== TEXT STREAM ===== */
  const [text, setText] = useState("");
  const [sendingText, setSendingText] = useState(false);

  /* ===== FULLSCREEN ===== */
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ===== RECORD TIMER ===== */
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef<number | null>(null);

  /* ===== TOAST ===== */
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useLeafletMap(mapContainerRef, {
    center: [9.082, 8.6753],
    zoom: 15,
  });

  const notify = (msg: string, vibrate = false) => {
    setToast(msg);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (vibrate) safeVibrate([60, 70, 60]);

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2400);
  };

  /* ===== LIVE VIDEO HOOK ===== */
  const liveVideo = useLiveVideo(blob => {
    socket.emit("sos:stream:video", blob);
  });

  const isRecording = !!liveVideo.recording;

  /* ================= TIMER ================= */

  useEffect(() => {
    const timer = setInterval(() => setElapsed(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ================= RECORD TIMER ================= */

  const startRecTimer = () => {
    stopRecTimer();
    setRecSeconds(0);
    recTimerRef.current = window.setInterval(() => {
      setRecSeconds(s => s + 1);
    }, 1000);
  };

  const stopRecTimer = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  };

  /* ================= MAP HELPERS ================= */

  const updateUserLocation = (lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;

    // ✅ create marker immediately
    if (!userMarker.current) {
      userMarker.current = L.marker([lat, lng]).addTo(map);
    } else {
      userMarker.current.setLatLng([lat, lng]);
    }

    // ✅ danger circle immediately
    if (!dangerCircle.current) {
      dangerCircle.current = L.circle([lat, lng], {
        radius: DANGER_RADIUS,
        color: "#dc2626",
        fillOpacity: 0.25,
      }).addTo(map);
    } else {
      dangerCircle.current.setLatLng([lat, lng]);
    }

    map.flyTo([lat, lng], 16, { animate: true });
  };

  const updateResponders = (list: Responder[]) => {
    const map = mapRef.current;
    if (!map) return;

    const existing = responderMarkers.current;
    const incomingIds = new Set(list.map(r => r.id));

    // remove old responders
    for (const [id, marker] of existing.entries()) {
      if (!incomingIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    // add / update responders
    list.forEach(r => {
      if (!existing.has(r.id)) {
        const marker = L.marker([r.lat, r.lng], {
          icon: L.divIcon({
            className: styles.responderMarker,
            html: `<span>${r.role}</span>`,
          }),
        }).addTo(map);

        existing.set(r.id, marker);
      } else {
        existing.get(r.id)!.setLatLng([r.lat, r.lng]);
      }
    });
  };

  /* ================= LIVE LOCATION (ALWAYS ON) ================= */

  useEffect(() => {
    // ✅ always start tracking immediately (no map dependency)
    watchPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
  
        lastCoordsRef.current = { lat: latitude, lng: longitude };
        setHasLocation(true);
  
        // ✅ if map already exists, update marker instantly
        updateUserLocation(latitude, longitude);
  
        // ✅ always emit location (even if no responders)
        socket.emit("sos:location", {
          lat: latitude,
          lng: longitude,
          accuracy,
          ts: Date.now(),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      } as any
    );
  
    return () => clearWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  useEffect(() => {
    let tries = 0;
  
    const t = setInterval(() => {
      const map = mapRef.current;
      if (!map) {
        tries += 1;
        if (tries > 30) clearInterval(t); // stop after ~3s
        return;
      }
  
      if (lastCoordsRef.current) {
        updateUserLocation(lastCoordsRef.current.lat, lastCoordsRef.current.lng);
      }
  
      clearInterval(t);
    }, 100);
  
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  
  /* ================= SOCKET LISTENERS ================= */

  useEffect(() => {
    socket.on("sos:risk", (r: RiskLevel) => setRisk(r));

    socket.on("sos:responders", (list: Responder[]) => {
      setResponders(list);
      updateResponders(list);

      if (list.length > 0) {
        notify("✅ Responder nearby!", true);
      }
    });

    return () => {
      socket.off("sos:risk");
      socket.off("sos:responders");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= FULLSCREEN ================= */

  const enterFullscreen = async () => {
    try {
      if (!stageRef.current) return;
      await stageRef.current.requestFullscreen();
    } catch {}
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  /* ================= DISABLE RULE (CAN'T DISABLE BOTH) ================= */

  const tryToggleAudio = () => {
    const next = !disableAudio;

    if (next === true && disableVideo) {
      notify("⚠️ You can't disable both audio and video.", true);
      return;
    }

    setDisableAudio(next);
    notify(next ? "🎙 Audio OFF" : "🎙 Audio ON");
  };

  const tryToggleVideo = () => {
    const next = !disableVideo;

    if (next === true && disableAudio) {
      notify("⚠️ You can't disable both audio and video.", true);
      return;
    }

    setDisableVideo(next);
    notify(next ? "📷 Video OFF" : "📷 Video ON");
  };

  /* ================= APPLY TRACK MUTING LIVE ================= */

  useEffect(() => {
    const stream = (liveVideo as any).streamRef?.current as MediaStream | undefined;
    if (!stream) return;

    stream.getVideoTracks().forEach(t => (t.enabled = !disableVideo));
    stream.getAudioTracks().forEach(t => (t.enabled = !disableAudio));
  }, [disableVideo, disableAudio, liveVideo]);

  /* ================= GO LIVE FLOW ================= */

  const openGoLive = async () => {
    setShowLive(true);
  
    try {
      if (typeof (liveVideo as any).startPreview === "function") {
        await (liveVideo as any).startPreview();
      } else if (typeof (liveVideo as any).start === "function") {
        await (liveVideo as any).start(); // fallback preview+record together
      }
  
      notify("📹 Camera opened");
    } catch {
      notify("❌ Unable to open camera");
    }
  };
  
  const closeGoLive = async () => {
    stopRecTimer();

    try {
      if (isRecording) {
        if (typeof (liveVideo as any).stopRecording === "function") {
          await (liveVideo as any).stopRecording();
        } else if (typeof (liveVideo as any).stop === "function") {
          await (liveVideo as any).stop();
        }
      } else {
        if (typeof (liveVideo as any).stopPreview === "function") {
          await (liveVideo as any).stopPreview();
        }
      }
    } catch {}

    setShowLive(false);
    setDisableAudio(false);
    setDisableVideo(false);
    setRecSeconds(0);
  };

  const handleRecord = async () => {
    try {
      if (!isRecording) {
        startRecTimer();
        notify("🔴 Recording started", true);

        // ✅ record BOTH audio+video by default
        if (typeof (liveVideo as any).startRecording === "function") {
          await (liveVideo as any).startRecording();
        } else if (typeof (liveVideo as any).start === "function") {
          await (liveVideo as any).start();
        }

        return;
      }

      stopRecTimer();
      notify("✅ Recording stopped");

      if (typeof (liveVideo as any).stopRecording === "function") {
        await (liveVideo as any).stopRecording();
      } else if (typeof (liveVideo as any).stop === "function") {
        await (liveVideo as any).stop();
      }
    } catch {
      notify("❌ Could not start/stop recording");
    }
  };

  /* ================= LIVE TEXT SENDER ================= */

  const canSendText = text.trim().length > 0 && !sendingText;

  const sendText = async () => {
    const value = text.trim();
    if (!value) return;

    setSendingText(true);

    try {
      socket.emit("sos:stream:text", {
        message: value,
        ts: Date.now(),
      });

      notify("✅ Message sent");
      setText(""); // ✅ allow continuous typing
    } catch {
      notify("❌ Failed to send message");
    } finally {
      setSendingText(false);
    }
  };

  /* ================= CLEANUP ================= */

  useEffect(() => {
    return () => {
      stopRecTimer();
      closeGoLive().catch(() => {});
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= UI ================= */

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel}>
        {/* STATUS */}
        <div className={styles.status}>
          <span className={`${styles.badge} ${styles[risk.toLowerCase()]}`}>
            {risk} RISK
          </span>

          <span className={styles.timer}>
            Active for {Math.floor(elapsed / 60)}:
            {(elapsed % 60).toString().padStart(2, "0")}
          </span>
        </div>

        {/* TOAST */}
        {toast && <div className={styles.toast}>{toast}</div>}

        {/* LIVE TEXT (CONTINUOUS) */}
        <div className={styles.textBox}>
          <textarea
            className={styles.textArea}
            value={text}
            maxLength={MAX_TEXT}
            placeholder="Send updates (e.g. I am bleeding, I’m being chased, I’m safe now...)"
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
          />

          <div className={styles.textFooter}>
            <span className={styles.textCount}>
              {text.length}/{MAX_TEXT}
            </span>

            <button
              className={styles.sendBtn}
              disabled={!canSendText}
              onClick={sendText}
            >
              {sendingText ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        {/* GO LIVE BUTTON */}
        {!showLive && (
          <div className={styles.liveControls}>
            <button className={styles.goLiveBtn} onClick={openGoLive}>
              Go Live
            </button>
          </div>
        )}

        {/* LIVE CAMERA WINDOW */}
        {showLive && (
          <div ref={stageRef} className={styles.cameraStage}>
            <video
              ref={liveVideo.videoRef}
              autoPlay
              muted
              playsInline
              className={styles.cameraVideo}
            />

            {/* FULLSCREEN */}
            <div className={styles.fsControls}>
              {!isFullscreen ? (
                <button onClick={enterFullscreen}>⛶ Fullscreen</button>
              ) : (
                <button onClick={exitFullscreen}>✕ Exit</button>
              )}
            </div>

            {/* RESPONDER ALERT */}
            {responders.length > 0 && (
              <div className={styles.responderToast}>
                ✅ {responders.length} responder(s) nearby
              </div>
            )}

            {/* REC BADGE */}
            <div className={styles.recBadge}>
              <span className={`${styles.recDot} ${isRecording ? styles.recDotOn : ""}`} />
              <span className={styles.recText}>{isRecording ? "REC" : "LIVE"}</span>
              <span className={styles.recTime}>{formatDuration(recSeconds)}</span>
            </div>

            {/* ✅ CANCEL OPTIONS */}
            <div className={styles.cancelRow}>
              <button
                className={`${styles.cancelBtn} ${disableAudio ? styles.cancelActive : ""}`}
                onClick={tryToggleAudio}
              >
                {disableAudio ? "🎙 Audio OFF" : "🎙 Audio ON"}
              </button>

              <button
                className={`${styles.cancelBtn} ${disableVideo ? styles.cancelActive : ""}`}
                onClick={tryToggleVideo}
              >
                {disableVideo ? "📷 Video OFF" : "📷 Video ON"}
              </button>
            </div>

            {/* BOTTOM CONTROLS */}
            <div className={styles.cameraBottom}>
              <button
                className={isRecording ? styles.stopBtn : styles.recordBtn}
                onClick={handleRecord}
              >
                {isRecording ? "■ Stop" : "● Record"}
              </button>

              <button className={styles.closeLiveBtn} onClick={closeGoLive}>
                Close Live
              </button>
            </div>
          </div>
        )}

        {/* MAP */}
        <div ref={mapContainerRef} className={styles.map} />

        {/* RESPONDERS SUMMARY */}
        {!hasLocation && (
          <div className={styles.locLoading}>
            📡 Getting your live location…
          </div>
          )}

        <div className={styles.responders}>
          <FaMapMarkerAlt />
          {responders.length > 0 ? (
            <p>{responders.length} responder(s) nearby</p>
          ) : (
            <p>Searching for responders…</p>
          )}
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <p>SOS is running in background even if you close this panel.</p>

          {onClose && (
            <button className={styles.closeBtn} onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
