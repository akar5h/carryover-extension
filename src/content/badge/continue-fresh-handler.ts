import type { PlatformAdapter } from '../../adapters/types'
import { buildBootstrapPrompt } from '../../compression/prompt-builder'
import type { BadgePanel } from './badge-panel'

export async function onContinueFreshClick(
  adapter: PlatformAdapter,
  checkpoint: string,
  panel: BadgePanel,
): Promise<void> {
  if (!checkpoint || !checkpoint.trim()) {
    panel.showMessage('Error: no checkpoint pasted.')
    return
  }

  try {
    const bootstrapPrompt = buildBootstrapPrompt(checkpoint)
    await adapter.openNewChatWithText!(bootstrapPrompt)
    panel.showMessage('New chat opened — press Enter to start.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    panel.showMessage(`Error: ${msg}`)
  }
}
