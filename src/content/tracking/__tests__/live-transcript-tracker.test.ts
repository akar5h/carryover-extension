import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  LiveMessageSnapshot,
  NormalizedTranscript,
  PlatformAdapter,
  PlatformUsage,
} from '../../../adapters/types'
import { LiveTranscriptTracker } from '../live-transcript-tracker'
import type { TranscriptStore } from '../live-transcript-tracker'

function transcript(
  conversationId: string,
  messages: NormalizedTranscript['messages']
): NormalizedTranscript {
  return {
    platform: 'chatgpt',
    conversationId,
    messages,
    source: 'internal_api',
    fetchedAt: new Date().toISOString(),
  }
}

function storeWith(cached: NormalizedTranscript | null): TranscriptStore {
  return {
    get: vi.fn().mockResolvedValue(cached ? {
      transcript: cached,
      fetchedAt: cached.fetchedAt,
    } : null),
    set: vi.fn().mockResolvedValue(undefined),
  }
}

function adapterWith(
  root: Element,
  visible: () => LiveMessageSnapshot[],
  fetchConversation: PlatformAdapter['fetchConversation'],
  generating: () => boolean = () => false
): PlatformAdapter {
  return {
    name: 'chatgpt',
    isSupportedPage: () => true,
    getConversationIdFromUrl: () => 'conv-1',
    fetchConversation,
    getUsageInfo: async () => ({
      available: false,
      source: 'unavailable',
      label: '',
    } satisfies PlatformUsage),
    normalizeConversation: vi.fn(),
    getConversationRoot: () => root,
    readVisibleMessages: visible,
    isGenerating: generating,
  }
}

function mutate(root: Element): void {
  root.appendChild(document.createElement('span'))
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('LiveTranscriptTracker', () => {
  it('shows cached state and then replaces it with a forced fresh transcript', async () => {
    const root = document.createElement('main')
    document.body.appendChild(root)
    const cached = transcript('conv-1', [{ id: 'u1', role: 'user', text: 'old' }])
    const fresh = transcript('conv-1', [{ id: 'u1', role: 'user', text: 'fresh transcript' }])
    const fetchConversation = vi.fn().mockResolvedValue(fresh)
    const tracker = new LiveTranscriptTracker(
      adapterWith(root, () => [], fetchConversation),
      { store: storeWith(cached), sampleIntervalMs: 1, settleIntervalMs: 1 }
    )

    tracker.start('conv-1')

    await vi.waitFor(() => {
      expect(tracker.getTranscript()?.messages[0].text).toBe('fresh transcript')
    })
    expect(fetchConversation).toHaveBeenCalledWith('conv-1', { forceRefresh: true })
    expect(tracker.getState().freshness).toBe('reconciled')
    tracker.stop()
  })

  it('updates token state from a streaming DOM message without waiting for reconciliation', async () => {
    const root = document.createElement('main')
    document.body.appendChild(root)
    let snapshots: LiveMessageSnapshot[] = [
      { id: 'u1', role: 'user', text: 'hello', streaming: false },
    ]
    let generating = false
    const fetchConversation = vi.fn().mockRejectedValue(new Error('unavailable'))
    const tracker = new LiveTranscriptTracker(
      adapterWith(root, () => snapshots, fetchConversation, () => generating),
      { store: storeWith(null), sampleIntervalMs: 1, settleIntervalMs: 5 }
    )
    tracker.start('conv-1')
    const initialTokens = tracker.getState().totalTokens

    generating = true
    snapshots = [
      snapshots[0],
      { id: 'a1', role: 'assistant', text: 'streaming response text', streaming: true },
    ]
    mutate(root)

    await vi.waitFor(() => {
      expect(tracker.getState().totalTokens).toBeGreaterThan(initialTokens)
      expect(tracker.getState().isGenerating).toBe(true)
    })
    tracker.stop()
  })

  it('forces reconciliation after the assistant response settles', async () => {
    const root = document.createElement('main')
    document.body.appendChild(root)
    let generating = false
    let snapshots: LiveMessageSnapshot[] = [
      { id: 'u1', role: 'user', text: 'hello', streaming: false },
      { id: 'a1', role: 'assistant', text: 'first answer', streaming: false },
    ]
    const fresh = transcript('conv-1', [
      { id: 'u1', role: 'user', text: 'hello' },
      { id: 'a1', role: 'assistant', text: 'first answer' },
    ])
    const fetchConversation = vi.fn().mockResolvedValue(fresh)
    const tracker = new LiveTranscriptTracker(
      adapterWith(root, () => snapshots, fetchConversation, () => generating),
      { store: storeWith(null), sampleIntervalMs: 1, settleIntervalMs: 5 }
    )
    tracker.start('conv-1')
    await vi.waitFor(() => expect(fetchConversation).toHaveBeenCalledTimes(1))

    generating = true
    snapshots = [
      ...snapshots,
      { id: 'u2', role: 'user', text: 'next question', streaming: false },
      { id: 'a2', role: 'assistant', text: 'partial', streaming: true },
    ]
    mutate(root)
    await vi.waitFor(() => expect(tracker.getState().isGenerating).toBe(true))

    generating = false
    snapshots = snapshots.map((message) =>
      message.id === 'a2' ? { ...message, text: 'completed answer', streaming: false } : message
    )
    mutate(root)

    await vi.waitFor(() => expect(fetchConversation).toHaveBeenCalledTimes(2))
    tracker.stop()
  })

  it('ignores a late refresh result after switching conversations', async () => {
    const root = document.createElement('main')
    document.body.appendChild(root)
    let resolveFirst: (value: NormalizedTranscript) => void = () => {
      throw new Error('first refresh did not start')
    }
    const fetchConversation = vi.fn()
      .mockImplementationOnce(() => new Promise<NormalizedTranscript>((resolve) => {
        resolveFirst = resolve
      }))
      .mockResolvedValueOnce(transcript('conv-2', [{ id: 'u2', role: 'user', text: 'second' }]))
    const tracker = new LiveTranscriptTracker(
      adapterWith(root, () => [], fetchConversation),
      { store: storeWith(null), sampleIntervalMs: 1, settleIntervalMs: 1 }
    )

    tracker.start('conv-1')
    await vi.waitFor(() => expect(fetchConversation).toHaveBeenCalledTimes(1))
    tracker.start('conv-2')
    await vi.waitFor(() => expect(tracker.getTranscript()?.conversationId).toBe('conv-2'))

    resolveFirst(transcript('conv-1', [{ id: 'u1', role: 'user', text: 'late first' }]))
    await Promise.resolve()

    expect(tracker.getTranscript()?.conversationId).toBe('conv-2')
    tracker.stop()
  })
})
