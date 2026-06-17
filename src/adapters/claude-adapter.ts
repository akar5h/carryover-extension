import type {
  PlatformAdapter,
  NormalizedTranscript,
  NormalizedMessage,
  PlatformUsage,
  MessageRole,
} from './types'
import { TranscriptCache } from './transcript-cache'

const ORG_CACHE_KEY = 'carryover_claude_org_id'

function uuidPattern(): RegExp {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
}

function makeError(code: string, message: string, recoverable = true): never {
  const err = new Error(message) as Error & { code: string; recoverable: boolean }
  err.code = code
  err.recoverable = recoverable
  throw err
}

export class ClaudeAdapter implements PlatformAdapter {
  readonly name = 'claude' as const

  private cache = new TranscriptCache()
  private cachedOrgId: string | null = null

  isSupportedPage(): boolean {
    return (
      location.hostname === 'claude.ai' &&
      uuidPattern().test(location.pathname)
    )
  }

  getConversationIdFromUrl(): string | null {
    const m = location.pathname.match(/\/chat\/([0-9a-f-]{36})/i)
    return m ? m[1] : null
  }

  private async getOrganizationId(): Promise<string> {
    if (this.cachedOrgId) return this.cachedOrgId

    // Check extension storage
    try {
      const stored = await chrome.storage.session.get(ORG_CACHE_KEY)
      if (stored[ORG_CACHE_KEY]) {
        this.cachedOrgId = stored[ORG_CACHE_KEY] as string
        return this.cachedOrgId
      }
    } catch {
      // session storage unavailable in some contexts — continue
    }

    const res = await fetch('/api/organizations', { credentials: 'include' })
    if (res.status === 401 || res.status === 403) {
      makeError('NOT_LOGGED_IN', 'Not authenticated with Claude', false)
    }
    if (!res.ok) {
      makeError('FETCH_FAILED', `Organizations fetch failed: ${res.status}`)
    }

    const orgs: unknown = await res.json()
    if (!Array.isArray(orgs) || orgs.length === 0) {
      makeError('ORG_NOT_FOUND', 'No organizations returned', false)
    }

    // Prefer active org with chat capability, then first
    const orgList = orgs as Record<string, unknown>[]
    const active = orgList.find(
      (o) => o['active_flags'] && (o['capabilities'] as string[] | undefined)?.includes('chat')
    ) ?? orgList.find((o) => (o['capabilities'] as string[] | undefined)?.includes('chat'))
      ?? orgList[0]

    const orgId = active['uuid'] as string | undefined
    if (!orgId) makeError('ORG_NOT_FOUND', 'Org UUID missing', false)

    this.cachedOrgId = orgId!
    try {
      await chrome.storage.session.set({ [ORG_CACHE_KEY]: orgId })
    } catch {
      // ignore
    }
    return this.cachedOrgId!
  }

  async fetchConversation(conversationId: string): Promise<NormalizedTranscript> {
    // Check IndexedDB cache first
    const cached = await this.cache.get('claude', conversationId)
    if (cached) return cached.transcript

    const orgId = await this.getOrganizationId()
    const url =
      `/api/organizations/${orgId}/chat_conversations/${conversationId}` +
      `?tree=True&rendering_mode=messages&render_all_tools=true`

    const res = await fetch(url, { credentials: 'include' })

    if (res.status === 401 || res.status === 403) {
      makeError('NOT_LOGGED_IN', 'Claude session expired', false)
    }
    if (res.status === 404) {
      makeError('CONVERSATION_NOT_FOUND', `Conversation ${conversationId} not found`, false)
    }
    if (res.status === 429) {
      makeError('RATE_LIMITED', 'Rate limited by Claude API', true)
    }
    if (!res.ok) {
      makeError('FETCH_FAILED', `Conversation fetch failed: ${res.status}`)
    }

    let raw: unknown
    try {
      raw = await res.json()
    } catch (e) {
      makeError('PARSER_FAILED', `Failed to parse Claude response: ${e}`)
    }

    const transcript = this.normalizeConversation(raw)
    await this.cache.set('claude', conversationId, transcript)
    return transcript
  }

