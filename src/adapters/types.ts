export type PlatformName = 'claude' | 'chatgpt'

export type TranscriptSource = 'internal_api' | 'indexeddb_cache' | 'dom_fallback' | 'manual_import'

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'unknown'

export interface NormalizedMessage {
  id?: string
  role: MessageRole
  text: string
  createdAt?: string
  updatedAt?: string
  parentId?: string
  childrenIds?: string[]
  branchId?: string
  metadata?: Record<string, unknown>
}

export interface NormalizedTranscript {
  platform: PlatformName
  conversationId: string
  title?: string
  url?: string
  messages: NormalizedMessage[]
  activeBranch?: string
  source: TranscriptSource
  fetchedAt: string
  estimatedTokens?: number
  metadata?: Record<string, unknown>
}

export interface PlatformUsage {
  available: boolean
  percentUsed?: number
  source: 'ui_detected' | 'unavailable'
  label: string
}

export type AdapterErrorCode =
  | 'NOT_ON_SUPPORTED_PAGE'
  | 'NO_CONVERSATION_ID'
  | 'NOT_LOGGED_IN'
  | 'ORG_NOT_FOUND'
  | 'CONVERSATION_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'FETCH_FAILED'
  | 'PARSER_FAILED'
  | 'UNKNOWN'

export interface AdapterError {
  code: AdapterErrorCode
  platform: PlatformName
  message: string
  recoverable: boolean
  details?: unknown
}

export interface PlatformAdapter {
  name: PlatformName
  isSupportedPage(): boolean
  getConversationIdFromUrl(): string | null
  fetchConversation(conversationId: string): Promise<NormalizedTranscript>
  getUsageInfo(): Promise<PlatformUsage>
  normalizeConversation(raw: unknown): NormalizedTranscript
  insertTextIntoComposer?(text: string): Promise<void>
  openNewChatWithText?(text: string): Promise<void>
}
