import { TranscriptCache } from '../../adapters/transcript-cache'
import type { CacheEntry } from '../../adapters/transcript-cache'
import type {
  LiveMessageSnapshot,
  NormalizedMessage,
  NormalizedTranscript,
  PlatformAdapter,
  PlatformName,
} from '../../adapters/types'
import { estimateTextTokens } from '../../token-estimator'

export type TranscriptFreshness = 'cached' | 'live' | 'reconciled' | 'stale'

export interface LiveTrackerState {
  conversationId: string
  transcript: NormalizedTranscript | null
  totalTokens: number
  isGenerating: boolean
  freshness: TranscriptFreshness
  updatedAt: number
}

export interface TranscriptStore {
  get(platform: PlatformName, conversationId: string): Promise<CacheEntry | null>
  set(
    platform: PlatformName,
    conversationId: string,
    transcript: NormalizedTranscript
  ): Promise<void>
}

interface LiveTrackerOptions {
  sampleIntervalMs?: number
  settleIntervalMs?: number
  store?: TranscriptStore
}

type StateListener = (state: LiveTrackerState) => void

const DEFAULT_SAMPLE_INTERVAL_MS = 400
const DEFAULT_SETTLE_INTERVAL_MS = 750

export class LiveTranscriptTracker {
  private readonly listeners = new Set<StateListener>()
  private readonly store: TranscriptStore
  private readonly sampleIntervalMs: number
  private readonly settleIntervalMs: number
  private readonly tokenCounts = new Map<string, number>()

  private conversationId: string | null = null
  private transcript: NormalizedTranscript | null = null
  private totalTokens = 0
  private freshness: TranscriptFreshness = 'stale'
  private updatedAt = 0
  private observer: MutationObserver | null = null
  private observedRoot: Element | null = null
  private sampleTimer: number | null = null
  private settleTimer: number | null = null
  private revision = 0
  private generating = false
  private sawGeneration = false
  private completionInitialized = false
  private lastCompletedAssistant = ''
  private reconcileInFlight: Promise<NormalizedTranscript | null> | null = null

  constructor(
    private readonly adapter: PlatformAdapter,
    options: LiveTrackerOptions = {}
  ) {
    this.store = options.store ?? new TranscriptCache()
    this.sampleIntervalMs = options.sampleIntervalMs ?? DEFAULT_SAMPLE_INTERVAL_MS
    this.settleIntervalMs = options.settleIntervalMs ?? DEFAULT_SETTLE_INTERVAL_MS
  }

  start(conversationId: string): void {
    this.stop()
    const revision = this.revision
    this.conversationId = conversationId
    this.attachObserver()
    this.sampleVisibleMessages(false)
    void this.hydrateAndReconcile(conversationId, revision)
  }

