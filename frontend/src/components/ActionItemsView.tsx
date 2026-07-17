import db from "../db";
import type { ActionItem } from "../types";

export default function ActionItemsView({ recordingId, items }: { recordingId: string; items: ActionItem[] }) {
  const toggle = async (id: string) => {
    const updated = items.map((it) => (it.id === id ? { ...it, done: !it.done } : it));
    await db.recordings.update(recordingId, { actionItems: updated });
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-dim text-center mt-10">この会議で決まったアクションアイテムはありませんでした。</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-paper-raised p-3">
          <button
            type="button"
            onClick={() => toggle(item.id)}
            className={
              "shrink-0 w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 text-xs " +
              (item.done ? "bg-success border-success text-white" : "border-border text-transparent")
            }
            aria-label={item.done ? "完了を取り消す" : "完了にする"}
          >
            ✓
          </button>
          <div className="min-w-0">
            <p className={"text-sm text-ink " + (item.done ? "line-through text-ink-faint" : "")}>{item.task}</p>
            {(item.assignee || item.due) && (
              <p className="text-xs text-ink-faint mt-0.5">{[item.assignee, item.due].filter(Boolean).join(" ・ ")}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
