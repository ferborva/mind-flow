---
id: round-02-thesis-first-pass
title: External thesis review, immutable first pass
type: external-agent-review
status: submitted
provenance: agent-analysis
reviewer: blind_thesis_review
review_ref: review/round-02
reviewed_commit: ce005e1c7fc08f05ab9493aa818f593e8397106a
submitted: 2026-09-08
---

# External thesis review, immutable first pass

> **Public release remains blocked.** This is agent analysis, not human, expert,
> Indigenous, institutional or affected-party approval.

## Reproduction

- Clean detached clone on macOS Darwin 25.6.0 arm64, Node 26.0.0, npm 11.12.1
  and Git 2.50.1.
- `npm ci`, all 74 tests, both deterministic builds and `git diff --exit-code`
  passed.
- All 28 manifest SHA-256 hashes matched.
- The source working tree remained unchanged.
- No other reviewer's findings were inspected.

## R02-AD-SL-01

**Severity:** Stop-line  
**Lane:** D cross-check, with dependency on E and F  
**Artifact:** `governance/schema/public-release.schema.json:29-56,95-175`;
`governance/public-release-validation.mjs:13-35,262-425`;
`contracts/tests/public-release-governance.test.mjs:46-67,109-123`;
`reviews/public-comprehension-affected-party-protocol-round-04.md:488-583`  
**Control challenged:** The release validator is a machine-readable boundary
that blocks public issuance until required review and authority exist.

**Observed problem:** The validator enforces eight self-attested record
categories while the human protocol requires G0 through G10. Ethics,
participant welfare, Indigenous governance, formative saturation,
confirmatory comprehension, and the multi-owner human release decision are not
structurally required. The validator trusts arbitrary reviewer strings,
declared `passed` outcomes, URLs and checksum-shaped values without
authenticating the reviewer or verifying the referenced evidence.

**Evidence and reproduction:** The repository's own test changes a shadow
fixture to `public`, marks every gate and evidence object passed, names
`Synthetic conformance authority, not a real institution`, and expects
`public_release_allowed: true`. The reviewer independently reproduced that
result from the frozen tag: `valid: true`, `public_release_allowed: true`, no
blocking gates and no errors.

**People or decisions affected:** Study participants, directly affected
workers and households, Indigenous authorities, disabled users, release owners
and any public reader who may treat machine approval as substantive legitimacy.

**Strongest defence:** The current honest fixture remains blocked, the signal
has no operational effect, and the schema is intended to validate a signed
record rather than investigate the underlying world.

**Assessment of defence:** It succeeds for the present frozen fixture. It fails
as a release boundary because public belief is consequential, and the
positive-path test proves structurally valid fiction can become publicly
issuable.

**Falsifier:** Demonstrate an independently enforced path that verifies
evidence bytes, signatures, reviewer authority, validity and all G0-G10 scopes
before any public artifact can issue.

**Minimum safe correction:** Rename the current result to `structurally
eligible for human review`, never `public release allowed`. Add a versioned
external attestation boundary covering G0-G10, authenticated identities,
evidence-byte checksum verification, scoped authority, expiry and revocation.

**Closure test:** An adversarial fixture using valid-looking dummy URLs, hashes,
self-declared reviewers, omitted ethics evidence, omitted Indigenous
determination or synthetic authority must fail issuance. A real signed fixture
must pass only within its named scope and validity period.

**Residual uncertainty:** The repository may eventually rely on deployment
controls not present in the frozen review object. Those controls cannot be
credited until inspectable and tested.

**Dependencies:** Security review, institutional-authority review,
affected-party review, ethics determination and Indigenous governance review.
Agent review cannot close it.

## R02-A-MJ-01

**Severity:** Major  
**Lane:** A  
**Artifact:** `meta/abundance-transition-programme.md:38-62`;
`evidence/claim-ledger-2026-09-08.json:28-45`;
`research/2026-09-08-thesis-debate.md:905-921,1098-1110`  
**Claim challenged:** The central proposition is empirically testable and can
be contradicted.

**Observed problem:** `Valuable capabilities can become` is a modal claim. A
success supports possibility, while any failure can be redescribed as a missing
condition, insufficient legitimacy, avoidable harm not detected early enough,
or an inadequately narrow scope. No denominator, comparison class, time
horizon, acceptable loss or precommitted abandonment rule identifies a result
that defeats the proposition itself.

