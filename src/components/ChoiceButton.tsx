interface Props {
  label: string
  index: number
  selected: boolean
  correct: boolean | null  // null = not yet revealed
  isAnswer: boolean
  onClick: () => void
  disabled: boolean
}

const LETTERS = ["A", "B", "C", "D"]

export function ChoiceButton({ label, index, selected, correct, isAnswer, onClick, disabled }: Props) {
  let base = "w-full text-left px-4 py-4 rounded-xl border-2 text-base font-medium transition-colors "

  if (correct === null) {
    base += selected
      ? "border-blue-500 bg-blue-900/40 text-white"
      : "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"
  } else {
    if (isAnswer) {
      base += "border-green-500 bg-green-900/40 text-green-300"
    } else if (selected && !correct) {
      base += "border-red-500 bg-red-900/40 text-red-300"
    } else {
      base += "border-slate-700 bg-slate-800/50 text-slate-400"
    }
  }

  return (
    <button className={base} onClick={onClick} disabled={disabled}>
      <span className="font-bold mr-3 text-slate-400">{LETTERS[index]}.</span>
      {label}
    </button>
  )
}
