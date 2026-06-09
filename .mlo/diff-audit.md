# Diff Audit — XER-162

## Change summary

Enable "Compress & Carry Over" button in badge panel; add pre-compression stats rows.

## Files changed

| File | Lines +/- | Risk |
|---|---|---|
| `src/content/badge/badge-panel.ts` | +42 -4 | LOW |
| `src/content/badge/badge-updater.ts` | +2 -1 | LOW |
| `src/content/badge/badge.ts` | +4 -1 | LOW |
| `package.json` | +1 -1 | LOW |
| `package-lock.json` | +390 -76 | LOW (dep upgrade) |

## Diff risk: LOW

## What changed

### `badge-panel.ts`
- Imports `estimateCompressedTokens` from `../../compression/prompt-builder` (XER-161)
- Adds `messageCount: number` to `PanelStats` interface
- Adds "If compressed:" and "Est. reduction:" rows between existing stats and button
- Adds `divider3` between new stats rows and button
- Removes `btn.title = 'Coming in next update'`
- `open()` computes `estimateCompressedTokens(estimatedTokens)` and updates rows
- Button enabled/disabled and styled inline based on `stats.messageCount > 0`
- `reductionPct` uses low-end estimate (conservative, per spec)
- Division-by-zero guarded: only computes if `estimatedTokens > 0`

### `badge-updater.ts`
- Reads `transcript.messages.length` into `messageCount`
- Passes `messageCount` to `panel.open()`

### `badge.ts`
- Adds CSS `transition` to `.co-btn-compress` base style
- Adds `.co-btn-compress:not([disabled]):hover` rule for hover feedback

### `package.json` + `package-lock.json`
- `overrides.rollup`: `^2.80.0` → `^4.20.0`
- Rationale: vite 5 requires rollup 4; prior override caused ERR_PACKAGE_PATH_NOT_EXPORTED (missing `./parseAst`). GHSA-mw96-cpmx-2vgc is fixed in 2.80.0+ AND 4.x — security requirement maintained.

## Behavior changed

- Badge panel: adds 2 new stat rows and a divider
- Badge panel: button enabled when messageCount > 0
- Build: now works with rollup 4.61.1

## Human inspection required

None. No auth, payment, DB, config, or user-data changes.
