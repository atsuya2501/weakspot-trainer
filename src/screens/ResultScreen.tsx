import { useStore } from "../store"
import type { GrammarTag } from "../types"
import { TAG_LABELS } from "../types"

export function ResultScreen() {
  const { session, startSession, setScreen, isGenerating } = useStore()

  if (!session) {
    setScreen("home")
    return null
  }

  const { attempts } = session
  const totalCorrect = attempts.filter((a) => a.correct).length
  const accuracy = Math.round((totalCorrect / attempts.length) * 100)

  // Per-tag results
  const tagResults = new Map<GrammarTag, { correct: number; total: number }>()
  for (const a of attempts) {
    const r = tagResults.get(a.tag) ?? { correct: 0, total: 0 }
    r.total++
    if (a.correct) r.correct++
    tagResults.set(a.tag, r)
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h2 className="text-xl font-bold text-white mb-1">セッション結果</h2>
      <p className="text-slate-400 text-sm mb-6">
        {totalCorrect} / {attempts.length} 問正解
      </p>

      {/* Big accuracy */}
      <div className="bg-slate-800 rounded-2xl p-6 text-center mb-6">
        <div
          className={`text-5xl font-bold mb-1 ${
            accuracy >= 80
              ? "text-green-400"
              : accuracy >= 60
              ? "text-yellow-400"
              : "text-red-400"
          }`}
        >
          {accuracy}%
        </div>
        <div className="text-slate-400 text-sm">正答率</div>
      </div>

      {/* Tag breakdown */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        タグ別正誤
      </h3>
      <div className="space-y-2 mb-8">
        {[...tagResults.entries()].map(([tag, r]) => {
          const pct = Math.round((r.correct / r.total) * 100)
          const color =
            pct >= 80
              ? "text-green-400"
              : pct >= 60
              ? "text-yellow-400"
              : "text-red-400"
          return (
            <div
              key={tag}
              className="flex justify-between items-center bg-slate-800 rounded-xl px-4 py-3"
            >
              <span className="text-slate-200 text-sm">{TAG_LABELS[tag]}</span>
              <span className={`font-bold text-sm ${color}`}>
                {r.correct}/{r.total}
              </span>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-bold disabled:opacity-50"
          onClick={startSession}
          disabled={isGenerating}
        >
          {isGenerating ? "生成中..." : "もう1セット"}
        </button>
        <button
          className="w-full py-4 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all text-white font-bold"
          onClick={() => setScreen("home")}
        >
          ホームへ
        </button>
      </div>
    </div>
  )
}
