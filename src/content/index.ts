import { ClaudeAdapter } from './adapters/claude-adapter'
import { ChatGPTAdapter } from './adapters/chatgpt-adapter'
import type { PlatformAdapter } from './adapters/platform-adapter'
import { startBadgeUpdater } from './badge/badge-updater'

function getAdapter(): PlatformAdapter | null {
  if (location.hostname === 'claude.ai') return new ClaudeAdapter()
  if (location.hostname === 'chatgpt.com') return new ChatGPTAdapter()
  return null
}

const adapter = getAdapter()
if (adapter) startBadgeUpdater(adapter)
