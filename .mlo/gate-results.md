# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| typecheck | PASS | npm run typecheck (tsc --noEmit) | 0 errors |
| build | PASS | npm run build (vite build) | 12 modules, 7.13 kB bundle, 0 warnings |
| gitleaks | PASS | gitleaks detect --source . --no-git | no leaks found, 45 KB scanned |
| semgrep | PASS | semgrep --config=p/default src/content/badge/ | 210 rules, 0 findings across 3 files |
| osv-scanner | WARN | osv-scanner --recursive . | 2 Medium vulns (esbuild 0.21.5, vite 5.4.21) — dev tools only, not runtime |

## Blocking failures

None.

## Non-blocking warnings

- esbuild GHSA-67mh-4wv8-2f99 (CVSS 5.3 Medium) — dev dependency, not bundled into extension
- vite GHSA-4w7w-66w2-5vf9 (CVSS 6.3 Medium) — dev dependency, build tool only
- Both pre-exist from XER-152; no new vulnerabilities introduced by this change

## Raw logs

- `.mlo/command-output/gitleaks.txt`
- `.mlo/command-output/semgrep.txt`
- `.mlo/command-output/osv.txt`
- `.mlo/command-output/typescript-checks.txt`
