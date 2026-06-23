import { describe, it, expect } from 'vitest'
import {
  buildCompressionPrompt,
  buildInContextCompressionPrompt,
  estimateCompressedTokens,
} from '../prompt-builder'
import type { NormalizedTranscript } from '../../adapters/types'

const base: NormalizedTranscript = {
  platform: 'claude',
  conversationId: 'test-123',
  messages: [],
  source: 'internal_api',
  fetchedAt: '2026-06-09T00:00:00.000Z',
}

describe('buildCompressionPrompt', () => {
  it('contains every required checkpoint section', () => {
    const prompt = buildCompressionPrompt(base)
    expect(prompt).toContain('## 🎯 Current Task & Goal')
    expect(prompt).toContain('## ✅ Completed Work')
    expect(prompt).toContain('## 🔄 Current State')
    expect(prompt).toContain('## 📋 Decisions Made')
    expect(prompt).toContain('## 🔒 Active Constraints & Preferences')
    expect(prompt).toContain('## 🗂️ Topics Covered')
    expect(prompt).toContain('## ⚠️ Known Issues & Failed Approaches')
    expect(prompt).toContain('## 📎 Artifacts & References')
    expect(prompt).toContain('## ❓ Open Questions')
    expect(prompt).toContain('## 💻 Code / Data State')
    expect(prompt).toContain('## ⚡ Continue From Here')
  })

  it('injects messages between CONVERSATION START/END markers', () => {
    const transcript: NormalizedTranscript = {
      ...base,
      messages: [
        { role: 'user', text: 'Hello' },
        { role: 'assistant', text: 'Hi there' },
      ],
    }
    const prompt = buildCompressionPrompt(transcript)
    const start = prompt.indexOf('--- CONVERSATION START ---')
    const end = prompt.indexOf('--- CONVERSATION END ---')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const body = prompt.slice(start, end)
    expect(body).toContain('User: Hello')
    expect(body).toContain('Assistant: Hi there')
  })

  it('excludes system and tool messages', () => {
    const transcript: NormalizedTranscript = {
      ...base,
      messages: [
        { role: 'system', text: 'System prompt' },
        { role: 'tool', text: 'Tool output' },
        { role: 'user', text: 'Real question' },
        { role: 'assistant', text: 'Real answer' },
        { role: 'unknown', text: 'Mystery' },
      ],
    }
    const prompt = buildCompressionPrompt(transcript)
    expect(prompt).not.toContain('System prompt')
    expect(prompt).not.toContain('Tool output')
    expect(prompt).not.toContain('Mystery')
    expect(prompt).toContain('User: Real question')
    expect(prompt).toContain('Assistant: Real answer')
  })

  it('handles empty transcript without crashing', () => {
    expect(() => buildCompressionPrompt(base)).not.toThrow()
    const prompt = buildCompressionPrompt(base)
    expect(prompt).toContain('[No messages]')
  })

  it('handles transcript where all messages are filtered out', () => {
    const transcript: NormalizedTranscript = {
      ...base,
      messages: [
        { role: 'system', text: 'System only' },
        { role: 'tool', text: 'Tool only' },
      ],
    }
    const prompt = buildCompressionPrompt(transcript)
    expect(prompt).toContain('[No messages]')
  })
})

describe('buildInContextCompressionPrompt', () => {
  it('uses existing chat context without embedding transcript markers', () => {
    const prompt = buildInContextCompressionPrompt()

    expect(prompt).toContain('conversation context already available to you')
    expect(prompt).not.toContain('--- CONVERSATION START ---')
    expect(prompt).not.toContain('{messages}')
  })

  it('includes accuracy, conflict, security, and size boundaries', () => {
    const prompt = buildInContextCompressionPrompt()

    expect(prompt).toContain('Never invent missing facts')
    expect(prompt).toContain('mark earlier ones as superseded')
    expect(prompt).toContain('Never include passwords, API keys')
    expect(prompt).toContain('Target 5,000 tokens or fewer')
    expect(prompt).toContain('Use up to 8,000 only when critical technical')
  })
})

describe('estimateCompressedTokens', () => {
  it('returns correct low/high for 10000 tokens', () => {
    const result = estimateCompressedTokens(10000)
    // low = 10000/15 ≈ 667, high = 10000/8 = 1250
    expect(result.low).toBe(667)
    expect(result.high).toBe(1250)
  })

  it('low is always less than high', () => {
    for (const n of [100, 1000, 50000]) {
      const { low, high } = estimateCompressedTokens(n)
      expect(low).toBeLessThan(high)
    }
  })

  it('returns 0 for 0 tokens', () => {
    const { low, high } = estimateCompressedTokens(0)
    expect(low).toBe(0)
    expect(high).toBe(0)
  })
})
