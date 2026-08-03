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

const QUALITY_RESPONSE = [{ index: 0, valid: true, reason: "" }]

function anthropicResponse(text: string) {
  return {
    ok: true,
    json: async () => ({ content: [{ type: "text", text }] }),
  }
}

describe("generateQuestions parsing", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("parses a clean JSON array response", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(anthropicResponse(JSON.stringify(VALID_RESPONSE)))
      .mockResolvedValueOnce(anthropicResponse(JSON.stringify(QUALITY_RESPONSE)))
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
    expect(questions[0].generationVersion).toBeGreaterThan(0)

    const request = mockFetch.mock.calls[0][1]
    const body = JSON.parse(request.body as string)
    expect(body.messages[0].content).toContain("Learner profile")
    expect(body.messages[0].content).toContain("verb complementation and valency")
    expect(body.messages[0].content).toContain("passive transformations")
  })

  it("strips markdown fences from response", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_RESPONSE) + "\n```"
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(anthropicResponse(fenced))
        .mockResolvedValueOnce(anthropicResponse(JSON.stringify(QUALITY_RESPONSE)))
    )

    const { generateQuestions } = await import("./generate")
    const questions = await generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")
    expect(questions).toHaveLength(1)
  })

  it("retries and rejects when every question has the wrong tag", async () => {
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
    await expect(
      generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")
    ).rejects.toThrow("did not contain any valid questions")
  })

  it("retries and rejects when every question is missing the blank", async () => {
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
    await expect(
      generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")
    ).rejects.toThrow("did not contain any valid questions")
  })

  it("deduplicates stems with same first 40 chars", async () => {
    const duplicate = [
      { ...VALID_RESPONSE[0] },
      { ...VALID_RESPONSE[0], choices: ["a", "b", "c", "d"] as [string, string, string, string] },
    ]
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(anthropicResponse(JSON.stringify(duplicate)))
        .mockResolvedValueOnce(anthropicResponse(JSON.stringify(QUALITY_RESPONSE)))
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

  it("retries when the quality reviewer rejects every candidate", async () => {
    const rejected = JSON.stringify([{ index: 0, valid: false, reason: "ambiguous" }])
    const mockFetch = vi.fn()
    for (let i = 0; i < 3; i++) {
      mockFetch
        .mockResolvedValueOnce(anthropicResponse(JSON.stringify(VALID_RESPONSE)))
        .mockResolvedValueOnce(anthropicResponse(rejected))
    }
    vi.stubGlobal("fetch", mockFetch)

    const { generateQuestions } = await import("./generate")
    await expect(
      generateQuestions("infinitive_gerund", 2, 1, "sk-test-key")
    ).rejects.toThrow("failed quality review")
    expect(mockFetch).toHaveBeenCalledTimes(6)
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
