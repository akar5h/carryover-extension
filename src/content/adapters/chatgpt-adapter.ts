import type { PlatformAdapter, MessageEntry } from './platform-adapter'

export class ChatGPTAdapter implements PlatformAdapter {
  extractVisibleMessages(): MessageEntry[] {
    try {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>('[data-message-id]')
      )
      return els
        .map((el) => ({
          id: el.getAttribute('data-message-id') ?? '',
          text: el.innerText?.trim() ?? '',
        }))
        .filter((m) => m.id && m.text.length > 0)
    } catch {
      return []
    }
  }

  extractTranscript(): string {
    try {
      // Primary: [data-message-id] elements with explicit role attribute
      const primary = Array.from(
        document.querySelectorAll<HTMLElement>('[data-message-id]')
      )
      if (primary.length > 0) {
        const lines: string[] = []
        for (const el of primary) {
          const role = el.getAttribute('data-message-author-role')
          const text = el.innerText?.trim() ?? ''
          if (!text) continue
          const label = role === 'user' ? 'User' : 'ChatGPT'
          lines.push(`${label}: ${text}`)
        }
        return lines.join('\n')
      }

      // Fallback: text-message or markdown containers
      const fallback = Array.from(
        document.querySelectorAll<HTMLElement>(
          'div[class*="text-message"], div[class*="markdown"]'
        )
      )
      if (fallback.length > 0) {
        const lines: string[] = []
        fallback.forEach((el, i) => {
          const text = el.innerText?.trim() ?? ''
          if (!text) return
          const label = i % 2 === 0 ? 'User' : 'ChatGPT'
          lines.push(`${label}: ${text}`)
        })
        return lines.join('\n')
      }
    } catch {
      // never throw
    }

    return ''
  }

  getPlatformUsagePct(): number | null {
    return null
  }
}
