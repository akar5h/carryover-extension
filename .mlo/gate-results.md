# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| gitleaks | ✅ PASS | `gitleaks detect --source . --no-git` | No secrets detected (139.76 KB scanned) |
| semgrep | ✅ PASS | `semgrep --config=p/default .` | 0 findings, 227 rules on 52 files |
| osv-scanner | ✅ PASS (warnings) | `osv-scanner --recursive .` | 2 Medium dev-dep vulns — pre-existing, not introduced here |
| tsc typecheck | ✅ PASS | `npx tsc --noEmit` | 0 errors |
| npm test (full) | ✅ PASS | `npm test` | 6 files, 53 tests all pass |
| npm run build | ✅ PASS | `npm run build` | 18 modules, dist/manifest.json includes "storage", built cleanly |

## Blocking failures

None.

## Non-blocking warnings

- `esbuild 0.21.5` GHSA-67mh-4wv8-2f99 (CVSS 5.3 Medium) — pre-existing dev dep, not introduced by this change
- `vite 5.4.21` GHSA-4w7w-66w2-5vf9 (CVSS 6.3 Medium) — pre-existing dev dep, not introduced by this change

## Raw logs

See `.mlo/command-output/gitleaks.txt`, `.mlo/command-output/semgrep.txt`, `.mlo/command-output/osv.txt`, `.mlo/command-output/tests.txt`, `.mlo/command-output/build.txt`, `.mlo/command-output/typescript-checks.txt`
