# Gate Results

## Run context

- Verifier run: XER-187 merge-conflict check + test/typecheck fix pass
- Base: ab4ca2a (prior verifier); HEAD: main post-merge
- New commits verified: 77f7a0e, 1c6ae5b, 6394478 + 3 fix commits this run

## TypeScript

PASS — `tsc --noEmit` clean (0 errors, 2 fixed this run)

## Tests

PASS — 45/45 (5 tests fixed this run: 2 adapter textarea, 3 compress-handler)

## Build

PASS — built in 186ms, no errors

## gitleaks

PASS — no leaks found

## semgrep

PASS — 0 findings on 54 git-tracked files
- 2 POC scratch files excluded via `.semgrepignore` (untracked, not committed, not shipped)

## osv-scanner

REVIEW_REQUIRED — 4 vulnerabilities in dev build tooling (NOT shipped in extension dist)

| GHSA | CVSS | Package | Risk to users |
|---|---|---|---|
| GHSA-fx2h-pf6j-xcff | 8.2 HIGH | vite 5.4.21 (dev) | none — build tool only |
| GHSA-4w7w-66w2-5vf9 | 6.3 MEDIUM | vite 5.4.21 (dev) | none |
| GHSA-v6wh-96g9-6wx3 | 5.5 MEDIUM | vite 5.4.21 (dev) | none |
| GHSA-67mh-4wv8-2f99 | 5.3 MEDIUM | esbuild 0.21.5 (dev) | none |

Exception basis: all in dev-only build tools; extension ships compiled `dist/` only. Same packages accepted in prior verifier run (0a5c3dc).

## Blocking failures

None.
