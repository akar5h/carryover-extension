export interface PanelStats {
  estimatedTokens: number
  contextLoadPct: number
  platformUsagePct: number | null
}

export interface BadgePanel {
  el: HTMLDivElement
  open(stats: PanelStats): void
  close(): void
  isOpen(): boolean
}

export function createBadgePanel(showPlatformUsage: boolean): BadgePanel {
  let visible = false

  const panel = document.createElement('div')
  panel.id = 'carryover-panel'
  panel.style.display = 'none'
  panel.addEventListener('click', (e: MouseEvent) => { e.stopPropagation() })

  const header = document.createElement('div')
  header.className = 'co-panel-header'
  header.textContent = 'CarryOver'

  const divider1 = document.createElement('div')
  divider1.className = 'co-panel-divider'

  const rowTokens = document.createElement('div')
  rowTokens.className = 'co-panel-row'
  const rowTokensLabel = document.createElement('span')
  rowTokensLabel.textContent = 'Est. tokens:'
  const rowTokensValue = document.createElement('span')
  rowTokensValue.className = 'co-panel-value'
  rowTokens.appendChild(rowTokensLabel)
  rowTokens.appendChild(rowTokensValue)

  const rowLoad = document.createElement('div')
  rowLoad.className = 'co-panel-row'
  const rowLoadLabel = document.createElement('span')
  rowLoadLabel.textContent = 'Context load:'
  const rowLoadValue = document.createElement('span')
  rowLoadValue.className = 'co-panel-value'
  rowLoad.appendChild(rowLoadLabel)
  rowLoad.appendChild(rowLoadValue)

  const rowPlatform = document.createElement('div')
  rowPlatform.className = 'co-panel-row'
  if (!showPlatformUsage) rowPlatform.style.display = 'none'
  const rowPlatformLabel = document.createElement('span')
  rowPlatformLabel.textContent = 'Platform usage:'
  const rowPlatformValue = document.createElement('span')
  rowPlatformValue.className = 'co-panel-value'
  rowPlatform.appendChild(rowPlatformLabel)
  rowPlatform.appendChild(rowPlatformValue)

  const divider2 = document.createElement('div')
  divider2.className = 'co-panel-divider'

  const btn = document.createElement('button')
  btn.className = 'co-btn-compress'
  btn.textContent = 'Compress & Carry Over'
  btn.disabled = true
  btn.title = 'Coming in next update'

  panel.appendChild(header)
  panel.appendChild(divider1)
  panel.appendChild(rowTokens)
  panel.appendChild(rowLoad)
  panel.appendChild(rowPlatform)
  panel.appendChild(divider2)
  panel.appendChild(btn)

  return {
    el: panel,
    open(stats: PanelStats): void {
      rowTokensValue.textContent = stats.estimatedTokens.toLocaleString()
      rowLoadValue.textContent = `${Math.round(stats.contextLoadPct)}%`
      if (showPlatformUsage) {
        rowPlatformValue.textContent =
          stats.platformUsagePct !== null ? `${Math.round(stats.platformUsagePct)}%` : '-'
      }
      panel.style.display = ''
      visible = true
    },
    close(): void {
      panel.style.display = 'none'
      visible = false
    },
    isOpen(): boolean {
      return visible
    },
  }
}