  normalizeConversation(raw: unknown): NormalizedTranscript {
    const data = raw as Record<string, unknown>
    const conversationId = data['uuid'] as string
    const title = data['name'] as string | undefined
    const messages = (data['chat_messages'] as Record<string, unknown>[] | undefined) ?? []

    // Build index for tree walk
    const byUuid = new Map<string, Record<string, unknown>>()
    for (const m of messages) {
      byUuid.set(m['uuid'] as string, m)
    }

    // Find active leaf — prefer current_leaf_message_uuid
    const leafUuid =
      (data['current_leaf_message_uuid'] as string | undefined) ??
      this.findLatestLeaf(messages, byUuid)

    // Walk active branch: leaf → root via parent_message_uuid, then reverse
    const branchMessages = leafUuid ? this.walkBranch(leafUuid, byUuid) : messages

    const normalized: NormalizedMessage[] = branchMessages.map((m) => ({
      id: m['uuid'] as string | undefined,
      role: this.mapRole(m['sender'] as string),
      text: this.extractText(m),
      createdAt: m['created_at'] as string | undefined,
      updatedAt: m['updated_at'] as string | undefined,
      parentId: (m['parent_message_uuid'] as string | null | undefined) ?? undefined,
      childrenIds: (m['children_message_uuids'] as string[] | undefined) ?? [],
    }))

    return {
      platform: 'claude',
      conversationId,
      title,
      url: `https://claude.ai/chat/${conversationId}`,
      messages: normalized,
      activeBranch: leafUuid ?? undefined,
      source: 'internal_api',
      fetchedAt: new Date().toISOString(),
    }
  }

  private mapRole(sender: string): MessageRole {
    if (sender === 'human') return 'user'
    if (sender === 'assistant') return 'assistant'
    return 'unknown'
  }

  private extractText(m: Record<string, unknown>): string {
    // text field is primary; content blocks are fallback
    if (typeof m['text'] === 'string' && m['text'].length > 0) return m['text']

    const content = m['content']
    if (Array.isArray(content)) {
      return content
        .map((c: unknown) => {
          const block = c as Record<string, unknown>
          if (block['type'] === 'text') return block['text'] as string ?? ''
          return ''
        })
        .filter(Boolean)
        .join('\n')
    }
    return ''
  }

  private findLatestLeaf(
    messages: Record<string, unknown>[],
    byUuid: Map<string, Record<string, unknown>>
  ): string | null {
    // Messages that are not a parent of any other message are leaves
    const parentUuids = new Set<string>()
    for (const m of messages) {
      const parent = m['parent_message_uuid'] as string | undefined
      if (parent) parentUuids.add(parent)
    }

    const leaves = messages.filter((m) => !parentUuids.has(m['uuid'] as string))
    if (leaves.length === 0) return messages[messages.length - 1]?.['uuid'] as string ?? null

    // Among leaves, pick the one on the longest path from root
    let best: string | null = null
    let bestDepth = -1
    for (const leaf of leaves) {
      const depth = this.pathDepth(leaf['uuid'] as string, byUuid)
      if (depth > bestDepth) {
        bestDepth = depth
        best = leaf['uuid'] as string
      }
    }
    return best
  }

  private pathDepth(
    uuid: string,
    byUuid: Map<string, Record<string, unknown>>
  ): number {
    let depth = 0
    let current: string | undefined = uuid
    const seen = new Set<string>()
    while (current && !seen.has(current)) {
      seen.add(current)
      const node = byUuid.get(current)
      if (!node) break
      current = node['parent_message_uuid'] as string | undefined
      depth++
    }
    return depth
  }

  private walkBranch(
    leafUuid: string,
    byUuid: Map<string, Record<string, unknown>>
  ): Record<string, unknown>[] {
    const path: Record<string, unknown>[] = []
    let current: string | undefined = leafUuid
    const seen = new Set<string>()
    while (current && !seen.has(current)) {
      seen.add(current)
      const node = byUuid.get(current)
      if (!node) break
      path.push(node)
      current = node['parent_message_uuid'] as string | undefined
    }
    return path.reverse()
  }

  async getUsageInfo(): Promise<PlatformUsage> {
    try {
      const el = document.querySelector<HTMLElement>('[data-testid="context-usage"]')
      if (!el) return { available: false, source: 'unavailable', label: 'Usage unavailable' }

      const text = el.innerText ?? el.textContent ?? ''
      const match = text.match(/(\d+(?:\.\d+)?)\s*%/)
      if (!match) return { available: false, source: 'unavailable', label: 'Usage unavailable' }

      const val = parseFloat(match[1])
      if (!Number.isFinite(val)) return { available: false, source: 'unavailable', label: 'Usage unavailable' }

      return { available: true, percentUsed: val, source: 'ui_detected', label: `${Math.round(val)}%` }
    } catch {
      return { available: false, source: 'unavailable', label: 'Usage unavailable' }
    }
  }

