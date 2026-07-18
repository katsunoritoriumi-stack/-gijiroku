import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState, type ComponentType, type SVGProps } from "react";
import db, { deleteRecording } from "../db";
import PageHeader from "../components/PageHeader";
import AudioPlayer from "../components/AudioPlayer";
import TranscriptView from "../components/TranscriptView";
import SummaryView from "../components/SummaryView";
import ActionItemsView from "../components/ActionItemsView";
import ChatPanel from "../components/ChatPanel";
import { transcribeAudio, summarizeTranscript, ApiError } from "../api";
import { parseTranscript } from "../utils";
import {
  IconFileText,
  IconSparkles,
  IconListChecks,
  IconMessageCircle,
  IconTrash,
  IconPencil,
} from "../components/icons";

type Tab = "transcript" | "summary" | "actions" | "chat";
type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const TABS: { key: Tab; label: string; icon: Icon }[] = [
  { key: "transcript", label: "文字起こし", icon: IconFileText },
  { key: "summary", label: "要約", icon: IconSparkles },
  { key: "actions", label: "アクション", icon: IconListChecks },
  { key: "chat", label: "チャット", icon: IconMessageCircle },
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
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  const focusTitle = () => {
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
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
                className="text-xs font-medium text-white record-gradient rounded-full px-3 py-2 min-h-[36px]"
              >
                削除する
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="glass text-xs font-medium text-ink-dim rounded-full px-3 py-2 min-h-[36px]"
              >
                やめる
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="glass w-10 h-10 rounded-full flex items-center justify-center text-ink-dim shrink-0"
              aria-label="削除"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          )
        }
      />

      <div className="px-4 -mt-1 mb-4 flex items-center gap-1.5">
        <input
          ref={titleInputRef}
          defaultValue={recording.title}
          onBlur={handleTitleBlur}
          className="min-w-0 flex-1 text-lg font-semibold text-ink bg-transparent outline-none border-b border-dashed border-border focus:border-solid pb-1 transition-colors"
          style={{ borderColor: "var(--border)" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-solid)")}
        />
        <button
          type="button"
          onClick={focusTitle}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-ink-faint"
          aria-label="タイトルを編集"
        >
          <IconPencil className="w-4 h-4" />
        </button>
      </div>

      {recording.audio && (
        <div className="px-4 mb-4">
          <AudioPlayer blob={recording.audio} />
        </div>
      )}

      <div className="px-4 mb-2">
        <div className="glass rounded-full p-1 flex gap-1">
          {TABS.map((t) => {
            const TabIcon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  "flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-medium transition-all min-h-[40px] " +
                  (active ? "btn-gradient text-white" : "text-ink-dim")
                }
              >
                <TabIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 px-4 py-5">
        {tab === "transcript" &&
          (transcribing ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--accent-solid)" }}>
                <span className="w-1.5 h-1.5 rounded-full btn-gradient animate-pulse" />
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
              icon={IconFileText}
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
              icon={IconSparkles}
              text="文字起こしが完了しました。要約とアクションアイテムを作成しましょう。"
              actionLabel="要約を作成"
              onAction={handleSummarize}
            />
          ) : (
            <EmptyTabState icon={IconSparkles} text="文字起こしが完了すると、ここに要約とキーポイントが表示されます。" />
          ))}

        {tab === "actions" &&
          (summarizing ? (
            <LoadingState text="アクションアイテムを抽出しています…" />
          ) : summarizeError ? (
            <ErrorRetry message={summarizeError} onRetry={handleSummarize} />
          ) : recording.actionItems ? (
            <ActionItemsView recordingId={recording.id} items={recording.actionItems} />
          ) : recording.transcriptText ? (
            <EmptyTabState icon={IconListChecks} text="「要約」タブから要約を作成すると、ここにアクションアイテムが表示されます。" />
          ) : (
            <EmptyTabState icon={IconListChecks} text="文字起こしが完了すると、ここにアクションアイテムが表示されます。" />
          ))}

        {tab === "chat" &&
          (recording.transcriptText ? (
            <ChatPanel
              recordingId={recording.id}
              transcript={recording.transcriptText}
              history={recording.chatHistory ?? []}
            />
          ) : (
            <EmptyTabState icon={IconMessageCircle} text="文字起こしが完了すると、この録音の内容について質問できるようになります。" />
          ))}
      </main>
    </div>
  );
}

function IconBadge({ icon: Icon }: { icon: Icon }) {
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center btn-gradient">
      <Icon className="w-6 h-6" />
    </div>
  );
}

function EmptyTabState({ icon, text }: { icon: Icon; text: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 mt-10 px-4">
      <IconBadge icon={icon} />
      <p className="text-sm text-ink-dim max-w-xs">{text}</p>
    </div>
  );
}

function CtaState({
  icon,
  text,
  actionLabel,
  onAction,
}: {
  icon: Icon;
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 mt-10 px-4">
      <IconBadge icon={icon} />
      <p className="text-sm text-ink-dim max-w-xs">{text}</p>
      <button
        type="button"
        onClick={onAction}
        className="text-sm font-medium text-white btn-gradient rounded-full px-5 py-2.5 min-h-[44px]"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <p className="text-xs font-medium flex items-center gap-1.5 justify-center mt-10" style={{ color: "var(--accent-solid)" }}>
      <span className="w-1.5 h-1.5 rounded-full btn-gradient animate-pulse" />
      {text}
    </p>
  );
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 mt-10 px-4">
      <p className="text-sm text-record">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium text-white btn-gradient rounded-full px-5 py-2.5 min-h-[44px]"
      >
        もう一度試す
      </button>
    </div>
  );
}
