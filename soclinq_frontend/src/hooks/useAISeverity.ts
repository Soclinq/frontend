import { useRef, useState } from "react";
import { DangerZone } from "./useDangerZones";

type SeverityLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";


  type SeverityInput = {
    speed?: number;
    accuracy: number;
    risk: "LOW" | "MEDIUM" | "HIGH";
    stationaryTime: number;
    networkLost: boolean;
    hasMedia: boolean;
    enteredZones?: DangerZone[];
  };
  

export function useAISeverity() {
  const [score, setScore] = useState(0);
  const [level, setLevel] =
    useState<SeverityLevel>("LOW");

  const lastMoveRef = useRef(Date.now());

  function evaluate(d: SeverityInput) {
    let s = 0;

    // Risk baseline
    if (d.risk === "LOW") s += 50;
    if (d.risk === "MEDIUM") s += 200;
    if (d.risk === "HIGH") s += 400;

    // Accuracy instability
    if (d.accuracy > 200) s += 150;
    if (d.accuracy > 500) s += 300;

    // Speed anomaly (running / crash)
    if (d.speed && d.speed > 8) s += 200;
    if (d.speed && d.speed > 20) s += 400;

    // Stationary too long (possible unconscious)
    if (d.stationaryTime > 30) s += 200;
    if (d.stationaryTime > 60) s += 400;

    if (d.enteredZones?.length) {
        d.enteredZones.forEach(z => {
          if (z.level === "MEDIUM") s += 200;
          if (z.level === "HIGH") s += 400;
          if (z.level === "CRITICAL") s += 600;
        });
      }

    // Network lost during SOS = danger
    if (d.networkLost) s += 150;

    // Media present = intentional SOS
    if (d.hasMedia) s += 100;

    let lvl: SeverityLevel = "LOW";
    if (s > 300) lvl = "MEDIUM";
    if (s > 600) lvl = "HIGH";
    if (s > 850) lvl = "CRITICAL";

    setScore(s);
    setLevel(lvl);

    return { score: s, level: lvl };
  }

  return { score, level, evaluate };
}
