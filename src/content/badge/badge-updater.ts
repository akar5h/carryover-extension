import type { PlatformAdapter, PlatformName } from '../../adapters/types'
import { createBadge, INNER_CIRC, OUTER_CIRC, usageColorForPercent } from './badge'
import { createBadgePanel } from './badge-panel'
import type { PanelStats } from './badge-panel'
import { onCompressClick } from './compress-handler'
import type { SpaNavigator } from '../spa-navigator'
import { LiveTranscriptTracker } from '../tracking/live-transcript-tracker'
import type { LiveTrackerState } from '../tracking/live-transcript-tracker'

const CONTEXT_WINDOW: Record<PlatformName, number> = {
  claude: 200_000,
  chatgpt: 128_000,
}

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val))
}

export function startBadgeUpdater(adapter: PlatformAdapter, navigator: SpaNavigator): void {
  const { badgeEl, innerFill, outerFill, outerTrack, percentText } = createBadge()
  const showPlatformUsage = location.hostname === 'claude.ai'
  const panel = createBadgePanel(showPlatformUsage)
  const tracker = new LiveTranscriptTracker(adapter)
  document.body.appendChild(panel.el)

  let trackerState = tracker.getState()
  let platformUsagePct: number | null = null

  function panelStats(state: LiveTrackerState): PanelStats {
    const contextWindow = CONTEXT_WINDOW[adapter.name]
    return {
      estimatedTokens: state.totalTokens,
      contextLoadPct: clamp(state.totalTokens / contextWindow, 0, 1) * 100,
      platformUsagePct,
      messageCount: state.transcript?.messages.length ?? 0,
    }
  }

  function updateInnerRing(tokens: number): void {
    const innerPct = clamp(tokens / CONTEXT_WINDOW[adapter.name], 0, 1)
    const percentUsed = Math.round(innerPct * 100)
    const color = usageColorForPercent(percentUsed)
    innerFill.style.strokeDasharray = `${INNER_CIRC}`
    innerFill.style.strokeDashoffset = `${INNER_CIRC * (1 - innerPct)}`
    innerFill.style.stroke = color
    percentText.textContent = `${percentUsed}%`
    percentText.style.fill = color
  }

  tracker.subscribe((state) => {
    trackerState = state
    updateInnerRing(state.totalTokens)
    if (panel.isOpen()) panel.update(panelStats(state))
  })

  panel.onCompress(async () => {
    await tracker.reconcile()
    await onCompressClick(adapter, tracker.getTranscript(), panel)
  })

  async function updateOuterRing(): Promise<void> {
    const usage = await adapter.getUsageInfo()
    platformUsagePct = usage.available ? (usage.percentUsed ?? null) : null
    if (!usage.available || usage.percentUsed == null) {
      outerTrack.style.display = 'none'
      outerFill.style.display = 'none'
    } else {
      outerTrack.style.display = ''
      outerFill.style.display = ''
      const outerPct = clamp(usage.percentUsed / 100, 0, 1)
      outerFill.style.strokeDasharray = `${OUTER_CIRC}`
      outerFill.style.strokeDashoffset = `${OUTER_CIRC * (1 - outerPct)}`
      outerFill.style.stroke = usageColorForPercent(outerPct * 100)
    }
    if (panel.isOpen()) panel.update(panelStats(trackerState))
  }

  function activateConversation(conversationId: string | null): void {
    if (!conversationId) {
      tracker.stop()
      panel.close()
      badgeEl.style.display = 'none'
      return
    }

    badgeEl.style.display = ''
    tracker.start(conversationId)
    void updateOuterRing()
  }

  navigator.onConversationChange((newId) => activateConversation(newId))

  badgeEl.addEventListener('click', (event: MouseEvent) => {
    event.stopPropagation()
    if (panel.isOpen()) {
      panel.close()
      return
    }
    panel.open(panelStats(trackerState))
  })

  document.addEventListener('click', () => {
    if (panel.isOpen()) panel.close()
  })

  activateConversation(navigator.getCurrentConversationId())
}
