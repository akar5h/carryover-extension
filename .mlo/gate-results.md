# Gate Results

## Summary

PASS

## Results

| Gate | Status | Command | Notes |
|---|---|---|---|
| typecheck | PASS | npx tsc --noEmit | 0 errors |
| build | PASS | npm run build (vite build) | 14 modules transformed, 15.13 kB bundle |
| tests | PASS | npm test (vitest run) | 19/19 passed (3 test files: claude normalizer, chatgpt normalizer, cache) |
| gitleaks | PASS | gitleaks detect --source . --no-git | 0 leaks |
| semgrep | PASS | semgrep --config=p/default src/ | 224 rules, 0 findings |
| osv-scanner | WARN | osv-scanner --recursive . | 2 Medium pre-existing devDep vulns (esbuild, vite) |

## Blocking failures

None.

## Non-blocking warnings

- esbuild GHSA-67mh-4wv8-2f99 (CVSS 5.3 Medium) — dev dependency, not bundled into extension
- vite GHSA-4w7w-66w2-5vf9 (CVSS 6.3 Medium) — dev dependency, build tool only
- Both pre-exist on feat/p2-5-badge-panel; no new vulns introduced

## Bugs caught by tests

Two bugs found and fixed during test authoring:
1. `ChatGPTAdapter.findLatestLeaf` was identifying the root node (no parent) as "leaf" instead of bottom nodes (no children) — fixed by filtering on `children.length === 0`
2. `ClaudeAdapter.normalizeConversation` was passing `null` parent_message_uuid directly; fixed to coerce to `undefined` per NormalizedMessage type contract

## Raw logs

- `.mlo/command-output/gitleaks.txt`
- `.mlo/command-output/semgrep.txt`
- `.mlo/command-output/osv.txt`
- `.mlo/command-output/typescript-checks.txt`
