import { describe, it, expect } from 'vitest'
import { buildCompressionPrompt, buildBootstrapPrompt, estimateCompressedTokens } from '../prompt-builder'
import type { NormalizedTranscript } from '../../adapters/types'

const base: NormalizedTranscript = {
  platform: 'claude',
  conversationId: 'test-123',
  messages: [],
  source: 'internal_api',
  fetchedAt: '2026-06-09T00:00:00.000Z',
}

describe('buildCompressionPrompt', () => {
  it('contains all 8 required sections', () => {
    const prompt = buildCompressionPrompt(base)
    expect(prompt).toContain('## 🎯 Current Task & Goal')
    expect(prompt).toContain('## 📋 Decisions Made')
    expect(prompt).toContain('## 🔒 Active Constraints')
    expect(prompt).toContain('## 🗂️ Topics Covered')
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

describe('buildBootstrapPrompt', () => {
  it('contains checkpoint verbatim when non-empty', () => {
    const checkpoint = '## Current Task\nBuild a Chrome extension.\n## Decisions Made\n1. Use TypeScript.'
    const prompt = buildBootstrapPrompt(checkpoint)
    expect(prompt).toContain(checkpoint)
  })

  it('prompt introduces checkpoint as compressed context from prior conversation', () => {
    const prompt = buildBootstrapPrompt('some checkpoint')
    expect(prompt.toLowerCase()).toContain('prior conversation')
    expect(prompt.toLowerCase()).toContain('checkpoint')
  })

  it('embeds checkpoint between START/END markers', () => {
    const checkpoint = 'test checkpoint data'
    const prompt = buildBootstrapPrompt(checkpoint)
    const start = prompt.indexOf('--- CHECKPOINT START ---')
    const end = prompt.indexOf('--- CHECKPOINT END ---')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(prompt.slice(start, end)).toContain(checkpoint)
  })

  it('handles empty checkpoint gracefully (no crash)', () => {
    expect(() => buildBootstrapPrompt('')).not.toThrow()
  })

  it('empty checkpoint prompt still contains marker text', () => {
    const prompt = buildBootstrapPrompt('')
    expect(prompt).toContain('--- CHECKPOINT START ---')
    expect(prompt).toContain('--- CHECKPOINT END ---')
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
