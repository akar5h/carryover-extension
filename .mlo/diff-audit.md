# Diff Audit — XER-161

## Summary

Two new files added under `src/compression/`: the prompt-builder module and its unit tests. No existing files modified. Adds `buildCompressionPrompt` (takes `NormalizedTranscript`, returns string prompt) and `estimateCompressedTokens` (token range estimator).

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| `src/compression/prompt-builder.ts` | added | XER-161 P3-1 spec: compression prompt builder | low |
| `src/compression/__tests__/prompt-builder.test.ts` | added | Unit tests for AC1–6 | low |

## Behavior changed

- User-facing behavior: none — library module, not wired into UI yet
- API behavior: none — new module export only
- DB/schema behavior: none
- Background job behavior: none
- Config/env behavior: none
- Auth/security behavior: none
- Frontend behavior: none

## Blast radius

- Modules touched: `src/compression/` (new directory)
- External services touched: none
- Data models touched: none — reads `NormalizedTranscript`, no mutation
- Auth/payment/user-data touched: none
- Build/deploy config touched: none

## Suspicious areas

None. Clean additive change. No deleted validation, no broad refactor.

## Human inspection required

None required. Change is isolated to a new module with no integration points yet.