  async insertTextIntoComposer(text: string): Promise<void> {
    // Claude uses a React-controlled contenteditable div (not a plain textarea).
    // Priority: scoped selectors first to avoid matching code-block editables.
    const selectors = [
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"][aria-label]',
      'div[contenteditable="true"]',
      'textarea',
    ]

    let el: HTMLElement | null = null
    for (const sel of selectors) {
      el = document.querySelector<HTMLElement>(sel)
      if (el) break
    }

    if (!el) {
      makeError('FETCH_FAILED', 'Composer element not found on page')
    }

    el.focus()

    if (el.tagName === 'TEXTAREA') {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      if (nativeSetter) {
        nativeSetter.call(el, text)
      } else {
        (el as HTMLTextAreaElement).value = text
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }))
    } else {
      // contenteditable — execCommand triggers React's synthetic event system
      document.execCommand('selectAll', false, null)
      document.execCommand('insertText', false, text)
    }
  }

  async openNewChatWithText(text: string): Promise<void> {
    await chrome.storage.session.set({ 'carryover:pending_insert': text })
    window.open('https://claude.ai/new', '_blank')
  }

  async compressInChat(prompt: string): Promise<string> {
    await this.insertTextIntoComposer(prompt)
    await this.delay(400)

    const ASSISTANT_SEL = '[data-testid="claude-message"]'
    // Claude streaming: response turn has data-is-streaming="true" while generating
    const STREAMING_SELS = [
      '[data-is-streaming="true"]',
      '.result-streaming',
      'button[aria-label*="Stop"]',
      'button[aria-label="Stop generating"]',
    ]
    const SEND_SELS = [
      'button[aria-label="Send message"]',
      'button[aria-label*="Send"]',
      'button[data-testid="send-button"]',
      'button[type="submit"]',
    ]

    const prevCount = document.querySelectorAll(ASSISTANT_SEL).length
    const sendBtn = this.findEnabledButton(SEND_SELS)
    if (!sendBtn) makeError('FETCH_FAILED', 'Send button not found or disabled — click the composer and retry')

    sendBtn.click()

    // Phase 1: wait for generation to start (new streaming turn appears)
    await new Promise<void>((resolve, reject) => {
      if (STREAMING_SELS.some(s => document.querySelector(s))) { resolve(); return }
      const t = window.setTimeout(() => { obs.disconnect(); reject(new Error('Response never started (20s)')) }, 20_000)
      const obs = new MutationObserver(() => {
        const newTurns = document.querySelectorAll(ASSISTANT_SEL).length > prevCount
        const streaming = STREAMING_SELS.some(s => document.querySelector(s))
        if (newTurns || streaming) { clearTimeout(t); obs.disconnect(); resolve() }
      })
      obs.observe(document.body, { childList: true, subtree: true })
    })

    // Phase 2: wait for streaming to stop + new turn has text
    return new Promise<string>((resolve, reject) => {
      const t = window.setTimeout(() => { obs.disconnect(); reject(new Error('Compression timed out (120s)')) }, 120_000)
      const obs = new MutationObserver(() => {
        if (STREAMING_SELS.some(s => document.querySelector(s))) return
        const turns = document.querySelectorAll(ASSISTANT_SEL)
        if (turns.length <= prevCount) return
        const last = turns[turns.length - 1]
        const txt = (last.querySelector('.font-claude-message') ?? last.querySelector('.font-claude-message-content') ?? last)
          ?.textContent?.trim() ?? ''
        if (!txt) return
        clearTimeout(t); obs.disconnect(); resolve(txt)
      })
      obs.observe(document.body, { childList: true, subtree: true, characterData: true })
    })
  }

  private findEnabledButton(selectors: string[]): HTMLButtonElement | null {
    for (const sel of selectors) {
      const btn = document.querySelector<HTMLButtonElement>(sel)
      if (btn && !btn.disabled) return btn
    }
    return null
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => window.setTimeout(r, ms))
  }
}
