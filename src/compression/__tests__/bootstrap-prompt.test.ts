import { describe, expect, it } from 'vitest'
import { buildBootstrapText } from '../bootstrap-prompt'

describe('buildBootstrapText', () => {
  it('restores context without asking the model to continue automatically', () => {
    const result = buildBootstrapText('## Continue From Here\nImplement the feature.')

    expect(result).toContain('Read and retain it as background context')
    expect(result).toContain('Do not continue the work')
    expect(result).toContain('at most three short sentences')
    expect(result).toContain('wait for the user\'s next instruction')
    expect(result).toContain('## Continue From Here\nImplement the feature.')
  })
})
