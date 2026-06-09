import type { PlatformAdapter, MessageEntry } from './platform-adapter'

function hashText(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return 'cl-' + (h >>> 0).toString(16)
}

export class ClaudeAdapter implements PlatformAdapter {
  extractVisibleMessages(): MessageEntry[] {
    try {
      let nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-is-streaming="false"] .font-claude-message'
        )
      )
      if (nodes.length === 0) {
        nodes = Array.from(
          document.querySelectorAll<HTMLElement>('[data-testid*="message"]')
        )
      }
      if (nodes.length === 0) {
        nodes = Array.from(
          document.querySelectorAll<HTMLElement>('div[class*="message"]')
        )
      }
      return nodes
        .map((node) => {
          const text = node.innerText?.trim() ?? ''
          return { id: hashText(text), text }
        })
        .filter((m) => m.text.length > 0)
    } catch {
      return []
    }
  }

  extractTranscript(): string {
    try {
      // Primary: fully-streamed claude.ai message containers
      let nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-is-streaming="false"] .font-claude-message'
        )
      )

      // Fallback 1: data-testid message containers
      if (nodes.length === 0) {
        nodes = Array.from(
          document.querySelectorAll<HTMLElement>('[data-testid*="message"]')
        )
      }

      // Fallback 2: generic message class containers
      if (nodes.length === 0) {
        nodes = Array.from(
          document.querySelectorAll<HTMLElement>('div[class*="message"]')
        )
      }

      if (nodes.length === 0) return ''

      const lines: string[] = []
      nodes.forEach((node, i) => {
        const role = i % 2 === 0 ? 'Human' : 'Assistant'
        const text = node.innerText?.trim() ?? ''
        if (text) lines.push(`${role}: ${text}`)
      })

      return lines.join('\n')
    } catch {
      return ''
    }
  }

  getPlatformUsagePct(): number | null {
    try {
      // Claude sometimes shows a context usage indicator
      const el = document.querySelector<HTMLElement>(
        '[data-testid="context-usage"]'
      )
      if (!el) return null

      const text = el.innerText ?? el.textContent ?? ''
      const match = text.match(/(\d+(?:\.\d+)?)/)
      if (!match) return null

      const val = parseFloat(match[1])
      return Number.isFinite(val) ? val : null
    } catch {
      return null
    }
  }
}
