import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { DeviceLocation } from "@/types/tracking";

export function useDeviceTracking(deviceId: string) {
  const socket = getSocket("demo-user-token");
  const [location, setLocation] = useState<DeviceLocation | null>(null);

  useEffect(() => {
    socket.emit("device_register", { deviceId });

    socket.on("device_location", data => {
      setLocation(data);
    });

    return () => {
      socket.off("device_location");
    };
  }, [deviceId]);

  const sendLocation = (lat: number, lng: number) => {
    socket.emit("device_location", {
      deviceId,
      lat,
      lng,
    });
  };

  return { location, sendLocation };
}
