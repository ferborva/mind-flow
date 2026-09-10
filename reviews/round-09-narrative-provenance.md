---
id: round-09-narrative-provenance
title: Round 09 deletion-only public-language review
type: internal-review
status: in-progress
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
updated: 2026-09-10
---

# Scope and fixed boundaries

This lane applies Round 09's deletion-only instruction to the three named
drafts. First-person sentences and the open company-choice GAP stay verbatim;
the naughty-kid passage remains absent. No new substantive position is drafted
for Fernando. Deletions and retained source ceilings will be recorded below.

The author display name in current pipeline drafts is **Ren**. The frontmatter
linter rejects casing variants of that name in `drafts/`, without rewriting
historical research, reviews, captures or foundation metadata. This is a casing
control, not proof of authorship. `from-if-to-when.md` changes only its author
field in the first commit; its prose is unchanged at that checkpoint.

## Recount and classification for independent review

The denominator is `proseSentences` from the existing attribution change
detector. A second, smaller denominator drops standalone list-number fragments
such as `2.`; this prevents those fragments from buying a passing percentage.
Tables still require human interpretation because the parser can join their
cells. No new prose was added to the drafts or used to enlarge denominators.

| Document | Lexical units | Without list-number fragments | Counted disclaimer units | Conservative-denominator ratio |
| --- | ---: | ---: | ---: | ---: |
| `drafts/abundance-has-an-if.md` | 135 | 130 | 6 | 6/130 = 4.62% |
| `drafts/every-if-is-somebodys-when.md` | 78 | 78 | 3 | 3/78 = 3.85% |
| `drafts/from-if-to-when.md` | 87 | 80 | 3 | 3/80 = 3.75% |
| `dashboard/README.md` | 38 | 32 | 3 | 3/32 = 9.38% |

Counted units, identified by wording rather than an opaque automated classifier:

- **Abundance:** the opening review boundary; starting categories not being a
  complete list; modelled income/consumption and missing upstream replay;
  global distribution not establishing a person's IF; the $30 line not defining
  the good life; country descriptions not establishing a current appointment.
  This deliberately counts several specific evidence ceilings as well as the
  general boundary, rather than claiming only one disclaimer remains.
- **Every IF:** the opening working-frame boundary; the shortened-quote and
  employer-naming notice; attribution of the five-part record to Ren. The worked
  pair, quote source, discretion distinction and conditional-dependency account
  remain substantive parts of the explanation, not repeated disclaimers.
- **From IF:** the opening commissioned-proposal boundary; barrier frequency
  not establishing causal importance; historical analogies supplying neither
  a timetable nor population equivalence. This broad count now includes the
  contentious method limits, rather than excluding them to pass the gate.
- **README:** the agent-built status sentence; the public-release-blocked
  sentence; the synthetic surface's no-authority clause (counted as a unit even
  though it shares a parsed unit with surrounding table text). The adjacent
  design-purpose and evidence-accountability sentences remain reader-facing
  orientation; they are not new padding. They existed before this pass.

These are creator classifications for a different-owner semantic review, not
an independent gate certificate. The first pass's contentious `from-if` count
was 7/83 = 8.43% and failed. Four additional, logged redundant-status cuts now
bring that broader classification to 3/80. The possible-response label remains;
the opening attribution covers the whole proposal; the requirement for an
accountable decision before action remains; and the worker-specific paragraph
still requires explicit source coverage. No actual national estimate appears
in this draft, so its repeated national-to-individual warning was not the sole
ceiling on an empirical claim. The frequency/causality and historical-transport
limits stay intact. The broader universal public-document gate is not
claimed: the operator reference and dedicated boundary page retain necessary
limitations, and embedded public messages need their own denominators.

## Verification and preserved substance

The hostile replay tests reject unlogged additions, rewritten words, missing
cuts, overlapping cuts, absent reasons, first-person deletions and GAP deletion.
The exact logged cuts reconstruct all four pre-edit bodies without requiring
Git history at test runtime. This is a mechanical change detector, not semantic
provenance proof; a fabricated self-consistent log still requires independent
comparison to the named base commit and capture reading.

