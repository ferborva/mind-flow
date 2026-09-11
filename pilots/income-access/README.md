# Income-access transition laboratory

**A feasibility proposal, not admitted measurements or an operational storm detector.**

Read the [research dossier](../../research/round-11-income-access-feasibility.md), then the [measurement protocol](measurement-protocol.md). The station may render the [versioned proposal](feasibility.v1.json) after validation. Its current summary has three candidate routes, seven unresolved decisions, six pending gates and zero admitted measurements.

```sh
node --test pilots/income-access/tests/*.test.mjs
node pilots/income-access/tools/feasibility.mjs
```

Use Node 22. No dependencies, network calls, data downloads or output files are required. The CLI validates and prints a summary. Tests exercise malformed and adversarial proposal mutations; they do not validate a survey or its construct.

The original proposal's source entries remain **official metadata inspection notes, not retained original source bytes**. A later bounded [SIPP crosswalk](sipp-crosswalk.md) now retains five public documentation files and a separately replayable [versioned crosswalk](sipp-crosswalk.v1.json). These are metadata only, not respondent data or evidence admission. A future respondent-data acquisition needs its own approval, permitted environment and byte-level provenance. No microdata, provider accounts, participant contact or forecast issuance are included.

```sh
node pilots/income-access/tools/sipp-crosswalk.mts
```

This additional check is also offline. PDF semantic annotations remain agent-reviewed, not independently verified by the replay. The separate capture command is an explicit network operation and is never called by tests.

Version 1 cannot change a pending gate to approved or promote evidence. A later operational record needs a separately reviewed contract and real evidence. Do not edit flags to create authority.
