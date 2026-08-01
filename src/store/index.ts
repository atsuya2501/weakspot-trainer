import { create } from "zustand"
import { v4 as uuidv4 } from "uuid"
import type { GrammarTag, Question, Attempt, TagSrs, Screen, Settings } from "../types"
import { ALL_TAGS } from "../types"
import {
  saveQuestions,
  saveAttempt,
  saveTagSrs,
  getAllTagSrs,
  getAllAttempts,
  getQuestionsByTag,
  getDueQuestionsByTag,
  clearAllData,
} from "../db"
import {
  createInitialTagSrs,
  selectSessionTags,
  updateRecentAccuracy,
  updateTagSrsAfterSession,
  scheduleQuestionAfterAnswer,
} from "../core/srs"
import { generateQuestions } from "../api/generate"

const POOL_MIN = 3

function loadSettings(): Settings {
  try {
    return {
      apiKey: localStorage.getItem("ws_apiKey") ?? "",
      sessionSize: Number(localStorage.getItem("ws_sessionSize") ?? "10"),
      difficultyBias:
        (localStorage.getItem("ws_difficultyBias") as Settings["difficultyBias"]) ??
        "standard",
    }
  } catch {
    return { apiKey: "", sessionSize: 10, difficultyBias: "standard" }
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem("ws_apiKey", s.apiKey)
  localStorage.setItem("ws_sessionSize", String(s.sessionSize))
  localStorage.setItem("ws_difficultyBias", s.difficultyBias)
}

interface SessionState {
  questions: Question[]
  currentIndex: number
  attempts: Attempt[]
  startedAt: number
}

interface Store {
  screen: Screen
  settings: Settings
  srsMap: Map<GrammarTag, TagSrs>
  allAttempts: Attempt[]
  session: SessionState | null
  isGenerating: boolean
  generateError: string | null

  init: () => Promise<void>
  setScreen: (s: Screen) => void
  updateSettings: (patch: Partial<Settings>) => void
  startSession: () => Promise<void>
  submitAnswer: (selectedIndex: number) => Promise<void>
  finishSession: () => Promise<void>
  clearData: () => Promise<void>
  getWrongQuestions: (tag: GrammarTag) => Promise<Question[]>
}

export const useStore = create<Store>((set, get) => ({
  screen: "home",
  settings: loadSettings(),
  srsMap: new Map(),
  allAttempts: [],
  session: null,
  isGenerating: false,
  generateError: null,

  init: async () => {
    const [srsList, attempts] = await Promise.all([
      getAllTagSrs(),
      getAllAttempts(),
    ])
    const srsMap = new Map<GrammarTag, TagSrs>()
    for (const srs of srsList) srsMap.set(srs.tag, srs)
    set({ srsMap, allAttempts: attempts })
  },

  setScreen: (screen) => set({ screen }),

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    saveSettings(settings)
    set({ settings })
  },

  startSession: async () => {
    const { settings, srsMap } = get()
    if (!settings.apiKey) {
      set({ generateError: "APIキーが設定されていません。設定画面で入力してください。" })
      set({ screen: "settings" })
      return
    }

    set({ isGenerating: true, generateError: null })

    try {
      const diffMap: Record<Settings["difficultyBias"], 1 | 2 | 3> = {
        easy: 1,
        standard: 2,
        hard: 3,
      }
      const difficulty = diffMap[settings.difficultyBias]
      const sessionTags = selectSessionTags(srsMap, settings.sessionSize)

      // Count needed per tag
      const tagCounts = new Map<GrammarTag, number>()
      for (const tag of sessionTags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }

      const sessionQuestions: Question[] = []

      for (const [tag, needed] of tagCounts) {
        const existing = await getDueQuestionsByTag(tag)
        for (let i = existing.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[existing[i], existing[j]] = [existing[j], existing[i]]
        }
        const available = existing.slice(0, needed)
        sessionQuestions.push(...available)

        const stillNeeded = needed - available.length
        if (stillNeeded > 0) {
          const generated = await generateQuestions(
            tag,
            difficulty,
            stillNeeded + POOL_MIN,
            settings.apiKey
          )
          if (generated.length > 0) {
            await saveQuestions(generated)
            sessionQuestions.push(...generated.slice(0, stillNeeded))
          }
        }
      }

      if (sessionQuestions.length === 0) {
        throw new Error("問題を生成できませんでした。しばらく待ってから再試行してください。")
      }

      // Shuffle to avoid tag clustering
      for (let i = sessionQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[sessionQuestions[i], sessionQuestions[j]] = [
          sessionQuestions[j],
          sessionQuestions[i],
        ]
      }

      set({
        isGenerating: false,
        session: {
          questions: sessionQuestions,
          currentIndex: 0,
          attempts: [],
          startedAt: Date.now(),
        },
        screen: "session",
      })

      // Background pool refill
      refillPoolInBackground(srsMap, difficulty, settings.apiKey)
    } catch (e) {
      set({
        isGenerating: false,
        generateError: e instanceof Error ? e.message : "生成エラーが発生しました",
      })
    }
  },

  submitAnswer: async (selectedIndex: number) => {
    const { session, allAttempts } = get()
    if (!session) return

    const question = session.questions[session.currentIndex]
    const correct = selectedIndex === question.answerIndex
    const now = Date.now()
    const responseMs = now - session.startedAt

    const attempt: Attempt = {
      id: uuidv4(),
      questionId: question.id,
      tag: question.tag,
      selectedIndex,
      correct,
      answeredAt: now,
      responseMs,
    }

    const scheduledQuestion = scheduleQuestionAfterAnswer(question, correct, now)
    await Promise.all([saveAttempt(attempt), saveQuestions([scheduledQuestion])])

    const scheduledQuestions = [...session.questions]
    scheduledQuestions[session.currentIndex] = scheduledQuestion

    const newAttempts = [...session.attempts, attempt]
    set({
      session: {
        ...session,
        questions: scheduledQuestions,
        attempts: newAttempts,
        startedAt: now,
      },
      allAttempts: [...allAttempts, attempt],
    })
  },

  finishSession: async () => {
    const { session, srsMap } = get()
    if (!session) return

    const now = Date.now()
    const tagAttempts = new Map<GrammarTag, boolean[]>()

    for (const attempt of session.attempts) {
      const list = tagAttempts.get(attempt.tag) ?? []
      list.push(attempt.correct)
      tagAttempts.set(attempt.tag, list)
    }

    const newSrsMap = new Map(srsMap)

    for (const [tag, results] of tagAttempts) {
      const existing = srsMap.get(tag) ?? createInitialTagSrs(tag)
      const allTagAttempts = get().allAttempts.filter((a) => a.tag === tag)
      const allResults = allTagAttempts.map((a) => a.correct)

      const sessionAccuracy = results.filter(Boolean).length / results.length
      const updated = updateTagSrsAfterSession(
        {
          ...existing,
          recentAccuracy: updateRecentAccuracy(allResults),
          attemptCount: existing.attemptCount + results.length,
        },
        sessionAccuracy,
        now
      )
      newSrsMap.set(tag, updated)
      await saveTagSrs(updated)
    }

    set({ srsMap: newSrsMap, screen: "result" })
  },

  clearData: async () => {
    await clearAllData()
    set({
      srsMap: new Map(),
      allAttempts: [],
      session: null,
    })
  },

  getWrongQuestions: async (tag: GrammarTag) => {
    const { allAttempts } = get()
    const wrongIds = new Set(
      allAttempts
        .filter((a) => a.tag === tag && !a.correct)
        .map((a) => a.questionId)
    )
    const questions = await getQuestionsByTag(tag)
    return questions.filter((q) => wrongIds.has(q.id))
  },
}))

async function refillPoolInBackground(
  _srsMap: Map<GrammarTag, TagSrs>,
  difficulty: 1 | 2 | 3,
  apiKey: string
) {
  for (const tag of ALL_TAGS) {
    try {
      const count = (await getDueQuestionsByTag(tag)).length
      if (count < POOL_MIN) {
        const generated = await generateQuestions(tag, difficulty, POOL_MIN * 2, apiKey)
        if (generated.length > 0) await saveQuestions(generated)
      }
    } catch {
      // Background; ignore errors
    }
  }
}
