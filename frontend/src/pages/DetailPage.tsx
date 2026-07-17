import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import db, { deleteRecording } from "../db";
import PageHeader from "../components/PageHeader";
import AudioPlayer from "../components/AudioPlayer";
import TranscriptView from "../components/TranscriptView";
import SummaryView from "../components/SummaryView";
import ActionItemsView from "../components/ActionItemsView";
import ChatPanel from "../components/ChatPanel";
import { transcribeAudio, summarizeTranscript, ApiError } from "../api";
import { parseTranscript } from "../utils";

type Tab = "transcript" | "summary" | "actions" | "chat";

const TABS: { key: Tab; label: string }[] = [
  { key: "transcript", label: "文字起こし" },
  { key: "summary", label: "要約" },
  { key: "actions", label: "アクション" },
  { key: "chat", label: "チャット" },
];

function errorMessageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recording = useLiveQuery(() => (id ? db.recordings.get(id) : undefined), [id]);
  const [tab, setTab] = useState<Tab>("transcript");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [liveText, setLiveText] = useState("");

  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  if (recording === undefined) return null;
  if (recording === null) {
    navigate("/", { replace: true });
    return null;
  }

  const handleTranscribe = async () => {
    if (!recording.audio) return;
    setTranscribing(true);
    setTranscribeError(null);
    setLiveText("");
    try {
      const fullText = await transcribeAudio(recording.audio, recording.mimeType, setLiveText);
      const segments = parseTranscript(fullText);
      await db.recordings.update(recording.id, {
        status: "transcribed",
        transcriptText: fullText,
        transcriptSegments: segments,
      });
    } catch (err) {
      setTranscribeError(errorMessageOf(err, "文字起こしに失敗しました。しばらく待ってから再度お試しください。"));
    } finally {
      setTranscribing(false);
    }
  };

  const handleSummarize = async () => {
    if (!recording.transcriptText) return;
    setSummarizing(true);
    setSummarizeError(null);
    try {
      const { summary, actionItems } = await summarizeTranscript(recording.transcriptText);
      await db.recordings.update(recording.id, { status: "ready", summary, actionItems });
    } catch (err) {
      setSummarizeError(errorMessageOf(err, "要約に失敗しました。しばらく待ってから再度お試しください。"));
    } finally {
      setSummarizing(false);
    }
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const title = e.target.value.trim();
    if (title && title !== recording.title) {
      void db.recordings.update(recording.id, { title });
    } else {
      e.target.value = recording.title;
    }
  };

  const handleDelete = async () => {
    await deleteRecording(recording.id);
    navigate("/", { replace: true });
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title=""
        right={
          confirmingDelete ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-medium text-white bg-record rounded-full px-3 py-1.5"
              >
                削除する
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-xs font-medium text-ink-dim border border-border rounded-full px-3 py-1.5"
              >
                やめる
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink-dim border border-border shrink-0"
              aria-label="削除"
            >
              🗑
            </button>
          )
        }
      />

      <div className="px-4 -mt-1 mb-4">
        <input
          defaultValue={recording.title}
          onBlur={handleTitleBlur}
          className="w-full text-lg font-semibold text-ink bg-transparent outline-none border-b border-transparent focus:border-border pb-1"
        />
      </div>

      {recording.audio && (
        <div className="px-4 mb-4">
          <AudioPlayer blob={recording.audio} />
        </div>
      )}

      <div className="px-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors " +
              (tab === t.key ? "text-accent border-accent" : "text-ink-dim border-transparent")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 py-5">
        {tab === "transcript" &&
          (transcribing ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-accent flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                文字起こし中…
              </p>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{liveText}</p>
            </div>
          ) : transcribeError ? (
            <ErrorRetry message={transcribeError} onRetry={handleTranscribe} />
          ) : recording.transcriptSegments && recording.transcriptSegments.length > 0 ? (
            <TranscriptView segments={recording.transcriptSegments} />
          ) : (
            <CtaState
              emoji="📝"
              text="録音の保存が完了しました。文字起こしを開始しましょう。"
              actionLabel="文字起こしを開始"
              onAction={handleTranscribe}
            />
          ))}

        {tab === "summary" &&
          (summarizing ? (
            <LoadingState text="要約を作成しています…" />
          ) : summarizeError ? (
            <ErrorRetry message={summarizeError} onRetry={handleSummarize} />
          ) : recording.summary ? (
            <SummaryView summary={recording.summary} />
          ) : recording.transcriptText ? (
            <CtaState
              emoji="✨"
              text="文字起こしが完了しました。要約とアクションアイテムを作成しましょう。"
              actionLabel="要約を作成"
              onAction={handleSummarize}
            />
          ) : (
            <EmptyTabState emoji="✨" text="文字起こしが完了すると、ここに要約とキーポイントが表示されます。" />
          ))}

        {tab === "actions" &&
          (summarizing ? (
            <LoadingState text="アクションアイテムを抽出しています…" />
          ) : summarizeError ? (
            <ErrorRetry message={summarizeError} onRetry={handleSummarize} />
          ) : recording.actionItems ? (
            <ActionItemsView recordingId={recording.id} items={recording.actionItems} />
          ) : recording.transcriptText ? (
            <EmptyTabState emoji="✅" text="「要約」タブから要約を作成すると、ここにアクションアイテムが表示されます。" />
          ) : (
            <EmptyTabState emoji="✅" text="文字起こしが完了すると、ここにアクションアイテムが表示されます。" />
          ))}

        {tab === "chat" &&
          (recording.transcriptText ? (
            <ChatPanel
              recordingId={recording.id}
              transcript={recording.transcriptText}
              history={recording.chatHistory ?? []}
            />
          ) : (
            <EmptyTabState emoji="💬" text="文字起こしが完了すると、この録音の内容について質問できるようになります。" />
          ))}
      </main>
    </div>
  );
}

function EmptyTabState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 mt-10 px-4">
      <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center text-xl">{emoji}</div>
      <p className="text-sm text-ink-dim max-w-xs">{text}</p>
    </div>
  );
}

function CtaState({
  emoji,
  text,
  actionLabel,
  onAction,
}: {
  emoji: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 mt-10 px-4">
      <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center text-xl">{emoji}</div>
      <p className="text-sm text-ink-dim max-w-xs">{text}</p>
      <button type="button" onClick={onAction} className="text-sm font-medium text-white bg-accent rounded-full px-5 py-2.5">
        {actionLabel}
      </button>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <p className="text-xs text-accent flex items-center gap-1.5 justify-center mt-10">
      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      {text}
    </p>
  );
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 mt-10 px-4">
      <p className="text-sm text-record">{message}</p>
      <button type="button" onClick={onRetry} className="text-sm font-medium text-white bg-accent rounded-full px-5 py-2.5">
        もう一度試す
      </button>
    </div>
  );
}
