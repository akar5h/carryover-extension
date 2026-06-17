import type { PlatformAdapter, NormalizedTranscript } from '../../adapters/types'
import { buildCompressionPrompt } from '../../compression/prompt-builder'
import { buildBootstrapText } from '../../compression/bootstrap-prompt'
import type { BadgePanel } from './badge-panel'
import type { CompressSuccess } from '../../background-messages'

export type Compressor = (prompt: string, originalTokens: number) => Promise<CompressSuccess>

function estimateTokens(transcript: NormalizedTranscript): number {
  const chars = transcript.messages.reduce((sum, m) => sum + m.text.length, 0)
  return Math.ceil(chars / 4)
}

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

export async function onCompressClick(
  adapter: PlatformAdapter,
  cachedTranscript: NormalizedTranscript | null,
  panel: BadgePanel,
  // Use in-chat compression by default (no API key needed).
  // Falls back to OpenAI API via background worker if compressInChat is unavailable.
  compressor: Compressor = adapter.compressInChat
    ? makeInChatCompressor(adapter)
    : chromeCompressor,
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
    const prompt = buildCompressionPrompt(transcript)
    const originalTokens = estimateTokens(transcript)

    const result = await compressor(prompt, originalTokens)

    panel.setCompressState('idle')

    // Auto carry-over: copy checkpoint to clipboard and open new chat immediately.
    // User should not need to click a second button — "Compress & Carry Over" does both.
    void navigator.clipboard.writeText(result.checkpoint)
    if (adapter.openNewChatWithText) {
      void adapter.openNewChatWithText(buildBootstrapText(result.checkpoint))
    }

    panel.showDone(
      {
        checkpoint: result.checkpoint,
        originalTokens: result.originalTokens,
        checkpointTokens: result.compressedTokens,
        reductionPct: result.reductionPct,
      },
      () => {
        void navigator.clipboard.writeText(result.checkpoint)
      },
    )
  } catch (err) {
    panel.setCompressState('idle')
    const msg = err instanceof Error ? err.message : 'Unknown error'
    panel.showMessage(`Error: ${msg}`)
  }
}
