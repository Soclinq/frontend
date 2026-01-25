export interface Device {
    id: string;
    imei: string;
    sim: string;
    model: string;
  }
  
  export interface DeviceLocation {
    deviceId: string;
    lat: number;
    lng: number;
    ts: string;
  }
  
  export interface MissingDevice {
    deviceId: string;
    lastSeen: string;
    details: string;
    ts: string;
  }
  