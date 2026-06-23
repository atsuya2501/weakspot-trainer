import type { Screen } from "../types"

interface Props {
  current: Screen
  onNav: (s: Screen) => void
}

const ITEMS: { id: Screen; label: string; icon: string }[] = [
  { id: "home", label: "ホーム", icon: "🏠" },
  { id: "analysis", label: "分析", icon: "📊" },
  { id: "settings", label: "設定", icon: "⚙️" },
]

export function NavBar({ current, onNav }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex justify-around py-2 z-50">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onNav(item.id)}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors ${
            current === item.id
              ? "text-blue-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-xs">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
