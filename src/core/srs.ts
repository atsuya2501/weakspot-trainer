import type { GrammarTag, Question, TagSrs } from "../types"
import { ALL_TAGS, TAG_WEIGHTS } from "../types"

export const CORRECT_QUESTION_INTERVAL_DAYS = 10

export function scheduleQuestionAfterAnswer(
  question: Question,
  correct: boolean,
  now: number = Date.now()
): Question {
  return {
    ...question,
    lastAnsweredAt: now,
    nextDueAt: correct
      ? now + CORRECT_QUESTION_INTERVAL_DAYS * 86_400_000
      : now,
  }
}

export function createInitialTagSrs(tag: GrammarTag): TagSrs {
  return {
    tag,
    recentAccuracy: 0.5,
    attemptCount: 0,
    intervalDays: 0.5,
    nextDueAt: Date.now(),
    lastReviewedAt: 0,
    easeFactor: 2.5,
  }
}

export function updateRecentAccuracy(history: boolean[]): number {
  if (history.length === 0) return 0.5
  const recent = history.slice(-10)
  return recent.filter(Boolean).length / recent.length
}

export function updateTagSrsAfterSession(
  srs: TagSrs,
  sessionAccuracy: number,
  now: number = Date.now()
): TagSrs {
  let { intervalDays, easeFactor } = srs

  if (sessionAccuracy >= 0.8) {
    intervalDays = intervalDays * easeFactor
    easeFactor = Math.min(3.0, easeFactor + 0.1)
  } else if (sessionAccuracy >= 0.5) {
    intervalDays = intervalDays * 1.2
  } else {
    intervalDays = 0.5
    easeFactor = Math.max(1.3, easeFactor - 0.2)
  }

  return {
    ...srs,
    intervalDays,
    easeFactor,
    nextDueAt: now + intervalDays * 86_400_000,
    lastReviewedAt: now,
  }
}

export function selectSessionTags(
  srsMap: Map<GrammarTag, TagSrs>,
  sessionSize: number,
  now: number = Date.now()
): GrammarTag[] {
  const dueAndWeak: GrammarTag[] = []
  const weakNotDue: GrammarTag[] = []
  const untouched: GrammarTag[] = []
  const confident: GrammarTag[] = []

  for (const tag of ALL_TAGS) {
    const srs = srsMap.get(tag) ?? createInitialTagSrs(tag)
    if (srs.attemptCount === 0) {
      untouched.push(tag)
    } else if (srs.nextDueAt <= now) {
      dueAndWeak.push(tag)
    } else if (srs.recentAccuracy < 0.6) {
      weakNotDue.push(tag)
    } else {
      confident.push(tag)
    }
  }

  dueAndWeak.sort(
    (a, b) =>
      (srsMap.get(a)?.recentAccuracy ?? 0.5) -
      (srsMap.get(b)?.recentAccuracy ?? 0.5)
  )
  weakNotDue.sort(
    (a, b) =>
      (srsMap.get(a)?.recentAccuracy ?? 0.5) -
      (srsMap.get(b)?.recentAccuracy ?? 0.5)
  )

  const result: GrammarTag[] = []
  const expandByWeight = (tags: GrammarTag[]) =>
    tags.flatMap((tag) => Array(TAG_WEIGHTS[tag]).fill(tag) as GrammarTag[])
  const primaryPool = expandByWeight([...dueAndWeak, ...weakNotDue])
  const untouchedPool = expandByWeight(untouched)
  const confidentPool = expandByWeight(confident)
  const allPooled = [...primaryPool, ...untouchedPool, ...confidentPool]

  // Slots: reserve 1 for untouched (if any) and 1 for confident (if any)
  const hasUntouched = untouched.length > 0
  const hasConfident = confident.length > 0
  const reservedSlots = (hasUntouched ? 1 : 0) + (hasConfident ? 1 : 0)
  const targetPrimary = Math.max(0, sessionSize - reservedSlots)

  // Fill primary (weak/due) slots with repeats allowed
  if (primaryPool.length > 0) {
    for (let i = 0; result.length < targetPrimary; i++) {
      result.push(primaryPool[i % primaryPool.length])
    }
  } else if (allPooled.length > 0) {
    // No weak/due tags — fill from whatever is available
    while (result.length < targetPrimary) {
      result.push(allPooled[Math.floor(Math.random() * allPooled.length)])
    }
  }

  // Add one untouched
  if (hasUntouched) {
    result.push(untouchedPool[Math.floor(Math.random() * untouchedPool.length)])
  }

  // Add one confident (retention check)
  if (hasConfident) {
    result.push(confidentPool[Math.floor(Math.random() * confidentPool.length)])
  } else if (allPooled.length > 0 && result.length < sessionSize) {
    result.push(allPooled[0])
  }

  // Final fill if still short (edge case: very few total tags)
  while (result.length < sessionSize && allPooled.length > 0) {
    result.push(allPooled[Math.floor(Math.random() * allPooled.length)])
  }

  return result.slice(0, sessionSize)
}
