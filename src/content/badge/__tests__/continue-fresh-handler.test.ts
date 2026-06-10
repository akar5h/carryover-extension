import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onContinueFreshClick } from '../continue-fresh-handler'
import type { PlatformAdapter, PlatformUsage } from '../../../adapters/types'
import type { BadgePanel } from '../badge-panel'

function makeAdapter(overrides: Partial<PlatformAdapter> = {}): PlatformAdapter {
  return {
    name: 'claude',
    isSupportedPage: vi.fn().mockReturnValue(true),
    getConversationIdFromUrl: vi.fn().mockReturnValue('conv-1'),
    fetchConversation: vi.fn(),
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

describe('onContinueFreshClick', () => {
  let adapter: PlatformAdapter
  let panel: BadgePanel

  beforeEach(() => {
    adapter = makeAdapter()
    panel = makePanel()
  })

  it('shows error and does NOT call openNewChatWithText when checkpoint is empty string', async () => {
    await onContinueFreshClick(adapter, '', panel)

    expect(panel.showMessage).toHaveBeenCalledWith('Error: no checkpoint pasted.')
    expect(adapter.openNewChatWithText).not.toHaveBeenCalled()
  })

  it('shows error and does NOT call openNewChatWithText when checkpoint is whitespace only', async () => {
    await onContinueFreshClick(adapter, '   ', panel)

    expect(panel.showMessage).toHaveBeenCalledWith('Error: no checkpoint pasted.')
    expect(adapter.openNewChatWithText).not.toHaveBeenCalled()
  })

  it('calls openNewChatWithText with prompt containing the checkpoint text', async () => {
    const checkpoint = 'Summary: user asked about X, assistant responded with Y.'

    await onContinueFreshClick(adapter, checkpoint, panel)

    expect(adapter.openNewChatWithText).toHaveBeenCalledOnce()
    const prompt = (adapter.openNewChatWithText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(prompt).toContain(checkpoint)
  })

  it('calls resetToIdle after openNewChatWithText resolves', async () => {
    await onContinueFreshClick(adapter, 'valid checkpoint', panel)

    expect(panel.resetToIdle).toHaveBeenCalledOnce()
    expect(panel.showMessage).not.toHaveBeenCalled()
  })

  it('shows error message when openNewChatWithText throws', async () => {
    ;(adapter.openNewChatWithText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('tab blocked'),
    )

    await onContinueFreshClick(adapter, 'valid checkpoint', panel)

    expect(panel.showMessage).toHaveBeenCalledWith(expect.stringContaining('tab blocked'))
  })
})
