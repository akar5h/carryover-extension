# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| typecheck | PASS | npx tsc --noEmit | 0 errors across all 7 changed files |
| build | PASS | npm run build (vite build) | 14 modules transformed, 15.13 kB content bundle, built in 381ms |
| gitleaks | PASS | gitleaks detect --source . --no-git | no leaks found, 80.87 KB scanned |
| semgrep | PASS | semgrep --config=p/default src/ | 224 rules on 19 files, 0 findings (0 blocking) |
| osv-scanner | WARN | osv-scanner --recursive . | 2 Medium vulns — dev tools only, not runtime; pre-existing |

## Blocking failures

None.

## Non-blocking warnings

- esbuild GHSA-67mh-4wv8-2f99 (CVSS 5.3 Medium) — dev dependency only, not bundled into extension
- vite GHSA-4w7w-66w2-5vf9 (CVSS 6.3 Medium) — dev dependency, build tool only
- Both pre-exist on feat/p2-5-badge-panel before this change; no new vulnerabilities introduced

## Raw logs

- `.mlo/command-output/gitleaks.txt`
- `.mlo/command-output/semgrep.txt`
- `.mlo/command-output/osv.txt`
- `.mlo/command-output/typescript-checks.txt`
