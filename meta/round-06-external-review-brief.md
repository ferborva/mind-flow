---
id: round-06-external-review-brief
title: Independent review of the abundance-transition programme candidate
type: review-charter
status: proposed
adoption_status: not-adopted
authority: none
author: ren
requested_reviewer: independent-review-coordinator
created: 2026-09-09
updated: 2026-09-09
---

# Independent review of the abundance-transition programme candidate

> **Review a frozen commit, not a moving branch. This charter grants no approval
> to publish, recruit, warn, negotiate, decide or act.**

## Decision first

The candidate should advance only if independent reviewers can show that it
makes uncertainty, affected people, alternatives, authority and correction more
legible without manufacturing confidence or urgency. A beautiful or internally
consistent system is a failure if it hides weak evidence, incomplete
representation or missing institutional authority.

The review target is the exact commit and complete tracked-tree inventory named
by `meta/review-freeze/round-06.review-freeze.json`. Do not review `HEAD`, the
branch name or a locally modified checkout. Verify the freeze before reading
substantive claims. Reproduce it in an independently governed environment
before relying on creator-reported command receipts.

## What this candidate claims

The programme proposes a public reasoning and early-action system for navigating
technological transition toward shared abundance and agency. Its core grammar is:

> **WHO + VERB + OBJECT + STANDARD + PLACE + PERIOD, IF CONDITION.**

Conditions are versioned and evaluated as `true`, `false`, `unknown`, `stale`
or `conflicted`. Evidence, forecasts, possible paths, negotiation, decisions,
preparation and public views should bind the exact condition version they use.
Changing an IF should expose what must be reconsidered. No local checksum or
validator is meant to establish empirical truth, consent, legitimacy, authority
or permission to act.

## What this candidate does not establish

- The programme mission has not been adopted by Fernando or affected communities.
- The NSW worker and household scenario is invented and has not been reviewed by
  those it names.
- The synthetic IF result is not an empirical finding.
- The 62% value is invented and is not a real forecast or confidence in the IF.
- The governance identities, mandates, signatures, context and authority are not
  authenticated.
- The NERO capture proves bounded local retention and derivation, not publisher
  identity, prospective chronology, classification version, causality or a warning.
- No research ethics, privacy, accessibility, recruitment, publication or action
  approval exists.

Any repair that makes one of these blockers disappear without independent
evidence is a regression.

## Review tracks

Run each track independently before reviewers see one another's findings.

### 1. Public narrative and epistemics

Ask whether a general reader can distinguish observation, modelled estimate,
mechanical rule output, inference, scenario, forecast, option, decision and
authorised action. Find every sentence that implies inevitability, completeness,
institutional readiness, empirical truth or moral consensus beyond its evidence.
Offer the weakest accurate replacement that still communicates why the work matters.

### 2. IF formalism and evolution

Attack condition identity, scope, predicate, threshold, window, evaluator,
evidence and clock independently. Try to change one while preserving a misleading
green result. Test every state and lifecycle combination. Find consumers outside
the declared eight-artifact bundle and show where a definition change could fail
to surface a human commitment, negotiation or decision.

### 3. Governance and negotiation

Try coordinated roster omission, false representation, expired mandate, role
substitution, coerced attestation, unresolved dissent deletion, authority
inflation, action substitution and decision-before-negotiation chronology. Treat
caller-supplied external context as an unauthenticated claim. Ask who can contest
the record, who bears consequences and who can stop the process.

### 4. Evidence and forecasts

Recompute every retained derivation from exact bytes. Challenge source identity,
release timing, classifications, missing vintages, revision handling, denominators,
baseline choice, resolver discretion, event dependence, void policy and scoring.
Try to issue a prospective forecast while dropping one preregistered binding.
Do not infer calibration from synthetic or insufficient samples.

### 5. Affected people and human outcomes

Review with people who could bear the named consequences, not only domain experts
or project supporters. Test comprehension, anxiety, stigma, fatalism, perceived
authority, false reassurance, coercion, challenge-route discovery and accessible
use. Preserve subgroup harms and dissent. A mean benefit cannot compensate for a
stop-line harm.

### 6. Operations, security and reproducibility

Attack path handling, symlinks, TOCTOU windows, oversized inputs, ZIP parsing,
hash domains, canonicalisation, partial writes, generated-file drift, dependency
resolution and runtime assumptions. Creator receipts are claims. The detached
checkout is not a process sandbox and must not be treated as safe for untrusted code.

### 7. Public experience and comparative value

Compare the Observatory with a plain statistical release using the same facts,
uncertainty, scope, decision context, order, correction status and planned viewing
time. Look for visual endorsement of a candidate path, aesthetic authority,
hidden caveats, poor reading order, clipping, contrast, zoom or assistive-output
failures. The Observatory must be allowed to lose.

## Required attacks

At minimum, attempt to:

1. Turn a synthetic fixture into an apparent real finding.
2. Use a probability as the current IF state.
3. Convert `unknown`, `stale` or `conflicted` into weak versions of `true`.
4. Change WHO, VERB, OBJECT, STANDARD, PLACE, PERIOD or IF without invalidating
   every bound consumer.
5. Remove an affected population, representative, position or dissent and reseal
   the remaining records.
6. Substitute an action or authority claim after negotiation.
7. Make a decision predate the complete negotiation or required attestations.
8. Treat local code checks, hashes or creator receipts as source authentication.
9. Retarget or selectively score a forecast after issue.
10. Drop a protocol, campaign, target, resolver or contract-identity binding at
    forecast issuance.
11. Present a retained modelled estimate as a direct observation or causal signal.
12. Make the candidate path visually dominant while preserving nominal fact parity.
13. Hide the affected-party consultation status from visual or assistive output.
14. Publish a plausible artifact while bypassing advisory validators.

## Finding contract

Each finding must contain:

- severity: `P0`, `P1`, `P2` or `P3`;
- exact file, line or JSON pointer;
- affected public claim or decision;
- reproduction steps and retained inputs;
- observed result and expected boundary;
- who could be harmed or excluded;
- the smallest credible repair; and
- the observation that would falsify the finding.

Reviewers must label inference as inference and state conflicts of interest,
tooling limits, inaccessible evidence and scope omissions. Agreement among
agents is not independence and does not establish truth.

## Coordinator disposition

The coordinator records every material finding as `accepted`, `rejected` or
`deferred`, with reasons and evidence. P0 and P1 findings block the next review
phase until repaired or explicitly accepted by an independently authorised human
process. Deferred findings retain an owner, next observation and review date.
Review completion still creates no publication, recruitment, warning or action
authority.

## Reproduction

After the final candidate commit is selected:

```sh
node meta/review-freeze/review-freeze.mjs create \
  --policy=round-06 \
  --commit=<exact-commit> \
  --output=meta/review-freeze/round-06.review-freeze.json \
  --run

node meta/review-freeze/review-freeze.mjs verify \
  --policy=round-06 \
  --manifest=meta/review-freeze/round-06.review-freeze.json
```

Expected historical freeze hash:
`sha256:a867ead6bfd743241581af438ecf4dfbea5ccedac0be36d3781ebf32212c69b3`.

The freeze records full command output and may be internally valid even when
reproduction fails. The verifier exits non-zero unless `reproduction.status` is
`passed`. `--allow-failed-reproduction` is only for forensic inspection. It does
not convert a failing or unexecuted reproduction into a pass.
