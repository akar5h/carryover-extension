// Runs in MAIN world at document_start — patches window.fetch before page code runs.
// Intercepts conversation fetch calls and dispatches carryover:messages to isolated world.

const _origFetch = window.fetch.bind(window)

window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
  const res = await _origFetch(...args)
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url

  const isChatGPTConv = /\/backend-api\/conversation\/[a-z0-9-]+$/.test(url)
  const isClaudeConv = /\/api\/organizations\/[^/]+\/chat_conversations\/[^/?]+/.test(url)

  if (isChatGPTConv || isClaudeConv) {
    res
      .clone()
      .json()
      .then((data: unknown) => {
        const messages = isChatGPTConv
          ? extractChatGPTMessages(data)
          : extractClaudeMessages(data)
        if (messages.length > 0) {
          window.dispatchEvent(
            new CustomEvent('carryover:messages', { detail: messages })
          )
        }
      })
      .catch(() => {
        // Non-JSON or unexpected shape — safe to ignore
      })
  }

  return res
}

function extractChatGPTMessages(data: unknown): Array<{ id: string; text: string }> {
  const mapping = (data as Record<string, unknown>)?.mapping ?? {}
  return Object.values(mapping as Record<string, unknown>)
    .filter((node: unknown) => (node as any)?.message?.content?.parts?.length > 0)
    .map((node: unknown) => ({
      id: (node as any).message.id as string,
      text: ((node as any).message.content.parts as unknown[])
        .filter((p) => typeof p === 'string')
        .join(''),
    }))
    .filter((m) => m.text.trim().length > 0)
}

function extractClaudeMessages(data: unknown): Array<{ id: string; text: string }> {
  const msgs =
    (data as any)?.chat_messages ??
    (data as any)?.messages ??
    []
  return (msgs as any[])
    .map((m: any) => ({
      id: String(m.uuid ?? m.id ?? m.index ?? Math.random()),
      text:
        typeof m.text === 'string'
          ? m.text
          : typeof m.content === 'string'
            ? m.content
            : extractContentBlocks(m.content),
    }))
    .filter((m) => m.text.trim().length > 0)
}

function extractContentBlocks(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return (content as any[])
    .filter((block: any) => block?.type === 'text' && typeof block.text === 'string')
    .map((block: any) => block.text as string)
    .join('')
}
