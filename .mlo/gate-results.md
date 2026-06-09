# Gate Results — XER-161

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| typecheck | PASS | `npm run typecheck` (tsc --noEmit) | 0 errors |
| tests | PASS | `npx vitest run` | 27/27 tests pass (4 test files incl. 8 new) |
| build | PASS | `npm run build` | vite build succeeds, 15 modules |
| gitleaks | PASS | `gitleaks detect --source . --no-git` | no leaks found, 110KB scanned |
| semgrep | PASS | `semgrep --config=p/default src/compression/` | 0 findings, 210 rules on 2 new files |
| osv-scanner | WARN | `osv-scanner --recursive .` | 2 medium vulns (pre-existing, dev-only) |

## Blocking failures

None.

## Non-blocking warnings

- `esbuild@0.21.5` — GHSA-67mh-4wv8-2f99 — CVSS 5.3 (Medium) — dev dependency, pre-existing from XER-160
- `vite@5.4.21` — GHSA-4w7w-66w2-5vf9 — CVSS 6.3 (Medium) — dev dependency, pre-existing from XER-160

Both vulns existed before this PR and affect dev tooling only. Neither is High/Critical. No exception required per policy.

## Raw logs

Semgrep: 0 findings on 2 files. Gitleaks: no leaks in 110KB scan.
