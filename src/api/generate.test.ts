import { describe, it, expect, vi, beforeEach } from "vitest"

// We test the internal parsing logic by extracting it — mock fetch for API tests
const VALID_RESPONSE = [
  {
    stem: "The manager asked the team to ___ the report by Friday.",
    choices: ["submit", "submitting", "submission", "submitted"],
    answerIndex: 0,
    explanation: "ask + 人 + to不定詞の構文なので原形不定詞 submit が正解。submitting は動名詞で to の後には使えない。",
    tag: "infinitive_gerund",
    difficulty: 2,
  },
]

describe("generateQuestions parsing", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("parses a clean JSON array response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: JSON.stringify(VALID_RESPONSE) }],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const { generateQuestions } = await import("./generate")
    const questions = await generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")

    expect(questions).toHaveLength(1)
    expect(questions[0].tag).toBe("infinitive_gerund")
    expect(questions[0].stem).toContain("___")
    expect(questions[0].choices).toHaveLength(4)
    expect([0, 1, 2, 3]).toContain(questions[0].answerIndex)
    expect(questions[0].id).toBeTruthy()
    expect(questions[0].source).toBe("generated")
  })

  it("strips markdown fences from response", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_RESPONSE) + "\n```"
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: fenced }],
        }),
      })
    )

    const { generateQuestions } = await import("./generate")
    const questions = await generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")
    expect(questions).toHaveLength(1)
  })

  it("discards questions with wrong tag (tag contamination)", async () => {
    const wrongTag = [{ ...VALID_RESPONSE[0], tag: "verb_tense" }]
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: JSON.stringify(wrongTag) }],
        }),
      })
    )

    const { generateQuestions } = await import("./generate")
    const questions = await generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")
    expect(questions).toHaveLength(0)
  })

  it("discards questions without ___ in stem", async () => {
    const noBlank = [{ ...VALID_RESPONSE[0], stem: "The manager asked the team to submit the report." }]
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: JSON.stringify(noBlank) }],
        }),
      })
    )

    const { generateQuestions } = await import("./generate")
    const questions = await generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")
    expect(questions).toHaveLength(0)
  })

  it("deduplicates stems with same first 40 chars", async () => {
    const duplicate = [
      { ...VALID_RESPONSE[0] },
      { ...VALID_RESPONSE[0], choices: ["a", "b", "c", "d"] as [string, string, string, string] },
    ]
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: JSON.stringify(duplicate) }],
        }),
      })
    )

    const { generateQuestions } = await import("./generate")
    const questions = await generateQuestions("infinitive_gerund", 2, 2, "sk-test-key")
    expect(questions).toHaveLength(1)
  })

  it("retries on parse failure and throws after 3 attempts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "not valid json {{{{" }],
        }),
      })
    )

    const { generateQuestions } = await import("./generate")
    await expect(generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")).rejects.toThrow()
  })

  it("throws on non-ok API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      })
    )

    const { generateQuestions } = await import("./generate")
    await expect(generateQuestions("infinitive_gerund", 2, 1, "bad-key")).rejects.toThrow()
  })
})
