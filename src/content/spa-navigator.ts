type ConversationChangeCallback = (newId: string | null, prevId: string | null) => void

function extractConvId(): string | null {
  // Claude: /chat/{uuid}
  const claude = location.pathname.match(/\/chat\/([0-9a-f-]{36})/i)
  if (claude) return claude[1]

  // ChatGPT: /c/{id}
  const gpt = location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/)
  if (gpt) return gpt[1]

  return null
}

export class SpaNavigator {
  private listeners: ConversationChangeCallback[] = []
  private currentId: string | null = extractConvId()
  private patched = false

  start(): void {
    if (this.patched) return
    this.patched = true

    // Monkey-patch history methods
    const orig = {
      push: history.pushState.bind(history),
      replace: history.replaceState.bind(history),
    }

    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      orig.push(...args)
      this.onNavigate()
    }

    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      orig.replace(...args)
      this.onNavigate()
    }

    window.addEventListener('popstate', () => this.onNavigate())

    // Fallback: observe title changes (SPAs often update title on nav)
    const titleObserver = new MutationObserver(() => this.onNavigate())
    if (document.head) {
      const titleEl = document.head.querySelector('title')
      if (titleEl) titleObserver.observe(titleEl, { childList: true, characterData: true })
    }
  }

  private onNavigate(): void {
    const newId = extractConvId()
    if (newId !== this.currentId) {
      const prev = this.currentId
      this.currentId = newId
      for (const cb of this.listeners) {
        try { cb(newId, prev) } catch { /* ignore */ }
      }
    }
  }

  onConversationChange(cb: ConversationChangeCallback): void {
    this.listeners.push(cb)
  }

  getCurrentConversationId(): string | null {
    return this.currentId
  }
}
