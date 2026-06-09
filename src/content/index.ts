import { ClaudeAdapter } from '../adapters/claude-adapter'
import { ChatGPTAdapter } from '../adapters/chatgpt-adapter'
import type { PlatformAdapter } from '../adapters/types'
import { SpaNavigator } from './spa-navigator'
import { startBadgeUpdater } from './badge/badge-updater'

function getAdapter(): PlatformAdapter | null {
  const { hostname } = location
  if (hostname === 'claude.ai') return new ClaudeAdapter()
  if (hostname === 'chatgpt.com' || hostname === 'chat.openai.com') return new ChatGPTAdapter()
  return null
}

const adapter = getAdapter()
if (adapter && adapter.isSupportedPage()) {
  const navigator = new SpaNavigator()
  navigator.start()
  startBadgeUpdater(adapter, navigator)
}
