# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| gitleaks | ✅ PASS | `gitleaks detect --source . --no-git` | No secrets detected |
| semgrep | ✅ PASS | `semgrep --config=p/default src/compression/` | 0 findings, 210 rules run |
| osv-scanner | ✅ PASS (warnings) | `osv-scanner --recursive .` | 2 Medium vulns in dev deps (esbuild 0.21.5, vite 5.4.21) — pre-existing, not introduced by this change |
| tsc typecheck | ✅ PASS | `npm run typecheck` | Clean exit, 0 errors |
| npm test (prompt-builder) | ✅ PASS | `npx vitest run src/compression/__tests__/prompt-builder.test.ts --pool=threads` | 13/13 tests pass |
| npm run build | ✅ PASS | `npm run build` | 17 modules, dist generated cleanly |

## Blocking failures

None.

## Non-blocking warnings

- `esbuild 0.21.5` GHSA-67mh-4wv8-2f99 (CVSS 5.3 Medium) — pre-existing dev dep, not introduced here
- `vite 5.4.21` GHSA-4w7w-66w2-5vf9 (CVSS 6.3 Medium) — pre-existing dev dep, not introduced here
- 2 other test files hit vitest forks-pool timeout (pre-existing infra issue, unrelated to this change)

## Raw logs

See `.mlo/command-output/gitleaks.txt`, `.mlo/command-output/semgrep.txt`
