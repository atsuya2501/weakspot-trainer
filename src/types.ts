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
  "word_form",
  "confusing_pairs",
]

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
