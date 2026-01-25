import { useRef, useState } from "react";
import { LocationPacket } from "./useLocationFusion";

export function useReplayEngine(
  onFrame: (d: LocationPacket) => void
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [playing, setPlaying] = useState(false);

  function start(data: LocationPacket[]) {
    if (!data.length) return;

    setPlaying(true);
    let i = 0;

    timerRef.current = setInterval(() => {
      onFrame(data[i]);
      i++;

      if (i >= data.length) stop();
    }, 1000);
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }

  return { start, stop, playing };
}
