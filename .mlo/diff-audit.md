# Diff Audit

## Change summary

**Branch:** `feat/p3-5-compress-wire`
**Issue:** XER-165
**Commits:** 52783be
**Files changed:** 4 (+199 / -0)

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| `src/content/badge/badge-panel.ts` | modified | Extend `BadgePanel` interface + impl: `showMessage`, `clearMessage`, `setCompressState`, `onCompress`; add `msgEl` DOM node and `btn` click listener | low |
| `src/content/badge/compress-handler.ts` | added | New module: `onCompressClick` — testable pipeline handler (fetch → build prompt → open tab) | low |
| `src/content/badge/badge-updater.ts` | modified | Import compress-handler; wire `panel.onCompress(() => onCompressClick(...))` | low |
| `src/content/badge/__tests__/compress-handler.test.ts` | added | 8 unit tests covering success, error, no-convId, loading state sequencing | low |

## Behavior changed

- **User-facing behavior:** Clicking "Compress & Carry Over" now runs the full pipeline (was: button existed but had no handler bound). Button shows "Opening…" while async work runs; shows instruction message on success; shows error message on failure.
- **API behavior:** None — no API contracts changed.
- **DB/schema behavior:** None.
- **Background job behavior:** None.
- **Config/env behavior:** None.
- **Auth/security behavior:** None — tab open uses pre-existing `openNewChatWithText` (chrome.storage.session + window.open, implemented in XER-163/164).
- **Frontend behavior:** Badge panel gains a `co-panel-msg` div (hidden by default) and reactive button text.

## Blast radius

- **Modules touched:** badge-panel, badge-updater, compress-handler (new)
- **External services touched:** None — `openNewChatWithText` already implemented in prior phases
- **Data models touched:** None
- **Auth/payment/user-data touched:** None
- **Build/deploy config touched:** None

## Suspicious areas

None:
- No unrelated files changed
- Diff strictly additive (199 lines, 0 deletions)
- No validation deleted
- No tests deleted — 8 new tests added
- Error handling is intentional: catch block covers async pipeline, surfaces user-friendly message
- No env changes, no auth changes, no permissions changes

## Human inspection required

None — no auth, payment, user-data, schema, or CORS changes.
