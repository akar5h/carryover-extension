import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ChatGPTAdapter } from '../chatgpt-adapter'

vi.stubGlobal('location', {
  hostname: 'chatgpt.com',
  pathname: '/c/abc123',
  href: 'https://chatgpt.com/c/abc123',
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
