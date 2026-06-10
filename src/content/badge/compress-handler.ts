import type { PlatformAdapter, NormalizedTranscript } from '../../adapters/types'
import { buildCompressionPrompt } from '../../compression/prompt-builder'
import type { BadgePanel } from './badge-panel'

export async function onCompressClick(
  adapter: PlatformAdapter,
  cachedTranscript: NormalizedTranscript | null,
  panel: BadgePanel,
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
    await adapter.openNewChatWithText!(prompt)
    panel.setCompressState('idle')
    panel.showPostCompressState()
  } catch (err) {
    panel.setCompressState('idle')
    const msg = err instanceof Error ? err.message : 'Unknown error'
    panel.showMessage(`Error: ${msg}`)
  }
}
