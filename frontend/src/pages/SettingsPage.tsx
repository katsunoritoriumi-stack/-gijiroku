import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import db from "../db";
import { IconTrash } from "../components/icons";

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

      <main className="flex-1 px-5 py-4 flex flex-col gap-4">
        <section className="glass rounded-2xl p-4 text-sm text-ink-dim leading-relaxed">
          <p>
            録音・文字起こし・要約・チャット履歴はすべてこの端末のブラウザ内（IndexedDB）にのみ保存されます。サーバーには保存されません。
          </p>
          <p className="mt-2">
            文字起こし・要約・チャットの処理中は、音声や文字起こしがGemini
            APIに一時的に送信されます。この処理はサーバーを経由しますが、サーバー側にはデータを保存しません。
          </p>
        </section>

        <section className="glass rounded-2xl p-4">
          <p className="font-medium text-ink mb-1 flex items-center gap-1.5">
            <IconTrash className="w-4 h-4 text-record" />
            データを全て削除
          </p>
          <p className="text-sm text-ink-dim mb-3">
            この端末に保存されている全ての録音・文字起こし・要約・チャット履歴を削除します。元に戻せません。
          </p>
          {confirming ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-sm font-medium text-white record-gradient rounded-full px-4 py-2.5 min-h-[44px]"
              >
                本当に削除する
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="glass text-sm font-medium text-ink-dim rounded-full px-4 py-2.5 min-h-[44px]"
              >
                やめる
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-sm font-medium text-record bg-record-soft rounded-full px-4 py-2.5 min-h-[44px]"
            >
              全データを削除
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
