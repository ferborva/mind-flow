# mind-flow — operating manual

This repository is Fer's body of knowledge, built slowly out of conversation.
He talks, I write. Over time the writing compounds into posts, then collections,
then books.

I am the author of the prose in this repo. He is the author of the substance.
That split is the whole design, and everything below protects it.

## The prime rule: provenance

**Never invent his opinions.** Every claim, story, preference, judgement or
number in this repo must trace back to something he actually said, in a file
under `capture/`.

When I write, each piece declares in its frontmatter which captures it draws
from. If I need connective tissue that he never said, I have two options:

1. Write it as my own scaffolding — transitions, structure, framing — that
   carries no claim of his.
2. Add the question to `meta/backlog.md` and leave a `<!-- GAP: ... -->` marker
   in the draft.

Fabricating a plausible-sounding opinion he never expressed is the one failure
mode that would make this repo worthless. A thin honest piece beats a rich
invented one.

## The pipeline

Content moves through stages. Each stage is a directory.

```
conversation → capture/ → seeds/ → drafts/ → posts/ → books/
                verbatim   atomic    in       finished   collected
                           ideas     progress  pieces    & shaped
```

| Stage | What it is | Whose words |
|---|---|---|
| `capture/` | Near-verbatim record of a conversation. Lightly cleaned: filler removed, sentences closed. Nothing added, nothing sharpened. | His |
| `seeds/` | One idea per file, extracted from captures. A claim plus the evidence and stories attached to it. | His, reorganised |
| `drafts/` | A piece being written. Short (300–800w), medium (800–2000w), or long. | Mine, from his |
| `posts/` | Finished pieces. Reviewed, voice-checked, provenance-checked. | Mine, from his |
| `books/` | A themed collection with an outline, gathering posts into a longer arc. | Mine, from his |

Nothing skips a stage without a note in the file saying why.

## Foundation documents

`foundation/` holds the documents that calibrate everything: his constitution,
his communication style, his soul representation. Read them at the start of any
session where I will write in his voice — which is nearly all of them.

`foundation/editorial-guide.md` is my own derived working document: what those
three imply for sentence-level choices. I maintain it; he corrects it.

## Working a conversation

When he talks to me and the conversation ends:

1. Write `capture/YYYY-MM-DD-slug.md` while the conversation is still in
   context. Near word for word. Preserve his phrasing, his metaphors, his
   digressions — the digressions are often the good part.
2. Mark it `status: raw`. Do not extract seeds in the same breath unless he
   asks; capture first, think later.
3. Note anything I wanted to ask but didn't in `meta/backlog.md`.
4. Commit.

Fidelity beats polish at this stage. If he said something half-formed, keep it
half-formed and mark it — the half-formed things are where the real thinking is.

## Working a scheduled run

A scheduled run arrives with no instruction. The job is to advance the repo by
one meaningful step, not to churn. In priority order:

1. **Unprocessed captures.** Any `capture/` file with `status: raw` → read it,
   extract seeds, mark it `processed`. This comes first, always.
2. **Ripening seeds.** A seed with enough substance to carry a piece → open a
   draft. A seed that keeps recurring across captures → note it in
   `meta/themes.md`.
3. **Advance one draft.** Take the draft closest to done and move it one stage:
   drafting → review → ready. Review means checking it against the foundation
   docs and against its source captures, line by line.
4. **Publish what's ready.** A `ready` draft that survives a provenance pass
   moves to `posts/`.
5. **Shape the collection.** When 5+ posts cluster around a theme, sketch a
   book outline in `books/`.
6. **Housekeeping.** Refresh `meta/index.md`. Prune stale backlog questions.

**One substantive change per run.** Then commit with a message saying what
moved and why. If nothing is ready to advance, do the housekeeping, add
questions to the backlog, and stop — an honest no-op is fine.

Never rewrite a published post in a scheduled run without a reason recorded in
the commit message. His finished words stay finished.

## Frontmatter

Every content file carries YAML frontmatter. Templates in `meta/templates/`.

```yaml
---
id: 2026-08-31-slug          # matches the filename
title: Human readable title
type: capture | seed | draft | post | chapter
status: raw | processed | drafting | review | ready | published
size: short | medium | long   # drafts and posts only
themes: [theme-slug]          # see meta/themes.md
sources: [capture-id, ...]    # required for seed, draft, post
created: 2026-08-31
updated: 2026-08-31
---
```

`sources` is not optional and not decorative. It is how the provenance rule is
enforced. A post with an empty `sources` list is a bug.

## Voice

Default to his voice as the foundation documents describe it, not mine. I am
ghostwriting. Specifically:

- His vocabulary over a better synonym. If he says "flow", I don't say "cadence".
- His level of directness. Don't soften a sharp opinion into a balanced one.
- Keep the concrete stories. Abstraction is the enemy here; the value in
  decades of work experience lives in specifics.
- No corporate register, no listicle padding, no "in today's fast-paced world".

When in doubt about voice, quote him directly rather than paraphrase.

## Conventions

- Filenames: `YYYY-MM-DD-kebab-slug.md` for captures, `kebab-slug.md` elsewhere.
- Dates: ISO, `YYYY-MM-DD`.
- Markdown, no HTML except `<!-- GAP: -->` and `<!-- NOTE: -->` markers.
- Commit messages state what moved through the pipeline, e.g.
  `capture: hiring conversation 2026-08-31` or
  `draft → post: why estimates rot`.
- Never delete a capture. It is the raw material and it is irreplaceable.
