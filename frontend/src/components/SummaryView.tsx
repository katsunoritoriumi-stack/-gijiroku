import type { Summary } from "../types";

export default function SummaryView({ summary }: { summary: Summary }) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="text-xs font-medium text-ink-faint mb-2">要約</h2>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{summary.summary}</p>
      </section>
      {summary.keyPoints.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-ink-faint mb-2">キーポイント</h2>
          <ul className="flex flex-col gap-2">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink leading-relaxed">
                <span className="text-accent">・</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
