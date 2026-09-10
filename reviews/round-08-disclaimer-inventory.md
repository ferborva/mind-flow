---
id: round-08-disclaimer-inventory
title: Round 08 public disclaimer inventory
type: internal-review
status: incomplete
provenance: commissioned-proposal
author: Ren
created: 2026-09-09
updated: 2026-09-10
---

# Round 08 public disclaimer inventory

**The universal under-five-percent gate is unmet.** Five public drafts now
have one general boundary statement each. The shortest, correspondence, has
20 mechanically segmented sentences and one wrapper boundary, exactly 5%.
The primary surfaces below now have an explicit audience classification;
embedded messages require their own denominators rather than borrowing the
length of an operator manual. No denominator is padded to produce a pass.

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

Counts below describe the E working tree, with September 10 recounts for the
revised abundance essay, programme and dashboard README. The
inventory includes public entry points and materials labelled communications
or public-guide proposals. Technical operator documents, research and past
reviews remain accessible in the repository and need audience classification
before the phrase “every public document” can be considered closed.

| Document | Lexical sentences | General boundary sentences reviewed | Status |
| --- | ---: | ---: | --- |
| `drafts/name-the-if.md` | 135 | 1 | Creator rate 0.74%; independent classification pending |
| `drafts/abundance-has-an-if.md` | 136 | Specific source and inference ceilings | September 10 restoration; fresh independent classification required, not the earlier 76-sentence draft |
| `drafts/every-if-is-somebodys-when.md` | 83 | 1 | Creator rate 1.20%; independent classification pending |
| `drafts/from-if-to-when.md` | 95 | 1 | Creator rate 1.05%; independent classification pending |
| `drafts/message-to-the-moonshot-mates.md` | 20 | 1 | Exactly 5%; strict gate unmet |
| `communications/README.md` | 210 | 1 wrapper | Editorial workbench with embedded public scripts; wrapper rate 0.48%, not a scripts-level pass |
| `communications/comprehension-test.md` | 231 | 4 opening sentences, including threshold validity | Facilitator research protocol, not a standalone public update |
| `communications/early-action-and-negotiation-framework.md` | 550 | 7 opening sentences, plus message-specific status | Negotiation design workbench with independently extractable public option cards |
| `communications/if-public-language-contract.md` | 263 | 6 opening sentences, including provenance | Editorial language specification with message templates |
| `communications/labels-and-headlines.md` | 105 | 2 wrapper sentences | Editorial rules; fictional headlines and claim ceilings remain local |
| `communications/public-experience-contract.md` | 64 | 5 opening sentences, plus required rendered labels | Product specification; each rendered public state has its own boundary requirements |
| `communications/templates.md` | 132 | 2 wrapper sentences, plus fictional-example status | Template library; each instantiated message is a separate public document |
| `communications/transition-field-guide.md` | 180 | 1 wrapper | Direct public guide; wrapper rate 0.56%; substantive condition ceilings retained |
| `README.md` | 39 | Original author-provenance passage | Repository public entry; imported first-person voice needs capture/history review, not reassignment to Ren |
| `governance/public-charter.md` | 117 | 1 opening boundary | Coordinator consolidated proposal status; substantive governance prohibitions and release conditions remain, not counted as redundant wrapper disclaimers |
| `meta/abundance-transition-programme.md` | 133 | Local evidence and authority ceilings | Includes four added-series justifications; no universal classification pass claimed |
| `dashboard/README.md` | 146 | Whole-prototype status plus repeated local authority and evidence limits | Public developer entry and build instructions; omitted from the original inventory, now explicitly in scope; strict classification pending |
| `pilots/australia/web/index.template.html` | Not a Markdown sentence denominator | Eight source/status chips or labels plus a three-sentence footer in the reviewed template | Rendered public evidence room; omission repaired, no percentage pass inferred from a Markdown parser |
| `dashboard/tools/render-primary-care.mjs` plus bound measurement JSON | 112 rendered lexical units; 62 narrative units in the bounded recount below | Seven explicit indicator/authority-status sentences, including five repeated owner-control limits; additional source-specific ceilings | Independently rendered from central `6d2ddfb` on September 10; not a percentage-compliance certificate |
| `paths/README.md` | 79 | 5 opening sentences including synthetic status and truth ceiling | Technical path-contract reference, not a public scenario release |
| `boundaries.md` | 24 | boundary reference | Concentrates necessary limitations by design; no passing percentage claimed |

The correspondence wrapper remains useful review information. Moving it into
frontmatter solely to exclude it from counting would obscure the gate rather
than improve the message. The linked boundary reference itself is necessarily
mostly limitations, which further prevents a literal all-documents claim.

