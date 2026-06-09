import type { NormalizedTranscript, PlatformName } from './types'

const DB_NAME = 'carryover_transcripts'
const STORE_NAME = 'transcripts'
const DB_VERSION = 1

interface CacheEntry {
  transcript: NormalizedTranscript
  rawHash?: string
  fetchedAt: string
  updatedAt?: string
}

export class TranscriptCache {
  private db: IDBDatabase | null = null

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)

      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME)
      }

      req.onsuccess = () => {
        this.db = req.result
        resolve(req.result)
      }

      req.onerror = () => reject(req.error)
    })
  }

  private key(platform: PlatformName, conversationId: string): string {
    return `${platform}:${conversationId}`
  }

  async get(
    platform: PlatformName,
    conversationId: string
  ): Promise<CacheEntry | null> {
    try {
      const db = await this.open()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(this.key(platform, conversationId))
        req.onsuccess = () => resolve((req.result as CacheEntry) ?? null)
        req.onerror = () => reject(req.error)
      })
    } catch {
      return null
    }
  }

  async set(
    platform: PlatformName,
    conversationId: string,
    transcript: NormalizedTranscript
  ): Promise<void> {
    try {
      const db = await this.open()
      const entry: CacheEntry = {
        transcript,
        fetchedAt: new Date().toISOString(),
      }
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const req = tx.objectStore(STORE_NAME).put(entry, this.key(platform, conversationId))
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch {
      // Cache writes are best-effort — don't throw
    }
  }

  async delete(platform: PlatformName, conversationId: string): Promise<void> {
    try {
      const db = await this.open()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const req = tx.objectStore(STORE_NAME).delete(this.key(platform, conversationId))
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch {
      // ignore
    }
  }
}
