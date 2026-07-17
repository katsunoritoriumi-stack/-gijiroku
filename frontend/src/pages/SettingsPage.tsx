import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import db from "../db";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const handleClearAll = async () => {
    await db.recordings.clear();
    await db.audioChunks.clear();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader title="設定" />

      <main className="flex-1 px-5 py-4 flex flex-col gap-6">
        <section className="rounded-2xl bg-paper-raised border border-border p-4 text-sm text-ink-dim leading-relaxed">
          <p>
            録音・文字起こし・要約・チャット履歴はすべてこの端末のブラウザ内（IndexedDB）にのみ保存されます。サーバーには保存されません。
          </p>
          <p className="mt-2">
            文字起こし・要約・チャットの処理中は、音声や文字起こしがGemini
            APIに一時的に送信されます。この処理はサーバーを経由しますが、サーバー側にはデータを保存しません。
          </p>
        </section>

        <section className="rounded-2xl border border-record-soft p-4">
          <p className="font-medium text-ink mb-1">データを全て削除</p>
          <p className="text-sm text-ink-dim mb-3">
            この端末に保存されている全ての録音・文字起こし・要約・チャット履歴を削除します。元に戻せません。
          </p>
          {confirming ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-sm font-medium text-white bg-record rounded-full px-4 py-2"
              >
                本当に削除する
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-sm font-medium text-ink-dim border border-border rounded-full px-4 py-2"
              >
                やめる
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-sm font-medium text-record border border-record-soft bg-record-soft rounded-full px-4 py-2"
            >
              全データを削除
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
