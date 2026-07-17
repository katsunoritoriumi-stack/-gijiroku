import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useRecorder } from "../hooks/useRecorder";
import PageHeader from "../components/PageHeader";
import db from "../db";
import { defaultTitle, formatTime, readAudioDuration } from "../utils";

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
            <div className="flex flex-col items-center gap-4">
              <div className="text-3xl font-semibold text-ink tabular-nums">{formatTime(elapsedSec)}</div>

              {isActive && (
                <div className="flex items-center gap-1 h-8">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-accent transition-all"
                      style={{
                        height: `${8 + Math.min(1, level * (1 + i * 0.3)) * 24}px`,
                        opacity: isPaused ? 0.3 : 1,
                      }}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={isActive ? handleStop : start}
                disabled={state === "requesting"}
                className={
                  "w-24 h-24 rounded-full flex items-center justify-center text-white shadow-shadow-md transition-transform active:scale-95 " +
                  (isActive ? "bg-record animate-pulse-record" : "bg-record")
                }
                aria-label={isActive ? "録音を終了" : "録音を開始"}
              >
                {state === "requesting" ? (
                  <span className="text-sm">準備中…</span>
                ) : isActive ? (
                  <span className="w-6 h-6 rounded-md bg-white" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-white" />
                )}
              </button>

              <div className="h-10 flex items-center">
                {isActive && (
                  <button
                    type="button"
                    onClick={isPaused ? resume : pause}
                    className="text-sm font-medium text-ink-dim border border-border rounded-full px-4 py-1.5"
                  >
                    {isPaused ? "再開" : "一時停止"}
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-record text-center bg-record-soft rounded-xl px-4 py-3">{error}</p>
            )}

            {!isActive && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <p className="text-xs text-ink-faint">または</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-accent border border-accent-soft bg-accent-soft rounded-full px-5 py-2.5"
                >
                  音声ファイルを選ぶ
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFile}
                />
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
