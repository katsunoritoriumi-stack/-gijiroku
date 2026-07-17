export type RecordingStatus =
  | "recording"
  | "recorded"
  | "transcribing"
  | "transcribed"
  | "summarizing"
  | "ready"
  | "error";

export interface TranscriptSegment {
  start: number;
  speaker?: string;
  text: string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee?: string;
  due?: string;
  done: boolean;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  ts: number;
}

export interface Summary {
  summary: string;
  keyPoints: string[];
}

export interface Recording {
  id: string;
  title: string;
  createdAt: number;
  durationSec: number;
  status: RecordingStatus;
  mimeType: string;
  audio?: Blob;
  transcriptSegments?: TranscriptSegment[];
  transcriptText?: string;
  summary?: Summary;
  actionItems?: ActionItem[];
  chatHistory?: ChatMessage[];
  errorMessage?: string;
}

export interface AudioChunk {
  id: string;
  recordingId: string;
  seq: number;
  blob: Blob;
  mimeType: string;
}
