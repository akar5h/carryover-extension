import { estimateCompressedTokens } from '../../compression/prompt-builder'

export interface PanelStats {
  estimatedTokens: number
  contextLoadPct: number
  platformUsagePct: number | null
  messageCount: number
}

export interface CompressionDoneResult {
  checkpoint: string
  originalTokens: number
  checkpointTokens: number
  reductionPct: number
}

export interface BadgePanel {
  el: HTMLDivElement
  open(stats: PanelStats): void
  close(): void
  isOpen(): boolean
  showMessage(msg: string): void
  clearMessage(): void
  setCompressState(state: 'idle' | 'loading'): void
  onCompress(handler: () => Promise<void>): void
  showDone(
    result: CompressionDoneResult,
    onCopyCheckpoint: () => void,
  ): void
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

  // Pre-compression estimate rows
  const rowIfCompressed = document.createElement('div')
  rowIfCompressed.className = 'co-panel-row'
  const rowIfCompressedLabel = document.createElement('span')
  rowIfCompressedLabel.textContent = 'If compressed:'
  const rowIfCompressedValue = document.createElement('span')
  rowIfCompressedValue.className = 'co-panel-value'
  rowIfCompressed.appendChild(rowIfCompressedLabel)
  rowIfCompressed.appendChild(rowIfCompressedValue)

  const rowReduction = document.createElement('div')
  rowReduction.className = 'co-panel-row'
  const rowReductionLabel = document.createElement('span')
  rowReductionLabel.textContent = 'Est. reduction:'
  const rowReductionValue = document.createElement('span')
  rowReductionValue.className = 'co-panel-value'
  rowReduction.appendChild(rowReductionLabel)
  rowReduction.appendChild(rowReductionValue)

  // Post-compression actual stats rows (hidden until done)
  const dividerDone = document.createElement('div')
  dividerDone.className = 'co-panel-divider'
  dividerDone.style.display = 'none'

  const rowOrigTokens = document.createElement('div')
  rowOrigTokens.className = 'co-panel-row'
  rowOrigTokens.style.display = 'none'
  const rowOrigTokensLabel = document.createElement('span')
  rowOrigTokensLabel.textContent = 'Original:'
  const rowOrigTokensValue = document.createElement('span')
  rowOrigTokensValue.className = 'co-panel-value'
  rowOrigTokens.appendChild(rowOrigTokensLabel)
  rowOrigTokens.appendChild(rowOrigTokensValue)

  const rowCpTokens = document.createElement('div')
  rowCpTokens.className = 'co-panel-row'
  rowCpTokens.style.display = 'none'
  const rowCpTokensLabel = document.createElement('span')
  rowCpTokensLabel.textContent = 'Checkpoint:'
  const rowCpTokensValue = document.createElement('span')
  rowCpTokensValue.className = 'co-panel-value'
  rowCpTokens.appendChild(rowCpTokensLabel)
  rowCpTokens.appendChild(rowCpTokensValue)

  const rowActualReduction = document.createElement('div')
  rowActualReduction.className = 'co-panel-row'
  rowActualReduction.style.display = 'none'
  const rowActualReductionLabel = document.createElement('span')
  rowActualReductionLabel.textContent = 'Reduction:'
  const rowActualReductionValue = document.createElement('span')
  rowActualReductionValue.className = 'co-panel-value'
  rowActualReduction.appendChild(rowActualReductionLabel)
  rowActualReduction.appendChild(rowActualReductionValue)

  const divider3 = document.createElement('div')
  divider3.className = 'co-panel-divider'

  const btn = document.createElement('button')
  btn.className = 'co-btn-compress'
  btn.textContent = 'Compress & Carry Over'
  btn.disabled = true

  // Post-compression action buttons (hidden until done)
  const btnCopy = document.createElement('button')
  btnCopy.className = 'co-btn-compress'
  btnCopy.textContent = 'Copy Checkpoint'
  btnCopy.style.display = 'none'
  btnCopy.style.marginTop = '4px'

  const btnFresh = document.createElement('button')
  btnFresh.className = 'co-btn-compress'
  btnFresh.textContent = 'Continue Fresh'
  btnFresh.style.display = 'none'
  btnFresh.style.marginTop = '4px'

