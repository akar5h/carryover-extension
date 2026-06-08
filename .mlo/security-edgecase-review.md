# Security & Edge Case Review

## Verdict

PASS_WITH_WARNINGS

## Security findings

| Severity | File | Finding | Risk | Required fix |
|---|---|---|---|---|
| info | badge-panel.ts | `textContent` used throughout — no innerHTML | confirms no XSS surface | none |
| info | badge-updater.ts | `e.stopPropagation()` on badge click | prevents panel close from firing immediately on same click cycle | none — correct behavior |

## Edge-case findings

| Severity | File | Edge case | Failure mode | Required fix |
|---|---|---|---|---|
| info | badge-updater.ts | adapter throws on badge click | `catch {}` → panel.open with zeros | none — silent failure per spec |
| info | badge-updater.ts | document `click` listener added each time badge is interacted | only added once at `startBadgeUpdater` call time | none — single listener |
| info | badge-panel.ts | `platformUsagePct` is null but `showPlatformUsage` is true | renders '-' in platform row | acceptable; '-' is valid display |
| info | badge-panel.ts | `contextLoadPct` > 100 (transcript exceeds 100k tokens) | `Math.round()` renders ">100%"; ring clamped to 1.0 | acceptable; display is informational |
| warning | badge-updater.ts | panel injected into document.body; badge also in document.body | panel position depends on `bottom: 74px` CSS — may overlap on very short viewports | not blocking for extension use case |
| warning | badge-panel.ts | no guard if createBadgePanel called multiple times | panel element would be orphaned | mitigated: called once from startBadgeUpdater |

## Human review required

None. No auth, payment, user data, or network surfaces.

## Auto-blocking issues

None.

## Suggested tests

- Unit test: `createBadgePanel(true).open({estimatedTokens: 12400, contextLoadPct: 12, platformUsagePct: 18})` → check textContent values
- Unit test: `createBadgePanel(false)` → platform row `display: none`
- Unit test: badge click triggers panel open; second click triggers close
- Unit test: document click (outside) triggers close when panel is open
