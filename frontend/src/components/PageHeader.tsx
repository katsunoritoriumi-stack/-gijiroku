import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

export default function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="flex items-center gap-3 px-4 pt-5 pb-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-ink border border-border shrink-0"
        aria-label="戻る"
      >
        ←
      </button>
      <h1 className="flex-1 text-lg font-semibold text-ink truncate">{title}</h1>
      {right}
    </header>
  );
}
