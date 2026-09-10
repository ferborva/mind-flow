---
id: round-09.1-editorial-repairs
title: Round 09.1 editorial repairs and forward provenance
type: internal-review
status: ready-for-independent-review
provenance: commissioned-proposal
author: Ren
created: 2026-09-10
updated: 2026-09-10
---

# Round 09.1 editorial repairs

**The WHEN ceiling is restored; the conservative disclaimer target is now missed.**
The repaired draft has 4/79 counted units (5.06%), not less than 5%. Protecting
the distinction between conditional work and a forecast takes priority over
manufacturing a passing ratio. No filler was added and no methodological limit
was relabelled to make the arithmetic pass.

## Disposition and provenance

| Finding | Repair and boundary |
| --- | --- |
| Naughty-kid attribution | Seed and current narrative register identify Ren's reading, permitted by the forwarded Round 09 brief. A commission is not Fernando's substance. Observation versus imperative remains open in the backlog. The draft restoration itself is unchanged. |
| Missing WHEN ceiling | Restore “It is not a date, forecast, guarantee or commitment.” using the explicit repair below. Original deletion-log JSON stays byte-identical. |
| Analysis in raw storms capture | Move all six implementation bullets to the backlog, labelled Ren's analysis. Keep the actual answers, asked follow-up and `status: raw`. No answer about dependent household members is invented. |
| Processed money capture still raw | Forward-only `raw` to `processed` metadata transition. Historical capture commit `832143d` and its words are not rewritten. The supplied capture's interpretive “What this settles” and “Loose ends” sections are reviewer framing, not extra verbatim words from Fernando; in particular they cannot settle the image's imperative force. |
| Main-unchanged attribution | New capture transcribes the retained question and exact answer, “Keep main unchanged; integrate the capture on Round 9 only”. Transcription date is not presented as an independently timestamped response. |
| Author casing | Current `drafts/`, `posts/`, `books/`, `governance/` and root `boundaries.md` enforce `Ren`, including future files in these roots. Historical reviews, sealed forecast materials, imported sources and foundation metadata retain their bytes. Other programme roots are not certified by this scoped rule; new current author surfaces must extend its explicit scope. Three current lowercase governance/boundary fields are corrected. |
| Capture in prior seal merge | Declared historical provenance, not rewritten. Round 09.1's forward capture and editorial changes should land in an ordinary authored commit rather than being introduced only by a seal merge. |

## Forward-only byte accounting

The [historical narrative register](round-09-narrative-provenance.md) retains its
four deletion records and original capture-amendment JSON. In particular, the
old reason that called the image an explicit author instruction is historical
and incorrect; preserving that record is not endorsing it. Current tests first
reverse these two narrowly logged Round 09.1 repairs, then apply the original
amendment and deletion replay. SHA-256 endpoints detect drift, not semantic
approval or source truth. No issued forecast, frozen source or historical
commit is amended by this repair.

```editorial-amendment
{
  "path": "drafts/every-if-is-somebodys-when.md",
  "scope": "body-excluding-frontmatter",
  "before_sha256": "5e22a3fe71206a85531aa9b2533c9b60e507a9849e152b25998cad06c3ba529b",
  "after_sha256": "ca97eee88dc16b34030c0bc4ada4696152864ea004278cfece17d6c192fa878d",
  "changes": [
    {
      "before": "**WHEN is a prompt for conditional work.** A person can use the sentence while still\ndepending on decisions held elsewhere.",
      "after": "**WHEN is a prompt for conditional work.** It is not a date, forecast, guarantee or commitment.\nA person can use the sentence while still depending on decisions held elsewhere.",
      "reason": "Restore the explicit claim ceiling removed in Round 09; retain the conditional-work explanation without enlarging prose to buy a passing ratio."
    }
  ]
}
```

```editorial-amendment
{
  "path": "capture/2026-09-10-where-the-money-sits-and-the-weather-station.md",
  "scope": "whole-file",
  "before_sha256": "b7e3851b2d780939ea37ee876212c3fa7042f22638f944b1e625fb4204ea9338",
  "after_sha256": "9fb0c7652ad86e383bdf4b106b69c78d6b736c572cd7eeab712b35bb96e4a52d",
  "changes": [
    {
      "before": "status: raw\n",
      "after": "status: processed\n",
      "reason": "Seeds and draft already draw from this capture; metadata now records that extraction without changing the supplied words or their historical commit."
    }
  ]
}
```

## Current disclaimer inventory

