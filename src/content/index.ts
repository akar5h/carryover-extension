import { ClaudeAdapter } from './adapters/claude-adapter'
import { ChatGPTAdapter } from './adapters/chatgpt-adapter'
import type { PlatformAdapter } from './adapters/platform-adapter'
import { startBadgeUpdater, seenMessages, updateBadge } from './badge/badge-updater'

function getAdapter(): PlatformAdapter | null {
  if (location.hostname === 'claude.ai') return new ClaudeAdapter()
  if (location.hostname === 'chatgpt.com') return new ChatGPTAdapter()
  return null
}

// Listen for messages intercepted by fetch-interceptor.ts (MAIN world)
window.addEventListener('carryover:messages', (e: Event) => {
  const messages = (e as CustomEvent<Array<{ id: string; text: string }>>).detail
  messages.forEach((m) => seenMessages.set(m.id, m.text))
  updateBadge([...seenMessages.values()].join('\n'))
})

const adapter = getAdapter()
if (adapter) startBadgeUpdater(adapter)
