import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ChatGPTAdapter } from '../chatgpt-adapter'

vi.stubGlobal('location', {
  hostname: 'chatgpt.com',
  pathname: '/c/abc123',
  href: 'https://chatgpt.com/c/abc123',
  assign: vi.fn(),
})

vi.stubGlobal('chrome', {
  storage: {
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
})

function makeNode(
  id: string,
  parent: string | null,
  children: string[],
  role: string,
  text: string,
  createTime?: number
) {
  return {
    id,
    message: {
      id,
      author: { role },
      create_time: createTime ?? null,
      update_time: null,
      content: { content_type: 'text', parts: [text] },
      status: 'finished_successfully',
      metadata: {},
    },
    parent,
    children,
  }
}

describe('ChatGPTAdapter.normalizeConversation', () => {
  let adapter: ChatGPTAdapter

  beforeEach(() => {
    adapter = new ChatGPTAdapter()
  })

  it('extracts linear conversation in chronological order', () => {
    const raw = {
      title: 'Test chat',
      current_node: 'msg-3',
      mapping: {
        'msg-1': makeNode('msg-1', null, ['msg-2'], 'user', 'Hello', 1000),
        'msg-2': makeNode('msg-2', 'msg-1', ['msg-3'], 'assistant', 'Hi there', 2000),
        'msg-3': makeNode('msg-3', 'msg-2', [], 'user', 'How are you?', 3000),
      },
    }

    const result = adapter.normalizeConversation(raw)

    expect(result.platform).toBe('chatgpt')
    expect(result.title).toBe('Test chat')
    expect(result.source).toBe('internal_api')
    expect(result.messages).toHaveLength(3)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[0].text).toBe('Hello')
    expect(result.messages[1].role).toBe('assistant')
    expect(result.messages[1].text).toBe('Hi there')
    expect(result.messages[2].role).toBe('user')
    expect(result.messages[2].text).toBe('How are you?')
  })

  it('uses current_node as active leaf', () => {
    const raw = {
      title: 'Branched',
      current_node: 'msg-2b',
      mapping: {
        'msg-1': makeNode('msg-1', null, ['msg-2a', 'msg-2b'], 'user', 'Root'),
        'msg-2a': makeNode('msg-2a', 'msg-1', [], 'assistant', 'Branch A'),
        'msg-2b': makeNode('msg-2b', 'msg-1', [], 'assistant', 'Branch B'),
      },
    }

    const result = adapter.normalizeConversation(raw)

    expect(result.messages).toHaveLength(2)
    expect(result.messages[1].text).toBe('Branch B')
    expect(result.activeBranch).toBe('msg-2b')
  })

  it('falls back to longest-path leaf when current_node absent', () => {
    const raw = {
      title: 'No current_node',
      mapping: {
        'msg-1': makeNode('msg-1', null, ['msg-2a', 'msg-2b'], 'user', 'Root'),
        'msg-2a': makeNode('msg-2a', 'msg-1', [], 'assistant', 'Short'),
        'msg-2b': makeNode('msg-2b', 'msg-1', ['msg-3'], 'assistant', 'Longer'),
        'msg-3': makeNode('msg-3', 'msg-2b', [], 'user', 'Deepest'),
      },
    }

    const result = adapter.normalizeConversation(raw)

    // Should pick msg-1 → msg-2b → msg-3 (depth 3 vs depth 2)
    expect(result.messages).toHaveLength(3)
    expect(result.messages[2].text).toBe('Deepest')
  })

  it('does not include messages from inactive branches', () => {
    const raw = {
      title: 'Dedup',
      current_node: 'msg-3',
      mapping: {
        'msg-1': makeNode('msg-1', null, ['msg-2', 'msg-alt'], 'user', 'Root'),
        'msg-2': makeNode('msg-2', 'msg-1', ['msg-3'], 'assistant', 'Active'),
        'msg-alt': makeNode('msg-alt', 'msg-1', [], 'assistant', 'INACTIVE — must not appear'),
        'msg-3': makeNode('msg-3', 'msg-2', [], 'user', 'End'),
      },
    }

    const result = adapter.normalizeConversation(raw)
    const texts = result.messages.map((m) => m.text)
    expect(texts).not.toContain('INACTIVE — must not appear')
    expect(result.messages).toHaveLength(3)
  })

  it('skips messages with empty content', () => {
    const raw = {
      title: 'Empty messages',
      current_node: 'msg-2',
      mapping: {
        'msg-1': {
          id: 'msg-1',
          message: { id: 'msg-1', author: { role: 'user' }, create_time: null, update_time: null, content: { content_type: 'text', parts: [''] }, status: 'finished_successfully', metadata: {} },
          parent: null,
          children: ['msg-2'],
        },
        'msg-2': makeNode('msg-2', 'msg-1', [], 'assistant', 'Real reply'),
      },
    }

    const result = adapter.normalizeConversation(raw)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].text).toBe('Real reply')
  })

  it('skips nodes with null message', () => {
    const raw = {
      title: 'Null message node',
      current_node: 'msg-2',
      mapping: {
        'root': { id: 'root', message: null, parent: null, children: ['msg-1'] },
        'msg-1': makeNode('msg-1', 'root', ['msg-2'], 'user', 'Hi'),
        'msg-2': makeNode('msg-2', 'msg-1', [], 'assistant', 'Hello'),
      },
    }

    const result = adapter.normalizeConversation(raw)
    // root node (null message) should be skipped
    expect(result.messages).toHaveLength(2)
  })

  it('converts Unix create_time to ISO string', () => {
    const raw = {
      title: 'Timestamps',
      current_node: 'msg-1',
      mapping: {
        'msg-1': makeNode('msg-1', null, [], 'user', 'Hi', 1704067200),
      },
    }

    const result = adapter.normalizeConversation(raw)
    expect(result.messages[0].createdAt).toBe(new Date(1704067200 * 1000).toISOString())
  })

  it('handles multi-part content', () => {
    const raw = {
      title: 'Multi-part',
      current_node: 'msg-1',
      mapping: {
        'msg-1': {
          id: 'msg-1',
          message: {
            id: 'msg-1',
            author: { role: 'assistant' },
            create_time: null,
            update_time: null,
            content: { content_type: 'text', parts: ['Part 1', 'Part 2'] },
            status: 'finished_successfully',
            metadata: {},
          },
          parent: null,
          children: [],
        },
      },
    }

    const result = adapter.normalizeConversation(raw)
    expect(result.messages[0].text).toBe('Part 1\nPart 2')
  })
})

