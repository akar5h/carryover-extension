const CONTEXT_WINDOW_TOKENS = 100_000

const COMPRESSION_TEMPLATE = `You are a context compression engine.

Compress the following conversation into a machine-readable checkpoint.

The checkpoint must preserve:
- Current task and goal
- Key decisions made
- Active constraints and requirements
- Open questions
- Relevant code / data snippets (abbreviated if large)

Format as structured markdown. Use section headers. Be dense, not verbose. Remove pleasantries, repetition, and anything not needed to continue the task.

--- CONVERSATION START ---
{transcript}
--- CONVERSATION END ---

Output the compressed checkpoint now:`

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function formatTokens(n: number): string {
  return n.toLocaleString() + ' est. tokens'
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

const transcriptEl = document.getElementById('transcript') as HTMLTextAreaElement
const tokenCountEl = document.getElementById('token-count') as HTMLElement
const loadBarEl = document.getElementById('load-bar') as HTMLElement
const loadPctEl = document.getElementById('load-pct') as HTMLElement
const btnGenerate = document.getElementById('btn-generate') as HTMLButtonElement
const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement
const outputEl = document.getElementById('output') as HTMLTextAreaElement

function updateStats(): void {
  const text = transcriptEl.value
  const tokens = estimateTokens(text)
  const pct = clamp(tokens / CONTEXT_WINDOW_TOKENS, 0, 1)
  const pctDisplay = Math.round(pct * 100)

  tokenCountEl.textContent = formatTokens(tokens)
  loadPctEl.textContent = `${pctDisplay}%`
  loadBarEl.style.width = `${pctDisplay}%`

  loadBarEl.classList.remove('warn', 'danger')
  if (pct >= 0.9) loadBarEl.classList.add('danger')
  else if (pct >= 0.7) loadBarEl.classList.add('warn')

  btnGenerate.disabled = text.trim().length === 0
}

function generatePrompt(): void {
  const transcript = transcriptEl.value.trim()
  if (!transcript) return
  const prompt = COMPRESSION_TEMPLATE.replace('{transcript}', transcript)
  outputEl.value = prompt
  btnCopy.disabled = false
}

let copyTimeout: ReturnType<typeof setTimeout> | null = null

function copyPrompt(): void {
  const text = outputEl.value
  if (!text) return

  navigator.clipboard.writeText(text).then(() => {
    btnCopy.textContent = 'Copied!'
    btnCopy.classList.add('copied')
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => {
      btnCopy.textContent = 'Copy Prompt'
      btnCopy.classList.remove('copied')
      copyTimeout = null
    }, 2000)
  })
}

transcriptEl.addEventListener('input', updateStats)
btnGenerate.addEventListener('click', generatePrompt)
btnCopy.addEventListener('click', copyPrompt)

updateStats()
