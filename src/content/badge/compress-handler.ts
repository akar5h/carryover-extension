import type { PlatformAdapter, NormalizedTranscript } from '../../adapters/types'
import {
  buildCompressionPrompt,
  buildInContextCompressionPrompt,
} from '../../compression/prompt-builder'
import { buildBootstrapText } from '../../compression/bootstrap-prompt'
import type { BadgePanel } from './badge-panel'
import type { CompressSuccess } from '../../background-messages'
import { COMPRESSION_MODE_STORAGE_KEY, DEFAULT_COMPRESSION_MODE, normalizeCompressionMode } from '../../settings'
import type { CompressionMode } from '../../settings'
import { estimateTranscriptTokens } from '../../token-estimator'

export type Compressor = (prompt: string, originalTokens: number) => Promise<CompressSuccess>

/**
 * Default compressor: injects prompt into the current chat and waits for the
 * platform's own response via DOM observation. No API key required.
 */
function makeInChatCompressor(adapter: PlatformAdapter): Compressor {
  return async (prompt: string, originalTokens: number): Promise<CompressSuccess> => {
    const checkpoint = await adapter.compressInChat!(prompt)
    const compressedTokens = Math.ceil(checkpoint.length / 4)
    const reductionPct = originalTokens > 0
      ? Math.round((1 - compressedTokens / originalTokens) * 100)
      : 0
    return { ok: true, checkpoint, originalTokens, compressedTokens, reductionPct }
  }
}

/** Fallback: send to background service worker which calls OpenAI API (requires key). */
function chromeCompressor(prompt: string, originalTokens: number): Promise<CompressSuccess> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'COMPRESS', prompt, originalTokens },
      (response: unknown) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        const resp = response as { ok: boolean; error?: string; checkpoint?: string; originalTokens?: number; compressedTokens?: number; reductionPct?: number } | null
        if (!resp) {
          reject(new Error('No response from background'))
          return
        }
        if (!resp.ok) {
          reject(new Error(resp.error ?? 'Compression failed'))
          return
        }
        resolve(resp as CompressSuccess)
      },
    )
  })
}

async function getCompressionMode(): Promise<CompressionMode> {
  try {
    const stored = await chrome.storage.sync.get(COMPRESSION_MODE_STORAGE_KEY)
    return normalizeCompressionMode(stored[COMPRESSION_MODE_STORAGE_KEY])
  } catch {
    return DEFAULT_COMPRESSION_MODE
  }
}

function usesApiFallback(adapter: PlatformAdapter, mode: CompressionMode): boolean {
  return mode === 'api_fallback' || !adapter.compressInChat
}

function resolveCompressor(
  adapter: PlatformAdapter,
  mode: CompressionMode
): Compressor {
  return usesApiFallback(adapter, mode) ? chromeCompressor : makeInChatCompressor(adapter)
}

export async function onCompressClick(
  adapter: PlatformAdapter,
  cachedTranscript: NormalizedTranscript | null,
  panel: BadgePanel,
  compressor?: Compressor,
): Promise<void> {
  const convId = adapter.getConversationIdFromUrl()
  if (!convId && !cachedTranscript) {
    panel.showMessage('Error: no conversation found.')
    return
  }

  panel.setCompressState('loading')
  panel.clearMessage()

  try {
    const transcript = cachedTranscript ?? await adapter.fetchConversation(convId!)
    const originalTokens = estimateTranscriptTokens(transcript)
    const mode = await getCompressionMode()
    const apiFallback = usesApiFallback(adapter, mode)
    const prompt = apiFallback
      ? buildCompressionPrompt(transcript)
      : buildInContextCompressionPrompt()

    const activeCompressor = compressor ?? resolveCompressor(adapter, mode)
    const result = await activeCompressor(prompt, originalTokens)

    panel.setCompressState('idle')

    // Auto carry-over: copy checkpoint to clipboard and open new chat immediately.
    // User should not need to click a second button — "Compress & Carry Over" does both.
    void navigator.clipboard?.writeText(result.checkpoint)
    if (adapter.openNewChatWithText) {
      await adapter.openNewChatWithText(buildBootstrapText(result.checkpoint))
    }

    panel.showDone(
      {
        checkpoint: result.checkpoint,
        originalTokens: result.originalTokens,
        checkpointTokens: result.compressedTokens,
        reductionPct: result.reductionPct,
      },
      () => {
        void navigator.clipboard?.writeText(result.checkpoint)
      },
    )
  } catch (err) {
    panel.setCompressState('idle')
    const msg = err instanceof Error ? err.message : 'Unknown error'
    panel.showMessage(`Error: ${msg}`)
  }
}
