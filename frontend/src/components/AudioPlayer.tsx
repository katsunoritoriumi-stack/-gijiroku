import { useEffect, useRef, useState } from "react";
import { formatTime } from "../utils";

export default function AudioPlayer({ blob }: { blob: Blob }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
  };

  const cycleRate = () => {
    const next = rate >= 2 ? 1 : rate + 0.5;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div className="rounded-2xl bg-paper-raised border border-border p-4 shadow-shadow-sm">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="shrink-0 w-11 h-11 rounded-full bg-accent text-accent-ink flex items-center justify-center text-lg"
          aria-label={playing ? "一時停止" : "再生"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={current}
            onChange={seek}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-ink-dim tabular-nums">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={cycleRate}
          className="shrink-0 text-xs font-medium text-ink-dim border border-border rounded-full px-2.5 py-1"
        >
          {rate}x
        </button>
      </div>
    </div>
  );
}
