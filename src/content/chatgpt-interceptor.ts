/**
 * MAIN world script — runs before ChatGPT's own JavaScript.
 * Patches window.fetch to capture /backend-api/conversation/{id} responses
 * and relay them to the isolated-world content script via CustomEvents on document.
 *
 * Never use chrome.* APIs here — this runs in the page's JS environment.
 */
;(function () {
  const cache = new Map<string, { data: unknown; capturedAt: number }>()
  const origFetch = window.fetch

  window.fetch = async function (
    ...args: Parameters<typeof fetch>
  ): Promise<Response> {
    const res = await origFetch.apply(this, args)

    const url =
      typeof args[0] === 'string'
        ? args[0]
        : (args[0] as Request).url ?? ''

    const m = url.match(/\/backend-api\/conversation\/([a-zA-Z0-9_-]+)(?:[?#]|$)/)
    if (m && res.ok) {
      const conversationId = m[1]
      res
        .clone()
        .json()
        .then((data: unknown) => {
          const capturedAt = Date.now()
          cache.set(conversationId, { data, capturedAt })
          document.dispatchEvent(
            new CustomEvent('carryover:chatgpt-conversation', {
              detail: { conversationId, data, capturedAt },
            })
          )
        })
        .catch(() => {
          // response body unreadable — skip
        })
    }

    return res
  }

  // Respond to on-demand requests from isolated world.
  // If the page already fetched this conversation, reply immediately from cache.
  document.addEventListener('carryover:chatgpt-request', (e: Event) => {
    const evt = e as CustomEvent<{ conversationId: string }>
    const id = evt.detail?.conversationId
    if (!id) return
    const cached = cache.get(id)
    if (cached) {
      document.dispatchEvent(
        new CustomEvent('carryover:chatgpt-conversation', {
          detail: { conversationId: id, data: cached.data, capturedAt: cached.capturedAt },
        })
      )
    }
    // If not cached yet, the intercept will fire when ChatGPT's frontend fetches it.
  })
})()
