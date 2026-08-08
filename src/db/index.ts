import { openDB } from "idb"
import type { IDBPDatabase } from "idb"
import type { Question, Attempt, TagSrs, GrammarTag } from "../types"

const DB_NAME = "weakspot"
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("questions")) {
          const qs = db.createObjectStore("questions", { keyPath: "id" })
          qs.createIndex("tag", "tag")
        }
        if (!db.objectStoreNames.contains("attempts")) {
          const as = db.createObjectStore("attempts", { keyPath: "id" })
          as.createIndex("tag", "tag")
          as.createIndex("questionId", "questionId")
        }
        if (!db.objectStoreNames.contains("tagSrs")) {
          db.createObjectStore("tagSrs", { keyPath: "tag" })
        }
      },
    })
  }
  return dbPromise
}

// Questions
export async function saveQuestions(questions: Question[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("questions", "readwrite")
  await Promise.all(questions.map((q) => tx.store.put(q)))
  await tx.done
}

export async function getQuestionsByTag(tag: GrammarTag): Promise<Question[]> {
  const db = await getDB()
  return db.getAllFromIndex("questions", "tag", tag)
}

export async function getDueQuestionsByTag(
  tag: GrammarTag,
  now: number = Date.now()
): Promise<Question[]> {
  const questions = await getQuestionsByTag(tag)
  return questions.filter((q) => q.nextDueAt === undefined || q.nextDueAt <= now)
}

export async function getAllQuestions(): Promise<Question[]> {
  const db = await getDB()
  return db.getAll("questions")
}

export async function countQuestionsByTag(
  tag: GrammarTag
): Promise<number> {
  const db = await getDB()
  return db.countFromIndex("questions", "tag", tag)
}

export async function deleteStaleUnansweredQuestions(
  attemptedQuestionIds: Set<string>,
  currentVersion: number
): Promise<number> {
  const db = await getDB()
  const questions = await db.getAll("questions") as Question[]
  const staleIds = questions
    .filter(
      (q) =>
        (q.generationVersion ?? 0) < currentVersion &&
        !attemptedQuestionIds.has(q.id)
    )
    .map((q) => q.id)

  if (staleIds.length === 0) return 0

  const tx = db.transaction("questions", "readwrite")
  await Promise.all(staleIds.map((id) => tx.store.delete(id)))
  await tx.done
  return staleIds.length
}

// Attempts
export async function saveAttempt(attempt: Attempt): Promise<void> {
  const db = await getDB()
  await db.put("attempts", attempt)
}

export async function getAttemptsByTag(tag: GrammarTag): Promise<Attempt[]> {
  const db = await getDB()
  return db.getAllFromIndex("attempts", "tag", tag)
}

export async function getAllAttempts(): Promise<Attempt[]> {
  const db = await getDB()
  return db.getAll("attempts")
}

export interface LearningDataSnapshot {
  questions: Question[]
  attempts: Attempt[]
  tagSrs: TagSrs[]
}

export async function getLearningDataSnapshot(): Promise<LearningDataSnapshot> {
  const db = await getDB()
  const [questions, attempts, tagSrs] = await Promise.all([
    db.getAll("questions"),
    db.getAll("attempts"),
    db.getAll("tagSrs"),
  ])
  return { questions, attempts, tagSrs }
}

export async function restoreLearningData(
  snapshot: LearningDataSnapshot
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(["questions", "attempts", "tagSrs"], "readwrite")
  await Promise.all([
    ...snapshot.questions.map((item) => tx.objectStore("questions").put(item)),
    ...snapshot.attempts.map((item) => tx.objectStore("attempts").put(item)),
    ...snapshot.tagSrs.map((item) => tx.objectStore("tagSrs").put(item)),
  ])
  await tx.done
}

// TagSrs
export async function getTagSrs(tag: GrammarTag): Promise<TagSrs | undefined> {
  const db = await getDB()
  return db.get("tagSrs", tag)
}

export async function getAllTagSrs(): Promise<TagSrs[]> {
  const db = await getDB()
  return db.getAll("tagSrs")
}

export async function saveTagSrs(srs: TagSrs): Promise<void> {
  const db = await getDB()
  await db.put("tagSrs", srs)
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear("questions"),
    db.clear("attempts"),
    db.clear("tagSrs"),
  ])
}
