# Diff Audit

## Summary

XER-190: Added `continue-fresh-handler.ts` — the "Continue Fresh" flow handler for the
CarryOver browser extension badge. Validates checkpoint, builds bootstrap prompt via
existing `buildBootstrapPrompt`, opens new chat tab via `adapter.openNewChatWithText`.
Also added 5 unit tests. No existing files modified.

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| `src/content/badge/continue-fresh-handler.ts` | added | Implements `onContinueFreshClick` per XER-190 spec | low |
| `src/content/badge/__tests__/continue-fresh-handler.test.ts` | added | Unit tests: empty checkpoint guard, valid path, error handling | low |

## Behavior changed

- User-facing behavior: `onContinueFreshClick` now available — opens new chat tab with bootstrap prompt built from checkpoint text
- API behavior: none
- DB/schema behavior: none
- Background job behavior: none
- Config/env behavior: none
- Auth/security behavior: none
- Frontend behavior: extension badge gains a concrete handler for the Continue Fresh button wired in XER-189

## Blast radius

- Modules touched: `src/content/badge/` (new files only), read-only imports from `src/compression/prompt-builder` and `src/adapters/types`
- External services touched: none (browser tab API via existing `adapter.openNewChatWithText`)
- Data models touched: none
- Auth/payment/user-data touched: none
- Build/deploy config touched: none

## Suspicious areas

None. Change is additive only — two new files, no existing code paths modified, no validation deleted.

## Human inspection required

None required. Isolated new files, no auth/data/config impact.
