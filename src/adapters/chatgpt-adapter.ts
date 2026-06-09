import type {
  PlatformAdapter,
  NormalizedTranscript,
  NormalizedMessage,
  PlatformUsage,
  MessageRole,
} from './types'
import { TranscriptCache } from './transcript-cache'

const SUPPORTED_HOSTNAMES = new Set(['chat.openai.com', 'chatgpt.com'])

function makeError(code: string, message: string, recoverable = true): never {
  const err = new Error(message) as Error & { code: string; recoverable: boolean }
  err.code = code
  err.recoverable = recoverable
  throw err
}

interface ChatGptNode {
  id: string
  message?: {
    id: string
    author: { role: string }
    create_time?: number | null
    update_time?: number | null
    content?: {
      content_type: string
      parts?: unknown[]
    }
    status?: string
    metadata?: Record<string, unknown>
  } | null
  parent: string | null
  children: string[]
}

interface ChatGptRaw {
  title?: string
  mapping: Record<string, ChatGptNode>
  current_node?: string
}

const INTERCEPT_TIMEOUT_MS = 12_000

export class ChatGPTAdapter implements PlatformAdapter {
  readonly name = 'chatgpt' as const

  private cache = new TranscriptCache()
  // Populated by carryover:chatgpt-conversation events from the MAIN world interceptor
  private intercepted = new Map<string, unknown>()

  constructor() {
    document.addEventListener('carryover:chatgpt-conversation', (e: Event) => {
      const evt = e as CustomEvent<{ conversationId: string; data: unknown }>
      const { conversationId, data } = evt.detail ?? {}
      if (conversationId && data) this.intercepted.set(conversationId, data)
    })
  }

  isSupportedPage(): boolean {
    return (
      SUPPORTED_HOSTNAMES.has(location.hostname) &&
      /\/c\/[a-zA-Z0-9_-]+/.test(location.pathname)
    )
  }

