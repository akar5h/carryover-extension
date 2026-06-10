# Diff Audit

## Summary

Added `buildBootstrapPrompt(checkpoint: string): string` to `src/compression/prompt-builder.ts` with 5 unit tests. Fixed pre-existing vitest forks-pool timeout by switching to `pool: 'threads'` in `vitest.config.ts`.

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| src/compression/prompt-builder.ts | modified | Add `buildBootstrapPrompt` export (XER-188 requirement) | low |
| src/compression/__tests__/prompt-builder.test.ts | modified | Add 5 unit tests for `buildBootstrapPrompt` | low |
| vitest.config.ts | modified | Fix pre-existing forks-pool timeout: `pool: 'threads'` | low |

## Behavior changed

- User-facing behavior: none (library function, no UI)
- API behavior: new export `buildBootstrapPrompt` added to compression module
- DB/schema behavior: none
- Background job behavior: none
- Config/env behavior: vitest config changed to use threads pool (fixes pre-existing test infra issue)
- Auth/security behavior: none
- Frontend behavior: none

## Blast radius

- Modules touched: `src/compression/prompt-builder.ts` only
- External services touched: none
- Data models touched: none
- Auth/payment/user-data touched: none
- Build/deploy config touched: vitest.config.ts (test infra only)

## Suspicious areas

None. Minimal targeted change:
- Single new exported function, ~12 lines
- Tests alongside implementation
- vitest config fix is mechanical and pre-existing

## Human inspection required

None required. Change is additive only, no existing behavior modified.
