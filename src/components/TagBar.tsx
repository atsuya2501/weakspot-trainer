import type { GrammarTag } from "../types"
import { TAG_LABELS } from "../types"

interface Props {
  tag: GrammarTag
  accuracy: number
  attemptCount: number
  onClick?: () => void
}

export function TagBar({ tag, accuracy, attemptCount, onClick }: Props) {
  const pct = Math.round(accuracy * 100)
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"

  return (
    <button
      className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-slate-200">{TAG_LABELS[tag]}</span>
        <span className="text-xs text-slate-400">
          {pct}% ({attemptCount}問)
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  )
}
