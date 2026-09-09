---
id: round-08-progress
title: Round 08 progress and measurement gates
type: review-register
status: in-progress
provenance: commissioned-proposal
created: 2026-09-09
updated: 2026-09-09
---

# Round 08 progress and measurement gates

## 2026-09-09, opening checkpoint

Started from merged Round 07 commit `b17d4ac`. Working tree was clean.
No open PRs were present. The default Node is 26; Node 22 is available at
`/opt/homebrew/opt/node@22/bin/node`. Git LFS is not installed in the current
shell. Its installation and transfer support need validation before migration.

No Round 08 gate is yet independently verified. The brief's measurement counts
are input claims pending inventory. The day-one repair dependency blocks
forecast issuance. The measurement and provenance work can proceed in parallel.

Decisions: use separate worktrees, six lane PRs into `ren/round-08`, existing
contracts only, exact retained source bytes, and explicit unmet gates. See
`meta/round-08-plan.md` for scope, dependencies and review challenges.

Fernando's enterprise-choice question remains open. No remedy is attributed
to him. LFS availability is an implementation dependency, not yet an exception
request. No changes to the public interface are authorised by this round.
