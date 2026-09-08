# Transition bundle

The transition bundle asks a question that subsystem validators cannot answer
alone:

> Do these exact artifacts describe the same bounded transition?

Schema 1.1 is the frozen seven-artifact Round 3 core. Schema 1.2 is the
eight-artifact Round 4 core: executable IF, agency, evolution, signals, paths,
forecasts, preparation and dashboard projection. The current Round 3 answer is
**no** because its valid local records still use different condition
identities. Refusing that join prevents a collection of plausible records from
becoming a false programme-level conclusion.

## Contract

The repository, not the caller, selects every component validator. The core
assessment checks:

1. exact local bytes and path containment;
2. every subsystem's own schema and semantic validator;
3. one content-addressed `executable_if_ref` for the kernel, fixed evaluator,
   active condition definitions and evidence fold;
4. one content-addressed `outcome_logic_ref` for the agency-map IF AST;
5. a v2 evolution overlay that binds the exact complete kernel definition
   history, active definitions, evidence-state tip and folded current state;
6. one content-addressed `scope_manifest_ref`;
7. explicit `scope_bindings` from that manifest to each supported native scope
   hash domain;
8. condition, metric, forecast, preparation, path and dashboard joins; and
9. independent integrity, scope, history, truth, freshness, evidence,
   forecast, preparation, authority and publication gates.

Native scope hashes are never coerced into equality. The agency map and
possible path hash different native structures. Their distinct hashes are
retained, then bound to one canonical scope manifest through separately hashed
mappings. Mapping integrity can pass while `mapping_truth_assessed` remains
false.

Schema 1.2 executes registered IF logic. The outcome-logic reference still
binds only the agency map's Boolean wiring, while `executable_if_ref` binds the
typed claims, predicates, thresholds, windows, signal definitions, active
evidence fold and evaluator. Mechanical evaluation remains distinct from
empirical truth. Scope-mapping integrity does not prove two concepts
equivalent. Nothing in the core grants authority, approves publication or
authorises action.

## Current results

`fixtures/round-03.current.json` pins seven individually validated artifacts.
Its expected programme assessment remains incoherent and non-authorising. Its
coherence blockers are now narrower:

- no condition ID is shared by all seven core components;
- downstream condition identities do not resolve through the evolution root.

`fixtures/round-04.worker-option.pre-projection.json` is the coherent
seven-artifact, non-dashboard Round 4 core. Its kernel, evolution, signals,
agency, path, preparation and forecast resolve one exact worker-option
condition, scope, bounded period and evidence state. Integrity, scope-mapping,
history, evidence, forecast and preparation gates pass.

`fixtures/round-04.worker-option.complete.json` is the eight-artifact complete
core. It adds only the exact dashboard projection derived from the frozen
pre-projection bundle. Its builder rejects changes to the earlier artifact
references, canonical references, scope bindings, clock and authority boundary.

That result has a deliberately narrow meaning. The scope manifest's structure
and hashes agree, while `mapping_truth_assessed` remains false. The supplied
clock is untrusted, so freshness remains closed. Mechanical IF state does not
establish empirical truth. No actor, authority, intervention benefit or public
release has been authenticated. Truth, freshness, authority and publication
therefore stay false.

This closes only the synthetic structural migration gate. Shared IDs and hashes
remain insufficient without exact scope, signal, forecast, preparation and
derivation joins. Real evidence, trusted clocks, scope truth, affected-party
participation, authority and publication each require separate review.

Run the assessment:

```sh
node integration/transition-bundle/tools/assess.mjs
```

Exit code `2` means the bundle was assessed but is not coherent. It does not
mean its individual artifacts are invalid. Run the safety tests with:

```sh
npm run test:integration
node integration/transition-bundle/tools/build-round-04-core.mjs --check
node dashboard/tools/build-round-04-executable-if-view.mjs --check
node integration/transition-bundle/tools/build-round-04-complete-core.mjs --check
```

The schema permits only an operator-supplied, untrusted manifest clock. Changing
manifest fields cannot open freshness. A verifier-controlled clock or
separately validated attestation is required for that gate.

## Experiment boundary

An experiment manifest must not be embedded in the same content-addressed core
bundle that it names as its source. That creates an impossible hash cycle. A
later experiment envelope must instead content-address the frozen eight-artifact
core and the experiment manifest. Its fixed validator must verify fact-pack and
arm parity, while integration separately checks the fact pack's canonical
condition and scope references. Experiment validity still cannot approve
recruitment or create truth or authority.

## Migration rule

Do not make a fixture pass by weakening cross-checks. Regenerate one bounded,
explicitly synthetic transition from a canonical condition and scope, then bind
all eight Round 4 core artifacts to it. A passing synthetic bundle remains
`research-draft`, with truth, authority, action and publication false.

The remaining sequence and acceptance criteria are in
[MIGRATION.md](MIGRATION.md). Run them with:

```sh
npm run test:integration:migration
```
