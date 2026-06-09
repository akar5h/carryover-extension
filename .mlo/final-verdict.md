# Final Verification Verdict

## Status

REVIEW_REQUIRED

## Merge/push recommendation

MANUAL_REVIEW_REQUIRED

## Summary

XER-160 internal-API adapter redesign passes all deterministic gates (typecheck 0 errors, build clean, gitleaks 0 leaks, semgrep 0 findings, OSV 2 pre-existing Medium dev-only vulns). All new code is spec-compliant and correctness-correct. REVIEW_REQUIRED because: (1) `credentials: 'include'` fetch calls warrant a human confirming the hostname guards are tight, (2) org selection field names (`active_flags`, `capabilities`) were not verified against a live API response, and (3) old DOM adapter files are now orphaned dead code.

## Deterministic gate status

PASS

## AI reviewer status

| Reviewer | Verdict |
|---|---|
| Diff Auditor | REVIEW_REQUIRED |
| Anti-Slop Reviewer | PASS_WITH_WARNINGS |
| Security & Edge Case Reviewer | PASS_WITH_WARNINGS |

## Blocking issues

None.

## Human must inspect

| File | Reason |
|---|---|
| src/adapters/claude-adapter.ts | `credentials: 'include'` — confirm only fires on claude.ai; verify org selection field names from live DevTools |
| src/adapters/chatgpt-adapter.ts | `credentials: 'include'` — confirm only fires on chatgpt.com / chat.openai.com |
| src/content/badge/badge-updater.ts | Inner ring denominator changed 100_000 → 200_000 — confirm this is the intended context-window assumption |

## Missing evidence

- No integration tests for API fetch paths (requires browser automation to intercept real claude.ai/chatgpt.com responses)
- Claude API response shape (`chat_messages[].text`, `current_leaf_message_uuid`, `parent_message_uuid`) not confirmed from live DevTools — assumed from spec description; actual shape may vary
- ChatGPT API response shape (`mapping`, `current_node`) assumed correct from spec; actual shape may add/remove fields

## Confidence

MEDIUM
