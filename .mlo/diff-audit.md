# Diff Audit

## Summary

XER-153: Add click-to-expand panel to the floating badge. Clicking the badge toggles a panel showing Est. tokens, Context load %, and (on Claude only) Platform usage %. Panel has a disabled "Compress & Carry Over" button. Outside-click closes the panel. All DOM construction uses `createElement` — no `innerHTML`. Stats fetched fresh from adapter on every open.

## Files changed

| File | Change type | Reason | Risk |
|---|---|---|---|
| src/content/badge/badge-panel.ts | added | New panel component — createElement only, stats display, disabled CTA button | low |
| src/content/badge/badge-updater.ts | modified | Wire badge click → panel toggle; outside-click to close; destructure badgeEl | low |
| src/content/badge/badge.ts | modified | Expose badgeEl in BadgeRefs (additive); inject panel CSS into carryover-styles | low |

## Behavior changed

- User-facing behavior: clicking badge opens/closes panel with context stats; clicking outside badge+panel closes panel
- API behavior: none
- DB/schema behavior: none
- Background job behavior: one `document.addEventListener('click')` listener added per page load
- Config/env behavior: none
- Auth/security behavior: none
- Frontend behavior: panel injected via createElement into document.body; styles added to existing carryover-styles tag

## Blast radius

- Modules touched: src/content/badge/ (3 files — all badge-scoped)
- External services touched: none
- Data models touched: BadgeRefs interface (additive — badgeEl field added)
- Auth/payment/user-data touched: none
- Build/deploy config touched: none

## Suspicious areas

None. Diff is minimal, focused, and additive. No deleted tests, no deleted validation, no config changes.

## Human inspection required

None required. Change is isolated to the badge module with no auth, data, or config surface.
