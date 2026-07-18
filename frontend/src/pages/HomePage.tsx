import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../db";
import RecordingCard from "../components/RecordingCard";
import { IconMic, IconSettings } from "../components/icons";

export default function HomePage() {
  const recordings = useLiveQuery(() => db.recordings.orderBy("createdAt").reverse().toArray(), []);

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-ink" style={{ fontFamily: "var(--font-display)" }}>
          議事録メーカー
        </h1>
        <Link to="/settings" className="glass w-10 h-10 rounded-full flex items-center justify-center text-ink-dim" aria-label="設定">
          <IconSettings className="w-5 h-5" />
        </Link>
      </header>

      <main className="flex-1 px-5 pb-28">
        {recordings === undefined ? null : recordings.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center gap-4 px-6">
            <div className="w-20 h-20 rounded-3xl btn-gradient flex items-center justify-center">
              <IconMic className="w-9 h-9" />
            </div>
            <p className="text-ink font-medium text-lg">まだ録音がありません</p>
            <p className="text-sm text-ink-dim leading-relaxed">
              右下のボタンから会議を録音するか、音声ファイルをアップロードして文字起こしを始めましょう。
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 mt-2">
            {recordings.map((r) => (
              <li key={r.id}>
                <RecordingCard recording={r} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-8 flex justify-center pointer-events-none">
        <Link
          to="/record"
          className="pointer-events-auto flex items-center gap-2.5 btn-gradient font-medium px-6 py-3.5 rounded-full glow-shadow"
        >
          <IconMic className="w-5 h-5" />
          録音する
        </Link>
      </div>
    </div>
  );
}
