export type CompressionMode = 'current_chat' | 'api_fallback'

export const OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key'
export const COMPRESSION_MODE_STORAGE_KEY = 'carryover_compression_mode'
export const DEFAULT_COMPRESSION_MODE: CompressionMode = 'current_chat'

export function normalizeCompressionMode(value: unknown): CompressionMode {
  return value === 'api_fallback' ? 'api_fallback' : DEFAULT_COMPRESSION_MODE
}
