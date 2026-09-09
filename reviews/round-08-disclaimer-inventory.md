---
id: round-08-disclaimer-inventory
title: Round 08 public disclaimer inventory
type: internal-review
status: incomplete
provenance: commissioned-proposal
author: ren
created: 2026-09-09
updated: 2026-09-09
---

# Round 08 public disclaimer inventory

**The universal under-five-percent gate is unmet.** Five public drafts now
have one general boundary statement each. The shortest, correspondence, has
20 mechanically segmented sentences and one wrapper boundary, exactly 5%.
Other public-facing documents have not yet received sentence-level disclaimer
classification. No denominator is padded to produce a passing rate.

## Counting method and limits

`proseSentences` in `meta/validate-draft-provenance.mjs` removes frontmatter,
HTML comments, code fences, headings, link targets and emphasis markers, then
splits on sentence-final punctuation and following whitespace. Lists and
tables remain visible text. It is a reproducible lexical denominator, not a
validated sentence parser. Quoted punctuation, ellipses and fragments can
join or split differently from a human count. A reviewer must inspect those
cases before treating a percentage as verified.

A general boundary statement concerns the status or authority of a whole
document. An evidence ceiling concerns the inference justified by a specific
source, such as insurance coverage versus appointment affordability. The
latter stays next to its claim. This distinction is a proposed editorial
classification and does not quietly redefine Fernando's gate; the independent
review needs to adjudicate it.

## Primary public inventory

Counts below describe the E working tree after the five-draft rewrite. The
inventory includes public entry points and materials labelled communications
or public-guide proposals. Technical operator documents, research and past
reviews remain accessible in the repository and need audience classification
before the phrase “every public document” can be considered closed.

| Document | Lexical sentences | General boundary sentences reviewed | Status |
| --- | ---: | ---: | --- |
| `drafts/name-the-if.md` | 135 | 1 | Creator rate 0.74%; independent classification pending |
| `drafts/abundance-has-an-if.md` | 76 | 1 | Creator rate 1.32%; independent classification pending |
| `drafts/every-if-is-somebodys-when.md` | 83 | 1 | Creator rate 1.20%; independent classification pending |
| `drafts/from-if-to-when.md` | 95 | 1 | Creator rate 1.05%; independent classification pending |
| `drafts/message-to-the-moonshot-mates.md` | 20 | 1 | Exactly 5%; strict gate unmet |
| `communications/README.md` | 210 | unclassified | Public entry and operator material mixed |
| `communications/comprehension-test.md` | 231 | unclassified | Research protocol; audience classification needed |
| `communications/early-action-and-negotiation-framework.md` | 550 | unclassified | Long proposal; further editing needed |
| `communications/if-public-language-contract.md` | 263 | unclassified | Public wording and operator rules mixed |
| `communications/labels-and-headlines.md` | 105 | unclassified | Templates and wording rules mixed |
| `communications/public-experience-contract.md` | 64 | unclassified | Technical contract and public explanation mixed |
| `communications/templates.md` | 132 | unclassified | Several separate public messages and operator notes |
| `communications/transition-field-guide.md` | 184 | unclassified | Public guide needs full edit and independent count |
| `README.md` | 39 | unclassified | Repository public entry |
| `governance/public-charter.md` | 118 | unclassified | Proposed public charter |
| `meta/abundance-transition-programme.md` | 107 | unclassified | Rewritten G/S/A programme, local ceilings retained |
| `paths/README.md` | 79 | unclassified | Operator/public scenario explanation mixed |
| `boundaries.md` | 24 | boundary reference | Concentrates necessary limitations by design; no passing percentage claimed |

The correspondence wrapper remains useful review information. Moving it into
frontmatter solely to exclude it from counting would obscure the gate rather
than improve the message. The linked boundary reference itself is necessarily
mostly limitations, which further prevents a literal all-documents claim.

## Remaining work

Independently classify public prose, operator instructions, templates and
boundary references. Apply the same sentence and disclaimer rules to every
included document. Revise the field guide and other long public explanations
without losing the condition-specific evidence ceilings. Recompute from the
final tree, retain failures and report the exact scope of any passing result.
The gate stays unmet until that work is completed or Fernando changes it.
