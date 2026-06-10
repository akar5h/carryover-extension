# Security & Edge Case Review

## Verdict

PASS

## Security findings

| Severity | File | Finding | Risk | Required fix |
|---|---|---|---|---|
| — | — | None | — | — |

`navigator.clipboard.writeText()` called with textarea value — standard browser API, user-initiated click only. No injection surface; value is written to clipboard, not injected into DOM or external services.

## Edge-case findings

| Severity | File | Edge case | Failure mode | Required fix |
|---|---|---|---|---|
| info | badge-panel.ts | Clipboard API unavailable (non-HTTPS / old browser) | `navigator.clipboard.writeText()` rejects; `.then()` never fires | Acceptable — silent failure; button doesn't flash "Copied!" but no crash |
| info | badge-panel.ts | `btnCopy.textContent` is null when timeout fires | `orig` captured before async, so `orig` could be "Copied!" if clicked twice rapidly | Cosmetically harmless; no data loss |

## Human review required

None.

## Auto-blocking issues

None.

## Suggested tests

All acceptance-criteria cases covered. Optional:
- Clipboard API rejection path (requires mocking `navigator.clipboard.writeText` to reject)