The three drafts each keep one opening whole-document boundary sentence.
Their first-person sentence sequences and the company-choice GAP are unchanged;
no naughty-kid passage, tax remedy, corporate provision or parked enough-line
argument is introduced. `OPERATIONS.md` retains moved operator text, including
the source acquisition and publication ceilings. The README keeps the explicit
prototype release block, synthetic surface label, build inputs and navigation.

Five inherited prose tests initially failed because they required the exact
redundant disclaimers being removed. They now check the surviving substantive
conditions: conditional rather than scheduled work, decisions held elsewhere,
coexisting or reversible scenarios, the proposal's concrete research questions,
and the preparation table's evidence-before-decision requirement. The underlying
negative overclaim tests remain. All 63 communications tests and the focused
dashboard operator-navigation test pass; full integration remains root's check.

The casing regression failed on the inherited validator, then passed after
the scoped rule. Historical lowercase metadata remains accepted deliberately.

## Exact deletion log

The following records use the body at `16963f8`, excluding frontmatter.
Each cut is reproduced exactly, with its original UTF-16 string offset and
reason. README passages move verbatim to `dashboard/OPERATIONS.md`; its only
added sentence links that reference. No draft prose is added. Abundance already
passes the inherited ratio; one repeated non-selection disclaimer is deleted
while its adjacent source ceilings remain unchanged.
This replay checks mechanics, not semantic fidelity or independent approval.

```deletion-log
{
  "path": "drafts/every-if-is-somebodys-when.md",
  "before_sha256": "782b774dbf93e85bd18338fc8c3d5303d742a5d9a92dcdca7164ba2bcc5ae763",
  "deletions": [
    {
      "offset": 1763,
      "text": "These are illustrative applications of the captured grammar. ",
      "reason": "The immediately preceding introduction already calls this a worked pair; scope questions and captured source remain."
    },
    {
      "offset": 4225,
      "text": "leaves the remedy open. It ",
      "reason": "Delete the repeated remedy-open declaration while preserving the existing antecedent and question: The frame asks which condition an arrangement changes."
    },
    {
      "offset": 4664,
      "text": "It is not a date, forecast,\nguarantee or commitment. ",
      "reason": "The surrounding paragraph describes conditional work and the next explains unexpected order; remove the repeated catalogue of non-claims."
    },
    {
      "offset": 4717,
      "text": "The wording is not a validated linguistic test of\nsomeone's role or authority. ",
      "reason": "No linguistic-validation claim is made; the paragraph keeps the dependence on decisions held elsewhere."
    },
    {
      "offset": 6255,
      "text": " The choice of a solution\nremains open to evidence and argument.",
      "reason": "The single opening boundary and absence of an adopted remedy remain; remove the repeated closing status declaration, retaining the actionable condition question."
    }
  ]
}
```

```deletion-log
{
  "path": "drafts/from-if-to-when.md",
  "before_sha256": "ee199d95dec7b0c066f6ba00c71a675409c531c430a4777fe52a2633d40cee65",
  "deletions": [
    {
      "offset": 1725,
      "text": "The following situations are an incomplete, unscored scenario\ntaxonomy. ",
      "reason": "The section is already titled Scenarios, not a calendar; the preceding captured sequencing concession and following coexist/reverse/never-arise sentence retain the substantive ceiling."
    },
    {
      "offset": 3090,
      "text": "A high national percentage cannot\nchoose a particular rural person's binding condition. ",
      "reason": "No national estimate is asserted in this draft. The later worker paragraph requires the page to say what sources actually cover when they cannot answer for that worker, alongside explicit service/population/place reporting. Delete this repeated generic warning, not an empirical claim's only ceiling."
    },
    {
      "offset": 3294,
      "text": ", not predictions",
      "reason": "Delete repeated prediction-status wording; the same label still says Possible public responses, and the retired calendar/coexist/reverse conditions remain."
    },
    {
      "offset": 4060,
      "text": "**The arithmetic does not select a remedy.**\n",
      "reason": "No arithmetic in this passage chooses a remedy. Keep the actual candidate mechanisms and research questions; delete the redundant disclaimer."
    },
    {
      "offset": 4119,
      "text": "is not choosing among those routes here. It ",
      "reason": "Delete the repeated non-selection disclaimer while preserving the existing antecedent and concrete research questions: This proposal asks what a route changes."
    },
    {
      "offset": 5551,
      "text": "It cannot authorise the option by itself.\n",
      "reason": "The next sentence still requires actor, funding, capacity and accountable decision beside the option before real-world action; remove the repeated prohibition."
    },
    {
      "offset": 5746,
      "text": "The following seven-part update is Ren's communication scaffolding. ",
      "reason": "The opening commissioned-proposal boundary and canonical author metadata already attribute this proposal to Ren; remove the repeated attribution."
    },
    {
      "offset": 6829,
      "text": "These are agent-proposed preparation options for review through the existing\nprotocols. They are questions for research and deliberation, not instructions\nissued to households or countries.\n\n",
      "reason": "The opening boundary identifies the whole piece as Ren's proposal; the options table itself contains questions and evidence needed before consequential decisions."
    }
  ]
}
```

