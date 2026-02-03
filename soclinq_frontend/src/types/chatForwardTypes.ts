export type ForwardTargetType = "PRIVATE" | "COMMUNITY";

export type ForwardTarget = {
  id: string;
  type: ForwardTargetType;
  name: string;
  photo?: string | null;
};

export type ForwardMessageLite = {
  id: string;
  text?: string | null;
  deletedAt?: string | null;
  attachments?: Array<{
    id: string;
    type: "IMAGE" | "AUDIO" | "VIDEO" | "FILE";
    url: string;
    thumbnailUrl?: string;
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
    width?: number;
    height?: number;
    durationMs?: number;
  }>;
};
