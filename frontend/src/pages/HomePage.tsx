import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../db";
import RecordingCard from "../components/RecordingCard";

export default function HomePage() {
  const recordings = useLiveQuery(() => db.recordings.orderBy("createdAt").reverse().toArray(), []);

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-ink">議事録メーカー</h1>
        <Link
          to="/settings"
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink-dim border border-border"
          aria-label="設定"
        >
          ⚙
        </Link>
      </header>

      <main className="flex-1 px-5 pb-28">
        {recordings === undefined ? null : recordings.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center gap-3 px-6">
            <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center text-2xl">
              🎙
            </div>
            <p className="text-ink font-medium">まだ録音がありません</p>
            <p className="text-sm text-ink-dim">
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
          className="pointer-events-auto flex items-center gap-2 bg-accent text-accent-ink font-medium px-6 py-3.5 rounded-full shadow-shadow-md"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-record" />
          録音する
        </Link>
      </div>
    </div>
  );
}