  getConversationIdFromUrl(): string | null {
    const m = location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/)
    return m ? m[1] : null
  }

  async fetchConversation(conversationId: string): Promise<NormalizedTranscript> {
    // 1. IndexedDB cache
    const cached = await this.cache.get('chatgpt', conversationId)
    if (cached) return cached.transcript

    // 2. Already intercepted from MAIN world (e.g. page fetched before this was called)
    const alreadyIntercepted = this.intercepted.get(conversationId)
    if (alreadyIntercepted) {
      const transcript = this.normalizeConversation(alreadyIntercepted)
      await this.cache.set('chatgpt', conversationId, transcript)
      return transcript
    }

    // 3. Request from MAIN world cache, then wait for event
    // The interceptor fires on ChatGPT's own /backend-api/conversation/{id} fetch
    // (which includes the required anti-bot tokens). We cannot make that call ourselves.
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        document.removeEventListener('carryover:chatgpt-conversation', handler)
        reject(new Error(`Timeout waiting for ChatGPT conversation ${conversationId}`))
      }, INTERCEPT_TIMEOUT_MS)

      const handler = (e: Event) => {
        const evt = e as CustomEvent<{ conversationId: string; data: unknown }>
        if (evt.detail?.conversationId !== conversationId) return
        clearTimeout(timer)
        document.removeEventListener('carryover:chatgpt-conversation', handler)
        const transcript = this.normalizeConversation(evt.detail.data)
        void this.cache.set('chatgpt', conversationId, transcript)
        resolve(transcript)
      }

      document.addEventListener('carryover:chatgpt-conversation', handler)

      // Trigger MAIN world to replay from its cache if already fetched
      document.dispatchEvent(
        new CustomEvent('carryover:chatgpt-request', {
          detail: { conversationId },
        })
      )
    })
  }

  normalizeConversation(raw: unknown): NormalizedTranscript {
    const data = raw as ChatGptRaw
    const { mapping, title, current_node } = data

    if (!mapping || typeof mapping !== 'object') {
      makeError('PARSER_FAILED', 'ChatGPT response missing mapping', false)
    }

    // Find the active leaf node
    const leafId = current_node ?? this.findLatestLeaf(mapping)
    const orderedIds = leafId ? this.walkToRoot(leafId, mapping) : []

    const messages: NormalizedMessage[] = []
    for (const nodeId of orderedIds) {
      const node = mapping[nodeId]
      if (!node?.message) continue

      const { message } = node
      const role = this.mapRole(message.author?.role ?? 'unknown')

      // Skip system/tool messages that have no useful content, unless they have text
      if (role === 'system' && !this.extractContent(message.content)) continue

      const text = this.extractContent(message.content)
      if (!text.trim()) continue

      messages.push({
        id: message.id,
        role,
        text,
        createdAt: message.create_time ? new Date(message.create_time * 1000).toISOString() : undefined,
        updatedAt: message.update_time ? new Date(message.update_time * 1000).toISOString() : undefined,
        parentId: node.parent ?? undefined,
        childrenIds: node.children,
        metadata: message.metadata,
      })
    }

    const conversationId = this.getConversationIdFromUrl() ?? 'unknown'

    return {
      platform: 'chatgpt',
      conversationId,
      title,
      url: location.href,
      messages,
      activeBranch: leafId ?? undefined,
      source: 'internal_api',
      fetchedAt: new Date().toISOString(),
    }
  }

  private mapRole(role: string): MessageRole {
    if (role === 'user') return 'user'
    if (role === 'assistant') return 'assistant'
    if (role === 'system') return 'system'
    if (role === 'tool') return 'tool'
    return 'unknown'
  }

  private extractContent(
    content?: { content_type: string; parts?: unknown[] } | null
  ): string {
    if (!content) return ''
    if (!Array.isArray(content.parts)) return ''

    return content.parts
      .map((p) => {
        if (typeof p === 'string') return p
        if (p && typeof p === 'object') {
          const part = p as Record<string, unknown>
          if (typeof part['text'] === 'string') return part['text']
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  private findLatestLeaf(mapping: Record<string, ChatGptNode>): string | null {
    const ids = Object.keys(mapping)
    const childSet = new Set<string>()
    for (const id of ids) {
      for (const child of mapping[id].children ?? []) {
        childSet.add(child)
      }
    }

    // Leaf nodes = nodes with no children of their own (bottom of tree)
    const leaves = ids.filter((id) => (mapping[id].children?.length ?? 0) === 0 && mapping[id].message)
    if (leaves.length === 0) return ids[ids.length - 1] ?? null

    // Pick leaf on longest path
    let best: string | null = null
    let bestDepth = -1
    for (const leaf of leaves) {
      const depth = this.pathLength(leaf, mapping)
      if (depth > bestDepth) {
        bestDepth = depth
        best = leaf
      }
    }
    return best
  }

  private pathLength(nodeId: string, mapping: Record<string, ChatGptNode>): number {
    let depth = 0
    let current: string | null = nodeId
    const seen = new Set<string>()
    while (current && !seen.has(current)) {
      seen.add(current)
      const node: ChatGptNode | undefined = mapping[current]
      if (!node) break
      current = node.parent
      depth++
    }
    return depth
  }

  /** Walk from leaf to root via parent pointers, then reverse for chronological order. */
  private walkToRoot(leafId: string, mapping: Record<string, ChatGptNode>): string[] {
    const path: string[] = []
    let current: string | null = leafId
    const seen = new Set<string>()
    while (current && !seen.has(current)) {
      seen.add(current)
      path.push(current)
      const node: ChatGptNode | undefined = mapping[current]
      if (!node) break
      current = node.parent
    }
    return path.reverse()
  }

  async getUsageInfo(): Promise<PlatformUsage> {
    return { available: false, source: 'unavailable', label: 'Usage unavailable' }
  }
}
