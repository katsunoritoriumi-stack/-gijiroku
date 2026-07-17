import type { ActionItem, ChatMessage, Summary } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5951";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface SseEvent {
  type: "delta" | "done" | "error";
  text?: string;
  message?: string;
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("webm")) return ".webm";
  if (mimeType.includes("mp4")) return ".mp4";
  if (mimeType.includes("wav")) return ".wav";
  if (mimeType.includes("aac")) return ".aac";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return ".mp3";
  return "";
}

async function readSse(res: Response, onDelta: (fullText: string) => void): Promise<string> {
  if (!res.body) throw new ApiError("応答を読み取れませんでした", 0);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      if (!raw.startsWith("data: ")) continue;
      const evt: SseEvent = JSON.parse(raw.slice(6));
      if (evt.type === "delta" && evt.text) {
        fullText += evt.text;
        onDelta(fullText);
      } else if (evt.type === "done") {
        if (evt.text) fullText = evt.text;
      } else if (evt.type === "error") {
        throw new ApiError(evt.message ?? "処理に失敗しました", 500);
      }
    }
  }
  return fullText;
}

async function parseErrorResponse(res: Response): Promise<never> {
  let message = `サーバーエラー（${res.status}）`;
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch {
    // JSON以外のエラー本文は無視してデフォルトメッセージを使う
  }
  throw new ApiError(message, res.status);
}

export async function transcribeAudio(
  blob: Blob,
  mimeType: string,
  onDelta: (fullText: string) => void
): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, `recording${extensionFor(mimeType)}`);

  const res = await fetch(`${API_BASE}/api/transcribe`, { method: "POST", body: form });
  if (!res.ok) await parseErrorResponse(res);
  return readSse(res, onDelta);
}

interface SummarizeApiResponse {
  summary: string;
  key_points: string[];
  action_items: { task: string; assignee?: string; due?: string }[];
}

export async function summarizeTranscript(
  transcript: string
): Promise<{ summary: Summary; actionItems: ActionItem[] }> {
  const res = await fetch(`${API_BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) await parseErrorResponse(res);
  const data: SummarizeApiResponse = await res.json();
  return {
    summary: { summary: data.summary, keyPoints: data.key_points },
    actionItems: data.action_items.map((a) => ({
      id: crypto.randomUUID(),
      task: a.task,
      assignee: a.assignee,
      due: a.due,
      done: false,
    })),
  };
}

export async function chatAboutRecording(
  transcript: string,
  history: ChatMessage[],
  question: string,
  onDelta: (fullText: string) => void
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
      history: history.map((m) => ({ role: m.role, text: m.text })),
      question,
    }),
  });
  if (!res.ok) await parseErrorResponse(res);
  return readSse(res, onDelta);
}
