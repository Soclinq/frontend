export async function compressVideo(
    file: File,
    maxWidth = 1280,
    maxHeight = 720
  ): Promise<File> {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
  
    await new Promise(res => (video.onloadedmetadata = res));
  
    const scale = Math.min(
      maxWidth / video.videoWidth,
      maxHeight / video.videoHeight,
      1
    );
  
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
  
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream();
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
      videoBitsPerSecond: 1_000_000,
    });
  
    const chunks: BlobPart[] = [];
  
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.start();
  
    video.play();
  
    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (!video.paused && !video.ended) {
        requestAnimationFrame(draw);
      }
    };
    draw();
  
    await new Promise(res => (video.onended = res));
    recorder.stop();
  
    await new Promise(res => (recorder.onstop = res));
  
    return new File(chunks, "sos-video.webm", { type: "video/webm" });
  }
  

  export async function compressAudio(file: File): Promise<File> {
    const ctx = new AudioContext({ sampleRate: 16000 });
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
  
    const source = ctx.createBufferSource();
    source.buffer = buffer;
  
    const dest = ctx.createMediaStreamDestination();
    source.connect(dest);
    source.start();
  
    const recorder = new MediaRecorder(dest.stream, {
      mimeType: "audio/webm; codecs=opus",
      audioBitsPerSecond: 32000,
    });
  
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => chunks.push(e.data);
  
    recorder.start();
    await new Promise(res => setTimeout(res, buffer.duration * 1000));
    recorder.stop();
  
    await new Promise(res => (recorder.onstop = res));
  
    return new File(chunks, "sos-audio.webm", { type: "audio/webm" });
  }


  