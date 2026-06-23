import { ClaudeAdapter } from '../adapters/claude-adapter'
import { ChatGPTAdapter } from '../adapters/chatgpt-adapter'
import type { PlatformAdapter } from '../adapters/types'
import { SpaNavigator } from './spa-navigator'
import { startBadgeUpdater } from './badge/badge-updater'

const PENDING_INSERT_KEY = 'carryover:pending_insert'
const PENDING_INSERT_TIMEOUT_MS = 10_000
const PENDING_INSERT_POLL_MS = 100

function getAdapter(): PlatformAdapter | null {
  const { hostname } = location
  if (hostname === 'claude.ai') return new ClaudeAdapter()
  if (hostname === 'chatgpt.com' || hostname === 'chat.openai.com') return new ChatGPTAdapter()
  return null
}

const adapter = getAdapter()
if (adapter) {
  const navigator = new SpaNavigator()
  navigator.start()
  startBadgeUpdater(adapter, navigator)
}

// Handle text carryover into a freshly opened tab (set by openNewChatWithText).
// Runs on claude.ai and chatgpt.com; key is cleared after first successful insert.
if (adapter) void checkPendingInsert(adapter)

async function checkPendingInsert(platformAdapter: PlatformAdapter): Promise<void> {
  let stored: Record<string, unknown>
  try {
    stored = await chrome.storage.session.get(PENDING_INSERT_KEY)
  } catch {
    return
  }

  const text = stored[PENDING_INSERT_KEY]
  if (typeof text !== 'string' || !text) return

  const deadline = Date.now() + PENDING_INSERT_TIMEOUT_MS

  while (Date.now() < deadline) {
    try {
      await platformAdapter.insertTextIntoComposer!(text)
      await chrome.storage.session.remove(PENDING_INSERT_KEY)
      return
    } catch {
      await new Promise<void>((resolve) => setTimeout(resolve, PENDING_INSERT_POLL_MS))
    }
  }

  // Timed out — clear key to avoid inserting into a subsequent page load
  await chrome.storage.session.remove(PENDING_INSERT_KEY).catch(() => {})
}
