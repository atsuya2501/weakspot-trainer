import { useEffect, useRef, useState } from "react"
import { useStore } from "../store"
import type { Settings } from "../types"

type StorageStatus = "checking" | "persistent" | "temporary" | "unsupported"

export function SettingsScreen() {
  const { settings, updateSettings, clearData, exportBackup, importBackup } = useStore()
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("checking")
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshStorageStatus = async () => {
    if (!navigator.storage?.persisted) {
      setStorageStatus("unsupported")
      return
    }
    setStorageStatus((await navigator.storage.persisted()) ? "persistent" : "temporary")
  }

  useEffect(() => {
    void refreshStorageStatus()
  }, [])

  const requestPersistentStorage = async () => {
    if (!navigator.storage?.persist) {
      setStorageStatus("unsupported")
      return
    }
    const granted = await navigator.storage.persist()
    setStorageStatus(granted ? "persistent" : "temporary")
    alert(
      granted
        ? "この端末で学習データの永続保存が有効になりました。"
        : "ブラウザが永続保存を許可しませんでした。定期的にバックアップしてください。"
    )
  }

  const handleSaveKey = () => {
    updateSettings({ apiKey: apiKey.trim() })
    alert("APIキーをこの端末に保存しました。")
  }

  const handleExport = async () => {
    const json = await exportBackup()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `weakspot-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file?: File) => {
    if (!file) return
    setIsImporting(true)
    try {
      await importBackup(await file.text())
      alert("学習データを復元しました。既存データと統合されています。")
    } catch (error) {
      alert(error instanceof Error ? error.message : "バックアップを読み込めませんでした。")
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    await clearData()
    setConfirmClear(false)
    alert("学習データを削除しました。")
  }

  const statusText = {
    checking: "確認中…",
    persistent: "永続保存：有効",
    temporary: "永続保存：未許可",
    unsupported: "このブラウザでは確認できません",
  }[storageStatus]

  return (
    <div className="px-4 pt-6 pb-24">
      <h2 className="text-xl font-bold text-white mb-6">設定</h2>

      <section className="mb-6">
        <label className="block text-sm font-semibold text-slate-400 mb-2">
          Anthropic APIキー
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type={showKey ? "text" : "password"}
            className="min-w-0 flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm border border-slate-600 focus:border-blue-500 outline-none"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <button className="px-3 bg-slate-700 rounded-xl text-slate-300 text-sm" onClick={() => setShowKey(!showKey)}>
            {showKey ? "隠す" : "表示"}
          </button>
        </div>
        <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm" onClick={handleSaveKey}>
          APIキーを保存
        </button>
        <p className="text-xs text-slate-500 mt-2">APIキーはこの端末だけに保存され、バックアップには含まれません。</p>
      </section>

      <section className="mb-6 rounded-2xl bg-slate-800 p-4">
        <h3 className="font-bold text-white mb-1">データ保護</h3>
        <p className={`text-sm mb-3 ${storageStatus === "persistent" ? "text-emerald-400" : "text-amber-400"}`}>
          {statusText}
        </p>
        {storageStatus !== "persistent" && (
          <button className="w-full py-3 mb-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm" onClick={requestPersistentStorage}>
            永続保存を要求する
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button className="py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm" onClick={handleExport}>
            バックアップ保存
          </button>
          <button className="py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm disabled:opacity-50" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
            {isImporting ? "復元中…" : "バックアップ復元"}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void handleImport(event.target.files?.[0])} />
        <p className="text-xs text-slate-500 mt-3">問題、解答履歴、復習予定、習熟度、学習設定をJSONファイルに保存します。</p>
      </section>

      <section className="mb-6">
        <label className="block text-sm font-semibold text-slate-400 mb-2">1セッションの問題数: {settings.sessionSize}問</label>
        <input type="range" min={5} max={20} step={5} value={settings.sessionSize} onChange={(event) => updateSettings({ sessionSize: Number(event.target.value) })} className="w-full accent-blue-500" />
        <div className="flex justify-between text-xs text-slate-500 mt-1"><span>5問</span><span>10問</span><span>15問</span><span>20問</span></div>
      </section>

      <section className="mb-8">
        <label className="block text-sm font-semibold text-slate-400 mb-2">難易度</label>
        <div className="flex gap-2">
          {(["easy", "standard", "hard"] as Settings["difficultyBias"][]).map((difficulty) => (
            <button key={difficulty} className={`flex-1 py-2 rounded-xl text-sm font-medium ${settings.difficultyBias === difficulty ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`} onClick={() => updateSettings({ difficultyBias: difficulty })}>
              {difficulty === "easy" ? "易しめ" : difficulty === "standard" ? "標準" : "難しめ"}
            </button>
          ))}
        </div>
      </section>

      <section>
        <button className={`w-full py-3 rounded-xl font-bold text-sm ${confirmClear ? "bg-red-700 text-white" : "bg-slate-800 text-red-400"}`} onClick={handleClear}>
          {confirmClear ? "本当に全削除する（取り消せません）" : "学習データを全削除"}
        </button>
        {confirmClear && <button className="w-full py-2 mt-2 text-slate-400 text-sm" onClick={() => setConfirmClear(false)}>キャンセル</button>}
      </section>
    </div>
  )
}
