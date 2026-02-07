import { openDB } from "idb";

export const mediaDB = openDB("soclinq-media", 1, {
  upgrade(db) {
    db.createObjectStore("media", { keyPath: "id" });
  },
});

export async function saveMedia(id: string, file: File) {
  const db = await mediaDB;
  await db.put("media", { id, file });
}

export async function getMedia(id: string): Promise<File | null> {
  const db = await mediaDB;
  const item = await db.get("media", id);
  return item?.file ?? null;
}

export async function deleteMedia(id: string) {
  const db = await mediaDB;
  await db.delete("media", id);
}