describe('ChatGPTAdapter composition methods', () => {
  let adapter: ChatGPTAdapter

  beforeEach(() => {
    adapter = new ChatGPTAdapter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('insertTextIntoComposer', () => {
    it('sets value and dispatches input event on #prompt-textarea', async () => {
      const textarea = { tagName: 'TEXTAREA', focus: vi.fn(), dispatchEvent: vi.fn(), value: '' }
      vi.spyOn(document, 'querySelector').mockReturnValue(textarea as unknown as HTMLElement)

      await adapter.insertTextIntoComposer('hello chatgpt')

      expect(textarea.focus).toHaveBeenCalled()
      expect((textarea as { value: string }).value).toBe('hello chatgpt')
      expect(textarea.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'input', bubbles: true }),
      )
    })

    it('calls execCommand on contenteditable composer', async () => {
      const el = { tagName: 'DIV', focus: vi.fn(), dispatchEvent: vi.fn() }
      vi.spyOn(document, 'querySelector').mockReturnValue(el as unknown as HTMLElement)
      const execMock = vi.fn().mockReturnValue(true)
      Object.defineProperty(document, 'execCommand', {
        value: execMock,
        writable: true,
        configurable: true,
      })

      await adapter.insertTextIntoComposer('hello world')

      expect(el.focus).toHaveBeenCalled()
      expect(execMock).toHaveBeenCalledWith('insertText', false, 'hello world')
    })

    it('throws AdapterError with code FETCH_FAILED when no composer found', async () => {
      vi.spyOn(document, 'querySelector').mockReturnValue(null)

      await expect(adapter.insertTextIntoComposer('text')).rejects.toMatchObject({
        code: 'FETCH_FAILED',
        recoverable: true,
      })
    })
  })

  describe('openNewChatWithText', () => {
    it('stores text and navigates the current tab to a fresh chat', async () => {
      await adapter.openNewChatWithText('my prompt')

      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        'carryover:pending_insert': 'my prompt',
      })
      expect(location.assign).toHaveBeenCalledWith('https://chatgpt.com/')
    })
  })
})

describe('ChatGPTAdapter live tracking', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('extracts stable message IDs, roles, text, and streaming state', () => {
    document.body.innerHTML = `
      <main>
        <article data-testid="conversation-turn-1">
          <div data-message-id="user-1" data-message-author-role="user">Question</div>
        </article>
        <article data-testid="conversation-turn-2">
          <div data-message-id="assistant-1" data-message-author-role="assistant">
            <div class="markdown">Streaming answer</div>
          </div>
        </article>
        <button aria-label="Stop streaming"></button>
      </main>
    `
    const adapter = new ChatGPTAdapter()

    expect(adapter.getConversationRoot()).toBe(document.querySelector('main'))
    expect(adapter.readVisibleMessages()).toEqual([
      { id: 'user-1', role: 'user', text: 'Question', streaming: false },
      { id: 'assistant-1', role: 'assistant', text: 'Streaming answer', streaming: true },
    ])
    expect(adapter.isGenerating()).toBe(true)
  })
})
