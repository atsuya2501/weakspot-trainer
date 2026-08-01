export type GrammarTag =
  | "verb_tense"
  | "subject_verb_agree"
  | "relative_clause"
  | "participle"
  | "comparison"
  | "conditionals"
  | "infinitive_gerund"
  | "passive_voice"
  | "pronoun"
  | "conjunction"
  | "preposition_collocation"
  | "verb_collocation"
  | "adj_noun_collocation"
  | "phrasal_verb"
  | "word_form"
  | "confusing_pairs"
  | "fifth_sentence_pattern"
  | "complex_passive"
  | "wh_ever_clause"
  | "transitive_intransitive"
  | "sentence_structure"
  | "modification"
  | "parallelism"
  | "context_usage"

export const ALL_TAGS: GrammarTag[] = [
  "verb_tense",
  "subject_verb_agree",
  "relative_clause",
  "participle",
  "comparison",
  "conditionals",
  "infinitive_gerund",
  "passive_voice",
  "pronoun",
  "conjunction",
  "preposition_collocation",
  "verb_collocation",
  "adj_noun_collocation",
  "phrasal_verb",
  "confusing_pairs",
  "fifth_sentence_pattern",
  "complex_passive",
  "wh_ever_clause",
  "transitive_intransitive",
  "sentence_structure",
  "modification",
  "parallelism",
  "context_usage",
]

// Personal weak spots take priority; the remaining weights roughly follow
// the category balance of the user's TOEIC grammar workbook.
export const TAG_WEIGHTS: Record<GrammarTag, number> = {
  verb_tense: 3,
  subject_verb_agree: 2,
  relative_clause: 1,
  participle: 2,
  comparison: 1,
  conditionals: 1,
  infinitive_gerund: 2,
  passive_voice: 2,
  pronoun: 1,
  conjunction: 3,
  preposition_collocation: 5,
  verb_collocation: 3,
  adj_noun_collocation: 2,
  phrasal_verb: 2,
  word_form: 0,
  confusing_pairs: 3,
  fifth_sentence_pattern: 5,
  complex_passive: 5,
  wh_ever_clause: 5,
  transitive_intransitive: 2,
  sentence_structure: 2,
  modification: 2,
  parallelism: 1,
  context_usage: 3,
}

export const TAG_LABELS: Record<GrammarTag, string> = {
  verb_tense: "時制",
  subject_verb_agree: "主述一致",
  relative_clause: "関係詞",
  participle: "分詞・分詞構文",
  comparison: "比較",
  conditionals: "仮定法",
  infinitive_gerund: "不定詞 vs 動名詞",
  passive_voice: "受動態",
  pronoun: "代名詞・指示語",
  conjunction: "接続詞 vs 前置詞 vs 副詞",
  preposition_collocation: "前置詞コロケーション",
  verb_collocation: "動詞コロケーション",
  adj_noun_collocation: "形容詞+名詞コロケーション",
  phrasal_verb: "句動詞",
  word_form: "品詞選択",
  confusing_pairs: "紛らわしい語法",
  fifth_sentence_pattern: "第5文型の語法",
  complex_passive: "第4・第5文型の受動態",
  wh_ever_clause: "wh-ever の副詞節",
  transitive_intransitive: "他動詞 vs 自動詞",
  sentence_structure: "構文",
  modification: "修飾",
  parallelism: "パラレリズム",
  context_usage: "文脈・語法",
}

export interface Question {
  id: string
  stem: string
  choices: [string, string, string, string]
  answerIndex: 0 | 1 | 2 | 3
  explanation: string
  tag: GrammarTag
  difficulty: 1 | 2 | 3
  createdAt: number
  source: "generated"
  lastAnsweredAt?: number
  nextDueAt?: number
}

export interface Attempt {
  id: string
  questionId: string
  tag: GrammarTag
  selectedIndex: number
  correct: boolean
  answeredAt: number
  responseMs: number
}

export interface TagSrs {
  tag: GrammarTag
  recentAccuracy: number
  attemptCount: number
  intervalDays: number
  nextDueAt: number
  lastReviewedAt: number
  easeFactor: number
}

export type Screen = "home" | "session" | "result" | "analysis" | "settings"

export interface Settings {
  apiKey: string
  sessionSize: number
  difficultyBias: "easy" | "standard" | "hard"
}
