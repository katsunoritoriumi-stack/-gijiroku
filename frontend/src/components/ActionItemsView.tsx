import db from "../db";
import type { ActionItem } from "../types";
import { IconCheck } from "./icons";

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
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            role="checkbox"
            aria-checked={item.done}
            onClick={() => toggle(item.id)}
            className="glass w-full min-h-[44px] flex items-center gap-3 rounded-2xl p-3.5 text-left active:scale-[0.99] transition-transform"
          >
            <span
              className={
                "shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors " +
                (item.done ? "btn-gradient border-transparent text-white" : "border-border text-transparent")
              }
            >
              <IconCheck className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <p className={"text-sm text-ink " + (item.done ? "line-through text-ink-faint" : "")}>{item.task}</p>
              {(item.assignee || item.due) && (
                <p className="text-xs text-ink-faint mt-0.5">
                  {[item.assignee, item.due].filter(Boolean).join(" ・ ")}
                </p>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
