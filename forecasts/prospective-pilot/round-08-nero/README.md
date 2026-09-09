# October NERO forecast preparation

**Status: candidate prepared, no forecast issued and no registration receipt
posted.** The in-memory candidate assigns 0.72 to October's modelled General
Clerks employment stock in Capital Region being at least the frozen August
count, 4,217. It cannot become an issued record until the coordinator clears
the day-one repairs, another agent reproduces the calculation and a real
provider receipt anchors the sealed protocol before issuance opens.

## 🦅 Target and evidence

The question is: will the first retained October 2026 NERO release report
`nsc_emp >= 4217` for `anzsco4_code=5311`, `sa4_code=101` and
`date=2026-10-15`? The labels must remain General Clerks, Capital Region and NSW.
The service is modelled employment stock, not healthcare. Selection uses the
first occupation and first SA4 in the already retained clerical scaffold; it
does not choose the strongest historical gain.

Jobs and Skills Australia's [NERO page](https://www.jobsandskills.gov.au/data/nero),
retrieved 9 September 2026, names 4 November 2026 as the expected October
release. This is a published plan, not a guaranteed date. The frozen observation
labels cover 1 to 31 October UTC; these are a calendar convention for the model's
monthly target, not timestamps of individual employment observations. Resolution
opens 1 November and closes **7 December 2026 at 00:00 UTC**, inside 90 days of
the planned September issue. Late or absent data must remain visible.

The baseline is [the retained August projection](../../../pilots/australia/data/nero-clerical-2026-08.r2.json),
whose classification-status correction preserves its predecessor's measurements.
The original archive has SHA-256
`a092fbdc1fe41a781120a0df964235fef1dd0913b3b9d2579f74a7ce67239446`.
The existing archive verifier reproduces the projection from the ZIP's CSV.
This candidate reads the exact corrected JSON bytes and freezes their digest in
both input manifests. It does not replace an archive digest with a provenance
claim.

