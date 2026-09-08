# Conditional options

This module compiles a closed agent proposal against a supplied condition and completed evaluation bundle. The condition must satisfy `contracts/schema/condition-contract.schema.json` v3. The run and observations must satisfy their contracts schemas and `validateEvaluationBundle`.

## Trust boundary

The caller supplies the condition, observations, completed evaluation run, option, and exact UTC `as_of`. The compiler validates their schemas, recomputes the evaluation bundle, and derives selected-gate truth and the correct eligibility axis. Failed, partial, conflicted, false, stale, unknown, ineligible, or non-current evaluations fail closed.

**A valid bundle is content-validated but externally unverified.** It establishes internal reproducibility, not truth, approval, identity, commitment, or authority. Every rendered result remains candidate-only or withheld with `authorisation_effect: "none"`. It does not prove authority.

Compilation fails closed when the condition is malformed, semantically inconsistent, outside its governance window, or retired. An option must match the condition scope, fit the selected gate policy, target an in-scope service, and bind its outcome to a positive, required enabling predicate. Negated, blocker, alternative, and optional predicates cannot serve as protected outcomes. `neq` is rejected because it has no unambiguous protected-outcome direction.

The chronology is causal: condition creation and validity precede evaluation and option generation; approvals cannot predate creation or postdate `as_of`; evaluation and generation are current at `as_of`; review and expiry remain future; option expiry cannot exceed condition expiry or 180 days from generation.

Display-bearing scope labels are trimmed, single-line, control-free, markup-free, and non-imperative. Actor, dependency, provenance, and dissent identities remain caller-supplied assertions. The renderer labels them explicitly as unverified. Consent or rights dissent produces a withheld record. Other dissent remains inseparable from the public record.

The versioned public envelope includes the full option checksum and every decision semantic: action, scope, protected outcome, all gate requirements and dependencies, dissent, review, expiry, and provenance. It also content-binds the completed evaluation bundle. `output_digest` covers every other returned field. It detects detached or altered output, but it does not authenticate the caller, verify external facts, or grant authority.
