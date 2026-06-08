import type { PlatformAdapter } from '../adapters/platform-adapter'
import { createBadge, INNER_CIRC, OUTER_CIRC } from './badge'
import { createBadgePanel } from './badge-panel'

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val))
}

export function startBadgeUpdater(adapter: PlatformAdapter): void {
  const { badgeEl, innerFill, outerFill, outerTrack } = createBadge()

  const showPlatformUsage = location.hostname === 'claude.ai'
  const panel = createBadgePanel(showPlatformUsage)
  document.body.appendChild(panel.el)

  badgeEl.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation()
    if (panel.isOpen()) {
      panel.close()
    } else {
      try {
        const transcript = adapter.extractTranscript()
        const tokens = estimateTokens(transcript)
        const contextLoadPct = clamp(tokens / 100_000, 0, 1) * 100
        const platformUsagePct = adapter.getPlatformUsagePct()
        panel.open({ estimatedTokens: tokens, contextLoadPct, platformUsagePct })
      } catch {
        panel.open({ estimatedTokens: 0, contextLoadPct: 0, platformUsagePct: null })
      }
    }
  })

  document.addEventListener('click', () => {
    if (panel.isOpen()) panel.close()
  })

  function update(): void {
    try {
      const transcript = adapter.extractTranscript()
      const innerPct = clamp(estimateTokens(transcript) / 100_000, 0, 1)

      innerFill.style.strokeDasharray  = `${INNER_CIRC}`
      innerFill.style.strokeDashoffset = `${INNER_CIRC * (1 - innerPct)}`

      const usagePct = adapter.getPlatformUsagePct()
      if (usagePct === null) {
        outerTrack.style.display = 'none'
        outerFill.style.display  = 'none'
      } else {
        outerTrack.style.display = ''
        outerFill.style.display  = ''
        const outerPct = clamp(usagePct / 100, 0, 1)
        outerFill.style.strokeDasharray  = `${OUTER_CIRC}`
        outerFill.style.strokeDashoffset = `${OUTER_CIRC * (1 - outerPct)}`
      }
    } catch {
      // AC9: silent — inner ring stays at last value (0% on first call)
    }
  }

  update()

  let timer: number | null = null
  const observer = new MutationObserver(() => {
    if (timer !== null) window.clearTimeout(timer)
    timer = window.setTimeout(update, 300)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
