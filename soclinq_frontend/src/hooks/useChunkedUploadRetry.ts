import type { ChatMessage } from "@/types/chat";

export async function retryChunkedUpload(
  msg: ChatMessage,
  sendChunk: (opts: {
    sessionId: string;
    chunkIndex: number;
    file: Blob;
  }) => Promise<void>
) {
  const media = msg.attachments?.[0];
  if (!media || !media.uploadSessionId) return;

  const missing = [];
  for (let i = 0; i < media.totalChunks; i++) {
    if (!media.uploadedChunks.includes(i)) {
      missing.push(i);
    }
  }

  for (const idx of missing) {
    await sendChunk({
      sessionId: media.uploadSessionId,
      chunkIndex: idx,
      file: media.file!,
    });
  }
}
