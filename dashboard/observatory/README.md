# The Transition Observatory · Round 04

A self-contained static projection of the exact Round 4 worker-option pre-projection bundle. The interface does not fetch remote data or invent measurements.

## Rebuild

```sh
node dashboard/observatory/build.mjs
node dashboard/observatory/build.mjs --check
node --test dashboard/observatory/tests/observatory.test.mjs
```

Serve the repository root with any static server and open `dashboard/observatory/`. `data.js` is deterministic and generated only after the transition-bundle assessor accepts the complete source set as coherent. The builder recomputes the governed IF receipt from the executable kernel and rejects drift in the forecast's copied receipt, even when the forecast and bundle digests are changed together.

## Interpretation boundary

This is a research prototype over synthetic fixtures. It displays candidate conditions and possible paths, not a complete transition model or a crisis verdict. A computed IF state is not empirical truth. The 62% forecast answers a future question and is not the current IF state. No displayed artifact grants authority or authorises action.
