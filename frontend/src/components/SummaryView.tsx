import type { Summary } from "../types";
import { IconSparkles } from "./icons";

export default function SummaryView({ summary }: { summary: Summary }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="glass-strong rounded-2xl p-4">
        <h2 className="text-xs font-semibold text-ink-faint mb-2 flex items-center gap-1.5 tracking-wide uppercase">
          <IconSparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-solid)" }} />
          要約
        </h2>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{summary.summary}</p>
      </section>
      {summary.keyPoints.length > 0 && (
        <section className="glass rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-ink-faint mb-2.5 tracking-wide uppercase">キーポイント</h2>
          <ul className="flex flex-col gap-2.5">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink leading-relaxed">
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 btn-gradient"
                  style={{ display: "inline-block" }}
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
