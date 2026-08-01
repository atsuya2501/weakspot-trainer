import { v4 as uuidv4 } from "uuid"
import type { GrammarTag, Question } from "../types"
import { ALL_TAGS } from "../types"

const SYSTEM_PROMPT = `You are a professional TOEIC Part 5 question creator. Your job is to generate realistic TOEIC Part 5 sentence completion questions.

Rules:
- Output ONLY a JSON array. No markdown fences, no explanation, no code blocks.
- Each question must test the EXACT grammar/collocation tag specified.
- Do NOT create basic word-form questions where the answer is obvious only from the missing part of speech.
- Prefer realistic business contexts and test grammar, usage, sentence structure, or contextual meaning.
- stem: one sentence with a blank represented as ___ (exactly 3 underscores).
- choices: exactly 4 options. Make distractors plausible — especially for collocation tags, use "grammatically possible but idiomatically wrong" distractors.
- answerIndex: 0-3 (index of the correct choice).
- explanation: in Japanese. 2-3 sentences explaining why the answer is correct AND why the main wrong choices are incorrect.
- difficulty: 1 (TOEIC 600), 2 (730), 3 (860).
- tag must exactly match one of: ${ALL_TAGS.join(", ")}

Output format (JSON array only):
[{"stem":"...","choices":["A","B","C","D"],"answerIndex":0,"explanation":"...","tag":"fifth_sentence_pattern","difficulty":2}]`

const PERSONAL_WEAKNESS_PROFILE = `This learner's error history shows these recurring traps. When relevant to the requested tag, deliberately create NEW questions that test the same reasoning pattern without copying source-book wording:
- governed prepositions and fixed frames: adjective/verb/noun + preposition, preposition + noun, and multiword frames; make all distractors locally plausible
- verb complementation and valency: V + O, V + O + C, V + O + to-infinitive, V + bare infinitive, V + gerund, and whether a preposition is required
- passive transformations: SVOO/SVOC passives with an object or complement left after the passive verb; causative verbs whose infinitive changes in the passive
- clause connectors: distinguish conjunction + clause, preposition + noun phrase, and conjunctive adverb punctuation; include contrast, reason, condition, result, and in-that style meaning
- participial and reduced clauses: active versus passive relationship, perfect participles, and choosing a finite clause when reduction is impossible
- agreement and count structure: a number of + plural, collective/count nouns, and agreement with the true head noun
- tense and voice must be decided from time sequence and argument structure, not from surface keywords
- derivational choices are allowed only when usage, valency, or context is the real test; never ask an elementary suffix-only question
- explanations must identify the sentence structure (S/V/O/C or clause boundary when helpful) and state the exact rule that rejects the strongest distractor.
Vary vocabulary and business situations. Do not repeatedly reuse the same collocation or example verb.`

const TAG_INSTRUCTIONS: Partial<Record<GrammarTag, string>> = {
  preposition_collocation:
    "Focus on verbs, adjectives, or nouns that govern a specific preposition, plus multiword prepositional frames expressing direction, duration, substitution, proximity, basis, or purpose. Use distractors that are grammatically possible but violate the required meaning or collocation.",
  fifth_sentence_pattern:
    "Focus on SVOC patterns and verbs taking an object complement: make/keep/find/consider/appoint/elect/enable/allow/require/leave and similar TOEIC usage. Test whether C is a noun, adjective, bare infinitive, to-infinitive, or participle and distinguish SVOC from SVOO/SVO.",
  complex_passive:
    "Focus on passive transformations of SVOO and SVOC. Include sentences where one object or an object complement remains after passivization and causatives such as make O do becoming be made to do. Make the remaining O/C relationship and required complement form central to the answer.",
  wh_ever_clause:
    "Focus on whoever/whomever/whatever/whichever/whenever/wherever/however introducing adverbial or concessive clauses. Test both clause completeness and the word's grammatical role; contrast them with no matter forms and ordinary wh-words when appropriate.",
  transitive_intransitive:
    "Test transitive versus intransitive verb usage, including whether a preposition is required, the object pattern of award/assign/provide/offer/remind/allow, and commonly confused pairs such as rise/raise and lie/lay.",
  sentence_structure:
    "Test TOEIC-relevant constructions and complementation patterns: help/make/allow/remind/intend/happen, result and reason constructions, dummy subjects, and finite versus nonfinite clauses. Require structural analysis rather than simple part-of-speech identification.",
  context_usage:
    "Require the surrounding business context to choose among grammatically plausible options; avoid rare-word trivia.",
  conjunction:
    "Contrast conjunctions, prepositions, and conjunctive adverbs by testing whether what follows is a clause or noun phrase and how clauses are connected. Include contrast, reason, condition, result, concession, and expressions such as whereas, since, unless, so...that, and in that, but create original sentences.",
  passive_voice:
    "Test voice choice and passive constructions in context, including be reminded to, be intended to, have/has been + past participle, and leave O C in the passive. Avoid questions solvable only by spotting be + past participle.",
  participle:
    "Test active/passive relationships in reduced clauses, present versus past participles, perfect participles, and cases where a full finite clause is required. Include the logical subject in the explanation.",
  subject_verb_agree:
    "Test agreement with the true head noun, especially a number of + plural, intervening prepositional phrases, quantities, and collective nouns.",
  verb_collocation:
    "Test the verb and complement/preposition as one usage unit. Favor business verbs whose object pattern is easy to confuse, and reject distractors by both meaning and valency.",
  infinitive_gerund:
    "Test the complement selected by a verb or construction, including bare infinitive versus to-infinitive in active/passive causatives, gerunds after fixed expressions, and purpose/result infinitives.",
  verb_tense:
    "Require a timeline: earlier past versus later past, present relevance, scheduled future, and voice. Do not make a single time adverb the only clue.",
}

function buildPrompt(tag: GrammarTag, difficulty: number, count: number): string {
  const focus = TAG_INSTRUCTIONS[tag] ??
    "Create a usage-focused question that requires understanding the sentence, not merely identifying a missing part of speech."
  return `Generate ${count} TOEIC Part 5 questions testing the "${tag}" category at difficulty level ${difficulty}.\n\nLearner profile:\n${PERSONAL_WEAKNESS_PROFILE}\n\nTag focus: ${focus}\nReturn only the JSON array.`
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

      if (questions.length === 0) {
        throw new Error("API response did not contain any valid questions")
      }

      return questions
    } catch (e) {
      lastError = e
    }
  }

  throw lastError
}
