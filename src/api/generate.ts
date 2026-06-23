import { v4 as uuidv4 } from "uuid"
import type { GrammarTag, Question } from "../types"
import { ALL_TAGS } from "../types"

const SYSTEM_PROMPT = `You are a professional TOEIC Part 5 question creator. Your job is to generate realistic TOEIC Part 5 sentence completion questions.

Rules:
- Output ONLY a JSON array. No markdown fences, no explanation, no code blocks.
- Each question must test the EXACT grammar/collocation tag specified.
- Do NOT create pure vocabulary questions (questions that only test if the user knows a rare word).
- stem: one sentence with a blank represented as ___ (exactly 3 underscores).
- choices: exactly 4 options. Make distractors plausible — especially for collocation tags, use "grammatically possible but idiomatically wrong" distractors.
- answerIndex: 0-3 (index of the correct choice).
- explanation: in Japanese. 2-3 sentences explaining why the answer is correct AND why the main wrong choices are incorrect.
- difficulty: 1 (TOEIC 600), 2 (730), 3 (860).
- tag must exactly match one of: ${ALL_TAGS.join(", ")}

Output format (JSON array only):
[{"stem":"...","choices":["A","B","C","D"],"answerIndex":0,"explanation":"...","tag":"word_form","difficulty":2}]`

function buildPrompt(tag: GrammarTag, difficulty: number, count: number): string {
  return `Generate ${count} TOEIC Part 5 questions testing the "${tag}" category at difficulty level ${difficulty}. Return only the JSON array.`
}

function extractJson(text: string): string {
  // Remove markdown fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  // Find first [ to last ]
  const start = text.indexOf("[")
  const end = text.lastIndexOf("]")
  if (start !== -1 && end !== -1) return text.slice(start, end + 1)
  return text.trim()
}

function isValidQuestion(obj: unknown, expectedTag: GrammarTag): obj is Omit<Question, "id" | "createdAt" | "source"> {
  if (!obj || typeof obj !== "object") return false
  const q = obj as Record<string, unknown>
  return (
    typeof q.stem === "string" &&
    q.stem.includes("___") &&
    Array.isArray(q.choices) &&
    q.choices.length === 4 &&
    typeof q.answerIndex === "number" &&
    [0, 1, 2, 3].includes(q.answerIndex) &&
    typeof q.explanation === "string" &&
    q.tag === expectedTag &&
    [1, 2, 3].includes(q.difficulty as number)
  )
}

export async function generateQuestions(
  tag: GrammarTag,
  difficulty: 1 | 2 | 3,
  count: number,
  apiKey: string
): Promise<Question[]> {
  let lastError: unknown

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: buildPrompt(tag, difficulty, count) },
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`API error ${res.status}: ${err}`)
      }

      const data = await res.json()
      const text = data.content
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("")

      const jsonStr = extractJson(text)
      const parsed = JSON.parse(jsonStr) as unknown[]

      const questions: Question[] = []
      const seen = new Set<string>()

      for (const item of parsed) {
        if (!isValidQuestion(item, tag)) continue
        const key = item.stem.slice(0, 40)
        if (seen.has(key)) continue
        seen.add(key)
        questions.push({
          id: uuidv4(),
          stem: item.stem,
          choices: item.choices as [string, string, string, string],
          answerIndex: item.answerIndex as 0 | 1 | 2 | 3,
          explanation: item.explanation,
          tag: item.tag,
          difficulty: item.difficulty as 1 | 2 | 3,
          createdAt: Date.now(),
          source: "generated",
        })
      }

      return questions
    } catch (e) {
      lastError = e
    }
  }

  throw lastError
}
