import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TranscriptCache } from '../transcript-cache'
import type { NormalizedTranscript } from '../types'

// Minimal IndexedDB mock
function makeIdbMock() {
  const store: Record<string, unknown> = {}

  const makeTx = (mode: string) => ({
    objectStore: () => ({
      get: (key: string) => {
        const req = { result: store[key], onsuccess: null as ((e?: unknown) => void) | null, onerror: null }
        setTimeout(() => req.onsuccess?.(), 0)
        return req
      },
      put: (value: unknown, key: string) => {
        store[key] = value
        const req = { onsuccess: null as ((e?: unknown) => void) | null, onerror: null }
        setTimeout(() => req.onsuccess?.(), 0)
        return req
      },
      delete: (key: string) => {
        delete store[key]
        const req = { onsuccess: null as ((e?: unknown) => void) | null, onerror: null }
        setTimeout(() => req.onsuccess?.(), 0)
        return req
      },
    }),
  })

  const db = {
    transaction: makeTx,
    createObjectStore: vi.fn(),
  }

  const openReq = {
    result: db,
    onupgradeneeded: null as ((e?: unknown) => void) | null,
    onsuccess: null as ((e?: unknown) => void) | null,
    onerror: null,
  }

  setTimeout(() => openReq.onsuccess?.(), 0)

  vi.stubGlobal('indexedDB', {
    open: () => openReq,
  })

  return { store, openReq }
}

function makeTranscript(): NormalizedTranscript {
  return {
    platform: 'claude',
    conversationId: 'conv-1',
    title: 'Test',
    messages: [{ role: 'user', text: 'Hello' }],
    source: 'internal_api',
    fetchedAt: new Date().toISOString(),
  }
}

describe('TranscriptCache', () => {
  beforeEach(() => {
    makeIdbMock()
  })

  it('returns null for missing key', async () => {
    const cache = new TranscriptCache()
    const result = await cache.get('claude', 'nonexistent')
    expect(result).toBeNull()
  })

  it('stores and retrieves transcript', async () => {
    const cache = new TranscriptCache()
    const t = makeTranscript()
    await cache.set('claude', 'conv-1', t)
    const retrieved = await cache.get('claude', 'conv-1')
    expect(retrieved?.transcript.conversationId).toBe('conv-1')
    expect(retrieved?.transcript.messages[0].text).toBe('Hello')
  })

  it('uses correct key format', async () => {
    const cache = new TranscriptCache()
    const t = makeTranscript()
    await cache.set('chatgpt', 'abc-123', t)

    const wrongPlatform = await cache.get('claude', 'abc-123')
    expect(wrongPlatform).toBeNull()

    const correct = await cache.get('chatgpt', 'abc-123')
    expect(correct?.transcript).toBeDefined()
  })

  it('deletes entry', async () => {
    const cache = new TranscriptCache()
    const t = makeTranscript()
    await cache.set('claude', 'conv-1', t)
    await cache.delete('claude', 'conv-1')
    const result = await cache.get('claude', 'conv-1')
    expect(result).toBeNull()
  })
})
