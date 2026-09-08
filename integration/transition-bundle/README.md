# Transition bundle

The transition bundle asks a question that the subsystem validators cannot:

> Do these exact artifacts describe the same bounded transition?

The answer for the current Round 03 artifacts is **no**. Each retained
component passes its own fixed validator, but their condition identities,
scopes, histories and decision objects do not join. That failure is the useful
result. It prevents a collection of internally valid records from becoming a
false programme-level conclusion.

## Contract

The bundle is a content-addressed manifest. The repository, rather than the
caller, selects each component validator. The assessment then checks:

1. exact local bytes and path containment;
2. each subsystem's own schema and semantic validator;
3. one canonical scope, condition set and IF-logic root;
4. condition identity through the evolution history;
5. target bindings for signals, forecasts, paths, preparation and the
   dashboard;
6. a common evaluation clock;
7. independent gates for integrity, scope, history, truth, freshness,
   evidence, forecast, preparation, authority, publication and experiments.

This is not another truth schema. The agency map currently supplies the
canonical scope and IF AST. The condition-evolution ledger must become the
history root. Downstream artifacts must resolve those identities rather than
copying prose or declaring themselves ready.

## Current result

`fixtures/round-03.current.json` pins the current individually valid artifacts.
Its expected programme assessment is incoherent and non-authorising. Among the
machine-detected blockers:

- no condition ID is shared by every component;
- the possible-path scope differs from the agency-map scope;
- preparation IFs identify ledger tips but not canonical condition IDs;
- the forecast target is not bound to a condition, signal, metric checksum and
  scope;
- the dashboard has no resolved possible paths;
- the evaluation time is operator-supplied rather than independently trusted;
- experiment arms do not consume one immutable fact pack.

Run the assessment:

```sh
node integration/transition-bundle/tools/assess.mjs
```

Exit code `2` means the bundle was assessed but is not coherent. It does not
mean its individual artifacts are invalid. Run the contract tests with:

```sh
npm run test:integration
```

The schema permits only an operator-supplied, untrusted manifest clock. A
verifier-controlled clock or separately validated attestation is required
before freshness can open. Likewise, an experiment artifact stays invalid
until a fixed repository validator can prove fact-pack parity, arm binding and
safety. Content addressing by itself proves neither claim.

## Migration rule

Do not make the current fixture pass by weakening the cross-checks. Build one
new bounded synthetic transition from the canonical agency map, then derive or
bind every other artifact to it. A passing synthetic bundle must remain
`research-draft`, with truth, authority, action and publication gates false
until evidence and real institutions close them outside this repository.

The exact cross-system changes are specified in [MIGRATION.md](MIGRATION.md).
They are also encoded as an intentionally failing acceptance suite:

```sh
npm run test:integration:migration
```

Keep that suite red until the component contracts expose the required typed
bindings. It must not be made green by weakening the integration checks.
