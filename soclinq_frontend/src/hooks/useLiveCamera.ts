"use client";

import { useRef } from "react";

export function useLiveCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    stopCamera();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const takePhoto = async (): Promise<File> => {
    const video = videoRef.current!;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    canvas.getContext("2d")!.drawImage(video, 0, 0);

    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve(
          new File([blob!], `photo-${Date.now()}.jpg`, {
            type: "image/jpeg",
          })
        );
      }, "image/jpeg", 0.85);
    });
  };

  return { videoRef, startCamera, stopCamera, takePhoto, streamRef };
}
