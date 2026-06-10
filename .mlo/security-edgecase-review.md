# Security & Edge Case Review

## Verdict

PASS

## Security findings

| Severity | File | Finding | Risk | Required fix |
|---|---|---|---|---|
| — | — | None | — | — |

No user input is injected into DOM, SQL, shell, or external service. Checkpoint text is passed to `buildBootstrapPrompt` (string concatenation into a prompt template) and then to `adapter.openNewChatWithText` (browser extension API). No injection surface in this chain.

## Edge-case findings

| Severity | File | Edge case | Failure mode | Required fix |
|---|---|---|---|---|
| info | continue-fresh-handler.ts | Very large checkpoint (e.g. multi-MB paste) | `buildBootstrapPrompt` concatenates into a large string; `openNewChatWithText` may silently truncate in some browser contexts | Acceptable — not a security issue; UX problem handled by downstream adapter |
| info | continue-fresh-handler.ts | `adapter.openNewChatWithText` is undefined (adapter that doesn't support it) | Non-null assertion `!` will throw TypeError | Acceptable — the `!` matches usage in compress-handler; adapters without this method don't expose the UI button |

## Human review required

None.

## Auto-blocking issues

None.

## Suggested tests

Acceptance-criteria cases fully covered. Optional additions:
- `openNewChatWithText` is `undefined` on adapter → TypeError surfaced via `panel.showMessage`