**Evidence and reproduction:** The ledger falsifiers test whether the taxonomy
helps explain access and whether encoders agree. H1-H7 are narrower empirical
hypotheses. Neither set supplies a failure rule for the master proposition. The
document says the Observatory should stop for invalid measurement or harm, but
that is a product stop rule, not a thesis falsifier.

**People or decisions affected:** Readers, funders, policymakers and affected
groups asked to invest attention or legitimacy in an inquiry whose central
answer may remain permanently affirmative.

**Strongest defence:** The programme explicitly permits contradiction,
preserves counter-hypotheses, and contains genuinely testable H1-H7.

**Assessment of defence:** It substantially improves the research programme.
It does not make the modal master proposition falsifiable. The proposition is
better understood as a mission and value commitment.

**Falsifier:** Pre-register a bounded scope, baseline, time horizon, loss
function and observation whose occurrence would require recording the
proposition as false rather than adding or redefining a condition.

**Minimum safe correction:** Label the master proposition as a normative mission
or research question. Move empirical weight to bounded hypotheses with explicit
denominators, causal alternatives, horizons and abandonment rules.

**Closure test:** A preregistration includes at least one plausible dataset that
would produce a decisive negative result, and the claim ledger cannot preserve
the claim merely by narrowing scope after results are known.

**Residual uncertainty:** A family of bounded propositions may eventually
justify a carefully limited generalisation. It cannot justify the current
universal framing yet.

**Dependencies:** Measurement and causal-inference review should determine
whether each bounded hypothesis is identifiable.

## R02-AD-SL-02

**Severity:** Stop-line  
**Lane:** A, cross-check D  
**Artifact:** `meta/abundance-transition-programme.md:46-55`;
`governance/if-protocol.md:71-113,162-223`;
`dashboard/schema/snapshot.schema.json:55-119`;
`dashboard/web/index.template.html:478-486`  
**Claim challenged:** The proposition's ecological conditions are represented
by the five-layer IF model, and the promise holds only if those layers hold.

**Observed problem:** Ecology is not a required layer or gate. It appears only
as a possible durability condition. The snapshot schema permits one arbitrary
condition and independently permits an `act` decision. Technical capability
and apparent access can therefore pass while lifecycle energy, water, mineral,
emissions, waste or locally concentrated infrastructure burdens are absent.

