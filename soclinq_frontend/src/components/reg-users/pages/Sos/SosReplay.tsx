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

import { useLeafletMap } from "@/hooks/useLeafletMap";
import { getSocket } from "@/lib/socket";

/* =====================================================
   TYPES
===================================================== */

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type LocationSource = "SOCKET" | "GPS" | "IP" | "REPLAY";

type Incident = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  risk: RiskLevel;
};

type Responder = {
  id: string;
  lat: number;
  lng: number;
  role: "POLICE" | "MEDIC" | "SECURITY";
};

/* =====================================================
   CONSTANTS
===================================================== */

const DEFAULT_CENTER: [number, number] = [9.082, 8.6753];
const DEFAULT_ZOOM = 6;
const DANGER_RADIUS = 300;

const MAX_JUMP_METERS = 300;
const MAX_ACCURACY = 500;

/* =====================================================
   KALMAN FILTER (2D)
===================================================== */

class Kalman2D {
  lat: number;
  lng: number;
  variance: number;

  constructor(lat: number, lng: number, variance: number) {
    this.lat = lat;
    this.lng = lng;
    this.variance = variance;
  }

  update(lat: number, lng: number, accuracy: number) {
    const k = this.variance / (this.variance + accuracy ** 2);
    this.lat += k * (lat - this.lat);
    this.lng += k * (lng - this.lng);
    this.variance *= 1 - k;
    return [this.lat, this.lng] as [number, number];
  }
}

/* =====================================================
   COMPONENT
===================================================== */

