export type CompressRequest = {
  type: 'COMPRESS'
  prompt: string
  originalTokens: number
}

export type CompressSuccess = {
  ok: true
  checkpoint: string
  originalTokens: number
  compressedTokens: number
  reductionPct: number
}

export type CompressError = {
  ok: false
  error: string
  errorCode: 'NO_API_KEY' | 'OPENAI_ERROR' | 'UNKNOWN'
}

export type CompressResponse = CompressSuccess | CompressError
