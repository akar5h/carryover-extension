# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| gitleaks | PASS | `gitleaks detect --source . --no-git` | no leaks found |
| semgrep | PASS | `semgrep --config=p/default .` | no HIGH/CRITICAL findings |
| osv-scanner | PASS (warnings) | `osv-scanner --recursive .` | 2 Medium dev-only vulns |
| npm test | PASS | `npm test` | 45/45 pass |
| npm build | PASS | `npm run build` | clean build |
| typecheck | PASS (implicit via build) | tsc via vite | no type errors |

## Blocking failures

None.

## Non-blocking warnings

- GHSA-67mh-4wv8-2f99: esbuild 0.21.5 (dev) CVSS 5.3 Medium — fixed in 0.25.0
- GHSA-4w7w-66w2-5vf9: vite 5.4.21 (dev) CVSS 6.3 Medium — fixed in 6.4.2

Both are dev-only build tools with no runtime exposure in the shipped extension bundle.

## Raw logs

Captured inline from gate runner session.
