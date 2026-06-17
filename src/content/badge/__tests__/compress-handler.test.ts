import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onCompressClick } from '../compress-handler'
import type { Compressor } from '../compress-handler'
import type { PlatformAdapter, NormalizedTranscript, PlatformUsage } from '../../../adapters/types'
import type { BadgePanel, CompressionDoneResult } from '../badge-panel'
import type { CompressSuccess } from '../../../background-messages'

function makeTranscript(overrides: Partial<NormalizedTranscript> = {}): NormalizedTranscript {
  return {
    platform: 'claude',
    conversationId: 'conv-1',
    messages: [
      { role: 'user', text: 'Hello' },
      { role: 'assistant', text: 'Hi there' },
    ],
    source: 'internal_api',
    fetchedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeAdapter(overrides: Partial<PlatformAdapter> = {}): PlatformAdapter {
  return {
    name: 'claude',
    isSupportedPage: vi.fn().mockReturnValue(true),
    getConversationIdFromUrl: vi.fn().mockReturnValue('conv-1'),
    fetchConversation: vi.fn().mockResolvedValue(makeTranscript()),
    getUsageInfo: vi.fn().mockResolvedValue({ available: false, source: 'unavailable', label: '' } satisfies PlatformUsage),
    normalizeConversation: vi.fn(),
    insertTextIntoComposer: vi.fn().mockResolvedValue(undefined),
    openNewChatWithText: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeCompressor(checkpoint = 'compressed result'): Compressor {
  const success: CompressSuccess = {
    ok: true,
    checkpoint,
    originalTokens: 100,
    compressedTokens: 30,
    reductionPct: 70,
  }
  return vi.fn().mockResolvedValue(success)
}

function makePanel(): BadgePanel {
  return {
    el: document.createElement('div'),
    open: vi.fn(),
    close: vi.fn(),
    isOpen: vi.fn().mockReturnValue(false),
    showMessage: vi.fn(),
    clearMessage: vi.fn(),
    setCompressState: vi.fn(),
    onCompress: vi.fn(),
    showDone: vi.fn(),
  }
}

describe('onCompressClick', () => {
  let adapter: PlatformAdapter
  let panel: BadgePanel
  let compressor: Compressor

  beforeEach(() => {
    adapter = makeAdapter()
    panel = makePanel()
    compressor = makeCompressor()
  })

  it('uses cached transcript if available — skips fetchConversation', async () => {
    const cached = makeTranscript()
    await onCompressClick(adapter, cached, panel, compressor)

    expect(adapter.fetchConversation).not.toHaveBeenCalled()
  })

  it('fetches transcript when no cached transcript', async () => {
    await onCompressClick(adapter, null, panel, compressor)

    expect(adapter.fetchConversation).toHaveBeenCalledWith('conv-1')
  })

  it('passes transcript content to compressor', async () => {
    await onCompressClick(adapter, makeTranscript(), panel, compressor)

    expect(compressor).toHaveBeenCalledOnce()
    const [prompt] = (compressor as ReturnType<typeof vi.fn>).mock.calls[0] as [string, number]
    expect(prompt).toContain('Hello')
    expect(prompt).toContain('Hi there')
  })

  it('sets loading state before async work, resets to idle on success', async () => {
    const order: string[] = []
    ;(compressor as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('compress')
      return { ok: true, checkpoint: 'cp', originalTokens: 10, compressedTokens: 3, reductionPct: 70 } satisfies CompressSuccess
    })
    ;(panel.setCompressState as ReturnType<typeof vi.fn>).mockImplementation((s: string) => {
      order.push(s)
    })

    await onCompressClick(adapter, makeTranscript(), panel, compressor)

    expect(order).toEqual(['loading', 'compress', 'idle'])
  })

  it('calls showDone with correct token stats from compressor response', async () => {
    await onCompressClick(adapter, makeTranscript(), panel, compressor)

    expect(panel.showDone).toHaveBeenCalledOnce()
    const [result] = (panel.showDone as ReturnType<typeof vi.fn>).mock.calls[0] as [CompressionDoneResult]
    expect(result.originalTokens).toBe(100)
    expect(result.checkpointTokens).toBe(30)
    expect(result.reductionPct).toBe(70)
    expect(result.checkpoint).toBe('compressed result')
  })

  it('onCopyCheckpoint callback copies checkpoint to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    await onCompressClick(adapter, makeTranscript(), panel, compressor)

    const [, onCopy] = (panel.showDone as ReturnType<typeof vi.fn>).mock.calls[0] as [CompressionDoneResult, () => void]
    onCopy()

    expect(writeText).toHaveBeenCalledWith('compressed result')
  })

  it('auto-calls openNewChatWithText with bootstrap text on success', async () => {
    await onCompressClick(adapter, makeTranscript(), panel, compressor)

    expect(adapter.openNewChatWithText).toHaveBeenCalledOnce()
    const text = (adapter.openNewChatWithText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(text).toContain('[CarryOver Checkpoint]')
    expect(text).toContain('compressed result')
  })

  it('shows error message and resets state when compressor throws', async () => {
    ;(compressor as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('tab blocked'))

    await onCompressClick(adapter, makeTranscript(), panel, compressor)

    expect(panel.setCompressState).toHaveBeenLastCalledWith('idle')
    expect(panel.showMessage).toHaveBeenCalledWith(expect.stringContaining('tab blocked'))
  })

  it('shows error when no convId and no cached transcript', async () => {
    ;(adapter.getConversationIdFromUrl as ReturnType<typeof vi.fn>).mockReturnValue(null)

    await onCompressClick(adapter, null, panel, compressor)

    expect(panel.showMessage).toHaveBeenCalledWith(expect.stringContaining('Error'))
    expect(adapter.fetchConversation).not.toHaveBeenCalled()
  })

  it('clears any previous message before starting', async () => {
    const order: string[] = []
    ;(panel.clearMessage as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('clear'))
    ;(panel.setCompressState as ReturnType<typeof vi.fn>).mockImplementation((s: string) => order.push(s))

    await onCompressClick(adapter, makeTranscript(), panel, compressor)

    expect(order.indexOf('clear')).toBeLessThan(order.indexOf('idle'))
  })
})
