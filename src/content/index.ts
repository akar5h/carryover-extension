import { ClaudeAdapter } from './adapters/claude-adapter'

console.log('CarryOver content script loaded')

const adapter = new ClaudeAdapter()
console.log('CarryOver: transcript length', adapter.extractTranscript().length)
