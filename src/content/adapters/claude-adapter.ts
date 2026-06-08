import type { PlatformAdapter } from './platform-adapter'

export class ClaudeAdapter implements PlatformAdapter {
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
