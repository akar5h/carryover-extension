# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| gitleaks | ✅ PASS | `gitleaks detect --source . --no-git` | 0 secrets; scanned 126 KB |
| semgrep | ✅ PASS | `semgrep --config=p/default .` | 0 findings; 227 rules on 47 files |
| osv-scanner | ⚠️ WARN | `osv-scanner --recursive .` | 2 Medium dev-dep vulns (pre-existing, not introduced by this change) |
| tsc typecheck | ✅ PASS | `npm run typecheck` | 0 errors |
| vitest | ✅ PASS | `npm test` | 43/43 pass (8 new compress-handler tests) |
| vite build | ✅ PASS | `npm run build` | 150ms, clean, 9 output chunks |

## Blocking failures

None.

## Non-blocking warnings

- **GHSA-67mh-4wv8-2f99**: esbuild 0.21.5 (dev), CVSS 5.3 — pre-existing, fix: ≥0.25.0
- **GHSA-4w7w-66w2-5vf9**: vite 5.4.21 (dev), CVSS 6.3 — pre-existing, fix: ≥6.4.2

Both are build-tool dev dependencies. Not shipped in the extension bundle. Not introduced by this change.
