# The Transition Observatory · Programme iteration 06

A self-contained static projection of the schema-complete Round 4 synthetic
worker-option fixture set. Every displayed observation and the 62% forecast are
invented test data. The interface does not fetch remote data.

## Rebuild

```sh
node dashboard/observatory/build.mjs
node dashboard/observatory/build.mjs --check
node --test dashboard/observatory/tests/observatory.test.mjs
```

Serve the repository root with any static server and open
`dashboard/observatory/`. `data.js` is deterministic and generated only after
the transition-bundle assessor accepts the complete required fixture files as
structurally coherent. The builder recomputes the sample IF receipt from the
executable kernel and rejects drift in the forecast's copied receipt, even when
the forecast and bundle digests are changed together.

The programme-gate horizon separates six local synthetic-fixture checks from
four real-world release gates, shown first as `0 of 4`. It binds the exact source-bundle bytes, each
named assessment output and a conservative validation context across
the local contract, integration, signal, path, preparation, forecast, dashboard
and package-lock roots. These are code and test files, not evidence sources.
This does not authenticate the runtime or installed npm package bytes. External
review must use the frozen source-tree manifest and
reproduce the build from that exact commit.

## Interpretation boundary

This is a research prototype over synthetic fixtures. It displays candidate
conditions and possible paths, not a complete transition model or a crisis
verdict. A computed IF state is not empirical truth. The prominent 62% value is
explicitly labelled as a synthetic fixture forecast. It answers a future
question and is not the current IF state. No displayed artifact grants
authority or authorises action.
