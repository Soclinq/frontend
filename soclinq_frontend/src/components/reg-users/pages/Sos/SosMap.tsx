"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";

import styles from "./styles/SosMap.module.css";
import {
  FaLocationArrow,
  FaCompass,
  FaPlay,
  FaStop,
  FaBolt,
} from "react-icons/fa";

import { getSocket } from "@/lib/socket";

/* ===================== HOOKS ===================== */

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useThrottle } from "@/hooks/useThrottle";
import { useBrowserGPS } from "@/hooks/useBrowserGPS";
import { useIPLocation } from "@/hooks/useIPLocation";
import {
  useLocationFusion,
  LocationPacket,
} from "@/hooks/useLocationFusion";
import { useSosMapCore } from "@/hooks/useSosMapCore";
import { useReplayEngine } from "@/hooks/useReplayEngine";
import { useResponderLayer } from "@/hooks/useResponderLayer";
import { useResponderETA } from "@/hooks/useResponderETA";
import { useAISeverity } from "@/hooks/useAISeverity";
import { useDangerZones } from "@/hooks/useDangerZones";

/* ===================== TYPES ===================== */

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

type SocketLocationPayload = {
  lat?: number;
  lng?: number;
  accuracy?: number;
  history?: [number, number][];
};

type Responder = {
  id: string;
  lat: number;
  lng: number;
  role: "POLICE" | "MEDIC" | "SECURITY";
  speed?: number;
};

/* ===================== COMPONENT ===================== */

export default function SosMap() {
  /* ================= MAP CORE ================= */

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { mapRef, updateLocation } =
    useSosMapCore(mapContainerRef);

  /* ================= SYSTEM STATE ================= */

  /* ================= FULLSCREEN ================= */

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const online = useNetworkStatus();
  const throttle = useThrottle(700);

  const [risk, setRisk] = useState<RiskLevel>("LOW");
  const [heading, setHeading] = useState<number | null>(null);

  /* ================= REPLAY ================= */

  const replayDataRef = useRef<LocationPacket[]>([]);
  const replayEngine = useReplayEngine(frame =>
    fusion.ingest({ ...frame, source: "REPLAY" })
  );

  /* ================= RESPONDERS ================= */

  const responderLayer = useResponderLayer(
    mapRef.current
  );

  function toggleFullscreen() {
    const el = wrapperRef.current;
    if (!el) return;
  
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }
  
  const responderETA = useResponderETA(id => {
    getSocket()?.emit("responder:arrived", {
      responderId: id,
    });
  });

  /* ================= AI SEVERITY ================= */

  const severity = useAISeverity();

  /* ================= DANGER ZONES ================= */

  const dangerZones = useDangerZones(
    mapRef.current,
    zone => {
      getSocket()?.emit("zone:entered", zone);
    },
    zone => {
      getSocket()?.emit("zone:exited", zone);
    }
  );

  /* ================= LOCATION FUSION ================= */

/* ================= LOCATION FUSION ================= */

const lastFusedRef = useRef<LocationPacket | null>(null);

const fusion = useLocationFusion(loc => {
  if (!throttle()) return;

  lastFusedRef.current = loc;

  updateLocation(loc.lat, loc.lng, loc.accuracy);

  const entered = dangerZones.check(loc.lat, loc.lng);

  severity.evaluate({
    speed: undefined,
    accuracy: loc.accuracy,
    risk,
    stationaryTime: 0,
    networkLost: !online,
    hasMedia: false,
    enteredZones: entered,
  });
});


  /* ================= GPS (PRIMARY) ================= */

  useBrowserGPS(gps => {
    fusion.ingest({
      ...gps,
      source: "GPS",
    });
  });

  /* ================= IP FALLBACK ================= */

  useIPLocation(!online, ip => {
    fusion.ingest({
      ...ip,
      source: "IP",
    });
  });

  /* ================= SOCKET ================= */

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("sos:risk", setRisk);

    socket.on("location:update", d => {
      if (replayEngine.playing) return;

      if (d.lat && d.lng) {
        fusion.ingest({
          lat: d.lat,
          lng: d.lng,
          accuracy: d.accuracy ?? 30,
          timestamp: Date.now(),
          source: "SOCKET",
        });
      }

      if (Array.isArray(d.history)) {
        replayDataRef.current = d.history.map(
          ([lat, lng]: [number, number], i: number) => ({
            lat,
            lng,
            accuracy: 30,
            timestamp:
              Date.now() -
              (d.history.length - i) * 1000,
            source: "REPLAY",
          })
        );
      }
    });

    socket.on(
      "responders:update",
      (responders: Responder[]) => {
        responderLayer.update(responders);

        if (lastFusedRef.current) {
          responderETA.compute(
            lastFusedRef.current.lat,
            lastFusedRef.current.lng,
            responders
          );
        }
      }
    );

    return () => {
      socket.off("sos:risk");
      socket.off("location:update");
      socket.off("responders:update");
    };
  }, [risk, online]);

  /* ================= UI ================= */

  return (
    <div
        ref={wrapperRef}
        className={`${styles.mapWrapper} ${
          isFullscreen ? styles.fullscreen : ""
        }`}
      >

      {/* STATUS BAR */}
      <div className={styles.statusBar}>
        <span>
          {replayEngine.playing
            ? "Replay Mode"
            : online
            ? "Live SOS Map"
            : "Offline – Buffering"}
        </span>

        <span
          className={`${styles.risk} ${styles[risk.toLowerCase()]}`}
        >
          {risk}
        </span>

        <span className={styles.severity}>
          {severity.level}
        </span>
      </div>

      {/* MAP */}
      <div
        ref={mapContainerRef}
        className={styles.map}
      />

      {/* REPLAY CONTROLS */}
      <div className={styles.replayControls}>
        <button
          onClick={() =>
            replayEngine.start(
              replayDataRef.current
            )
          }
        >
          <FaPlay />
        </button>
        <button onClick={replayEngine.stop}>
          <FaStop />
        </button>
        {[1, 2, 4].map(v => (
          <button key={v}>
            <FaBolt /> {v}x
          </button>
        ))}
      </div>

      {/* LOCATE */}
      <button
        className={styles.fullscreenBtn}
        onClick={toggleFullscreen}
        aria-label="Toggle fullscreen"
      >
        {isFullscreen ? "⤢" : "⤢"}
      </button>

      <button
        className={styles.locateBtn}
        onClick={() => {
          const map = mapRef.current;
          const loc = lastFusedRef.current;
        
          if (!map || !loc) return;
        
          map.whenReady(() => {
            // ✅ public API, properly typed
            const pane = map.getPane("mapPane");
            if (!pane) return;
        
            map.flyTo(
              [loc.lat, loc.lng],
              16,
              {
                animate:
                  !(
                    navigator.hardwareConcurrency &&
                    navigator.hardwareConcurrency <= 4
                  ),
              }
            );
          });
        }}       
        
      >
        <FaLocationArrow />
      </button>

      {/* COMPASS */}
      {heading !== null && (
        <div
          className={styles.compass}
          style={{
            transform: `rotate(${heading}deg)`,
          }}
        >
          <FaCompass />
        </div>
      )}
    </div>
  );
}
