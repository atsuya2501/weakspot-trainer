import { useStore } from "../store"
import { ALL_TAGS, TAG_LABELS } from "../types"
import { createInitialTagSrs } from "../core/srs"

export function HomeScreen() {
  const { srsMap, allAttempts, startSession, isGenerating, generateError } =
    useStore()

  const totalAttempts = allAttempts.length
  const totalCorrect = allAttempts.filter((a) => a.correct).length
  const overallAccuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  const dueCount = ALL_TAGS.filter((tag) => {
    const srs = srsMap.get(tag)
    return srs && srs.nextDueAt <= Date.now()
  }).length

  const weakTop3 = [...ALL_TAGS]
    .filter((tag) => (srsMap.get(tag)?.attemptCount ?? 0) > 0)
    .sort(
      (a, b) =>
        (srsMap.get(a)?.recentAccuracy ?? 0.5) -
        (srsMap.get(b)?.recentAccuracy ?? 0.5)
    )
    .slice(0, 3)

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-white mb-1">Weakspot</h1>
      <p className="text-slate-400 text-sm mb-6">TOEIC Part5 弱点ピンポイントトレーナー</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{dueCount}</div>
          <div className="text-xs text-slate-400 mt-1">期限タグ</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{totalAttempts}</div>
          <div className="text-xs text-slate-400 mt-1">累計解答</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{overallAccuracy}%</div>
          <div className="text-xs text-slate-400 mt-1">正答率</div>
        </div>
      </div>

      {/* Start button */}
      <button
        className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white text-xl font-bold shadow-lg mb-6 disabled:opacity-50"
        onClick={startSession}
        disabled={isGenerating}
      >
        {isGenerating ? "問題を生成中..." : "セッション開始"}
      </button>

      {generateError && (
        <div className="mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
          {generateError}
        </div>
      )}

      {/* Weak spots */}
      {weakTop3.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            弱点タグ TOP3
          </h2>
          <div className="space-y-2">
            {weakTop3.map((tag) => {
              const srs = srsMap.get(tag) ?? createInitialTagSrs(tag)
              return (
                <div
                  key={tag}
                  className="flex justify-between items-center bg-slate-800 rounded-xl px-4 py-3"
                >
                  <span className="text-slate-200 text-sm">{TAG_LABELS[tag]}</span>
                  <span className="text-red-400 font-bold text-sm">
                    {Math.round(srs.recentAccuracy * 100)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {weakTop3.length === 0 && totalAttempts === 0 && (
        <div className="text-center text-slate-500 text-sm mt-8">
          <p>まずはセッションを開始して</p>
          <p>弱点を見つけましょう</p>
        </div>
      )}
    </div>
  )
}
