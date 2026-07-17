import type { TranscriptSegment } from "./types";

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function defaultTitle(date = new Date()): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `録音 ${y}/${m}/${d} ${hh}:${mm}`;
}

export function parseTranscript(text: string): TranscriptSegment[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const timestampRe = /^\[(\d{1,2}):(\d{2})\]\s*(.*)$/;
  const speakerRe = /^(話者[^\s:：]{1,6}|[^\s:：]{1,12})[:：]\s*(.*)$/;
  const segments: TranscriptSegment[] = [];

  for (const line of lines) {
    const m = line.match(timestampRe);
    if (!m) {
      if (segments.length > 0) segments[segments.length - 1].text += ` ${line}`;
      continue;
    }
    const [, mm, ss, rest] = m;
    const start = Number(mm) * 60 + Number(ss);
    const speakerMatch = rest.match(speakerRe);
    if (speakerMatch) {
      segments.push({ start, speaker: speakerMatch[1], text: speakerMatch[2] });
    } else {
      segments.push({ start, text: rest });
    }
  }
  return segments;
}

export function readAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const el = new Audio();
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}