  stop(): void {
    this.revision += 1
    this.observer?.disconnect()
    this.observer = null
    this.observedRoot = null
    if (this.sampleTimer !== null) window.clearTimeout(this.sampleTimer)
    if (this.settleTimer !== null) window.clearTimeout(this.settleTimer)
    this.sampleTimer = null
    this.settleTimer = null
    this.conversationId = null
    this.transcript = null
    this.tokenCounts.clear()
    this.totalTokens = 0
    this.freshness = 'stale'
    this.updatedAt = Date.now()
    this.generating = false
    this.sawGeneration = false
    this.completionInitialized = false
    this.lastCompletedAssistant = ''
    this.reconcileInFlight = null
    this.emit()
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  getState(): LiveTrackerState {
    return {
      conversationId: this.conversationId ?? '',
      transcript: this.transcript,
      totalTokens: this.totalTokens,
      isGenerating: this.generating,
      freshness: this.freshness,
      updatedAt: this.updatedAt,
    }
  }

  getTranscript(): NormalizedTranscript | null {
    return this.transcript
  }

  async reconcile(): Promise<NormalizedTranscript | null> {
    if (!this.conversationId) return null
    if (this.reconcileInFlight) return this.reconcileInFlight

    const conversationId = this.conversationId
    const revision = this.revision
    const request = this.reconcileConversation(conversationId, revision)
    this.reconcileInFlight = request

    try {
      return await request
    } finally {
      if (this.reconcileInFlight === request) this.reconcileInFlight = null
    }
  }

  private async hydrateAndReconcile(conversationId: string, revision: number): Promise<void> {
    const cached = await this.store.get(this.adapter.name, conversationId)
    if (!this.isCurrent(conversationId, revision)) return

    if (cached) {
      this.replaceTranscript(cached.transcript, 'cached')
      this.sampleVisibleMessages(false)
    }

    await this.reconcile()
  }

  private async reconcileConversation(
    conversationId: string,
    revision: number
  ): Promise<NormalizedTranscript | null> {
    try {
      const fresh = await this.adapter.fetchConversation(conversationId, { forceRefresh: true })
      if (!this.isCurrent(conversationId, revision)) return this.transcript

      this.replaceTranscript(fresh, 'reconciled')
      this.sampleVisibleMessages(false)
      if (this.transcript) {
        await this.store.set(this.adapter.name, conversationId, this.transcript)
      }
      return this.transcript
    } catch {
      if (!this.isCurrent(conversationId, revision)) return this.transcript
      if (this.transcript) {
        this.freshness = 'stale'
        this.updatedAt = Date.now()
        this.emit()
        await this.store.set(this.adapter.name, conversationId, this.transcript)
      }
      return this.transcript
    }
  }

  private attachObserver(): void {
    const root = this.adapter.getConversationRoot?.() ?? document.body
    if (!root || root === this.observedRoot) return

    this.observer?.disconnect()
    this.observedRoot = root
    this.observer = new MutationObserver(() => this.scheduleSample())
    this.observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  private scheduleSample(): void {
    if (this.sampleTimer !== null) return
    this.sampleTimer = window.setTimeout(() => {
      this.sampleTimer = null
      this.attachObserver()
      this.sampleVisibleMessages(true)
    }, this.sampleIntervalMs)
  }

  private sampleVisibleMessages(detectCompletion: boolean): void {
    if (!this.conversationId || !this.adapter.readVisibleMessages) return
    const snapshots = this.adapter.readVisibleMessages()
    const isGenerating = this.adapter.isGenerating?.()
      ?? snapshots.some((message) => message.streaming)
    let changed = false

    if (!this.transcript && snapshots.length > 0) {
      this.transcript = {
        platform: this.adapter.name,
        conversationId: this.conversationId,
        url: location.href,
        messages: [],
        source: 'dom_fallback',
        fetchedAt: new Date().toISOString(),
      }
    }

    if (this.transcript) {
      for (const snapshot of snapshots) {
        changed = this.mergeSnapshot(snapshot) || changed
      }
    }

    this.generating = isGenerating
    if (isGenerating) this.sawGeneration = true

    if (changed && this.transcript) {
      this.transcript.fetchedAt = new Date().toISOString()
      this.transcript.estimatedTokens = this.totalTokens
      this.freshness = 'live'
      this.updatedAt = Date.now()
      this.emit()
    }

    const assistantSignature = this.latestAssistantSignature(snapshots)
    if (!this.completionInitialized) {
      this.completionInitialized = true
      this.lastCompletedAssistant = assistantSignature
      return
    }

    if (!detectCompletion) return
    if (isGenerating) {
      this.cancelSettle()
      return
    }

    if (assistantSignature && (
      this.sawGeneration || assistantSignature !== this.lastCompletedAssistant
    )) {
      this.scheduleSettle()
    }
  }

  private mergeSnapshot(snapshot: LiveMessageSnapshot): boolean {
    if (!this.transcript) return false
    const messages = this.transcript.messages
    let index = messages.findIndex((message) => message.id === snapshot.id)

    if (index < 0 && snapshot.id.startsWith('dom:')) {
      index = messages.findIndex(
        (message) => message.role === snapshot.role && message.text === snapshot.text
      )
    }

    if (index < 0) {
      const message: NormalizedMessage = {
        id: snapshot.id,
        role: snapshot.role,
        text: snapshot.text,
      }
      messages.push(message)
      const tokens = estimateTextTokens(message.text)
      this.tokenCounts.set(this.messageKey(message, messages.length - 1), tokens)
      this.totalTokens += tokens
      return true
    }

    const existing = messages[index]
    if (existing.text === snapshot.text && existing.role === snapshot.role) return false
    const key = this.messageKey(existing, index)
    this.totalTokens -= this.tokenCounts.get(key) ?? estimateTextTokens(existing.text)
    existing.text = snapshot.text
    existing.role = snapshot.role
    const tokens = estimateTextTokens(existing.text)
    this.tokenCounts.set(key, tokens)
    this.totalTokens += tokens
    return true
  }

  private scheduleSettle(): void {
    if (this.settleTimer !== null) window.clearTimeout(this.settleTimer)
    this.settleTimer = window.setTimeout(() => {
      this.settleTimer = null
      this.sampleVisibleMessages(false)
      if (this.generating) return
      this.lastCompletedAssistant = this.latestAssistantSignature(
        this.adapter.readVisibleMessages?.() ?? []
      )
      this.sawGeneration = false
      void this.reconcile()
    }, this.settleIntervalMs)
  }

  private cancelSettle(): void {
    if (this.settleTimer !== null) window.clearTimeout(this.settleTimer)
    this.settleTimer = null
  }

  private replaceTranscript(
    transcript: NormalizedTranscript,
    freshness: TranscriptFreshness
  ): void {
    this.transcript = {
      ...transcript,
      messages: transcript.messages.map((message) => ({ ...message })),
    }
    this.rebuildTokenIndex()
    this.transcript.estimatedTokens = this.totalTokens
    this.freshness = freshness
    this.updatedAt = Date.now()
    this.emit()
  }

  private rebuildTokenIndex(): void {
    this.tokenCounts.clear()
    this.totalTokens = 0
    if (!this.transcript) return
    this.transcript.messages.forEach((message, index) => {
      const tokens = estimateTextTokens(message.text)
      this.tokenCounts.set(this.messageKey(message, index), tokens)
      this.totalTokens += tokens
    })
  }

  private messageKey(message: NormalizedMessage, index: number): string {
    return message.id ?? `message:${index}`
  }

  private latestAssistantSignature(snapshots: LiveMessageSnapshot[]): string {
    const assistant = [...snapshots].reverse().find((message) => message.role === 'assistant')
    return assistant ? `${assistant.id}\u0000${assistant.text}` : ''
  }

  private isCurrent(conversationId: string, revision: number): boolean {
    return this.conversationId === conversationId && this.revision === revision
  }

  private emit(): void {
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }
}
