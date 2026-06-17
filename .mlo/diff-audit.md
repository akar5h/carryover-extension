# Diff Audit

## Summary

Phase 4 of CarryOver extension: implements "Continue Fresh" and "Copy Checkpoint" post-compression actions. Fixes background message protocol to return structured CompressResponse with accurate token counts. Makes compression testable via injectable Compressor parameter.

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| src/background-messages.ts | added | Typed message protocol for COMPRESS request/response | low |
| src/background.ts | modified | Return full CompressResponse with token counts; use CompressRequest type | low |
| src/content/badge/compress-handler.ts | modified | Injectable compressor param; use buildBootstrapText; call panel.showDone() | low |
| src/content/badge/__tests__/compress-handler.test.ts | modified | Rewrite to test button-based showDone flow; add showDone to panel mock | low |

## Behavior changed

- User-facing behavior: post-compression panel shows original/compressed token counts and reduction %, with Copy Checkpoint and Continue Fresh buttons
- API behavior: background returns { ok, checkpoint, originalTokens, compressedTokens, reductionPct } using OpenAI usage field for accurate token counts
- DB/schema behavior: none
- Background job behavior: background.ts now handles typed CompressRequest; returns CompressResponse union
- Config/env behavior: none
- Auth/security behavior: none
- Frontend behavior: compress-handler.ts calls panel.showDone() with callbacks; Continue Fresh uses buildBootstrapText

## Blast radius

- Modules touched: background.ts, compress-handler.ts, background-messages.ts (new)
- External services touched: OpenAI API (same endpoint, same key storage — no change)
- Data models touched: CompressResponse shape changed (ok flag + token fields added)
- Auth/payment/user-data touched: no
- Build/deploy config touched: no

## Suspicious areas

None. Diff is focused and coherent. No validation deleted, no permissions changed, no error handling weakened.

## Human inspection required

None.
