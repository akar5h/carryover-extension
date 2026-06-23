import type { CompressRequest, CompressResponse } from './background-messages'
import { OPENAI_API_KEY_STORAGE_KEY } from './settings'

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
})

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
})

const OPENAI_MODEL = 'gpt-4o-mini'

chrome.runtime.onMessage.addListener(
  (request: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (r: CompressResponse) => void) => {
    if (!request || typeof request !== 'object') return false
    const req = request as Record<string, unknown>
    if (req['type'] !== 'COMPRESS') return false

    const prompt = req['prompt'] as string | undefined
    const originalTokens = (req['originalTokens'] as number | undefined) ?? 0

    if (!prompt) {
      sendResponse({ ok: false, error: 'Missing prompt', errorCode: 'UNKNOWN' })
      return false
    }

    void handleCompress(prompt, originalTokens, sendResponse)
    return true
  }
)

async function handleCompress(
  prompt: string,
  originalTokens: number,
  sendResponse: (r: CompressResponse) => void,
): Promise<void> {
  try {
    const stored = await chrome.storage.sync.get(OPENAI_API_KEY_STORAGE_KEY)
    const apiKey = stored[OPENAI_API_KEY_STORAGE_KEY] as string | undefined
    if (!apiKey) {
      sendResponse({
        ok: false,
        error: 'OpenAI API key not set. Open the CarryOver popup to configure it.',
        errorCode: 'NO_API_KEY',
      })
      return
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      sendResponse({
        ok: false,
        error: `OpenAI error ${res.status}: ${text.slice(0, 200)}`,
        errorCode: 'OPENAI_ERROR',
      })
      return
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }

    const checkpoint = data?.choices?.[0]?.message?.content ?? ''
    const promptTokens = data?.usage?.prompt_tokens ?? originalTokens
    const completionTokens = data?.usage?.completion_tokens ?? Math.ceil(checkpoint.length / 4)
    const reductionPct = promptTokens > 0
      ? Math.round((1 - completionTokens / promptTokens) * 100)
      : 0

    sendResponse({
      ok: true,
      checkpoint,
      originalTokens: promptTokens,
      compressedTokens: completionTokens,
      reductionPct,
    })
  } catch (err) {
    sendResponse({
      ok: false,
      error: err instanceof Error ? err.message : 'Compression failed',
      errorCode: 'UNKNOWN',
    })
  }
}
