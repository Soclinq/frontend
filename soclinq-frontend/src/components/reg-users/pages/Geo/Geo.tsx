"use client";

import styles from "./styles/Geo.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLeafletMap } from "@/hooks/useLeafletMap";
import { useUser } from "@/context/UserContext";

import L from "leaflet";
import "leaflet.heat";
import Supercluster from "supercluster";
import { io, Socket } from "socket.io-client";

/* ================= TYPES ================= */

type Zone = "all" | "safe" | "risk";
type Role = "USER" | "RESPONDER" | "ADMIN";

interface GeoSubscription {
  regions: string[];
  zone: Zone;
}

interface Incident {
  id: string;
  lat: number;
  lng: number;
  severity: "low" | "medium" | "high";
  region: string;
  restricted?: boolean;
}

interface SOSPing {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  updatedAt: number;
}

/* ================= CONSTANTS ================= */

const MAP_CENTER: [number, number] = [9.082, 8.6753];
const MAP_ZOOM = 5;

/* ================= PLACEHOLDER FETCH ================= */

async function fetchInitialIncidents(): Promise<Incident[]> {
  return new Promise(resolve =>
    setTimeout(() => {
      resolve([
        {
          id: "1",
          lat: 6.4654,
          lng: 3.4064,
          severity: "high",
          region: "Home",
        },
        {
          id: "2",
          lat: 7.3775,
          lng: 3.947,
          severity: "medium",
          region: "School",
          restricted: true,
        },
      ]);
    }, 600)
  );
}

/* ================= COMPONENT ================= */

export default function Geo() {
  const map = useLeafletMap("geoMap", MAP_CENTER, MAP_ZOOM);
  const { user } = useUser();
  const role: Role = (user?.role ?? "USER") as Role;

  /* ===== STATE ===== */
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sosPings, setSosPings] = useState<Record<string, SOSPing>>({});

  const [subs, setSubs] = useLocalStorage<GeoSubscription>("geoSubs", {
    regions: [],
    zone: "all",
  });

  /* ===== SOCKET ===== */
  const socketRef = useRef<Socket | null>(null);

  /* ===== MAP LAYERS ===== */
  const clusterLayerRef = useRef<L.LayerGroup | null>(null);
  const sosLayerRef = useRef<L.LayerGroup | null>(null);

  /* ===== CLUSTER ENGINE ===== */
  const clusterRef = useRef(
    new Supercluster({
      radius: 60,
      maxZoom: 16,
    })
  );

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    fetchInitialIncidents().then(setIncidents);
  }, []);

  /* ================= SOCKET ================= */

  useEffect(() => {
    const socket = io("wss://placeholder-socket.example", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("incident:new", (incident: Incident) => {
      setIncidents(prev => [...prev, incident]);
    });

    socket.on("sos:update", (ping: SOSPing) => {
      setSosPings(prev => ({
        ...prev,
        [ping.id]: ping,
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /* ================= FILTER INCIDENTS ================= */

  const visibleIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (i.restricted && role === "USER") return false;
      if (!subs.regions.includes(i.region)) return false;
      return true;
    });
  }, [incidents, subs.regions, role]);

  /* ================= BUILD CLUSTERS ================= */

  useEffect(() => {
    if (!map || !(map instanceof L.Map)) return;

    const points = visibleIncidents.map(i => ({
      type: "Feature" as const,
      properties: {
        cluster: false,
        incidentId: i.id,
        severity: i.severity,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [i.lng, i.lat],
      },
    }));

    clusterRef.current.load(points);

  }, [visibleIncidents]);

  /* ================= RENDER CLUSTERS ================= */

  useEffect(() => {
    if (!map || !(map instanceof L.Map)) return;

    if (!clusterLayerRef.current) {
      clusterLayerRef.current = L.layerGroup().addTo(map);
    }

    const updateClusters = () => {
      clusterLayerRef.current!.clearLayers();

      const bounds = map.getBounds();
      const zoom = map.getZoom();

      const clusters = clusterRef.current.getClusters(
        [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ],
        zoom
      );

      clusters.forEach((c: any) => {
        const [lng, lat] = c.geometry.coordinates;

        if (c.properties.cluster) {
          const count = c.properties.point_count;

          L.circleMarker([lat, lng], {
            radius: Math.min(30, 10 + count),
            color: "#4f46e5",
            fillOpacity: 0.6,
          })
            .on("click", () => {
              map.setView([lat, lng], zoom + 2);
            })
            .addTo(clusterLayerRef.current!);
        } else {
          L.circleMarker([lat, lng], {
            radius: 6,
            color:
              c.properties.severity === "high"
                ? "#dc2626"
                : "#f59e0b",
            fillOpacity: 0.9,
          }).addTo(clusterLayerRef.current!);
        }
      });
    };

    updateClusters();
    map.on("moveend", updateClusters);

    return () => {
      map.off("moveend", updateClusters);
    };

  }, [map]);

  /* ================= SOS TRACKING ================= */

  useEffect(() => {
    if (!map || !(map instanceof L.Map)) return;

    if (!sosLayerRef.current) {
      sosLayerRef.current = L.layerGroup().addTo(map);
    }

    sosLayerRef.current.clearLayers();

    Object.values(sosPings).forEach(p => {
      L.circleMarker([p.lat, p.lng], {
        radius: 8,
        color: "#dc2626",
        fillOpacity: 1,
      })
        .bindPopup(`SOS ACTIVE`)
        .addTo(sosLayerRef.current!);
    });

  }, [map, sosPings]);

  /* ================= RENDER ================= */

  return (
    <section className={styles.geo}>
      <header className={styles.header}>
        <h1>Geospatial Intelligence</h1>
        <p>Live incidents, clustering & SOS tracking</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h3>Live Map</h3>
          <div id="geoMap" className={styles.map} />
        </section>

        <section className={styles.panel}>
          <h3>Active SOS</h3>
          {Object.keys(sosPings).length === 0 ? (
            <p className={styles.empty}>No active SOS.</p>
          ) : (
            <ul className={styles.alertList}>
              {Object.values(sosPings).map(s => (
                <li key={s.id}>
                  SOS from {s.userId} • updated{" "}
                  {Math.floor((Date.now() - s.updatedAt) / 1000)}s ago
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
