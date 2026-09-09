# Internal reviews

Documents in this directory are working analysis produced during review. They are not approvals by Fernando Bordallo, project governance, domain experts, affected communities, or any public authority.

Review findings remain provisional until they are resolved, tested, and accepted through the project's governance process. A reviewed artifact does not become public-ready merely because a review exists.

## Review round map

| Round | Role | Brief | Freeze | Disposition |
|---|---|---|---|---|
| 02 | Initial dashboard and thesis review | [`external-review-brief-round-02.md`](external-review-brief-round-02.md) | None | [`round-02-synthesis-and-round-03-plan.md`](round-02-synthesis-and-round-03-plan.md) |
| 03 | Multi-lane adversarial review of `f5b3b643e80e0f16d7dadd13805df6accf9526ed` | [`external/round-03/README.md`](external/round-03/README.md) | Frozen pack named in its brief | [`round-03-disposition-ledger.json`](round-03-disposition-ledger.json) |
| 04 | Integrated contract review candidate | [`../meta/round-04-external-review-brief.md`](../meta/round-04-external-review-brief.md) | [`../meta/review-freeze/round-04.review-freeze.json`](../meta/review-freeze/round-04.review-freeze.json) | Incorporated into Round 06 |
| 05 | Internal integration checkpoint | None | None | No external review was claimed |
| 06 | Completed adversarial review | [`../meta/round-06-external-review-brief.md`](../meta/round-06-external-review-brief.md) | [`../meta/review-freeze/round-06.review-freeze.json`](../meta/review-freeze/round-06.review-freeze.json) | [`round-06-disposition-ledger.json`](round-06-disposition-ledger.json) |
| 07 | Repair candidate for independent retest | [`../meta/round-07-external-review-brief.md`](../meta/round-07-external-review-brief.md) | [`../meta/review-freeze/round-07.review-freeze.json`](../meta/review-freeze/round-07.review-freeze.json) | [`round-07-component-review-manifest.json`](round-07-component-review-manifest.json) |

Round 05 was an internal integration checkpoint, not a missing external review.
The Round 06 freeze pins the reviewed bytes at commit
`318d095c219d1bbec947876cebd982bbc55841d1`. Public release and operational use
remain blocked while Round 07 repairs are developed and independently retested.
The Round 07 manifest divides the integration tree into six sequential,
path-bounded review lanes. Those lanes improve reviewability but do not make a
partial stack independently mergeable or grant approval.
The Round 07 receipt pins candidate `5da6a1a0df6c43d6e76200f71f9298615c9c9f88`.

The review views are PRs
[#3](https://github.com/ferborva/mind-flow/pull/3),
[#4](https://github.com/ferborva/mind-flow/pull/4),
[#5](https://github.com/ferborva/mind-flow/pull/5),
[#6](https://github.com/ferborva/mind-flow/pull/6),
[#7](https://github.com/ferborva/mind-flow/pull/7) and
[#8](https://github.com/ferborva/mind-flow/pull/8), in dependency order.

Severity means:

- **Stop-line:** blocks public release or operational use.
- **Major:** requires resolution and another review before public release.
- **Minor:** improves clarity, safety, accessibility, or evidential quality.
