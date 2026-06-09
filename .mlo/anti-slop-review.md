# Anti-Slop Review

## Verdict

PASS_WITH_WARNINGS

## Summary

XER-160 implementation is spec-compliant and functionally coherent. Core logic (API fetch, branch tree walk, IndexedDB cache, SPA nav, badge wiring) is purposeful and dense. Two warnings: org selection logic uses two speculative field names (`active_flags`, `capabilities`) that may not match actual API shape; and old DOM adapters in `src/content/adapters/` are now orphaned but not deleted.

## Slop findings

| Severity | File | Finding | Why it matters | Required fix |
|---|---|---|---|---|
| warning | claude-adapter.ts | `active_flags` and `capabilities` in org selection — field names not verified from live API | If Claude API doesn't return these fields, all orgs fail the predicate and fall through to `orgList[0]` — which is the correct final fallback, but the predicates add noise | None blocking — fallback is safe; verify field names from DevTools before production |
| warning | src/content/adapters/ | Old DOM adapters (claude-adapter.ts, chatgpt-adapter.ts, platform-adapter.ts) are dead code — not imported anywhere | Orphaned code creates confusion about which adapters are active | Non-blocking; should be deleted or moved to `fallback/` in a follow-up |
| info | badge-updater.ts | 200_000 denominator for inner ring changed from 100_000 | Doubles the "full context" assumption — intentional but undocumented | None |

## Bloat check

- unnecessary abstraction: none — TranscriptCache is a minimal IndexedDB wrapper; no over-engineering
- fake fallback: `catch {}` blocks in cache and org storage are correct — storage failures must not break fetch flow
- broad try/catch: badge-updater fetchAndUpdate and badge click handlers catch all errors — correct for extension content scripts that must never surface to page
- duplicate logic: `makeError` helper defined identically in both adapters — minor DRY miss, non-blocking
- dead code: old `src/content/adapters/` directory orphaned but not removed
- unrelated refactor: badge-updater.ts inner ring denominator changed 100k→200k — minor scope creep, acceptable
- speculative extensibility: `insertTextIntoComposer?` and `openNewChatWithText?` in PlatformAdapter interface — spec-required, not invented

## Success path clarity

YES

Page load → `isSupportedPage()` true → `SpaNavigator.start()` → `startBadgeUpdater(adapter, navigator)` → `fetchAndUpdate()` → `adapter.fetchConversation(convId)` → `normalizeConversation(raw)` → `estimateTokens(transcript)` → ring fill update. Clear and linear.

## Required cleanup

None blocking.

## Non-blocking suggestions

- Delete `src/content/adapters/` (old DOM adapters) or move to `src/adapters/dom-fallback/` — they're dead code now
- Extract `makeError` into a shared utility to remove duplication between claude-adapter and chatgpt-adapter
- Verify `active_flags` and `capabilities` field names against a live `/api/organizations` response