The [NERO methodology](https://www.jobsandskills.gov.au/data/nero/nero-methodology),
checked 9 September 2026, describes experimental, smoothed and revision-prone
estimates, based on residence. Neither source establishes the exact ANZSCO and
ASGS vintage used in the retained file. The resolver therefore uses the frozen
source-native code and label pairs, retains that uncertainty and refuses a
changed pair. No cross-occupation or cross-region totals are calculated.

## 🧮 Reproducible baseline

| Quantity | Predeclared rule |
| --- | --- |
| Training input | One August 2026 vintage, selected 5311/101 series, August 2024 through August 2026 |
| Reference class | All 23 overlapping two-month changes in those 25 consecutive months |
| Success | Later modelled count is at least the earlier count; equality counts as nonnegative |
| Observed successes | 17 |
| Reference probability | Laplace smoothing: `(17 + 1) / (23 + 2) = 0.72` |
| Naive probability | `0.5`, after checking the same input eligibility |
| Primary forecast | The same predeclared reference algorithm, `0.72` |
| Rounding | Six decimal places, exact rational half-even |

**The overlapping historical changes are not independent trials.** They come
from one revised and smoothed vintage, not a reconstructed real-time backtest.
The probability is a mechanical research forecast. Using the reference algorithm
as the primary forecast deliberately supplies no possible claim of improvement
over that comparator. No calibration claim is permitted, before or after this
single outcome.

The kernel uses the bounded index `x / (x + 4217)`, with domain `[0,1]` and
threshold `0.5`. For every nonnegative finite count, this threshold is equivalent
to `x >= 4217`. The denominator is a mathematical transform, not population or
eligible workers. This supplies a defensible domain without inventing a maximum
regional population. The condition's availability category marks **exposure
context about occupied roles**, not available vacancies or a worker's ability
to obtain work. It does not establish a binding access condition or an agency
increase.

## 🕒 Source chronology and registration

The single-request landing-page acquisition ran between
`2026-09-09T10:44:42Z` and `2026-09-09T10:44:49Z`. It retained
[body bytes](sources/nero-landing.source.txt) and
[response headers](sources/nero-landing.response-headers.txt). Their SHA-256s are
`e83dabf3e8b268a85008a30eefd0301b517780d39187428a808f019918edc9fb` and
`e204975c11e75541f55c39407560b26dd3e16cac9f0790f0c4bef040119b66b0`.
The page linked the August archive and listed October as a future release.
It did not contain an October outcome download. This is a local reported
absence on that page, not proof that no outcome exists anywhere. No publisher
signature or independent clock was verified.

Preparation is pure: `prepareNeroCandidate` in [candidate.mts](candidate.mts)
returns in-memory proposed records and retained source objects. It writes
nothing and posts nothing. The forecast-shaped object is a proposal, not an
issuance event. Its preregistration remains invalid while its provider receipt
is absent. No such object is saved as an issued record during preparation.

Before registration, freeze the complete target, baseline parameters, resolver
and dependency hashes, scoring implementation, campaign manifest, source-absence
prefix and exact UTC clocks. Post that sealed protocol hash to the already
authorised draft PR only after coordinator clearance. Retain the provider's
actual response JSON, URL and `created_at` as a separate receipt. The content
seal precedes or equals that timestamp; the timestamp must precede issue opens.
The receipt's bytes and timestamp remain externally unverified. Do not invent
a receipt or substitute the client's local clock for the provider's time.

Issue only inside the frozen issue window, with an actual current UTC time and
the reviewed source checkout revision. The legacy `issued_commit` field records
that source revision, not a self-referential containing commit. Retain the
issued JSON unchanged, record its exact digest and push the containing commit.
Git history supplies that containing commit; subsequent resolutions are
separate records checked against the original with
`assertIssuedForecastImmutable`.

## 🔍 Resolution procedure, written before the outcome

1. Preserve a landing-page absence check and the first observed presence of an
   October archive, including single-request headers, body, UTC request bounds
   and digests. Retain the first complete archive. A failure to monitor promptly
   is disclosed; it must not be represented as proof of the first public release.
2. Preserve its native filename, media type, ZIP member inventory, CRC results
   and exact archive hash. Use Git LFS above 5 MB. Check source-native labels and
   classification comparability before calculating anything. A purported October
   outcome seen before the frozen publication lower bound invalidates the
   chronology; do not move that bound retrospectively.
3. Use [resolver.mts](resolver.mts), the hash-bound existing ZIP/CSV parser and
   the existing binary-threshold resolver. Consume the whole verified stream.
   Require exactly one matching cell, with all frozen labels and a nonnegative
   integer value. Missing, duplicate, suppressed, malformed or changed cells fail
   closed. Never select a convenient later vintage or another occupation/region.
4. Retain the extracted count and source archive hash alongside the derived
   existing-format resolution payload. Transform the count, then let the frozen
   binary resolver reconstruct the outcome. Both native source and derived
   payload must remain available for independent reproduction. A reviewer checks
   the same bytes and the source chronology before accepting the resolution.
5. Append a separate resolved record and history event inside the resolution
   window. Set the outcome from reconstructed bytes only. Preserve the original
   issue file. After 7 December, a still unresolved record is overdue, not a
   negative outcome and not silently excluded.

## 🛑 Void and correction procedure

The only allowed void reasons are source retirement, a material measure change
or resolution evidence unavailable. Each needs contemporaneous reason evidence
and a separately evidenced adjudication whose claimed identity is distinct from
both author and issuer after Unicode collision checks. No adjudicator has been
appointed or authenticated here. If no acceptable adjudication exists, retain
the unresolved record and withhold scoring.

**A void at or after the frozen publication boundary makes cohort performance
ineligible.** The evaluator retains the void in the registered denominator and
withholds scores, including aggregate and stratified scores. An earlier void is
also visible and requires the same reason and adjudication evidence. An
unfavourable result, ordinary revision or wish to improve the score is not a
void reason.

If the publisher corrects the first release, retain both releases. Never
overwrite the first outcome. Append the correction and a separately identified
reconstruction. If the resolution itself was erroneous, withdraw it and rescore
in a new report with the superseded result visible. If comparability cannot be
established, disclose the conflict and apply the void policy without claiming
an independent resolver or institutional authority.

Scoring stays withheld until resolution close and retained outcome evidence.
Register the one-member evaluation cohort before observation begins. Its
denominator includes this forecast whatever happens. The exercise establishes
neither calibration nor a right, warning, service recommendation or action.

## Attribution

Nowcast of Employment by Region and Occupation, Jobs and Skills Australia,
Commonwealth of Australia. Used under Creative Commons BY 4.0 licence. The
bounded transform and forecast method are agent-authored research additions.
