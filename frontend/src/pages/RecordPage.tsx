import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useRecorder } from "../hooks/useRecorder";
import PageHeader from "../components/PageHeader";
import db from "../db";
import { defaultTitle, formatTime, readAudioDuration } from "../utils";
import { IconMic, IconStop, IconUpload, IconPauseCircle } from "../components/icons";

export default function RecordPage() {
  const navigate = useNavigate();
  const { state, elapsedSec, level, error, start, pause, resume, stop } = useRecorder();
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStop = async () => {
    setSaving(true);
    const result = await stop();
    if (!result) {
      setSaving(false);
      return;
    }
    await db.recordings.add({
      id: result.recordingId,
      title: defaultTitle(),
      createdAt: Date.now(),
      durationSec: result.durationSec,
      status: "recorded",
      mimeType: result.mimeType,
      audio: result.blob,
    });
    navigate(`/recording/${result.recordingId}`, { replace: true });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > 65 * 1024 * 1024) {
      setUploadError("ファイルサイズが大きすぎます（上限65MB）。");
      return;
    }
    setSaving(true);
    const duration = await readAudioDuration(file);
    const id = crypto.randomUUID();
    await db.recordings.add({
      id,
      title: file.name.replace(/\.[^/.]+$/, "") || defaultTitle(),
      createdAt: Date.now(),
      durationSec: duration,
      status: "recorded",
      mimeType: file.type || "audio/mpeg",
      audio: file,
    });
    navigate(`/recording/${id}`, { replace: true });
  };

  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const isActive = isRecording || isPaused;

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="録音" />

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 pb-16">
        {saving ? (
          <p className="text-ink-dim">保存しています…</p>
        ) : (
          <>
            <div className="flex flex-col items-center gap-5">
              <div
                className="text-4xl font-semibold text-ink tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {formatTime(elapsedSec)}
              </div>

              <div className="flex items-end gap-1.5 h-9">
                {isActive &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full btn-gradient transition-all"
                      style={{
                        height: `${8 + Math.min(1, level * (1 + i * 0.3)) * 28}px`,
                        opacity: isPaused ? 0.3 : 1,
                      }}
                    />
                  ))}
              </div>

              <button
                type="button"
                onClick={isActive ? handleStop : start}
                disabled={state === "requesting"}
                className={
                  "w-28 h-28 rounded-full flex items-center justify-center text-white record-gradient glow-shadow-record transition-transform active:scale-95 " +
                  (isActive ? "animate-pulse-record" : "")
                }
                aria-label={isActive ? "録音を終了" : "録音を開始"}
              >
                {state === "requesting" ? (
                  <span className="text-sm">準備中…</span>
                ) : isActive ? (
                  <IconStop className="w-9 h-9" />
                ) : (
                  <IconMic className="w-10 h-10" />
                )}
              </button>

              <div className="h-10 flex items-center">
                {isActive && (
                  <button
                    type="button"
                    onClick={isPaused ? resume : pause}
                    className="glass flex items-center gap-1.5 text-sm font-medium text-ink rounded-full px-4 py-2"
                  >
                    <IconPauseCircle className="w-4 h-4" />
                    {isPaused ? "再開" : "一時停止"}
                  </button>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-record text-center bg-record-soft rounded-xl px-4 py-3">{error}</p>}

            {!isActive && (
              <div className="flex flex-col items-center gap-3 mt-2">
                <p className="text-xs text-ink-faint">または</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="glass flex items-center gap-2 text-sm font-medium rounded-full px-5 py-2.5"
                  style={{ color: "var(--accent-solid)" }}
                >
                  <IconUpload className="w-4 h-4" />
                  音声ファイルを選ぶ
                </button>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
                {uploadError && <p className="text-xs text-record">{uploadError}</p>}
              </div>
            )}

            {isActive && (
              <p className="text-xs text-ink-faint text-center max-w-xs">
                録音中は他のアプリに切り替えないでください（環境によっては録音が中断されます）。
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
