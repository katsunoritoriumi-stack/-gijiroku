import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { IconArrowLeft } from "./icons";

export default function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="flex items-center gap-3 px-4 pt-5 pb-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="glass w-10 h-10 rounded-full flex items-center justify-center text-ink shrink-0"
        aria-label="戻る"
      >
        <IconArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="flex-1 text-lg font-semibold text-ink truncate">{title}</h1>
      {right}
    </header>
  );
}
