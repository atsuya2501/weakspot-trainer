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
