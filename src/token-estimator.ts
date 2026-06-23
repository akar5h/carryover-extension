import type { NormalizedTranscript } from './adapters/types'

export function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function estimateTranscriptTokens(transcript: NormalizedTranscript): number {
  return transcript.messages.reduce(
    (sum, message) => sum + estimateTextTokens(message.text),
    0
  )
}
