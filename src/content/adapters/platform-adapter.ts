export interface MessageEntry {
  id: string
  text: string
}

export interface PlatformAdapter {
  /** Extract currently-visible messages with stable IDs for accumulator. */
  extractVisibleMessages(): MessageEntry[]
  /** Extract full visible conversation as plain text (used by panel on demand). */
  extractTranscript(): string
  /**
   * Return platform-reported usage % (0–100) if available from DOM.
   * Return null if not available or selector fails.
   */
  getPlatformUsagePct(): number | null
}
