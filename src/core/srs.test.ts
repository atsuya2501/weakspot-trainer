import { describe, it, expect } from "vitest"
import {
  createInitialTagSrs,
  updateRecentAccuracy,
  updateTagSrsAfterSession,
  selectSessionTags,
} from "./srs"
import type { TagSrs } from "../types"
import { ALL_TAGS } from "../types"

describe("createInitialTagSrs", () => {
  it("sets default values", () => {
    const srs = createInitialTagSrs("verb_tense")
    expect(srs.tag).toBe("verb_tense")
    expect(srs.easeFactor).toBe(2.5)
    expect(srs.intervalDays).toBe(0.5)
    expect(srs.attemptCount).toBe(0)
  })
})

describe("updateRecentAccuracy", () => {
  it("returns 0.5 for empty history", () => {
    expect(updateRecentAccuracy([])).toBe(0.5)
  })
  it("caps at last 10", () => {
    const history = new Array(20).fill(false)
    history[19] = true
    expect(updateRecentAccuracy(history)).toBe(0.1)
  })
  it("100% correct", () => {
    expect(updateRecentAccuracy([true, true, true])).toBe(1)
  })
})

describe("updateTagSrsAfterSession", () => {
  const base = createInitialTagSrs("verb_tense")
  const now = 1_000_000_000

  it("extends interval on high accuracy", () => {
    const updated = updateTagSrsAfterSession(base, 0.9, now)
    expect(updated.intervalDays).toBeGreaterThan(base.intervalDays)
    expect(updated.easeFactor).toBeGreaterThan(base.easeFactor)
  })

  it("resets interval on low accuracy", () => {
    const srs = { ...base, intervalDays: 5, easeFactor: 2.5 }
    const updated = updateTagSrsAfterSession(srs, 0.3, now)
    expect(updated.intervalDays).toBe(0.5)
    expect(updated.easeFactor).toBeLessThan(srs.easeFactor)
  })

  it("slightly extends on medium accuracy", () => {
    const updated = updateTagSrsAfterSession(base, 0.6, now)
    expect(updated.intervalDays).toBe(base.intervalDays * 1.2)
    expect(updated.easeFactor).toBe(base.easeFactor)
  })

  it("caps easeFactor at 3.0", () => {
    const srs = { ...base, easeFactor: 2.95 }
    const updated = updateTagSrsAfterSession(srs, 0.9, now)
    expect(updated.easeFactor).toBe(3.0)
  })
})

describe("selectSessionTags", () => {
  it("returns requested number of tags", () => {
    const map = new Map<string, TagSrs>()
    const tags = selectSessionTags(map as any, 10)
    expect(tags).toHaveLength(10)
  })

  it("prioritizes weak due tags", () => {
    const now = Date.now()
    const map = new Map()
    for (const tag of ALL_TAGS) {
      map.set(tag, {
        ...createInitialTagSrs(tag),
        attemptCount: 5,
        recentAccuracy: 0.9,
        nextDueAt: now + 999999,
      })
    }
    // Make verb_tense very weak and due
    map.set("verb_tense", {
      ...createInitialTagSrs("verb_tense"),
      attemptCount: 5,
      recentAccuracy: 0.1,
      nextDueAt: now - 1,
    })
    const tags = selectSessionTags(map, 10)
    expect(tags.filter((t) => t === "verb_tense").length).toBeGreaterThan(2)
  })
})
