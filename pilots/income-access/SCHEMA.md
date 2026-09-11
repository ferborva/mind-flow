# Feasibility proposal v1

`feasibility.v1.json` is an authored proposal validated by `tools/feasibility.mjs`. This is a JavaScript runtime contract, not a JSON Schema implementation or an admission authority.

| Field | Meaning and constraint |
|---|---|
| `schemaVersion`, `id` | Exact version `1.0.0` and programme identity. |
| `status` | Exact `proposal-not-admitted`. |
| `assessedAt`, `authorship` | ISO calendar date and exact pinned agent-proposal authorship statement. |
| `sources[]` | Unique ID, title, publisher, official HTTPS URL, date, locator, authored finding and evidence-kind label. `publishedOrRevised` is null where no exact date is asserted. |
| `candidates[]` | Stable country-route ID, country, name, six prose dimensions, resolvable `sourceIds` and hard `gaps`. |
| `recommendation` | Candidate reference, historical-method-only scope, null live-country choice, rationale, conditions, counterargument and fallback. |
| `unresolvedDecisions[]` | Seven unique required identities; `value:null`, `status:unresolved`. |
| `gates[]` | Six unique required gate identities; independently pinned requirement and unappointed owner-role wording, with `status:pending`. |
| `evidenceAdmission` | Zero measurements; false national inference, warning readiness and microdata retrieval. |

Unknown properties are rejected at every object level. URLs use a small exact-host allowlist; arbitrary subdomains and credential-bearing URLs fail. Dates must exist on the calendar and cannot put a source after the proposal or its publication after assessment.

`summariseFeasibility(proposal)` validates first and returns only bounded counts and statuses. It does not fetch sources, assess the truth of prose, resolve legal eligibility, inspect survey variables or create IF observations. A changed candidate ranking remains a human-reviewable research judgement, not a statistical result.

The six prose dimensions are `constructFit`, `longitudinal`, `denominator`, `timeliness`, `access` and `claimLimit`. The stable candidate-country pairs are `usa-sipp/USA`, `aus-hilda/AUS` and `gbr-ukhls/GBR`. The current retained proposal compares all three; this contract does not rank countries generally.

The recommendation's `livePilotCountry:null` is intentional. Choosing a historical-method benchmark does not choose the actual future pilot population.

Version 1 also pins authorship and each gate's requirement and owner-role wording in validator constants, independently of the JSON input. Keeping a `pending` flag while changing the prose to claim an appointment, Fernando's settled decision or waived review is rejected. This narrow boundary is not a general truth checker for prose, an authenticated appointment record or a substitute for independent review of a future contract.
