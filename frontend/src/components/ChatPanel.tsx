import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";
import { ApiError, chatAboutRecording } from "../api";
import db from "../db";

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
        <p className="text-sm text-ink-dim text-center mt-6">この録音の内容について質問できます。</p>
      )}
      <div className="flex flex-col gap-3">
        {history.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {sending && liveAnswer && <ChatBubble message={{ role: "model", text: liveAnswer, ts: 0 }} />}
        {sending && !liveAnswer && (
          <p className="text-xs text-accent flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            考えています…
          </p>
        )}
        {error && <p className="text-sm text-record">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-4 flex gap-2 bg-paper pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="この会議について質問する"
          className="flex-1 rounded-full border border-border bg-paper-raised px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !input.trim()}
          className="shrink-0 w-10 h-10 rounded-full bg-accent text-accent-ink flex items-center justify-center disabled:opacity-40"
          aria-label="送信"
        >
          →
        </button>
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
          (isUser ? "bg-accent text-accent-ink" : "bg-paper-raised border border-border text-ink")
        }
      >
        {message.text}
      </div>
    </div>
  );
}
