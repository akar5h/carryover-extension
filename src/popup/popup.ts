const keyInput = document.getElementById('openai-key') as HTMLInputElement
const saveBtn = document.getElementById('btn-save') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLElement

// Load saved key on popup open
chrome.storage.sync.get('openai_api_key', (result) => {
  const key = result['openai_api_key'] as string | undefined
  if (key) keyInput.value = key
})

let statusTimer: ReturnType<typeof setTimeout> | null = null

saveBtn.addEventListener('click', () => {
  const key = keyInput.value.trim()
  chrome.storage.sync.set({ openai_api_key: key }, () => {
    statusEl.textContent = key ? 'API key saved.' : 'API key cleared.'
    statusEl.style.color = key ? '#4ecf8a' : '#ff6b6b'
    if (statusTimer) clearTimeout(statusTimer)
    statusTimer = setTimeout(() => {
      statusEl.textContent = ''
      statusTimer = null
    }, 2500)
  })
})
