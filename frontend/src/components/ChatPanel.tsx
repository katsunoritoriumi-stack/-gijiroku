import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";
import { ApiError, chatAboutRecording } from "../api";
import db from "../db";
import { useSpeechInput } from "../hooks/useSpeechInput";
import { IconMessageCircle, IconMic, IconSend } from "./icons";

export default function ChatPanel({
  recordingId,
  transcript,
  history,
}: {
  recordingId: string;
  transcript: string;
  history: ChatMessage[];
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [liveAnswer, setLiveAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { listening, toggle: toggleListening, supported: speechSupported } = useSpeechInput(setInput);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, liveAnswer]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setInput("");
    setError(null);
    const historyBefore = history;
    const userMsg: ChatMessage = { role: "user", text: question, ts: Date.now() };
    await db.recordings.update(recordingId, { chatHistory: [...historyBefore, userMsg] });

    setSending(true);
    setLiveAnswer("");
    try {
      const fullText = await chatAboutRecording(transcript, historyBefore, question, setLiveAnswer);
      const modelMsg: ChatMessage = { role: "model", text: fullText, ts: Date.now() };
      await db.recordings.update(recordingId, { chatHistory: [...historyBefore, userMsg, modelMsg] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "回答の生成に失敗しました。しばらく待ってから再度お試しください。");
    } finally {
      setSending(false);
      setLiveAnswer("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {history.length === 0 && !sending && (
        <div className="flex flex-col items-center text-center gap-3 mt-6">
          <div className="w-14 h-14 rounded-2xl btn-gradient flex items-center justify-center">
            <IconMessageCircle className="w-6 h-6" />
          </div>
          <p className="text-sm text-ink-dim max-w-xs">
            この録音の内容について質問できます。{speechSupported && "マイクボタンで音声入力もできます。"}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-3 pb-2">
        {history.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {sending && liveAnswer && <ChatBubble message={{ role: "model", text: liveAnswer, ts: 0 }} />}
        {sending && !liveAnswer && (
          <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--accent-solid)" }}>
            <span className="w-1.5 h-1.5 rounded-full btn-gradient animate-pulse" />
            考えています…
          </p>
        )}
        {error && <p className="text-sm text-record">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-4">
        <div className="glass-strong rounded-full p-1.5 flex items-center gap-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={listening ? "聞き取り中…" : "この会議について質問する"}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={
                "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors " +
                (listening ? "record-gradient text-white animate-pulse-record" : "text-ink-dim")
              }
              aria-label={listening ? "音声入力を停止" : "音声入力を開始"}
            >
              <IconMic className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-full btn-gradient flex items-center justify-center disabled:opacity-35 transition-opacity"
            aria-label="送信"
          >
            <IconSend className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap " +
          (isUser ? "btn-gradient text-white" : "glass text-ink")
        }
      >
        {message.text}
      </div>
    </div>
  );
}
