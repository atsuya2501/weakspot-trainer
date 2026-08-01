import { useEffect } from "react"
import { useStore } from "./store"
import { NavBar } from "./components/NavBar"
import { HomeScreen } from "./screens/HomeScreen"
import { SessionScreen } from "./screens/SessionScreen"
import { ResultScreen } from "./screens/ResultScreen"
import { AnalysisScreen } from "./screens/AnalysisScreen"
import { SettingsScreen } from "./screens/SettingsScreen"

export default function App() {
  const { screen, setScreen, init } = useStore()

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="min-h-screen bg-slate-900 text-white max-w-lg mx-auto">
      {screen === "home" && <HomeScreen />}
      {screen === "session" && <SessionScreen />}
      {screen === "result" && <ResultScreen />}
      {screen === "analysis" && <AnalysisScreen />}
      {screen === "settings" && <SettingsScreen />}

      {screen !== "session" && (
        <NavBar current={screen === "result" ? "home" : screen} onNav={setScreen} />
      )}
    </div>
  )
}
