# Security & Edge Case Review

## Verdict

PASS_WITH_WARNINGS

## Security findings

| Severity | File | Finding | Risk | Required fix |
|---|---|---|---|---|
| warning | src/content/chatgpt-interceptor.ts | `window.fetch` patched in MAIN world | Any page code checking `fetch === originalFetch` may detect the patch; extension intercepts ALL fetch calls on chatgpt.com | None — standard extension pattern; matches XER-159 precedent |
| warning | src/adapters/claude-adapter.ts | `credentials: 'include'` on fetch to Claude internal APIs | Sends session cookies; safe because fetch only executes when hostname === 'claude.ai' (isSupportedPage() + manifest match pattern) | None — confirmed hostname guard |
| info | src/content/chatgpt-interceptor.ts | Reads response body via `res.clone().json()` | Reads conversation data already visible in the page's network layer; no exfiltration | None — extension reads its own page traffic |
| info | src/adapters/claude-adapter.ts | Org ID stored in chrome.storage.session | Cleared on browser session end; not persisted to disk | None — acceptable for session-scoped cache |
| info | all | No innerHTML, eval, or dynamic script injection in new code | No XSS surface | None |

## Edge-case findings

| Severity | File | Edge case | Failure mode | Required fix |
|---|---|---|---|---|
| warning | src/adapters/chatgpt-adapter.ts | 12s timeout if ChatGPT doesn't fetch conversation in 12s | fetchConversation() rejects; badge stays at 0 tokens | Non-blocking — correct behavior; MutationObserver may retry |
| warning | src/adapters/chatgpt-adapter.ts | SPA navigation: ChatGPT may not re-fetch conversation API on in-app navigation (uses cached React state) | interceptor never fires for the new conversation; fetchConversation times out | Non-blocking — known limitation of intercept-only approach |
| warning | src/adapters/claude-adapter.ts | getOrganizationId concurrent calls (two rapid fetchConversation calls before first resolves) | Both fetch /api/organizations; second overwrites cachedOrgId with same value | Harmless — same result both times |
| warning | src/content/chatgpt-interceptor.ts | URL regex `/\/backend-api\/conversation\/([a-zA-Z0-9_-]+)(?:[?#]|$)/` may miss future ChatGPT API URL changes | Interceptor silently does nothing; badge stays at 0 | Non-blocking — correct failure mode |
| info | src/adapters/transcript-cache.ts | IndexedDB unavailable (private browsing without extension permission) | get/set catch and return null/void silently | Correct — cache failure is non-fatal |
| info | src/adapters/chatgpt-adapter.ts | constructor registers document.addEventListener on every instantiation | If multiple instances created, multiple listeners accumulate | Architectural note — startBadgeUpdater creates one adapter per page; acceptable |
| info | src/content/spa-navigator.ts | history.pushState monkey-patch | Could affect platform code checking pushState identity | Standard pattern; no security risk |
| info | src/adapters/claude-adapter.ts | Leaf walk cycle guard (seen Set) | Prevents infinite loop on pathological tree | Correct |

## Human review required

| File | Reason |
|---|---|
| src/content/chatgpt-interceptor.ts | window.fetch patch — verify URL regex captures all ChatGPT conversation patterns (including project conversations, GPT builder, etc.) |
| manifest.json | `world: "MAIN"` + `run_at: "document_start"` — confirm crxjs MV3 build produces standalone IIFE with no chrome.* calls |
| src/adapters/claude-adapter.ts | credentials:include — verify isSupportedPage() + manifest match patterns leave no cross-origin gaps |

## Auto-blocking issues

None.

## Suggested tests

- Integration test: load extension → open Claude conversation → verify NormalizedTranscript has messages beyond DOM scroll viewport
- Integration test: ChatGPT SPA navigation — open conversation A, navigate to conversation B → verify cachedTranscript resets and badge updates for B
- Integration test: Claude conversation with branched messages → verify only active branch messages appear, no duplicates
- Timeout test: ChatGPT with a page that never fetches conversation API → verify badge shows 0 cleanly after 12s
