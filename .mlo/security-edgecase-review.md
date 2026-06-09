# Security & Edge Case Review

## Verdict: PASS_WITH_WARNINGS

## Security findings

| Severity | File | Finding | Risk | Required fix |
|---|---|---|---|---|
| INFO | `compress-handler.ts` | `adapter.openNewChatWithText!` — non-null assertion | Both adapters define this method. If a future adapter omits it, the `!` causes a runtime crash. Not a security issue — no user-controlled input reaches this path unsanitized. | None (V1 accepted) |
| INFO | `compress-handler.ts` | Compression prompt contains full conversation text from `buildCompressionPrompt` | Text goes to the platform's own composer via `chrome.storage.session`. No third-party service; no PII exfiltration beyond what the platform already has. | None |

## Edge-case findings

| Severity | File | Edge case | Failure mode | Required fix |
|---|---|---|---|---|
| WARNING | `compress-handler.ts` | `openNewChatWithText` called but popup blocked by browser | `window.open` returns null silently; user sees "Press Enter..." instruction but no tab opened | Acceptable V1 — pre-existing behaviour from XER-163/164 |
| WARNING | `compress-handler.ts` | Very large transcript | `buildCompressionPrompt` joins all messages; no truncation. Could produce a very long prompt (e.g. 200k token conversation). Inserted into composer which may have a character limit. | Platform composer handles gracefully via truncation or scroll; V1 accepted |
| INFO | `compress-handler.ts` | Double-click on compress button | `compressHandler` is not guarded against concurrent calls. Button is disabled on `setCompressState('loading')` so double-fire is visually impossible. | None — state machine prevents it |
| INFO | `compress-handler.ts` | `fetchConversation` throws a non-Error (string, object) | Caught; `'Unknown error'` shown to user. Correct fallback. | None |
| INFO | `badge-panel.ts` | `setCompressState('idle')` re-enables button regardless of `messageCount` | On load-then-error, button returns enabled even if original stats had messageCount=0. Benign because no messages → pipeline would show "no conversation found" anyway. | None |

## Human review required

None — no auth, payment, user-data, DB schema, CORS, or rate-limiting changes.

## Auto-blocking issues

None.

## Suggested tests

- (Optional) Test the case where `adapter.openNewChatWithText` is undefined — verifies runtime behavior when an adapter omits it.
