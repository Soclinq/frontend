"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/LiveStreamSection.module.css";

import { authFetch } from "@/lib/authFetch";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNotify } from "@/components/utils/NotificationContext";

import { MdLiveTv, MdLocationOn, MdHistory } from "react-icons/md";

/* ================= TYPES ================= */

type LiveStream = {
  id: string;
  title: string;
  description?: string;
  streamUrl: string; // LiveKit HLS (.m3u8) or replay
  thumbnail?: string;
  distanceKm?: number;
  startedAt?: string;
  endedAt?: string;
  isLive: boolean;
};

const FALLBACK_CENTER = { latitude: 9.082, longitude: 8.6753 };

/* ================= COMPONENT ================= */

export default function LiveStreamSection() {
  const notify = useNotify();
  const { getLocation } = useGeolocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nearest, setNearest] = useState<LiveStream | null>(null);
  const [others, setOthers] = useState<LiveStream[]>([]);
  const [previous, setPrevious] = useState<LiveStream[]>([]);

  const [coords, setCoords] = useState(FALLBACK_CENTER);
  const [version, setVersion] = useState(0); // triggers refetch

  const wsRef = useRef<WebSocket | null>(null);

  /* ================= GET LOCATION ================= */

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const pos = await getLocation();
        if (!mounted) return;
        setCoords({ latitude: pos.latitude, longitude: pos.longitude });
      } catch {
        // silent fallback
      }
    })();

    return () => {
      mounted = false;
    };
  }, [getLocation]);

  /* ================= FETCH STREAMS ================= */

  useEffect(() => {
    let mounted = true;

    async function loadStreams() {
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch(
          `/live/streams/?lat=${coords.latitude}&lng=${coords.longitude}`
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load live streams");
        }

        if (!mounted) return;

        setNearest(data?.nearest || null);
        setOthers(data?.others || []);
        setPrevious(data?.previous7Days || []);
      } catch (err: any) {
        if (!mounted) return;

        setError(err?.message || "Live streams unavailable");

        notify({
          type: "error",
          title: "Live stream error",
          message: err?.message || "Unable to load live streams",
          duration: 4500,
        });

        setNearest(null);
        setOthers([]);
        setPrevious([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStreams();

    return () => {
      mounted = false;
    };
  }, [coords.latitude, coords.longitude, version, notify]);

  /* ================= WEBSOCKET (REAL-TIME UPDATES) ================= */

  useEffect(() => {
    let active = true;

    async function connectWS() {
      try {
        // 1️⃣ Get WS token from backend
        const res = await authFetch("/auth/ws-token/");
        const data = await res.json();

        if (!res.ok || !data?.token) return;

        const ws = new WebSocket(
          `${process.env.NEXT_PUBLIC_WS_URL}/ws/responders/?token=${data.token}`
        );

        wsRef.current = ws;

        ws.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (
              payload?.type === "STREAM_STARTED" ||
              payload?.type === "STREAM_ENDED" ||
              payload?.type === "SEVERITY_UPDATE" ||
              payload?.type === "RECORDING_READY"
            ) {
              setVersion((v) => v + 1); // refetch
            }
          } catch {
            // ignore malformed events
          }
        };

        ws.onerror = () => ws.close();
        ws.onclose = () => {
          wsRef.current = null;
        };
      } catch {
        // WS is optional — fail silently
      }
    }

    connectWS();

    return () => {
      active = false;
      wsRef.current?.close();
    };
  }, []);

  /* ================= HELPERS ================= */

  const nearestStreamUrl = useMemo(() => {
    return nearest?.streamUrl || "";
  }, [nearest]);

  /* ================= UI ================= */

  return (
    <section className={styles.wrap}>
      {/* HEADER */}
      <div className={styles.head}>
        <h3 className={styles.title}>
          <MdLiveTv /> Live Near You
        </h3>

        <div className={styles.meta}>
          <MdLocationOn />
          <span>
            {coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)}
          </span>
        </div>
      </div>

      {/* MAIN LIVE STREAM */}
      <div className={styles.mainCard}>
        {loading ? (
          <div className={styles.skeletonMain}>
            <div className={styles.skeletonVideo} />
            <div className={styles.skeletonText} />
            <div className={styles.skeletonTextSmall} />
          </div>
        ) : error ? (
          <div className={styles.emptyMain}>
            <p className={styles.emptyTitle}>Unable to load stream</p>
            <p className={styles.emptySub}>{error}</p>
          </div>
        ) : nearest ? (
          <>
            <div className={styles.mainTop}>
              {nearest.isLive && <div className={styles.liveBadge}>LIVE</div>}

              <div className={styles.mainInfo}>
                <p className={styles.mainTitle}>{nearest.title}</p>
                <p className={styles.mainDesc}>
                  {nearest.description ||
                    "Streaming a real-time incident nearby."}
                </p>

                {typeof nearest.distanceKm === "number" && (
                  <p className={styles.distance}>
                    Approx. {nearest.distanceKm.toFixed(1)} km away
                  </p>
                )}
              </div>
            </div>

            <div className={styles.player}>
              {nearestStreamUrl ? (
                <video
                  className={styles.video}
                  src={nearestStreamUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  onError={() =>
                    setError("Live stream temporarily unavailable")
                  }
                />
              ) : (
                <div className={styles.connecting}>
                  Connecting to live stream…
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.emptyMain}>
            <p className={styles.emptyTitle}>No live event nearby</p>
            <p className={styles.emptySub}>
              When an emergency stream starts close to your area, it will appear
              here.
            </p>
          </div>
        )}
      </div>

      {/* OTHER LIVE STREAMS */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h4 className={styles.sectionTitle}>Other Live Streams</h4>
          <span className={styles.sectionHint}>Swipe horizontally</span>
        </div>

        {loading ? (
          <div className={styles.rowScroll}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.streamCardSkeleton} />
            ))}
          </div>
        ) : others.length ? (
          <div className={styles.rowScroll}>
            {others.map((s) => (
              <button
                key={s.id}
                className={styles.streamCard}
                onClick={() => setNearest(s)}
              >
                <div className={styles.thumb}>
                  {s.thumbnail ? (
                    <img src={s.thumbnail} alt={s.title} />
                  ) : (
                    <div className={styles.thumbFallback}>LIVE</div>
                  )}
                </div>

                <div className={styles.streamBody}>
                  <p className={styles.streamTitle}>{s.title}</p>
                  {typeof s.distanceKm === "number" && (
                    <p className={styles.streamMeta}>
                      {s.distanceKm.toFixed(1)} km away
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyRow}>No other live streams.</div>
        )}
      </div>

      {/* PREVIOUS STREAMS */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <h4 className={styles.sectionTitle}>
            <MdHistory /> Previous Streams (Last 7 Days)
          </h4>
        </div>

        {loading ? (
          <div className={styles.previousGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.prevCardSkeleton} />
            ))}
          </div>
        ) : previous.length ? (
          <div className={styles.previousGrid}>
            {previous.map((s) => (
              <div key={s.id} className={styles.prevCard}>
                <div className={styles.prevTop}>
                  <span className={styles.prevBadge}>REPLAY</span>
                  <p className={styles.prevTitle}>{s.title}</p>
                </div>

                <a
                  className={styles.prevLink}
                  href={s.streamUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch →
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyPrev}>
            No previous streams in the last 7 days.
          </div>
        )}
      </div>
    </section>
  );
}
