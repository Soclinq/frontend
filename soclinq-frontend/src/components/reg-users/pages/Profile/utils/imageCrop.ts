export async function cropImage(
    file: File,
    size = 256
  ): Promise<string> {
    const img = new Image();
    img.src = URL.createObjectURL(file);
  
    await new Promise((res) => (img.onload = res));
  
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
  
    const ctx = canvas.getContext("2d")!;
    const min = Math.min(img.width, img.height);
  
    ctx.drawImage(
      img,
      (img.width - min) / 2,
      (img.height - min) / 2,
      min,
      min,
      0,
      0,
      size,
      size
    );
  
    return canvas.toDataURL("image/jpeg", 0.9);
  }
  