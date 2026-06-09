import type { PlatformAdapter, NormalizedTranscript } from '../../adapters/types'
import { createBadge, INNER_CIRC, OUTER_CIRC } from './badge'
import { createBadgePanel } from './badge-panel'
import type { SpaNavigator } from '../spa-navigator'

// Chars-per-token industry estimate: OpenAI / Anthropic both use ~4 chars = 1 token
// for typical English prose. Accurate to ±10-15%; underestimates code.
function estimateTokens(transcript: NormalizedTranscript): number {
  const chars = transcript.messages.reduce((sum, m) => sum + m.text.length, 0)
  return Math.ceil(chars / 4)
}

// Context window by platform. ChatGPT default model (GPT-4o / o1) is 128k;
// Claude is 200k. Using platform default so the ring reflects actual model capacity.
// If we can detect the active model from the transcript metadata in the future,
// we can be more precise here.
const CONTEXT_WINDOW: Record<string, number> = {
  claude: 200_000,
  chatgpt: 128_000,
}

function contextWindow(transcript: NormalizedTranscript): number {
  return CONTEXT_WINDOW[transcript.platform] ?? 128_000
}

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val))
}

export function startBadgeUpdater(adapter: PlatformAdapter, navigator: SpaNavigator): void {
  const { badgeEl, innerFill, outerFill, outerTrack } = createBadge()

  const showPlatformUsage = location.hostname === 'claude.ai'
  const panel = createBadgePanel(showPlatformUsage)
  document.body.appendChild(panel.el)

  let cachedTranscript: NormalizedTranscript | null = null
  let fetchInFlight = false

  async function fetchAndUpdate(): Promise<void> {
    if (fetchInFlight) return
    const convId = adapter.getConversationIdFromUrl()
    if (!convId) return

    fetchInFlight = true
    try {
      cachedTranscript = await adapter.fetchConversation(convId)
      updateRings()
    } catch {
      // API failed — rings stay at last value
    } finally {
      fetchInFlight = false
    }
  }

  function updateRings(): void {
    if (!cachedTranscript) return

    const tokens = estimateTokens(cachedTranscript)
    const innerPct = clamp(tokens / contextWindow(cachedTranscript), 0, 1)

    innerFill.style.strokeDasharray  = `${INNER_CIRC}`
    innerFill.style.strokeDashoffset = `${INNER_CIRC * (1 - innerPct)}`
  }

  async function updateOuterRing(): Promise<void> {
    const usage = await adapter.getUsageInfo()
    if (!usage.available || usage.percentUsed == null) {
      outerTrack.style.display = 'none'
      outerFill.style.display  = 'none'
    } else {
      outerTrack.style.display = ''
      outerFill.style.display  = ''
      const outerPct = clamp(usage.percentUsed / 100, 0, 1)
      outerFill.style.strokeDasharray  = `${OUTER_CIRC}`
      outerFill.style.strokeDashoffset = `${OUTER_CIRC * (1 - outerPct)}`
    }
  }

  // SPA navigation: reset and re-fetch
  navigator.onConversationChange(() => {
    cachedTranscript = null
    fetchInFlight = false
    updateRings()
    void fetchAndUpdate()
    void updateOuterRing()
  })

  // Badge click: open panel with current data
  badgeEl.addEventListener('click', async (e: MouseEvent) => {
    e.stopPropagation()
    if (panel.isOpen()) {
      panel.close()
      return
    }

    let transcript = cachedTranscript
    if (!transcript) {
      const convId = adapter.getConversationIdFromUrl()
      if (convId) {
        try { transcript = await adapter.fetchConversation(convId) } catch { /* ignore */ }
      }
    }

    const tokens = transcript ? estimateTokens(transcript) : 0
    const contextLoadPct = transcript ? clamp(tokens / contextWindow(transcript), 0, 1) * 100 : 0
    const usage = await adapter.getUsageInfo()
    const platformUsagePct = usage.available ? (usage.percentUsed ?? null) : null

    const messageCount = transcript ? transcript.messages.length : 0
    panel.open({ estimatedTokens: tokens, contextLoadPct, platformUsagePct, messageCount })
  })

  document.addEventListener('click', () => {
    if (panel.isOpen()) panel.close()
  })

  // Initial fetch
  void fetchAndUpdate()
  void updateOuterRing()

  // Debounced re-fetch on DOM mutations (catches stream completion)
  let debounceTimer: number | null = null
  const observer = new MutationObserver(() => {
    if (debounceTimer !== null) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      void fetchAndUpdate()
    }, 2000)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
