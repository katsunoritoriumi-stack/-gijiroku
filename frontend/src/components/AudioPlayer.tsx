import { useEffect, useRef, useState } from "react";
import { formatTime } from "../utils";
import { IconPause, IconPlay } from "./icons";

export default function AudioPlayer({ blob, fallbackDurationSec }: { blob: Blob; fallbackDurationSec?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(fallbackDurationSec ?? 0);
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
    setCurrent(Number(e.target.value));
  };

  const handleLoadedMetadata = (el: HTMLAudioElement) => {
    if (Number.isFinite(el.duration)) {
      setDuration(el.duration);
      return;
    }
    // 一部の録音由来のファイルはduration=Infinityになることがある（既知のブラウザ挙動）。
    // フォールバック値（録音時に計測した秒数）があればそれを使い続ける。
    if (fallbackDurationSec) setDuration(fallbackDurationSec);
  };

  const cycleRate = () => {
    const next = rate >= 2 ? 1 : rate + 0.5;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div className="glass-strong rounded-2xl p-4">
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
          onDurationChange={(e) => handleLoadedMetadata(e.currentTarget)}
        />
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="shrink-0 w-12 h-12 rounded-full btn-gradient flex items-center justify-center"
          aria-label={playing ? "一時停止" : "再生"}
        >
          {playing ? <IconPause className="w-5 h-5" /> : <IconPlay className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={current}
            onChange={seek}
            className="w-full"
            style={{ accentColor: "var(--accent-solid)" }}
          />
          <div className="flex justify-between text-xs text-ink-dim tabular-nums">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={cycleRate}
          className="glass shrink-0 text-xs font-medium text-ink-dim rounded-full px-2.5 py-1.5"
        >
          {rate}x
        </button>
      </div>
    </div>
  );
}
