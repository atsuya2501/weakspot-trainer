import { useState } from "react"
import { useStore } from "../store"
import type { Settings } from "../types"

export function SettingsScreen() {
  const { settings, updateSettings, clearData } = useStore()
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const handleSaveKey = () => {
    updateSettings({ apiKey: apiKey.trim() })
    alert("保存しました")
  }

  const handleClear = async () => {
    if (confirmClear) {
      await clearData()
      setConfirmClear(false)
      alert("データを削除しました")
    } else {
      setConfirmClear(true)
    }
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h2 className="text-xl font-bold text-white mb-6">設定</h2>

      {/* API Key */}
      <section className="mb-6">
        <label className="block text-sm font-semibold text-slate-400 mb-2">
          Anthropic APIキー
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type={showKey ? "text" : "password"}
            className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm border border-slate-600 focus:border-blue-500 outline-none"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            className="px-3 bg-slate-700 rounded-xl text-slate-300 text-sm"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? "隠す" : "表示"}
          </button>
        </div>
        <button
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
          onClick={handleSaveKey}
        >
          保存
        </button>
        <p className="text-xs text-slate-500 mt-2">
          キーはローカルにのみ保存されます。外部サーバーには送信されません。
        </p>
      </section>

      {/* Session size */}
      <section className="mb-6">
        <label className="block text-sm font-semibold text-slate-400 mb-2">
          1セッションの問題数: {settings.sessionSize}問
        </label>
        <input
          type="range"
          min={5}
          max={20}
          step={5}
          value={settings.sessionSize}
          onChange={(e) => updateSettings({ sessionSize: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>5問</span>
          <span>10問</span>
          <span>15問</span>
          <span>20問</span>
        </div>
      </section>

      {/* Difficulty */}
      <section className="mb-8">
        <label className="block text-sm font-semibold text-slate-400 mb-2">
          難易度バイアス
        </label>
        <div className="flex gap-2">
          {(["easy", "standard", "hard"] as Settings["difficultyBias"][]).map((d) => (
            <button
              key={d}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                settings.difficultyBias === d
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
              onClick={() => updateSettings({ difficultyBias: d })}
            >
              {d === "easy" ? "易しめ" : d === "standard" ? "標準" : "難しめ"}
            </button>
          ))}
        </div>
      </section>

      {/* Clear data */}
      <section>
        <button
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
            confirmClear
              ? "bg-red-700 hover:bg-red-600 text-white"
              : "bg-slate-800 hover:bg-slate-700 text-red-400"
          }`}
          onClick={handleClear}
        >
          {confirmClear ? "本当に削除する（取り消し不可）" : "データ全削除"}
        </button>
        {confirmClear && (
          <button
            className="w-full py-2 mt-2 text-slate-400 text-sm"
            onClick={() => setConfirmClear(false)}
          >
            キャンセル
          </button>
        )}
      </section>
    </div>
  )
}