**Evidence and reproduction:** The reviewer reduced the frozen snapshot to one
`capability` condition set `true` and changed the decision to `act` with an
arbitrary eligible action. The exact schema validated it. This contradicts the
interface statement that five layers must hold. The [IEA Energy and AI
report](https://www.iea.org/reports/energy-and-ai/executive-summary) identifies
locally concentrated electricity-system impacts from AI infrastructure, while
[UNEP](https://www.unep.org/resources/report/artificial-intelligence-ai-end-end-environmental-impact-full-ai-lifecycle-needs-be)
calls for full-lifecycle assessment across energy, water, minerals, emissions
and electronic waste.

**People or decisions affected:** Communities hosting data centres, energy and
water infrastructure, mining and disposal; future generations; Indigenous
custodians; households whose apparent access gain shifts costs elsewhere.

**Strongest defence:** Ecology is named in the proposition and can be encoded
under durability or fairness. The schema is generic so different services can
use different conditions.

**Assessment of defence:** Generic extensibility is useful, but optional
encoding cannot support a public assertion that ecological conditions hold.
The schema cannot distinguish `assessed and acceptable` from `never represented`.

**Falsifier:** Show a semantic validator that rejects supported or actionable
claims unless ecological lifecycle materiality is assessed for the complete
service boundary.

**Minimum safe correction:** Require a scoped ecological lifecycle condition,
or a signed and challengeable not-material determination, before `supported` or
`act`. Name the geographic burden, upstream and downstream boundary, evidence,
affected community, threshold owner and expiry.

**Closure test:** Synthetic cases with improved price and access but excessive
local water demand, power-system burden, mining harm, emissions or waste must
block support and action. Omitting the ecological object must also block.

**Residual uncertainty:** Standardised AI lifecycle measures remain immature,
as UNEP notes. Unknown must therefore remain visible and blocking where
material, not be converted to safe.

**Dependencies:** Ecological expertise and affected-community governance. An
agent cannot choose acceptable burden thresholds.

## R02-A-SL-03

**Severity:** Stop-line  
**Lane:** A  
**Artifact:** `drafts/from-if-to-when.md:129-161,183-184,666-669`;
`research/2026-09-07-transition-precedents-and-adkar.md:67-129`  
**Claim challenged:** Engels' Pause reveals the actual shape of technological
transitions, and it ended because capital saturated plus Factory Acts raised
child-labour costs, accelerated steam adoption and redirected allocation.

**Observed problem:** The descriptive wage and productivity figures are
supported, but the draft turns one contested historical episode into a general
transition shape and a confident causal policy mechanism. Allen's paper
attributes the wage path principally to productivity growth and capital
accumulation, with population dynamics and other factors. It does not establish
the draft's Factory Acts causal chain. The repository research note supplies no
primary source for that chain.

**Evidence and reproduction:** [Allen's
paper](https://www.nuff.ox.ac.uk/Users/Allen/engelspause.pdf) supports roughly
46 percent output-per-worker growth versus 12 percent real-wage growth for
1780-1840, and 90 percent versus 123 percent for 1840-1900. Its British series
also relies on sparse benchmark estimates and interpolation, which limits
analogy precision. A recent open-access [Economic History Review
study](https://eprints.gla.ac.uk/350183/) reports substantial census
undercounting of child factory labour and finds early Factory Acts did not
immediately or effectively remove it. Child labour persisted alongside steam
mechanisation.

**People or decisions affected:** Readers asked to accept a particular
political-economic mechanism, legislators encouraged to infer that
relative-price regulation predictably redirects investment, and workers whose
historical experience is compressed into an optimistic catch-up narrative.

**Strongest defence:** The essay says Engels' Pause is a warning, not a timer,
and its core distributional lesson remains sound.

**Assessment of defence:** It succeeds for the narrow lesson that productivity
can diverge from wages for decades. It fails for `the actual shape`, the
asserted cause of the end, and `allocation follows`. Those claims exceed the
cited evidence and suppress counterevidence.

**Falsifier:** Produce primary historical research that causally identifies
the Factory Acts as a material cause of steam adoption and the wage catch-up,
distinguishes them from capital deepening and other institutional changes, and
supports transfer to the proposed modern mechanism.

**Minimum safe correction:** Retain the verified descriptive divergence. Label
causal accounts as contested hypotheses, remove the singular `actual shape`
claim, and withdraw `set the measures, allocation follows` unless supported by
an explicit causal evidence chain.

**Closure test:** Every sentence is classified as descriptive fact, historical
interpretation, causal claim, analogy or present-day proposal, with a primary
source and stated transfer limits for each material causal statement.

**Residual uncertainty:** Historical measurement and causal attribution will
remain disputed. That argues for calibrated language rather than no historical
reference.

**Dependencies:** Specialist economic-historian review. Agent source review
cannot substitute.

## R02-D-MJ-01

**Severity:** Major  
**Lane:** D, cross-check A  
**Artifact:** `drafts/from-if-to-when.md:167-181,403-429` and household access
and agency constructs throughout `governance/if-protocol.md:81-113`  
**Claim challenged:** A household's access margin is the relevant success unit
and can establish whether gains reached exposed people.

**Observed problem:** Household resources can improve while one member loses
income, time, privacy, bargaining power or practical freedom. The equation
assumes usable pooling and does not encode who controls resources, performs
unpaid care, can refuse technology, or bears administrative and surveillance
costs.

**Evidence and reproduction:** A synthetic household can keep the same
disposable resources and basket access after one member loses wages if another
member's income or transfer rises. It therefore passes the margin while
individual agency falls. The [UNECE guide on intra-household
power](https://unece.org/info/publications/pub/352411) treats household
decisions as multidimensional and unequally distributed. UNECE's [poverty
measurement guidance](https://unece.org/fileadmin/DAM/stats/documents/ece/ces/2020/09Rev1_Poverty_Measurement_Guide_after_consultation.pdf)
warns that household measures conventionally assume equal sharing. The [ILO
care-work
report](https://www.ilo.org/publications/major-publications/care-work-and-care-jobs-future-decent-work)
documents unpaid care as a major gendered inequality mechanism.

**People or decisions affected:** Women and unpaid carers, disabled dependants,
young people, partners with less financial control, informal workers, migrants
and anyone whose household-level gain conceals an individual loss.

**Strongest defence:** The margin is explicitly split by household type, place
and exposed cohort, and agency is a separate IF layer.

**Assessment of defence:** It prevents some national-average errors but does
not resolve within-household allocation. Separate prose-level agency does not
force individual harm to block a favourable household verdict.

**Falsifier:** Demonstrate measures that identify control, time, privacy,
refusal and distribution within households and semantically prevent household
improvement from overriding a material individual loss.

**Minimum safe correction:** Use linked but separate household-access and
individual-agency records. Add confidential measures of control, desired
hours, unpaid care, privacy, refusal and appeal, with explicit no-offset rules
for severe individual harms.

**Closure test:** A synthetic case with stable household margin but one member's
lost earnings, increased unpaid care or coerced adoption must not produce
`supported` or `act`. Affected-party review must confirm the constructs without
exposing sensitive household data.

**Residual uncertainty:** Individual data collection can itself create privacy
and safety risks. Data minimisation and safe non-disclosure need independent
review.

**Dependencies:** Affected-party, gender, disability, privacy and
household-survey expertise.

## R02-AD-MJ-02

**Severity:** Major  
**Lane:** A, cross-check D  
**Artifact:** `meta/abundance-transition-programme.md:277-294`;
`research/2026-09-08-thesis-debate.md:905-921`;
`reviews/public-comprehension-affected-party-protocol-round-04.md:179-201`  
**Claim challenged:** The Observatory is a useful and trustworthy public
instrument, rather than a more elaborate presentation of information
available through simpler institutions.

**Observed problem:** H7 acknowledges that the Observatory may increase anxiety
or manufacture legitimacy, but the comprehension experiment compares only
three Observatory layouts. It lacks the required comparator: a conventional
statistical release, with and without a deliberative process. It therefore
cannot attribute any benefit or harm to the Observatory concept itself.

**Evidence and reproduction:** Variants A, B and C preserve the same seven-part
architecture. None tests whether the interface adds decision value over a short
official-statistics release or whether deliberation, rather than dashboard
structure, produces comprehension and agency. The [UN Fundamental Principles
of Official Statistics](https://unstats.un.org/fpos) supply a simpler trust
baseline. [OECD citizen-participation
guidance](https://www.oecd.org/en/publications/2022/09/oecd-guidelines-for-citizen-participation-processes_63b34541.html)
says participation should be chosen according to purpose and must offer
meaningful influence. The [National
Academies](https://nap.nationalacademies.org/read/23674/chapter/4?term=%22public+engagement%22)
distinguishes one-way communication from goals requiring dialogue and
engagement.

**People or decisions affected:** Public readers, journalists, employers,
governments and workers whose behaviour may be changed by a crisis-framed
institution; funders deciding whether to build it.

**Strongest defence:** The current trial is a formative
information-architecture test, not the final institutional evaluation.

**Assessment of defence:** It is a valid formative objective. It cannot support
the programme-level claim that an Observatory should exist, and it leaves the
brief's simpler-design falsification attempt unanswered.

**Falsifier:** A preregistered study compares the Observatory with simpler
baselines under equal factual content and facilitation, and measures decision
quality, correction, anxiety, false authority, trust calibration and downstream
behaviour.

**Minimum safe correction:** Add at least three arms: official-statistics
release; the same release plus facilitated deliberation; Observatory plus
identical deliberation. Precommit a default to the simpler design unless the
Observatory adds material value within harm bounds.

**Closure test:** Predefined superiority or non-inferiority criteria are met
for comprehension and appropriate action, while anxiety, false authority,
polarisation and harmful behavioural effects remain below
affected-party-approved thresholds.

**Residual uncertainty:** Simulations may understate self-fulfilling employer,
market, media or government responses. A no-consequence field pilot is still
required.

**Dependencies:** Independent experimental design, public-deliberation
expertise and affected-party co-design.

## R02-D-MJ-02

**Severity:** Major  
**Lane:** D  
**Artifact:** `reviews/public-comprehension-affected-party-protocol-round-04.md:82-105,420-486,488-572`  
**Control challenged:** The proposed protocol ensures directly affected
participation and prevents dangerous misunderstandings from being averaged
away.

**Observed problem:** The first 30-person group combines `directly affected or
closely analogous` participants, so all 30 can be analogous and zero directly
affected. Cross-cutting quotas do not repair that omission. Separately, the
group go threshold is 90 percent, while the automatic stop triggers only above
10 percent. Three harmful misunderstandings among 30 participants produce
exactly 90 percent correct and 10 percent harmful, so the candidate can pass
both rules. Group confidence bounds are not required.

**Evidence and reproduction:** `27 / 30 = 0.90`; `3 / 30 = 0.10`; `0.10 > 0.10`
is false. The protocol's overall confidence-bound protection does not apply to
each priority group.

**People or decisions affected:** People bearing actual employment, access,
stigma, surveillance or administrative losses; small high-risk subgroups;
participants whose dissent may be formally recorded without changing the
metric or release decision.

**Strongest defence:** The protocol has strong accessibility quotas,
conjunctive gates, critical-incident stops, dissent records and explicit
Indigenous-governance requirements.

**Assessment of defence:** These are substantial safeguards. They do not
guarantee participation by anyone directly experiencing the named loss, and
the threshold boundary permits three dangerous misunderstandings per
30-person group.

**Falsifier:** Show recruitment rules with a separate minimum for directly
affected people and a threshold simulation in which the 27 of 30 case cannot
yield a go decision.

**Minimum safe correction:** Separate directly affected and analogous strata.
Let directly affected representatives co-define minimum numbers, unacceptable
harms, thresholds and disposition rights. Apply subgroup uncertainty bounds
and make the stop comparator inclusive where 10 percent is intended to stop.

**Closure test:** Recruitment records prove the direct stratum was met; direct
participants are analysed separately; three of 30 dangerous misunderstandings
force revision; affected representatives confirm that severe objections can
change the metric, goal, action or release outcome.

**Residual uncertainty:** No sampling rule can substitute for legitimate
representation, safe participation, compensation and continuing decision
rights.

**Dependencies:** Human ethics, affected-party, Indigenous, accessibility and
statistical reviewers must own closure. Agent review cannot execute or approve
participant research.

## Strongest surviving case

The strongest defensible thesis is narrow:

> For a named service, cohort, place and period, test whether actual adoption
> improves specified outcomes and voluntary choice without transferring labour,
> household, institutional or ecological harm, and test whether an evidence
> interface improves decisions relative to simpler public-statistics and
> deliberation baselines.

The core distinction between capability, access and agency survives. Current
evidence supports the concern that productivity or innovation can coexist with
concentrated ownership, insecure earnings, reduced autonomy or algorithmic
control. The [OECD](https://www.oecd.org/en/publications/the-impact-of-artificial-intelligence-on-productivity-distribution-and-growth_8d900037-en.html)
identifies both productivity potential and concentration and distribution
risks. The [ILO's platform-work
evidence](https://webapps.ilo.org/infostories/en-GB/Campaigns/WESO/World-Employment-Social-Outlook-2021.html)
documents innovation alongside insecure income, unilateral terms, weak
protection and constrained autonomy.

The frozen checkpoint also behaves responsibly in its current state: unknown
conditions remain visible, scenarios are labelled, no crisis is scored, no
action is authorised, and public release is presently blocked.

What does not yet survive is the Observatory's claim to be a warranted
institution or independent source of authority. Its most defensible role is a
provenance and correction layer attached to trusted statistics and legitimate
deliberation.

## Ranked next tests

1. **Release-boundary kill test:** Replace self-attestation with authenticated
   G0-G10 evidence and prove synthetic authority, dummy evidence, omitted
   ethics and omitted Indigenous determination cannot issue.
2. **Central-proposition preregistration:** Separate mission from empirical
   claims and precommit a genuine negative result, denominator, horizon,
   baseline, loss function and abandonment rule.
3. **Instrument comparator:** Compare official statistical release, release
   plus deliberation, and Observatory plus identical deliberation before
   investing in further interface development.
4. **Distribution and ecology counterexamples:** Require cases with rising
   output and access but ownership concentration, individual household harm,
   coercion or lifecycle burden to block support and action.
5. **Affected-party co-governance:** Fix direct-participant sampling, threshold
   arithmetic, decision rights, ethics, compensation and Indigenous scope
   determination before recruitment.
6. **Historical correction:** Retain the verified Engels' Pause divergence but
   remove or properly source the singular Factory Acts and allocation mechanism.
7. **Prospective no-consequence pilot:** Only after the above, test whether the
   instrument improves response time and appropriate decisions over a naive
   baseline without increasing anxiety, surveillance, stigma or false authority.
