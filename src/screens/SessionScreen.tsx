import { useState } from "react"
import { useStore } from "../store"
import { ChoiceButton } from "../components/ChoiceButton"
import { TAG_LABELS } from "../types"

export function SessionScreen() {
  const { session, submitAnswer, finishSession } = useStore()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  if (!session) return null

  const { questions, currentIndex } = session
  const question = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  const handleSelect = async (i: number) => {
    if (revealed) return
    setSelectedIndex(i)
    setRevealed(true)
    await submitAnswer(i)
  }

  const handleNext = async () => {
    if (isLast) {
      await finishSession()
    } else {
      setSelectedIndex(null)
      setRevealed(false)
      useStore.setState((s) => ({
        session: s.session ? { ...s.session, currentIndex: s.session.currentIndex + 1, startedAt: Date.now() } : null,
      }))
    }
  }

  const correct = revealed && selectedIndex !== null
    ? selectedIndex === question.answerIndex
    : null

  const diffLabel = ["", "600点", "730点", "860点"][question.difficulty]

  return (
    <div className="px-4 pt-5 pb-24 min-h-screen flex flex-col">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm">
          {currentIndex + 1} / {questions.length}
        </span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full ${
                i < currentIndex
                  ? session.attempts[i]?.correct
                    ? "bg-green-500"
                    : "bg-red-500"
                  : i === currentIndex
                  ? "bg-blue-400"
                  : "bg-slate-700"
              }`}
              style={{ width: `${Math.min(240 / questions.length, 24)}px` }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
          {TAG_LABELS[question.tag]}
        </span>
      </div>

      {/* Stem */}
      <div className="bg-slate-800 rounded-2xl p-5 mb-5 flex-shrink-0">
        <div className="text-xs text-slate-500 mb-2">{diffLabel}</div>
        <p className="text-white text-base leading-relaxed">
          {question.stem.split("___").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="border-b-2 border-blue-400 text-blue-300 px-2">
                  ___
                </span>
              )}
            </span>
          ))}
        </p>
      </div>

      {/* Choices */}
      <div className="space-y-3 mb-5">
        {question.choices.map((choice, i) => (
          <ChoiceButton
            key={i}
            label={choice}
            index={i}
            selected={selectedIndex === i}
            correct={correct}
            isAnswer={i === question.answerIndex}
            onClick={() => handleSelect(i)}
            disabled={revealed}
          />
        ))}
      </div>

      {/* Explanation */}
      {revealed && (
        <div
          className={`rounded-xl p-4 mb-5 border ${
            correct
              ? "bg-green-900/30 border-green-700"
              : "bg-red-900/30 border-red-700"
          }`}
        >
          <div className="text-sm font-bold mb-2">
            {correct ? (
              <span className="text-green-400">正解！</span>
            ) : (
              <span className="text-red-400">
                不正解 — 正解: {["A", "B", "C", "D"][question.answerIndex]}
              </span>
            )}
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}

      {/* Next button */}
      {revealed && (
        <button
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-bold text-base"
          onClick={handleNext}
        >
          {isLast ? "結果を見る" : "次へ"}
        </button>
      )}
    </div>
  )
}
