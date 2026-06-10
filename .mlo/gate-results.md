# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| gitleaks | ✅ PASS | `gitleaks detect --source . --no-git` | No secrets detected (133.67 KB scanned) |
| semgrep | ✅ PASS | `semgrep --config=p/default .` | 0 findings, 227 rules, 47 files |
| osv-scanner | ✅ PASS (warnings) | `osv-scanner --recursive .` | 2 Medium dev-dep vulns — pre-existing |
| tsc typecheck | ✅ PASS | `npm run typecheck` | Clean after adding 4 stubs to compress-handler mock |
| npm test (badge) | ✅ PASS | `npx vitest run src/content/badge` | 8/8 tests pass |
| npm run build | ✅ PASS | `npm run build` | 17 modules, dist generated cleanly |

## Blocking failures

None.

## Non-blocking warnings

- `esbuild 0.21.5` GHSA-67mh-4wv8-2f99 (CVSS 5.3 Medium) — pre-existing dev dep
- `vite 5.4.21` GHSA-4w7w-66w2-5vf9 (CVSS 6.3 Medium) — pre-existing dev dep
- vitest concurrency fixed by `pool: 'threads'` + `maxThreads: 2` — all 48 tests now pass reliably

## Raw logs

See `.mlo/command-output/gitleaks.txt`, `.mlo/command-output/semgrep.txt`
