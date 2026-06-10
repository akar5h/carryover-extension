# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| Build | ✅ PASS | `npm run build` | 19 modules (new: `background.ts-7D7dniqv.js`), 0 errors |
| Tests | ✅ PASS | `npm test` | 53/53 passed, 6 test files |
| Typecheck | ✅ PASS | `npm run typecheck` (`tsc --noEmit`) | 0 errors |
| Secrets (gitleaks) | ✅ PASS | `gitleaks detect --source . --no-git` | No leaks (139 KB scanned) |
| Static analysis (semgrep) | ✅ PASS | `semgrep --config=p/default .` | 0 findings, 227 rules on 53 files |
| Dependencies (osv-scanner) | ✅ PASS (warn) | `osv-scanner --recursive .` | 2 Medium in dev deps — pre-existing, not introduced here |

## Blocking failures

None.

## Non-blocking warnings

- `esbuild@0.21.5` GHSA-67mh-4wv8-2f99, CVSS 5.3 (Medium) — pre-existing dev-only build tool
- `vite@5.4.21` GHSA-4w7w-66w2-5vf9, CVSS 6.3 (Medium) — pre-existing dev-only build tool

Neither is Critical or High; both are dev-only (not shipped in extension).

## Raw logs

- `.mlo/command-output/gitleaks.txt`
- `.mlo/command-output/semgrep.txt`
- `.mlo/command-output/osv.txt`
