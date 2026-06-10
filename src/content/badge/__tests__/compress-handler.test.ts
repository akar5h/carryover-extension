import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onCompressClick } from '../compress-handler'
import type { PlatformAdapter, NormalizedTranscript, PlatformUsage } from '../../../adapters/types'
import type { BadgePanel } from '../badge-panel'

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
    showPostCompressState: vi.fn(),
    getCheckpointText: vi.fn().mockReturnValue(''),
    onContinueFresh: vi.fn(),
    resetToIdle: vi.fn(),
  }
}

describe('onCompressClick', () => {
  let adapter: PlatformAdapter
  let panel: BadgePanel

  beforeEach(() => {
    adapter = makeAdapter()
    panel = makePanel()
  })

  it('uses cached transcript if available — skips fetchConversation', async () => {
    const cached = makeTranscript()
    await onCompressClick(adapter, cached, panel)

    expect(adapter.fetchConversation).not.toHaveBeenCalled()
  })

  it('fetches transcript when no cached transcript', async () => {
    await onCompressClick(adapter, null, panel)

    expect(adapter.fetchConversation).toHaveBeenCalledWith('conv-1')
  })

  it('calls openNewChatWithText with a non-empty prompt', async () => {
    await onCompressClick(adapter, makeTranscript(), panel)

    expect(adapter.openNewChatWithText).toHaveBeenCalledOnce()
    const prompt = (adapter.openNewChatWithText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(prompt.length).toBeGreaterThan(100)
    expect(prompt).toContain('Hello')
    expect(prompt).toContain('Hi there')
  })

  it('sets loading state before async work, resets to idle on success', async () => {
    const order: string[] = []
    ;(adapter.openNewChatWithText as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('open')
    })
    ;(panel.setCompressState as ReturnType<typeof vi.fn>).mockImplementation((s: string) => {
      order.push(s)
    })

    await onCompressClick(adapter, makeTranscript(), panel)

    expect(order).toEqual(['loading', 'open', 'idle'])
  })

  it('shows success instruction message after openNewChatWithText resolves', async () => {
    await onCompressClick(adapter, makeTranscript(), panel)

    expect(panel.showMessage).toHaveBeenCalledWith(
      expect.stringContaining('Press Enter in the new tab'),
    )
  })

  it('shows error message and resets state when openNewChatWithText throws', async () => {
    ;(adapter.openNewChatWithText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('tab blocked'),
    )

    await onCompressClick(adapter, makeTranscript(), panel)

    expect(panel.setCompressState).toHaveBeenLastCalledWith('idle')
    expect(panel.showMessage).toHaveBeenCalledWith(expect.stringContaining('tab blocked'))
  })

  it('shows error when no convId and no cached transcript', async () => {
    ;(adapter.getConversationIdFromUrl as ReturnType<typeof vi.fn>).mockReturnValue(null)

    await onCompressClick(adapter, null, panel)

    expect(panel.showMessage).toHaveBeenCalledWith(expect.stringContaining('Error'))
    expect(adapter.fetchConversation).not.toHaveBeenCalled()
  })

  it('clears any previous message before starting', async () => {
    const order: string[] = []
    ;(panel.clearMessage as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('clear'))
    ;(panel.setCompressState as ReturnType<typeof vi.fn>).mockImplementation((s: string) => order.push(s))

    await onCompressClick(adapter, makeTranscript(), panel)

    expect(order.indexOf('clear')).toBeLessThan(order.indexOf('idle'))
  })
})
