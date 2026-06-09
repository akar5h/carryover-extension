import type { NormalizedTranscript } from '../adapters/types'

const COMPRESSION_TEMPLATE = `You are a context compression engine.

Compress this conversation into a dense, machine-readable state checkpoint for pasting into a fresh chat.

RULES:
- Dense. Every word earns its place.
- No pleasantries, filler, or meta-commentary.
- Preserve exact technical details, numbers, names, constraints verbatim.
- Record decisions with rationale — do not summarize them.

---

## 🎯 Current Task & Goal
## 📋 Decisions Made (numbered, chronological — each: decision + rationale)
## 🔒 Active Constraints (hard requirements, non-negotiables)
## 🗂️ Topics Covered (one bullet per distinct subject — subject + current status + key outcome)
## 📎 Artifacts & References (files uploaded, code shared, URLs, docs — name + what it is + why it matters)
## ❓ Open Questions (unresolved — each: question + context needed)
## 💻 Code / Data State (exact snippets, schema, config — abbreviated if long, never omitted if critical)
## ⚡ Continue From Here (one sentence: exact next step in fresh chat)

--- CONVERSATION START ---
{messages}
--- CONVERSATION END ---

Output checkpoint now. Follow structure exactly.`

export function buildCompressionPrompt(transcript: NormalizedTranscript): string {
  const lines = transcript.messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n\n')

  const messages = lines.length > 0 ? lines : '[No messages]'
  return COMPRESSION_TEMPLATE.replace('{messages}', messages)
}

export function estimateCompressedTokens(originalTokens: number): { low: number; high: number } {
  // Typical 10–15x compression for conversational text
  return {
    low: Math.round(originalTokens / 15),
    high: Math.round(originalTokens / 8),
  }
}
