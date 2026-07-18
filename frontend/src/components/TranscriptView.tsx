import type { TranscriptSegment } from "../types";
import { formatTime } from "../utils";

export default function TranscriptView({ segments }: { segments: TranscriptSegment[] }) {
  if (segments.length === 0) {
    return <p className="text-sm text-ink-dim text-center mt-10">発話は検出されませんでした。</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {segments.map((seg, i) => (
        <li key={i} className="glass rounded-2xl p-3.5 flex gap-3">
          <div
            className="shrink-0 w-12 pt-0.5 text-xs text-ink-faint tabular-nums"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatTime(seg.start)}
          </div>
          <div className="flex-1 min-w-0">
            {seg.speaker && (
              <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--accent-solid)" }}>
                {seg.speaker}
              </p>
            )}
            <p className="text-sm text-ink leading-relaxed">{seg.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