## Audience scope and denominator decision

The independent PR15 review used a stricter classification than the creator's
one-wrapper count. Its pre-follow-up rates were 7.2% for `every-if`, 5.3% for
`from-if-to-when`, 5% for correspondence, 10.6% for the dashboard README and
100% for the boundary reference. These are review findings about that tree,
not freshly reproduced percentages for changed files. They prevent treating
the smaller creator-wrapper percentages above as compliance. The gate is
unmet under that review as well as under the literal universal scope.

The Australian page combines template text, NERO values and the new primary-care
renderer with its bound JSON. The renderer's price and availability populations,
2018 capability date, permission rule role, workforce proxy, owner-control
limits, survey coverage change and ecological-join ceiling are substantive
claim boundaries that must stay visible. Counting only the template would miss
them. Conversely, counting JavaScript tokens as public prose would invent a
denominator. A final rendered-text classification must include both sections,
table cells, source labels, expandable context and footer, without counting
hidden scripts or CSS. This inventory records that remaining integration step;
it does not quietly exempt the evidence room or claim its gate is complete.

### Integrated primary-care recount, September 10

The independent checker executed `renderPrimaryCare(process.cwd())` at central
`6d2ddfb`, including its exact reproduction check of the bound September 10 JSON.
The inspected output includes the current positive-signal research link, excluded
very-remote residents, broad historical kernel scope and same-publisher
corroboration warning. It also includes all five owner roles, source dates,
licence labels, hashes and measurement ceilings; these were not inferred only
from the literal page template.

For a reproducible bounded segmentation, replace closing `p`, `li`, `td`, `th`,
`h2` and `summary` tags, and `br` tags, with a full stop and newline; strip the
remaining tags, replace HTML entities with spaces, then apply `proseSentences`.
This produces **112 display units**, including headings, values, hashes and
other fragments. They are not 112 grammatical sentences. The narrative subset
is units 2–6, 16–23, 32–37, 46–53, 62–68, 77–81, 86–97 and 99–109, **62 units**.
It retains the five role-description sentences and excludes column headings,
numeric-only observations, publisher labels, source metadata and link fragments.

At least seven sentences in that subset explicitly state indicator or authority
status: “These are retained indicators, not five personal-access diagnoses”,
the institutional-owner/authorised-action ceiling, and five “Control not
verified” sentences. This conservative status count alone is 7/62, **11.3%**;
it is not a final adjudication of every evidence ceiling. Even adding all 112
display fragments to the denominator would give 6.25%, still above the gate,
but padding a sentence denominator with hashes would be invalid. Five additional
“Licence unreviewed” labels remain visible outside this narrative subset.

This closes the previously missing inspection of the integrated GP addition,
not the universal metric. Source-local limitations stay next to their claims.
The NERO template's eight status/source labels and three-sentence footer remain
separately inventoried; browser-generated NERO table cells, selected-series
updates and extracted public cards still require their own rendered-state
classification. No whole-site passing percentage follows from this recount.

Direct public prose comprises the five drafts, field guide, repository entry
and public charter. The programme and paths references explain the method;
communications manuals teach authors, facilitators and implementers. Being
an operator manual does not make a file private or exempt from the literal
phrase "every public document". This classification identifies the correct
reader and editing task rather than removing a difficult denominator.

The early-action framework's standalone option cards, the language contract's
claim templates, the README's three scripts and the templates library's
messages must each carry necessary local status when separated from their
parent. A 550-sentence manual cannot make a seven-sentence public card's
disclaimer percentage small. Repeated operational tests of authority are
substantive conditions, while repeated whole-document non-authority statements
are general boundaries. Their identical word "authorised" is not enough to
classify them mechanically. Code-fenced templates, excluded by the lexical
parser, particularly prevent a universal count based on that parser alone.

Capture, foundation, research and historical reviews are publicly accessible
source/reference records, not newly released public claims in Fernando's
voice. They remain traceable and are not rewritten merely to improve an
editorial metric. Their existence, together with the dedicated boundary
reference, prevents treating this bounded rewrite as proof about every byte
accessible through GitHub.

## Remaining work

The field guide and communications entry have now been edited to one wrapper
boundary each, retaining epistemic and service-specific limitations in context.
Independent review should adjudicate the distinction above, segment extracted
message templates, and recompute against the final central tree after root's
public-charter and provenance review. The counts in this creator inventory are
not an independent acceptance certificate. The universal gate stays unmet;
the short correspondence and dedicated boundary reference are explicit
structural conflicts, not missing classifications to conceal.
