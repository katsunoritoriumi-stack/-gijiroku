import { Link } from "react-router-dom";
import type { Recording } from "../types";
import { IconFileText } from "./icons";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}分${s.toString().padStart(2, "0")}秒`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<Recording["status"], string> = {
  recording: "録音中",
  recorded: "未処理",
  transcribing: "文字起こし中…",
  transcribed: "文字起こし済み",
  summarizing: "要約中…",
  ready: "完了",
  error: "エラー",
};

export default function RecordingCard({ recording }: { recording: Recording }) {
  const busy = recording.status === "transcribing" || recording.status === "summarizing";
  return (
    <Link
      to={`/recording/${recording.id}`}
      className="glass flex items-center gap-3 rounded-2xl p-4 active:scale-[0.98] transition-transform"
    >
      <div className="shrink-0 w-10 h-10 rounded-xl btn-gradient flex items-center justify-center">
        <IconFileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink truncate">{recording.title}</p>
        <p className="text-sm text-ink-dim mt-0.5">
          {formatDate(recording.createdAt)} ・ {formatDuration(recording.durationSec)}
        </p>
      </div>
      <span
        className={
          "shrink-0 text-xs px-2.5 py-1 rounded-full font-medium " +
          (recording.status === "error"
            ? "bg-record-soft text-record"
            : recording.status === "ready"
              ? "bg-success-soft text-success"
              : busy
                ? "bg-accent-soft text-accent"
                : "bg-white/10 text-ink-dim border border-border")
        }
      >
        {STATUS_LABEL[recording.status]}
      </span>
    </Link>
  );
}
