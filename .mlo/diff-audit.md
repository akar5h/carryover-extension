# Diff Audit

## Summary

XER-194: Add `"storage"` to `manifest.json` permissions array. Fixes `chrome.storage undefined` crash on both Claude and ChatGPT. 1 insertion, 1 deletion, 1 file.

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| `manifest.json` | modified | Add `"storage"` permission so Chrome exposes `chrome.storage.session` | low |

## Behavior changed

- **User-facing behavior:** Extension no longer crashes on load; `chrome.storage.session` calls in adapters and content scripts now work
- **API behavior:** none
- **DB/schema behavior:** none
- **Background job behavior:** none
- **Config/env behavior:** manifest permissions updated — Chrome will prompt user to re-accept on extension update
- **Auth/security behavior:** `"storage"` grants `chrome.storage` access within the extension context only. No external data access.
- **Frontend behavior:** crash eliminated on both Claude and ChatGPT

## Blast radius

- **Modules touched:** `manifest.json` only
- **External services touched:** none
- **Data models touched:** none
- **Auth/payment/user-data touched:** none
- **Build/deploy config touched:** `dist/manifest.json` regenerated (1.59 kB → 1.61 kB)

## Suspicious areas

None. Single permission addition, no code changes.

## Human inspection required

None required. Minimal change, well-understood Chrome API permission.
