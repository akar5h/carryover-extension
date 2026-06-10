# Diff Audit

## Summary

XER-200: Adds `src/background.ts` (11 lines) — new MV3 service worker that calls `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` on `onInstalled` and `onStartup`. Updates `manifest.json` to register it. Fixes `Access to storage is not allowed from this context` thrown by content scripts.

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| `src/background.ts` | added | New service worker — grants content-script access to session storage per Chrome docs | low |
| `manifest.json` | modified | Registers `src/background.ts` as MV3 background service worker | low |

## Behavior changed

- User-facing behavior: content scripts no longer throw storage-context error when calling `chrome.storage.session`
- API behavior: none
- DB/schema behavior: none
- Background job behavior: new MV3 service worker registered; two event listeners call `setAccessLevel` — no data processing, no retries
- Config/env behavior: manifest gains `"background"` key with `service_worker` + `type: module`
- Auth/security behavior: Chrome session storage becomes readable/writable by content scripts (untrusted contexts) — intentional per fix spec
- Frontend behavior: none

## Blast radius

- Modules touched: `manifest.json`, `src/background.ts` (new)
- External services touched: none
- Data models touched: none
- Auth/payment/user-data touched: no
- Build/deploy config touched: manifest change affects extension packaging; crxjs picks it up automatically

## Suspicious areas

None. Change is minimal, directly prescribed by Chrome docs, and matches the spec exactly.

## Human inspection required

| File | Reason |
|---|---|
| `src/background.ts` | New execution context — new service worker in the extension |
| `manifest.json` | Background registration changes extension capability surface |
