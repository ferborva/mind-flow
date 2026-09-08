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
5. immutable condition-definition references through evolution events and the
   folded current state;
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

## Current result

`fixtures/round-03.current.json` pins seven individually validated artifacts.
Its expected programme assessment remains incoherent and non-authorising. Its
coherence blockers are now narrower:

- no condition ID is shared by all seven core components;
- downstream condition identities do not resolve through the evolution root.

Freshness is a separate closed gate because the supplied evaluation time is not
independently trusted. It does not make an otherwise coherent core incoherent.

The scope manifest records known differences instead of hiding them. Forecast,
preparation and dashboard contracts now expose typed bindings, but their current
records still need to be regenerated from the same canonical synthetic
transition.

The executable IF boundary has landed. The next migration gate is to derive new
subsystem fixtures from its active condition definitions. Shared IDs and hashes
remain insufficient without scope, signal, evolution, forecast and preparation
joins.

Run the assessment:

```sh
node integration/transition-bundle/tools/assess.mjs
```

Exit code `2` means the bundle was assessed but is not coherent. It does not
mean its individual artifacts are invalid. Run the safety tests with:

```sh
npm run test:integration
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
