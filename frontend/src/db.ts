import Dexie, { type EntityTable } from "dexie";
import type { Recording, AudioChunk } from "./types";

const db = new Dexie("gijiroku") as Dexie & {
  recordings: EntityTable<Recording, "id">;
  audioChunks: EntityTable<AudioChunk, "id">;
};

db.version(1).stores({
  recordings: "id, createdAt, status",
  audioChunks: "id, recordingId, seq",
});

export default db;

export async function deleteRecording(id: string) {
  await db.transaction("rw", db.recordings, db.audioChunks, async () => {
    await db.audioChunks.where("recordingId").equals(id).delete();
    await db.recordings.delete(id);
  });
}

/**
 * アプリ起動時などに呼ぶ。録音中にクラッシュ/タブ強制終了した場合、
 * 確定保存されなかった audioChunks が残っている可能性があるため、
 * それらを1本の録音として復元する。
 */
export async function recoverOrphanRecordings(): Promise<number> {
  const chunks = await db.audioChunks.toArray();
  if (chunks.length === 0) return 0;

  const byRecording = new Map<string, typeof chunks>();
  for (const chunk of chunks) {
    const list = byRecording.get(chunk.recordingId) ?? [];
    list.push(chunk);
    byRecording.set(chunk.recordingId, list);
  }

  let recovered = 0;
  for (const [recordingId, group] of byRecording) {
    const existing = await db.recordings.get(recordingId);
    if (existing) {
      await db.audioChunks.where("recordingId").equals(recordingId).delete();
      continue;
    }
    group.sort((a, b) => a.seq - b.seq);
    const mimeType = group[0].mimeType;
    const blob = new Blob(
      group.map((c) => c.blob),
      { type: mimeType }
    );
    await db.recordings.add({
      id: recordingId,
      title: `復元された録音 ${new Date().toLocaleString("ja-JP")}`,
      createdAt: Date.now(),
      durationSec: 0,
      status: "recorded",
      mimeType,
      audio: blob,
    });
    await db.audioChunks.where("recordingId").equals(recordingId).delete();
    recovered++;
  }
  return recovered;
}
