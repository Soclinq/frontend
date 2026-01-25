// src/types/sos.ts
export interface SosAlert {
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  createdAt: string;
}
