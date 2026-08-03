import { useState } from "react"
import { useStore } from "../store"
import type { GrammarTag, Question } from "../types"
import { ALL_TAGS, TAG_LABELS } from "../types"
import { createInitialTagSrs } from "../core/srs"
import { TagBar } from "../components/TagBar"
import { ChoiceButton } from "../components/ChoiceButton"

export function AnalysisScreen() {
  const { srsMap, getWrongQuestions, submitReviewAnswer } = useStore()
  const [reviewTag, setReviewTag] = useState<GrammarTag | null>(null)
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const sortedTags = [...ALL_TAGS].sort((a, b) => {
    const sa = srsMap.get(a) ?? createInitialTagSrs(a)
    const sb = srsMap.get(b) ?? createInitialTagSrs(b)
    if (sa.attemptCount === 0 && sb.attemptCount === 0) return 0
    if (sa.attemptCount === 0) return 1
    if (sb.attemptCount === 0) return -1
    return sa.recentAccuracy - sb.recentAccuracy
  })

  const handleTagClick = async (tag: GrammarTag) => {
    const questions = await getWrongQuestions(tag)
    setReviewTag(tag)
    setReviewQuestions(questions)
    setReviewIndex(0)
    setSelectedIndex(null)
    setRevealed(false)
  }

  if (reviewTag && reviewQuestions.length > 0) {
    const q = reviewQuestions[reviewIndex]
    const correct = revealed && selectedIndex !== null
      ? selectedIndex === q.answerIndex
      : null
    const isLast = reviewIndex === reviewQuestions.length - 1

    return (
      <div className="px-4 pt-5 pb-24 min-h-screen flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <button
            className="text-slate-400 hover:text-white"
            onClick={() => setReviewTag(null)}
          >
            ← 戻る
          </button>
          <span className="text-slate-300 text-sm">
            {TAG_LABELS[reviewTag]} — 誤答復習 {reviewIndex + 1}/{reviewQuestions.length}
          </span>
        </div>

        <div className="bg-slate-800 rounded-2xl p-5 mb-5">
          <p className="text-white text-base leading-relaxed">
            {q.stem.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="border-b-2 border-blue-400 text-blue-300 px-2">___</span>
                )}
              </span>
            ))}
          </p>
        </div>

        <div className="space-y-3 mb-5">
          {q.choices.map((choice, i) => (
            <ChoiceButton
              key={i}
              label={choice}
              index={i}
              selected={selectedIndex === i}
              correct={correct}
              isAnswer={i === q.answerIndex}
              onClick={async () => {
                setSelectedIndex(i)
                setRevealed(true)
                await submitReviewAnswer(q, i)
              }}
              disabled={revealed}
            />
          ))}
        </div>

        {revealed && (
          <div className={`rounded-xl p-4 mb-5 border ${
            correct ? "bg-green-900/30 border-green-700" : "bg-red-900/30 border-red-700"
          }`}>
            <div className="text-sm font-bold mb-2">
              {correct
                ? <span className="text-green-400">正解！</span>
                : <span className="text-red-400">不正解 — 正解: {["A","B","C","D"][q.answerIndex]}</span>
              }
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{q.explanation}</p>
          </div>
        )}

        {revealed && (
          <button
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
            onClick={() => {
              if (isLast) {
                setReviewTag(null)
              } else {
                setReviewIndex(i => i + 1)
                setSelectedIndex(null)
                setRevealed(false)
              }
            }}
          >
            {isLast ? "完了" : "次へ"}
          </button>
        )}
      </div>
    )
  }

  if (reviewTag && reviewQuestions.length === 0) {
    return (
      <div className="px-4 pt-6 pb-24">
        <button className="text-slate-400 hover:text-white mb-4" onClick={() => setReviewTag(null)}>
          ← 戻る
        </button>
        <p className="text-slate-400 text-center mt-12">
          {TAG_LABELS[reviewTag]} の誤答がありません
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h2 className="text-xl font-bold text-white mb-1">弱点分析</h2>
      <p className="text-slate-400 text-sm mb-5">タグをタップすると誤答を復習できます</p>
      <div className="space-y-2">
        {sortedTags.map((tag) => {
          const srs = srsMap.get(tag) ?? createInitialTagSrs(tag)
          return (
            <TagBar
              key={tag}
              tag={tag}
              accuracy={srs.recentAccuracy}
              attemptCount={srs.attemptCount}
              onClick={() => handleTagClick(tag)}
            />
          )
        })}
      </div>
    </div>
  )
}
