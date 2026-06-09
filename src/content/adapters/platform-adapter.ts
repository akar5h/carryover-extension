export interface PlatformAdapter {
  /** Extract full visible conversation as plain text */
  extractTranscript(): string
  /**
   * Return platform-reported usage % (0–100) if available from DOM.
   * Return null if not available or selector fails.
   */
  getPlatformUsagePct(): number | null
}
