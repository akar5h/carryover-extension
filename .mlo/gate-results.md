# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| typecheck | PASS | npx tsc --noEmit | 0 errors across all new/modified files |
| build | PASS | npm run build (vite build) | 15 modules, chatgpt-interceptor.ts = separate 0.69 kB MAIN world chunk |
| tests | PASS | npm test (vitest run, jsdom) | 19/19 passed (3 test files) |
| gitleaks | PASS | gitleaks detect --source . --no-git | 0 leaks, 107 KB scanned |
| semgrep | PASS | semgrep --config=p/default src/ | 224 rules on 23 files, 0 findings |
| osv-scanner | WARN | osv-scanner --recursive . | 2 Medium pre-existing devDep vulns |

## Blocking failures

None.

## Non-blocking warnings

- esbuild GHSA-67mh-4wv8-2f99 (CVSS 5.3 Medium) — dev dependency, not bundled into extension artifact
- vite GHSA-4w7w-66w2-5vf9 (CVSS 6.3 Medium) — dev dependency, build tool only
- Both pre-exist on `feat/p2-5-badge-panel`; no new vulnerabilities introduced by this branch
- rollup GHSA-mw96-cpmx-2vgc (CVSS 8.8 HIGH) — was temporarily regressed to 2.79.2 by npm install of new devDeps; restored to 2.80.0 by clean reinstall (commit b3a7443). Final scan confirms 0 High/Critical.

## Bugs caught by tests

Two logic bugs found during test authoring:
1. `ChatGPTAdapter.findLatestLeaf` was returning root node (no parent) as "leaf" — fixed to filter on `children.length === 0`
2. `ClaudeAdapter.normalizeConversation` was passing `null` as `parentId` — fixed to coerce to `undefined`

## Raw logs

- `.mlo/command-output/gitleaks.txt`
- `.mlo/command-output/semgrep.txt`
- `.mlo/command-output/osv.txt`
- `.mlo/command-output/typescript-checks.txt`