  const msgEl = document.createElement('div')
  msgEl.className = 'co-panel-msg'
  msgEl.style.display = 'none'

  panel.appendChild(header)
  panel.appendChild(divider1)
  panel.appendChild(rowTokens)
  panel.appendChild(rowLoad)
  panel.appendChild(rowPlatform)
  panel.appendChild(divider2)
  panel.appendChild(rowIfCompressed)
  panel.appendChild(rowReduction)
  panel.appendChild(dividerDone)
  panel.appendChild(rowOrigTokens)
  panel.appendChild(rowCpTokens)
  panel.appendChild(rowActualReduction)
  panel.appendChild(divider3)
  panel.appendChild(btn)
  panel.appendChild(btnCopy)
  panel.appendChild(btnFresh)
  panel.appendChild(msgEl)

  let compressHandler: (() => Promise<void>) | null = null

  btn.addEventListener('click', () => {
    if (compressHandler) void compressHandler()
  })

  function hideDoneState(): void {
    dividerDone.style.display = 'none'
    rowOrigTokens.style.display = 'none'
    rowCpTokens.style.display = 'none'
    rowActualReduction.style.display = 'none'
    btnCopy.style.display = 'none'
    btnFresh.style.display = 'none'
    btn.style.display = ''
  }

  return {
    el: panel,
    open(stats: PanelStats): void {
      hideDoneState()

      rowTokensValue.textContent = stats.estimatedTokens.toLocaleString()
      rowLoadValue.textContent = `${Math.round(stats.contextLoadPct)}%`
      if (showPlatformUsage) {
        rowPlatformValue.textContent =
          stats.platformUsagePct !== null ? `${Math.round(stats.platformUsagePct)}%` : '-'
      }

      const { low, high } = estimateCompressedTokens(stats.estimatedTokens)
      rowIfCompressedValue.textContent = `~${low.toLocaleString()}–${high.toLocaleString()}`
      const reductionPct = stats.estimatedTokens > 0
        ? Math.round((1 - low / stats.estimatedTokens) * 100)
        : 0
      rowReductionValue.textContent = `~${reductionPct}%`

      const hasMessages = stats.messageCount > 0
      btn.disabled = !hasMessages
      btn.style.cursor = hasMessages ? 'pointer' : 'not-allowed'
      btn.style.opacity = hasMessages ? '1' : '0.6'
      btn.style.color = hasMessages ? '#e0e0e0' : '#666'

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
    showMessage(msg: string): void {
      msgEl.textContent = msg
      msgEl.style.display = ''
    },
    clearMessage(): void {
      msgEl.textContent = ''
      msgEl.style.display = 'none'
    },
    setCompressState(state: 'idle' | 'loading'): void {
      if (state === 'loading') {
        btn.textContent = 'Compressing...'
        btn.disabled = true
      } else {
        btn.textContent = 'Compress & Carry Over'
        btn.disabled = false
      }
    },
    onCompress(handler: () => Promise<void>): void {
      compressHandler = handler
    },
    showDone(
      result: CompressionDoneResult,
      onCopyCheckpoint: () => void,
    ): void {
      // Show actual stats
      rowOrigTokensValue.textContent = result.originalTokens.toLocaleString()
      rowCpTokensValue.textContent = result.checkpointTokens.toLocaleString()
      rowActualReductionValue.textContent = `${result.reductionPct}%`

      dividerDone.style.display = ''
      rowOrigTokens.style.display = ''
      rowCpTokens.style.display = ''
      rowActualReduction.style.display = ''

      // Replace compress button with Copy Checkpoint (new chat already opened automatically)
      btn.style.display = 'none'
      btnFresh.style.display = 'none'

      const newCopy = btnCopy.cloneNode(true) as HTMLButtonElement
      newCopy.style.display = ''
      newCopy.style.marginTop = '4px'
      btnCopy.replaceWith(newCopy)
      newCopy.addEventListener('click', onCopyCheckpoint)

      // Status: new tab was auto-opened
      msgEl.textContent = '✓ New chat opened. Checkpoint auto-pasted.'
      msgEl.style.display = ''
      msgEl.style.color = '#4ecf8a'
      msgEl.style.fontSize = '11px'
      msgEl.style.marginTop = '6px'
    },
  }
}
