import type { PlatformAdapter } from '../adapters/platform-adapter'
import { createBadge, INNER_CIRC, OUTER_CIRC } from './badge'
import { createBadgePanel } from './badge-panel'

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val))
}

// Accumulator: grows only — never shrinks on scroll/DOM changes.
// Written by MutationObserver (DOM fallback) and carryover:messages listener (fetch intercept).
export const seenMessages = new Map<string, string>()

let _innerFill: SVGCircleElement | null = null
let _outerFill: SVGCircleElement | null = null
let _outerTrack: SVGCircleElement | null = null
let _panel: ReturnType<typeof createBadgePanel> | null = null
let _adapter: PlatformAdapter | null = null

export function updateBadge(fullTranscript: string): void {
  if (!_innerFill || !_outerFill || !_outerTrack) return
  try {
    const innerPct = clamp(estimateTokens(fullTranscript) / 100_000, 0, 1)
    _innerFill.style.strokeDasharray = `${INNER_CIRC}`
    _innerFill.style.strokeDashoffset = `${INNER_CIRC * (1 - innerPct)}`

    const usagePct = _adapter?.getPlatformUsagePct() ?? null
    if (usagePct === null) {
      _outerTrack.style.display = 'none'
      _outerFill.style.display = 'none'
    } else {
      _outerTrack.style.display = ''
      _outerFill.style.display = ''
      const outerPct = clamp(usagePct / 100, 0, 1)
      _outerFill.style.strokeDasharray = `${OUTER_CIRC}`
      _outerFill.style.strokeDashoffset = `${OUTER_CIRC * (1 - outerPct)}`
    }
  } catch {
    // silent — ring stays at last value
  }
}

function accumulatedTranscript(): string {
  return [...seenMessages.values()].join('\n')
}

export function startBadgeUpdater(adapter: PlatformAdapter): void {
  _adapter = adapter

  const { badgeEl, innerFill, outerFill, outerTrack } = createBadge()
  _innerFill = innerFill
  _outerFill = outerFill
  _outerTrack = outerTrack

  const showPlatformUsage = location.hostname === 'claude.ai'
  _panel = createBadgePanel(showPlatformUsage)
  document.body.appendChild(_panel.el)

  badgeEl.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation()
    if (_panel!.isOpen()) {
      _panel!.close()
    } else {
      try {
        const transcript = accumulatedTranscript() || adapter.extractTranscript()
        const tokens = estimateTokens(transcript)
        const contextLoadPct = clamp(tokens / 100_000, 0, 1) * 100
        const platformUsagePct = adapter.getPlatformUsagePct()
        _panel!.open({ estimatedTokens: tokens, contextLoadPct, platformUsagePct })
      } catch {
        _panel!.open({ estimatedTokens: 0, contextLoadPct: 0, platformUsagePct: null })
      }
    }
  })

  document.addEventListener('click', () => {
    if (_panel?.isOpen()) _panel.close()
  })

  // Seed accumulator with currently-visible DOM messages on load
  adapter.extractVisibleMessages().forEach((m) => seenMessages.set(m.id, m.text))
  updateBadge(accumulatedTranscript())

  // MutationObserver fallback: accumulate new messages as they appear in DOM
  let timer: number | null = null
  const observer = new MutationObserver(() => {
    if (timer !== null) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      adapter.extractVisibleMessages().forEach((m) => seenMessages.set(m.id, m.text))
      updateBadge(accumulatedTranscript())
    }, 300)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
