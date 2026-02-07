import { useCallback, useEffect, useRef, useState } from "react";
import { openDB } from "idb";

/* ================= Types ================= */

type UploadJob = {
  jobId: string;
  file: File;
  threadId: string;
  clientTempId: string;
  uploadedBytes: number;
  chunkSize: number;
};

type Params = {
  uploadEndpoint: string;
  maxParallel?: number;
  chunkSize?: number;
};

type ProgressMap = Record<string, number>;

/* ================= IndexedDB ================= */

const DB_NAME = "chat-upload-db";
const STORE = "uploads";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: "jobId" });
    }
  },
});

/* ================= Hook ================= */

export function useChatUploads({
  uploadEndpoint,
  maxParallel = 2,
  chunkSize = 1024 * 1024 * 2, // 2MB
}: Params) {
  const queueRef = useRef<UploadJob[]>([]);
  const activeRef = useRef(0);

  const [progress, setProgress] = useState<ProgressMap>({});

  /* ================= persistence ================= */

  const persistJob = async (job: UploadJob) => {
    const db = await dbPromise;
    await db.put(STORE, job);
  };

  const removeJob = async (jobId: string) => {
    const db = await dbPromise;
    await db.delete(STORE, jobId);
  };

  const loadPersistedJobs = async () => {
    const db = await dbPromise;
    return (await db.getAll(STORE)) as UploadJob[];
  };

  /* ================= upload core ================= */

  const uploadChunk = async (
    job: UploadJob,
    start: number,
    end: number
  ) => {
    const blob = job.file.slice(start, end);

    const form = new FormData();
    form.append("file", blob);
    form.append("clientTempId", job.clientTempId);
    form.append("offset", String(start));

    const res = await fetch(uploadEndpoint, {
      method: "POST",
      body: form,
      credentials: "include",
    });

    if (!res.ok) throw new Error("Chunk upload failed");
  };

  const processJob = async (job: UploadJob) => {
    activeRef.current++;

    try {
      while (job.uploadedBytes < job.file.size) {
        const nextEnd = Math.min(
          job.uploadedBytes + job.chunkSize,
          job.file.size
        );

        await uploadChunk(job, job.uploadedBytes, nextEnd);

        job.uploadedBytes = nextEnd;
        await persistJob(job);

        setProgress((p) => ({
          ...p,
          [job.clientTempId]: Math.round(
            (job.uploadedBytes / job.file.size) * 100
          ),
        }));
      }

      await removeJob(job.jobId);
      setProgress((p) => {
        const { [job.clientTempId]: _, ...rest } = p;
        return rest;
      });
    } finally {
      activeRef.current--;
      runQueue();
    }
  };

  /* ================= scheduler ================= */

  const runQueue = useCallback(() => {
    if (activeRef.current >= maxParallel) return;
    const next = queueRef.current.shift();
    if (!next) return;

    processJob(next);
  }, [maxParallel]);

  /* ================= public API ================= */

  const enqueueUpload = useCallback(
    async (file: File, opts: { threadId: string; clientTempId: string }) => {
      const job: UploadJob = {
        jobId: `${opts.clientTempId}-${file.name}`,
        file,
        threadId: opts.threadId,
        clientTempId: opts.clientTempId,
        uploadedBytes: 0,
        chunkSize,
      };

      await persistJob(job);
      queueRef.current.push(job);
      runQueue();
    },
    [chunkSize, runQueue]
  );

  /* ================= resume on mount ================= */

  useEffect(() => {
    (async () => {
      const persisted = await loadPersistedJobs();
      if (persisted.length) {
        queueRef.current.push(...persisted);
        runQueue();
      }
    })();
  }, [runQueue]);

  /* ================= API ================= */

  return {
    enqueueUpload,
    uploadProgress: progress, // % per clientTempId
  };
}
