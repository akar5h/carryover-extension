import {
  COMPRESSION_MODE_STORAGE_KEY,
  DEFAULT_COMPRESSION_MODE,
  OPENAI_API_KEY_STORAGE_KEY,
  normalizeCompressionMode,
} from '../settings'
import type { CompressionMode } from '../settings'

const pageStatusDot = document.getElementById('page-status-dot') as HTMLSpanElement
const pageStatusText = document.getElementById('page-status-text') as HTMLSpanElement
const currentChatBtn = document.getElementById('mode-current-chat') as HTMLButtonElement
const apiFallbackBtn = document.getElementById('mode-api-fallback') as HTMLButtonElement
const modeNote = document.getElementById('mode-note') as HTMLDivElement
const fallbackToggle = document.getElementById('fallback-toggle') as HTMLButtonElement
const fallbackBody = document.getElementById('fallback-body') as HTMLDivElement
const fallbackPill = document.getElementById('fallback-pill') as HTMLSpanElement
const keyInput = document.getElementById('openai-key') as HTMLInputElement
const saveBtn = document.getElementById('btn-save') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLElement

let mode: CompressionMode = DEFAULT_COMPRESSION_MODE
let fallbackOpen = false
let savedKey = ''
let statusTimer: ReturnType<typeof setTimeout> | null = null

void init()

async function init(): Promise<void> {
  renderCurrentPageStatus()

  const stored = await chrome.storage.sync.get([
    OPENAI_API_KEY_STORAGE_KEY,
    COMPRESSION_MODE_STORAGE_KEY,
  ])
  savedKey = (stored[OPENAI_API_KEY_STORAGE_KEY] as string | undefined) ?? ''
  mode = normalizeCompressionMode(stored[COMPRESSION_MODE_STORAGE_KEY])
  keyInput.value = savedKey
  fallbackOpen = mode === 'api_fallback'

  renderMode()
  renderFallback()
}

function renderCurrentPageStatus(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const status = getPageStatus(tab?.url)
    pageStatusText.textContent = status.label
    pageStatusDot.className = `status-dot ${status.className}`
  })
}

function getPageStatus(urlString: string | undefined): { label: string; className: string } {
  if (!urlString) return { label: 'Unable to read current tab', className: 'is-warning' }

  try {
    const url = new URL(urlString)
    if (url.hostname === 'chatgpt.com' || url.hostname === 'chat.openai.com') {
      if (url.pathname.startsWith('/c/')) {
        return { label: 'ChatGPT conversation detected', className: 'is-active' }
      }
      return { label: 'Open a ChatGPT conversation', className: 'is-warning' }
    }

    if (url.hostname === 'claude.ai') {
      if (url.pathname.startsWith('/chat/')) {
        return { label: 'Claude conversation detected', className: 'is-active' }
      }
      return { label: 'Open a Claude conversation', className: 'is-warning' }
    }
  } catch {
    return { label: 'Unsupported page', className: 'is-off' }
  }

  return { label: 'Unsupported page', className: 'is-off' }
}

function renderMode(): void {
  currentChatBtn.setAttribute('aria-pressed', String(mode === 'current_chat'))
  apiFallbackBtn.setAttribute('aria-pressed', String(mode === 'api_fallback'))
  modeNote.textContent = mode === 'api_fallback'
    ? 'Sends the compression prompt to OpenAI using your API key.'
    : 'Uses the active ChatGPT or Claude tab.'
}

function renderFallback(): void {
  const required = mode === 'api_fallback'
  if (required) fallbackOpen = true

  fallbackToggle.setAttribute('aria-expanded', String(fallbackOpen))
  fallbackPill.textContent = required ? 'Required' : 'Optional'
  fallbackPill.className = `fallback-pill${required ? ' is-required' : ''}`
  fallbackBody.classList.toggle('is-hidden', !fallbackOpen)

  if (required && !savedKey) {
    statusEl.textContent = 'OpenAI API key required for API fallback.'
    statusEl.style.color = '#f6c84c'
  } else if (savedKey) {
    statusEl.textContent = 'API key saved.'
    statusEl.style.color = '#4ecf8a'
  } else {
    statusEl.textContent = ''
  }
}

async function setMode(nextMode: CompressionMode): Promise<void> {
  mode = nextMode
  await chrome.storage.sync.set({ [COMPRESSION_MODE_STORAGE_KEY]: mode })
  if (mode === 'api_fallback') fallbackOpen = true
  renderMode()
  renderFallback()
}

currentChatBtn.addEventListener('click', () => {
  void setMode('current_chat')
})

apiFallbackBtn.addEventListener('click', () => {
  void setMode('api_fallback')
})

fallbackToggle.addEventListener('click', () => {
  if (mode === 'api_fallback') return
  fallbackOpen = !fallbackOpen
  renderFallback()
})

saveBtn.addEventListener('click', () => {
  const key = keyInput.value.trim()
  chrome.storage.sync.set({ [OPENAI_API_KEY_STORAGE_KEY]: key }, () => {
    savedKey = key
    statusEl.textContent = key ? 'API key saved.' : 'API key cleared.'
    statusEl.style.color = key ? '#4ecf8a' : '#ff6b6b'
    if (statusTimer) clearTimeout(statusTimer)
    statusTimer = setTimeout(() => {
      statusTimer = null
      renderFallback()
    }, 2500)
  })
})