```deletion-log
{
  "path": "dashboard/README.md",
  "before_sha256": "497ce9cee45c62b8cffc76c05d3ad68888307baf3bd375d233e2210d2302c271",
  "navigation_addition": "[Operator details](OPERATIONS.md) covers validation, evidence acquisition, synthetic fixtures and release governance.\n\n",
  "deletions": [
    {
      "offset": 621,
      "text": "It does not predict history, assign a single transition score, or confer policy\nauthority. ",
      "reason": "Move the repeated non-prediction/non-authority sentence; retain the reader-facing design purpose and evidence-accountability principle in README."
    },
    {
      "offset": 1694,
      "text": "None of these surfaces is approved for public warning or operational action. The\nglobal snapshot schema accepts only `none` and `proposed` action states. It\nrejects operational state claims even when their metadata looks complete,\nbecause no trusted external authority-verification boundary exists yet.\n\nThe programme iteration 06 Observatory uses invented Round 04 fixture data to test whether a complex\ntransition record can remain inspectable. Its mechanically computed `true`\nstate is not an empirical finding. Its 62% forecast concerns a future event and\nis not a confidence score for the current IF. Its source bundle, forecast and\npreparation proposal are hash-bound, while truth, freshness, authority and\npublication remain closed. Its gate horizon presents local fixture checks and\nreal-world release gates in separate groups, with the four closed real-world\ngates first. Local reproduction is not a readiness score. The page leads with a\ndominant demonstration warning and states that the named NSW workers and\nhouseholds have not reviewed it.\n\n",
      "reason": "Detailed synthetic-fixture and operational-state discussion moves intact to the operator reference."
    },
    {
      "offset": 3002,
      "text": "This preserves the evidence envelope used for a claim. `tools/build.mjs` performs\nbuild-time JSON Schema and semantic validation before embedding a snapshot. It\nverifies a separately hash-pinned adapter and classification policy, every\nrecord-index identity/path/digest and correction link, complete raw-input coverage for local-hash claims,\nbyte-to-series equivalence, derived arithmetic, timing and the seven-part\nupdate. The default public build accepts only the latest indexed record. It also\nrejects missing signal references and false authority claims. A non-empty\npossible-path reference is rendered only after the build resolves a\ncontent-addressed transition bundle, re-hashes the repository-contained path\nartifact, applies the repository-owned path validator and proves exact `WHO +\nVERB + OBJECT + STANDARD + PLACE + PERIOD + IF` alignment.\n\n`snapshot_id` names the evidence cut-off date. `record_id` names an immutable\nrevision of that dated claim record. This distinction permits a same-day\ncorrection such as `2026-09-08.r2` without overwriting `2026-09-08.r1`. A later\ncorrection keeps the original evidence-date identity while `generated_at` and\n`correction.issued_on` record when the correction was actually produced.\nRecord `2026-09-08.r3` adds the transition-bundle boundary without rewriting\nthe frozen `r2` bytes.\n\nThe current snapshot remains `research_draft_unverified`. Eight inherited macro\nseries lack retained upstream response bytes; four added primary-care series\nhave locally retained source evidence. Read each series' acquisition label,\npopulation and reference period separately rather than transferring one\nseries' evidence status to the whole panel.\nEven retained bytes can establish only `captured_local_hash_consistent` status,\nnot publisher authenticity. `--mode=publishable` always fails with\n`MISSING_TRUSTED_ACQUISITION_BOUNDARY` until a separately verifiable receipt\nsystem exists. Captured inputs must also carry 2xx HTTP and matching media\nmetadata.\n\nThere is no single truthful freshness clock. The schema 2.1 snapshot retains\nthe schema 2.0 timing contract, which keeps **reference\nperiod**, **publisher vintage**, **publisher release**, **retrieval**, **byte\nacquisition**, **derived computation** and **record generation** separate.\nBuild-time assessments use exact selected point lineage. An unknown clock stays\nunknown and must not make a value look fresh. A recent retrieval cannot freshen\nan old reference period, and a derived result cannot borrow the newest point in\na source it did not use. External observations are assessed separately for each\nentity, measure and year. Derived lineage marks baseline, comparator and endpoint\nroles, so an intentionally historical baseline cannot make a current endpoint\nlook stale. Unbound derived points say `TIMING NOT ASSESSED FOR THIS POINT`.\nLegacy calendar retrieval dates are **reported and unverified retrieval\nmetadata**, not verified byte acquisition. Local publisher dates become bounded\ncivil-date intervals using recognised IANA timezones. Non-existent local dates\nfail validation. Internal computation and assessment clocks remain unknown\nuntil retained execution artifacts and a governed producer registry exist.\nCaller assertions cannot promote them.\n\nAssessment output separates assessment execution, structural lineage, input\ntiming readiness, evidence readiness and publication eligibility. A successful\nassessment therefore does not imply ready evidence or permission to publish.\nEach generated bundle is validated against\n`schema/timing-assessment-set.schema.json`, names and hashes its evaluator, has\na canonical content address, and binds the record bytes, policy bytes, evidence\ncut-off and record generation time. Historical records are validated through\nthe content-addressed `schema/snapshot-schema-registry.json`, not the latest\nschema alone.\n\n`tools/fetch_snapshot.py` is now a verifier for frozen v1.8 raw-input fixtures.\nIts live writer is retired until a replacement satisfies the 2.0 timing and\nacquisition contract. The current record combines inherited macro context with\na separately retained primary-care addition, not a fresh fetch of every series.\n\nThe browser cannot load arbitrary local snapshots. A changed snapshot must go\nthrough the build and test path.\n\n### Executable IF dashboard projection\n\n`schema/executable-if-view.schema.json` defines a bounded projection contract\nfor the executable IF kernel. `tools/validate-executable-if-view.mjs` validates\nan in-memory view plus retained kernel bytes. It never shells out, reads the\nlatest snapshot index or invents a second truth evaluator.\n\nThe projection must recompute the complete evaluation receipt and display that\nexact `computed_rule_state`. Its public legend keeps `true`, `false`, `unknown`,\n`stale` and `conflicted` distinct, with a different explanation and next step\nfor each. Source identity, exact claim and scope, evaluation clock, evidence\nstate and observation hashes are always visible.\n\nMacro series are context only. They cannot satisfy predicates or alter the IF\nstate. Forecast probabilities are also orthogonal to current condition truth,\nincluding probabilities of zero or one. A computed state remains neither an\nempirical truth claim nor authority to act.\n\n",
      "reason": "Validation, timing, acquisition and projection details move intact to the operator reference."
    },
    {
      "offset": 13025,
      "text": "\n## What the global snapshot can say\n\nThe snapshot includes eight inherited macro series (six source series and two\nderived aggregate comparisons) and four added primary-care measures. All twelve\nare available under the panel's status vocabulary.\nAvailable does not mean directly observed or decision-ready. Each point is\nlabelled as a published statistic, published estimate, modelled estimate,\nnowcast, forecast, direct observation or derived value. The labour-income\ncomparison, for example, compares indexed output per person with constructed aggregate labour\nincome per person. It is not a household purchasing-power measure, causal AI\nestimate or cohort outcome.\n\nEight former unmeasured placeholders were deleted with reasons in\n`../pilots/australia/basket/panel-dispositions.json`. The four additions do not\nreplace household resource margin, productive-power concentration, readiness\nor trust with renamed health proxies. Those wider questions remain research\ngaps; a twelve-series available panel is not a complete transition instrument.\n\n## Scenarios, possible paths and actions\n\n- Scenario arithmetic uses explicit example assumptions or user-entered inputs.\n  It is not seeded silently from observations and is not a forecast.\n- The current World snapshot has no registered typed possible-path assessment.\n  It therefore displays no crisis path, forecast, option or action card.\n- The current snapshot does not bind a complete condition-evolution ledger.\n  The interface says so beside the IF map. Its current state cannot prove how\n  wording, scope or evidence changed, so no history-based decision is eligible.\n- Free-text failure modes and actor playbooks were removed because labels alone\n  could not bind hypotheses, discriminators, condition gates or authority.\n- A non-empty possible-path reference passes only when the declared transition\n  bundle and typed path bytes are repository-contained and checksum-exact, the\n  fixed path validator accepts every required role and graph invariant, and the\n  bundle-native scope, canonical conditions and complete dashboard IF scope\n  match. Symlinks, drift and prose substitutes fail closed.\n- The displayed path is a build-derived projection. Its source bundle remains\n  `research-draft`, grants no authority and cannot turn a hypothesis into a\n  finding, forecast or command.\n- A public signal cannot become an operational action without a separate owner,\n  authority, review, expiry, help route and appeal path.\n\nThe atlas download is deliberately a **selection-only artifact with external\nrecord binding**. It contains only the selected series and their point timing\nassessments, while preserving the source record, policy, evaluator and\nassessment-bundle identities. It omits the seven-part public update because\nthat update is a separate claim graph whose dependencies may extend beyond the\ncurrent atlas selection.\n\n## Australia evidence room: evidence boundary\n\nThe Australian pilot freezes the August 2026 NERO archive and exposes 440\nseparate modelled series for five clerical occupations across 88 SA4 regions.\nJobs and Skills Australia says occupation and region estimates must not be\nsummed or combined, so the interface does neither.\n\nThe historical Australia baseline remains pinned as\n`research_draft_unverified` with `not_retained_unverified` source bytes because\nthat describes the state when it was created. A later capture now retains the\nexact 48,613,300-byte archive, official landing and licence pages, and response\nheaders. Byte snapshots of a pinned in-process builder and archive reproduce\nthe canonical numeric-and-identity projection of all 440 baseline series. The\nhistorical file is independently hash-pinned. This establishes local artifact\nintegrity and bounded derivation only. It does not certify the historical\nmetadata or prose, authenticate the publisher, establish classification\nversions or prospective chronology, validate modelled estimates as direct\nobservations, or permit a warning.\n\nThis archive cannot support a historical warning backtest. It has no\nas-published vintage panel, first-release revisions, uncertainty interval or\nindependent target labels. It can support a prospective, no-consequence shadow\nrehearsal after governance gates pass. See\n`../pilots/australia/nero-backtest-and-shadow-plan.md`.\n\n## Known release blockers\n\n- The seven-part update has not passed comprehension testing with affected\n  workers, community organisations, policy decision-makers or general readers.\n- No approved action owner, authority, help route or appeal path exists.\n- Global indicators do not carry complete point-of-claim uncertainty and\n  revision metadata.\n- The IF path is now a validated decision record, but the current claim still\n  lacks an approved cohort, geography, horizon and outcome threshold. All five\n  conditions therefore remain `unknown` and no action is eligible.\n- Keyboard, screen-reader, contrast, reduced-motion and mobile behaviour need\n  rendered accessibility verification.\n- Privacy, security, data-governance and correction processes need independent\n  review.\n- The prospective Australian rehearsal has not accumulated future vintages or\n  independent outcome evidence.\n\n## Provenance and editorial authority\n\nThe code, research and wording are agent proposals. Source series remain\nthird-party facts with dates and caveats. Nothing in this dashboard becomes\nFernando's view until he reviews and adopts it. Corrections remain visible in\nthe page and repository history.\n",
      "reason": "Move detailed global evidence, scenario, Australian archive and governance sections intact to OPERATIONS; README retains its surface-specific scope and build navigation."
    }
  ]
}
```

```deletion-log
{
  "path": "drafts/abundance-has-an-if.md",
  "before_sha256": "278656212910a5b698c83ffa4ebbe6f96df3ab41c5c1b81c04b0bc84df6f6235",
  "deletions": [
    {
      "offset": 7036,
      "text": " This comparison illustrates the question; it does\nnot choose a system for everyone.",
      "reason": "Delete repeated whole-comparison non-selection disclaimer; the sourced descriptions, eligibility limitation and inability to establish an appointment remain beside the claim."
    }
  ]
}
```