export default function SosMap() {
  /* ================= MAP ================= */

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useLeafletMap(mapContainerRef, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  });

  const markerRef = useRef<L.Marker | null>(null);
  const dangerRef = useRef<L.Circle | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);
  const heatRef = useRef<any>(null);
  const responderLayerRef = useRef<L.LayerGroup | null>(null);

  /* ================= STATE ================= */

  const [risk, setRisk] = useState<RiskLevel>("LOW");
  const [heading, setHeading] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  /* ================= REPLAY STATE ================= */

  const [replayMode, setReplayMode] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 4>(1);
  const [replayIndex, setReplayIndex] = useState(0);
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const replayDataRef = useRef<Incident[]>([]);

  /* ================= LOCATION PIPELINE ================= */

  const kalmanRef = useRef<Kalman2D | null>(null);
  const lastPosRef = useRef<[number, number] | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  function isValidMove(lat: number, lng: number) {
    if (!lastPosRef.current) return true;
    const d = L.latLng(lastPosRef.current).distanceTo([lat, lng]);
    return d < MAX_JUMP_METERS;
  }

  function processLocation(
    incident: Incident,
    source: LocationSource
  ) {
    const map = mapRef.current;
    if (!map) return;

    if (incident.accuracy > MAX_ACCURACY) return;
    if (!isValidMove(incident.lat, incident.lng)) return;

    if (!kalmanRef.current) {
      kalmanRef.current = new Kalman2D(
        incident.lat,
        incident.lng,
        incident.accuracy
      );
    }

    const [lat, lng] = kalmanRef.current.update(
      incident.lat,
      incident.lng,
      incident.accuracy
    );

    lastPosRef.current = [lat, lng];
    lastTimeRef.current = incident.timestamp;

    /* ===== Marker ===== */
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    /* ===== Danger Ring ===== */
    if (!dangerRef.current) {
      dangerRef.current = L.circle([lat, lng], {
        radius: DANGER_RADIUS,
        color: "#dc2626",
        fillOpacity: 0.25,
        className:
          incident.risk === "HIGH"
            ? styles.pulseHigh
            : styles.pulseNormal,
      }).addTo(map);
    } else {
      dangerRef.current.setLatLng([lat, lng]);
    }

    /* ===== Accuracy Ring ===== */
    const color =
      incident.accuracy < 20
        ? "#16a34a"
        : incident.accuracy < 50
        ? "#22c55e"
        : incident.accuracy < 100
        ? "#eab308"
        : "#ef4444";

    if (!accuracyRef.current) {
      accuracyRef.current = L.circle([lat, lng], {
        radius: incident.accuracy,
        color,
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(map);
    } else {
      accuracyRef.current.setLatLng([lat, lng]);
      accuracyRef.current.setRadius(incident.accuracy);
      accuracyRef.current.setStyle({ color });
    }

    map.flyTo([lat, lng], 16, { animate: true });
  }

  /* =====================================================
     REPLAY ENGINE
  ===================================================== */

  function startReplay() {
    if (!replayDataRef.current.length) return;
    setReplayMode(true);

    replayTimerRef.current = setInterval(() => {
      setReplayIndex(i => {
        const next = i + 1;
        if (next >= replayDataRef.current.length) {
          stopReplay();
          return i;
        }

        processLocation(
          replayDataRef.current[next],
          "REPLAY"
        );
        return next;
      });
    }, 1200 / replaySpeed);
  }

  function stopReplay() {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setReplayMode(false);
  }

  /* =====================================================
     SOCKET (LIVE MODE)
  ===================================================== */

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("sos:risk", setRisk);

    socket.on("location:update", (d: any) => {
      if (replayMode) return;

      if (d.lat && d.lng) {
        processLocation(
          {
            lat: d.lat,
            lng: d.lng,
            accuracy: d.accuracy ?? 30,
            timestamp: Date.now(),
            risk,
          },
          "SOCKET"
        );
      }

      if (Array.isArray(d.history)) {
        replayDataRef.current = d.history.map(
          ([lat, lng]: [number, number], i: number) => ({
            lat,
            lng,
            accuracy: 30,
            timestamp: Date.now() - (d.history.length - i) * 1000,
            risk,
          })
        );
      }
    });

    socket.on("responders:update", responders => {
      const map = mapRef.current;
      if (!map) return;

      if (!responderLayerRef.current) {
        responderLayerRef.current = L.layerGroup().addTo(map);
      } else {
        responderLayerRef.current.clearLayers();
      }

      responders.forEach((r: Responder) => {
        L.circleMarker([r.lat, r.lng], {
          radius: 6,
          color:
            r.role === "POLICE"
              ? "#2563eb"
              : r.role === "MEDIC"
              ? "#16a34a"
              : "#f97316",
        }).addTo(responderLayerRef.current!);
      });
    });

    return () => {
      socket.off("sos:risk");
      socket.off("location:update");
      socket.off("responders:update");
    };
  }, [risk, replayMode]);

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className={styles.mapWrapper}>
      {/* STATUS */}
      <div className={styles.statusBar}>
        <span>
          {replayMode ? "Replay Mode" : "Live SOS Map"}
        </span>
        <span className={`${styles.risk} ${styles[risk.toLowerCase()]}`}>
          {risk}
        </span>
      </div>

      {/* MAP */}
      <div ref={mapContainerRef} className={styles.map} />

      {/* CONTROLS */}
      <div className={styles.replayControls}>
        <button onClick={startReplay}>
          <FaPlay />
        </button>
        <button onClick={stopReplay}>
          <FaStop />
        </button>
        {[1, 2, 4].map(v => (
          <button
            key={v}
            onClick={() => setReplaySpeed(v as 1 | 2 | 4)}
          >
            <FaBolt /> {v}x
          </button>
        ))}
      </div>

      {/* LOCATE */}
      <button
        className={styles.locateBtn}
        onClick={() =>
          markerRef.current &&
          mapRef.current?.flyTo(markerRef.current.getLatLng(), 16)
        }
      >
        <FaLocationArrow />
      </button>

      {heading !== null && (
        <div
          className={styles.compass}
          style={{ transform: `rotate(${heading}deg)` }}
        >
          <FaCompass />
        </div>
      )}
    </div>
  );
}
