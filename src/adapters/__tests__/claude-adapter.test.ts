import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ClaudeAdapter } from '../claude-adapter'

// Stub browser globals not present in Node
vi.stubGlobal('location', { hostname: 'claude.ai', pathname: '/chat/aaaa-bbbb', href: 'https://claude.ai/chat/aaaa-bbbb' })
vi.stubGlobal('chrome', { storage: { session: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) } } })

describe('ClaudeAdapter.normalizeConversation', () => {
  let adapter: ClaudeAdapter

  beforeEach(() => {
    adapter = new ClaudeAdapter()
  })

  it('extracts linear conversation in order', () => {
    const raw = {
      uuid: 'conv-1',
      name: 'Test chat',
      current_leaf_message_uuid: 'msg-3',
      chat_messages: [
        { uuid: 'msg-1', sender: 'human', text: 'Hello', parent_message_uuid: null, children_message_uuids: ['msg-2'], created_at: '2024-01-01T00:00:00Z' },
        { uuid: 'msg-2', sender: 'assistant', text: 'Hi there', parent_message_uuid: 'msg-1', children_message_uuids: ['msg-3'], created_at: '2024-01-01T00:01:00Z' },
        { uuid: 'msg-3', sender: 'human', text: 'How are you?', parent_message_uuid: 'msg-2', children_message_uuids: [], created_at: '2024-01-01T00:02:00Z' },
      ],
    }

    const result = adapter.normalizeConversation(raw)

    expect(result.platform).toBe('claude')
    expect(result.conversationId).toBe('conv-1')
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

  it('uses current_leaf_message_uuid to select active branch', () => {
    // Branched conversation: msg-1 → msg-2a and msg-2b; current_leaf = msg-2b
    const raw = {
      uuid: 'conv-branch',
      name: 'Branched',
      current_leaf_message_uuid: 'msg-2b',
      chat_messages: [
        { uuid: 'msg-1', sender: 'human', text: 'Hello', parent_message_uuid: null, children_message_uuids: ['msg-2a', 'msg-2b'], created_at: '2024-01-01T00:00:00Z' },
        { uuid: 'msg-2a', sender: 'assistant', text: 'Response A', parent_message_uuid: 'msg-1', children_message_uuids: [], created_at: '2024-01-01T00:01:00Z' },
        { uuid: 'msg-2b', sender: 'assistant', text: 'Response B', parent_message_uuid: 'msg-1', children_message_uuids: [], created_at: '2024-01-01T00:02:00Z' },
      ],
    }

    const result = adapter.normalizeConversation(raw)

    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].text).toBe('Hello')
    expect(result.messages[1].text).toBe('Response B')
    expect(result.activeBranch).toBe('msg-2b')
  })

  it('falls back to longest-path leaf when current_leaf_message_uuid absent', () => {
    const raw = {
      uuid: 'conv-noLeaf',
      name: 'No leaf',
      chat_messages: [
        { uuid: 'msg-1', sender: 'human', text: 'A', parent_message_uuid: null, children_message_uuids: ['msg-2a', 'msg-2b'] },
        { uuid: 'msg-2a', sender: 'assistant', text: 'Short', parent_message_uuid: 'msg-1', children_message_uuids: [] },
        { uuid: 'msg-2b', sender: 'assistant', text: 'Longer branch', parent_message_uuid: 'msg-1', children_message_uuids: ['msg-3b'] },
        { uuid: 'msg-3b', sender: 'human', text: 'Follow up', parent_message_uuid: 'msg-2b', children_message_uuids: [] },
      ],
    }

    const result = adapter.normalizeConversation(raw)

    // Should pick the longer branch: msg-1 → msg-2b → msg-3b
    expect(result.messages).toHaveLength(3)
    expect(result.messages[2].text).toBe('Follow up')
  })

  it('does not include messages from other branches', () => {
    const raw = {
      uuid: 'conv-dedup',
      name: 'Dedup',
      current_leaf_message_uuid: 'msg-3',
      chat_messages: [
        { uuid: 'msg-1', sender: 'human', text: 'Root', parent_message_uuid: null, children_message_uuids: ['msg-2', 'msg-alt'] },
        { uuid: 'msg-2', sender: 'assistant', text: 'Active branch', parent_message_uuid: 'msg-1', children_message_uuids: ['msg-3'] },
        { uuid: 'msg-alt', sender: 'assistant', text: 'OTHER BRANCH — should not appear', parent_message_uuid: 'msg-1', children_message_uuids: [] },
        { uuid: 'msg-3', sender: 'human', text: 'End', parent_message_uuid: 'msg-2', children_message_uuids: [] },
      ],
    }

    const result = adapter.normalizeConversation(raw)
    const texts = result.messages.map((m) => m.text)
    expect(texts).not.toContain('OTHER BRANCH — should not appear')
    expect(result.messages).toHaveLength(3)
  })

  it('handles empty chat_messages', () => {
    const raw = { uuid: 'conv-empty', name: 'Empty', chat_messages: [] }
    const result = adapter.normalizeConversation(raw)
    expect(result.messages).toHaveLength(0)
  })

  it('extracts text from content blocks when text field absent', () => {
    const raw = {
      uuid: 'conv-content',
      name: 'Content blocks',
      chat_messages: [
        {
          uuid: 'msg-1', sender: 'assistant', text: '', parent_message_uuid: null, children_message_uuids: [],
          content: [{ type: 'text', text: 'From content block' }],
        },
      ],
    }

    const result = adapter.normalizeConversation(raw)
    expect(result.messages[0].text).toBe('From content block')
  })

  it('preserves parentId and childrenIds on messages', () => {
    const raw = {
      uuid: 'conv-tree',
      name: 'Tree',
      current_leaf_message_uuid: 'msg-2',
      chat_messages: [
        { uuid: 'msg-1', sender: 'human', text: 'Hi', parent_message_uuid: null, children_message_uuids: ['msg-2'] },
        { uuid: 'msg-2', sender: 'assistant', text: 'Hello', parent_message_uuid: 'msg-1', children_message_uuids: [] },
      ],
    }

    const result = adapter.normalizeConversation(raw)
    expect(result.messages[0].parentId).toBeUndefined()
    expect(result.messages[0].childrenIds).toEqual(['msg-2'])
    expect(result.messages[1].parentId).toBe('msg-1')
    expect(result.messages[1].childrenIds).toEqual([])
  })
})