The denominator uses the existing `proseSentences` parser, with standalone
list-number fragments removed for the conservative count. These are lexical
units, not a claim that the parser understands prose: abbreviation fragments
and joined table cells remain limitations. Numerators are manually classified
and identified below; tests pin the scope, not the semantics.

| Current document | Lexical units | Conservative units | Counted units | Ratio |
| --- | ---: | ---: | ---: | ---: |
| `drafts/abundance-has-an-if.md` | 137 | 132 | 6 | 4.55% |
| `drafts/every-if-is-somebodys-when.md` | 79 | 79 | 4 | **5.06%, target unmet** |
| `drafts/from-if-to-when.md` | 88 | 81 | 4 | 4.94% |
| `dashboard/README.md` | 38 | 32 | 3 | 9.38% |
| `signals/countries/measurement-view.md`, broad non-templated limits | 390 | 390 | 18 | 4.62% |
| Same reader, also counting each country's two-unit binding assessment | 390 | 390 | 118 | **30.26%** |

The three draft and README numerator classifications remain those listed in
the historical register, with the restored WHEN ceiling added as a fourth
unit. The country reader's 18 non-templated units deliberately count
methodological and source limits broadly, including GDP estimates, rounding,
missingness, native flags, source timezone, construct ceilings and unassessed
comparability. This is not the independent review's narrower 1.8% count.

The reader's **50 “Binding category: unknown” statements and 50 following
scope explanations are empirical assessment results, not disposable
boilerplate**. Including all 100 gives the alternate 30.26% ratio. Named gap
definitions and individual missing-observation cells remain substantive
content, not counted hedges; the table does not claim a count of every possible
limitation under every classification. A universal less-than-5% reader rule
would therefore be unmet under the all-binding-assessments interpretation.
Neither missing data nor unknown bindings should be hidden to pass it.

```disclaimer-inventory
[
  { "path": "drafts/abundance-has-an-if.md", "lexical_units": 137, "conservative_units": 132, "disclaimer_units": 6 },
  { "path": "drafts/every-if-is-somebodys-when.md", "lexical_units": 79, "conservative_units": 79, "disclaimer_units": 4 },
  { "path": "drafts/from-if-to-when.md", "lexical_units": 88, "conservative_units": 81, "disclaimer_units": 4 },
  { "path": "dashboard/README.md", "lexical_units": 38, "conservative_units": 32, "disclaimer_units": 3 },
  {
    "path": "signals/countries/measurement-view.md",
    "lexical_units": 390,
    "conservative_units": 390,
    "binding_assessment_units": 100,
    "non_templated_counted_units": [
      { "number": 2, "starts_with": "These are dated national statistics" },
      { "number": 3, "starts_with": "Binding categories remain unknown" },
      { "number": 5, "starts_with": "Fernando has not chosen" },
      { "number": 6, "starts_with": "IMF economies include Hong Kong" },
      { "number": 7, "starts_with": "GDP estimates may be present" },
      { "number": 10, "starts_with": "Values display at most three decimal places" },
      { "number": 12, "starts_with": "The series cover different reference years" },
      { "number": 13, "starts_with": "Missing entries are not backfilled" },
      { "number": 14, "starts_with": "Empty native observation flags do not certify" },
      { "number": 15, "starts_with": "ILO labour-income shares are publisher-modelled" },
      { "number": 16, "starts_with": "ILO native flags are retained; their meaning is not verified" },
      { "number": 17, "starts_with": "National averages do not establish household access" },
      { "number": 19, "starts_with": "Headline typical-consumer basket price change" },
      { "number": 24, "starts_with": "Population electricity-access share" },
      { "number": 29, "starts_with": "2025; TOC last.update" },
      { "number": 30, "starts_with": "Aggregate labour-income distribution context only" },
      { "number": 34, "starts_with": "The proposed weather criteria remain unadopted" },
      { "number": 35, "starts_with": "No rank is computed in this reader" }
    ]
  }
]
```

## Validation

Six new expectations failed on the prior implementation: governance casing,
the missing WHEN ceiling, image attribution, raw-capture analysis separation,
processed status and captured integration instruction. Forward amendment tests
then failed before the reverse-repair helper and records existed. Hostile
checks reject extra prose, changed source bytes, missing/duplicate anchors,
blank reasons and mismatched endpoints. Historical deletion and first-person
checks are retained. Passing tests verify these specific controls, not that
Fernando has approved publication or answered the parked questions.
The inventory expectation also failed before the current reader was added.
