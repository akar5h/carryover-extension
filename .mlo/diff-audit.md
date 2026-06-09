# Diff Audit

## Summary

XER-160: Replaces DOM-based transcript extraction with internal API calls using the user's existing browser session. Seven files added/modified: new type system, Claude adapter (organizations + chat_conversations API), ChatGPT adapter (backend-api/conversation + mapping tree walk), IndexedDB transcript cache, SPA navigator (history.pushState monkey-patch + popstate), and updated badge wiring.

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| src/adapters/types.ts | added | Shared type definitions: PlatformAdapter, NormalizedTranscript, NormalizedMessage, AdapterError, PlatformUsage | low |
| src/adapters/transcript-cache.ts | added | IndexedDB cache keyed by platform:conversationId | low |
| src/adapters/claude-adapter.ts | added | Claude internal API extraction via /api/organizations/{org}/chat_conversations/{conv}?tree=True | medium |
| src/adapters/chatgpt-adapter.ts | added | ChatGPT internal API via /backend-api/conversation/{id}, walks mapping node tree | medium |
| src/content/spa-navigator.ts | added | Detects SPA URL changes via history.pushState/replaceState patch + popstate | low |
| src/content/badge/badge-updater.ts | modified | Refactored to async PlatformAdapter; removed sync DOM extractTranscript calls; added SpaNavigator wiring | medium |
| src/content/index.ts | modified | Routes to new adapters by hostname, creates SpaNavigator, passes both to startBadgeUpdater | low |

## Behavior changed

- User-facing behavior: Badge token count now reflects full conversation (including messages not in DOM). Rings update after API fetch (async, debounced 2s). Panel shows full transcript token estimate.
- API behavior: Extension now makes credentialed fetch calls to same-origin internal APIs. Org ID cached in chrome.storage.session. Transcript cached in IndexedDB.
- DB/schema behavior: IndexedDB store `carryover_transcripts` created in user's browser. Key: `{platform}:{conversationId}`. Local only, no cloud sync.
- Background job behavior: MutationObserver triggers API re-fetch debounced at 2s (was 300ms DOM re-scan). Much lower frequency.
- Config/env behavior: No change.
- Auth/security behavior: `credentials: 'include'` on same-origin fetch calls to claude.ai and chatgpt.com respectively. Org ID cached in extension session storage.
- Frontend behavior: Badge ring animation now updated from NormalizedTranscript token estimate. Outer ring shows Claude usage % if DOM element detectable.

## Blast radius

- Modules touched: all adapter files, badge-updater, content entry
- External services touched: claude.ai (/api/organizations, /api/organizations/{org}/chat_conversations/{conv}), chatgpt.com (/backend-api/conversation/{id})
- Data models touched: NormalizedTranscript, NormalizedMessage (new); IndexedDB store (new)
- Auth/payment/user-data touched: Reads user's own conversation data via their existing session cookies. No external transmission.
- Build/deploy config touched: None

## Suspicious areas

- `credentials: 'include'` on fetch — correct for same-origin extension reads; still warrants inspection to confirm no cross-origin use.
- `history.pushState` / `replaceState` monkey-patch in SpaNavigator — standard SPA detection; could interfere with platform's own navigation if exceptions thrown.
- Old DOM adapters in `src/content/adapters/` are now orphaned dead code (not imported from anywhere). Not deleted.
- `chrome.storage.session` used for org ID cache — session storage may not be available in all content script contexts (e.g. incognito without extension permission).
- `conversationId = this.getConversationIdFromUrl() ?? 'unknown'` in ChatGPT normalizeConversation — if called outside a page context, falls back to 'unknown'.

## Human inspection required

| File | Concern |
|---|---|
| src/adapters/claude-adapter.ts | `credentials: 'include'` fetch — verify only executes when hostname === 'claude.ai' |
| src/adapters/chatgpt-adapter.ts | `credentials: 'include'` fetch — verify only executes when hostname is chatgpt.com or chat.openai.com |
| src/adapters/claude-adapter.ts | Org selection logic (`active_flags` + `capabilities`) — actual API shape may differ; fallback to first org |
| src/content/spa-navigator.ts | history.pushState monkey-patch — verify catch-free, doesn't break platform navigation |
| src/content/badge/badge-updater.ts | 200_000 token denominator for inner ring (was 100_000) — intentional change to context window assumption |
