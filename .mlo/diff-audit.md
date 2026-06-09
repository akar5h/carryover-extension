# Diff Audit

## Summary

XER-160: Full adapter redesign — replaces DOM-based transcript extraction with platform-internal API calls. Claude adapter uses direct credentialed fetch to `/api/organizations/.../chat_conversations?tree=True`. ChatGPT adapter uses a MAIN world fetch interceptor to capture ChatGPT's own API calls (which include anti-bot tokens not replicable by content scripts). Adds IndexedDB transcript cache, SPA navigator, 19 unit tests, and platform-specific context window denominators (200k Claude / 128k ChatGPT).

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| src/adapters/types.ts | added | PlatformAdapter, NormalizedTranscript, NormalizedMessage, AdapterError, PlatformUsage type definitions | low |
| src/adapters/transcript-cache.ts | added | IndexedDB cache keyed platform:conversationId | low |
| src/adapters/claude-adapter.ts | added | Claude internal API extraction via /api/organizations/{org}/chat_conversations/{conv}?tree=True | medium |
| src/adapters/chatgpt-adapter.ts | added | ChatGPT event-driven adapter — listens for carryover:chatgpt-conversation CustomEvent | medium |
| src/adapters/__tests__/claude-adapter.test.ts | added | 7 unit tests for normalizeConversation (linear, branched, fallback, dedup, empty, content blocks, parentId) | low |
| src/adapters/__tests__/chatgpt-adapter.test.ts | added | 8 unit tests for normalizeConversation (linear, current_node, fallback, dedup, empty, null nodes, timestamps, multi-part) | low |
| src/adapters/__tests__/transcript-cache.test.ts | added | 4 unit tests for IndexedDB cache (get/set/delete, key isolation) | low |
| src/content/chatgpt-interceptor.ts | added | MAIN world fetch interceptor — patches window.fetch to capture ChatGPT API responses | medium |
| src/content/spa-navigator.ts | added | SPA URL change detection via history.pushState/replaceState patch + popstate | low |
| src/content/badge/badge-updater.ts | modified | Refactored to async PlatformAdapter + SpaNavigator; platform-specific context window denominator | medium |
| src/content/index.ts | modified | Routes to new adapters, wires SpaNavigator | low |
| manifest.json | modified | Added MAIN world content_script for chatgpt-interceptor.ts (document_start, chatgpt.com only) | medium |
| package.json | modified | Added vitest, jsdom, @vitest/browser devDependencies; added test script | low |
| package-lock.json | modified | Updated for new devDependencies; @crxjs/vite-plugin rollup resolved to 2.80.0 (GHSA-mw96-cpmx-2vgc fix) | medium |
| vitest.config.ts | added | Vitest jsdom environment configuration | low |

## Behavior changed

- User-facing behavior: Badge token count now reflects full conversation from API (not just visible DOM). Count is accurate including messages not mounted in DOM. Ring fill uses platform-specific context window (200k Claude, 128k ChatGPT).
- API behavior: Claude extension makes credentialed fetch calls to `/api/organizations` and `/api/organizations/{org}/chat_conversations/{conv}?tree=True`. Org ID cached in chrome.storage.session.
- DB/schema behavior: IndexedDB store `carryover_transcripts` created in user's browser. Key: `{platform}:{conversationId}`. Local only, no cloud sync.
- Background job behavior: MutationObserver triggers re-fetch debounced at 2s. ChatGPT uses event-driven approach (waits for intercepted data, 12s timeout).
- Config/env behavior: No change.
- Auth/security behavior: Claude uses `credentials: 'include'` on same-origin fetches. ChatGPT: MAIN world patches `window.fetch` to capture responses from ChatGPT's own authenticated calls.
- Frontend behavior: Ring fill corrected to platform-specific context window. Panel shows full transcript estimate.

## Blast radius

- Modules touched: adapters, badge-updater, content entry, manifest
- External services touched: claude.ai (2 API endpoints), chatgpt.com (intercepted, not directly called)
- Data models touched: NormalizedTranscript, NormalizedMessage (new); IndexedDB transcript cache (new)
- Auth/payment/user-data touched: Reads user's own conversation data via session cookies. No external transmission.
- Build/deploy config touched: manifest.json — new MAIN world content_script entry

## Suspicious areas

- `window.fetch` patching in MAIN world (chatgpt-interceptor.ts) — standard extension pattern; inspect URL regex
- `credentials: 'include'` in claude-adapter.ts — safe, same-origin only; gated by isSupportedPage()
- Old DOM adapters in `src/content/adapters/` are orphaned dead code (not deleted)
- 12s timeout in ChatGPTAdapter.fetchConversation — if ChatGPT doesn't fetch the conversation within 12s, badge stays at 0

## Human inspection required

| File | Concern |
|---|---|
| src/content/chatgpt-interceptor.ts | window.fetch patch — verify URL regex captures all conversation patterns |
| src/adapters/claude-adapter.ts | credentials:include — confirm only executes on claude.ai via isSupportedPage() + manifest |
| manifest.json | MAIN world content_script world/run_at — verify crxjs MV3 build output is standalone IIFE |
