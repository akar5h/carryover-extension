# Gate Results — XER-162

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| typecheck | PASS | `npm run typecheck` | 0 errors |
| tests | PASS | `npm test` | 27/27 tests pass (4 files) |
| build | PASS | `npm run build` | 9 assets, 16 modules, 0 errors |
| gitleaks | PASS | `gitleaks detect --source . --no-git` | 0 leaks, 104KB scanned |
| semgrep | PASS | `semgrep --config=p/default src/content/badge/ src/compression/` | 0 findings, 210 rules, 5 files |
| osv-scanner | WARN | `osv-scanner --recursive .` | 2 medium vulns (pre-existing, dev-only) |

## Blocking failures

None.

## Non-blocking warnings

- `esbuild@0.21.5` — GHSA-67mh-4wv8-2f99 — CVSS 5.3 (Medium) — devDep, pre-existing from XER-160
- `vite@5.4.21` — GHSA-4w7w-66w2-5vf9 — CVSS 6.3 (Medium) — devDep, pre-existing from XER-160

Both existed before this PR, affect dev tooling only, no Critical/High. No exception required per policy.
