# External-review input freeze

The Round 04 brief has the right review posture, but its current process is not
yet a mechanical freeze. It names a moving branch until a coordinator writes
down a commit, lists commands as shell text, does not bind the complete Git
tree, asks reviewers to record command output without a retained format, and
does not define a post-capture drift check.

This tool closes those integrity gaps. It does not close the programme's
evidence, human, institutional or release gates.

## What the freeze binds

`review-freeze.mjs` resolves an exact commit and records these runtime inputs
and review contracts:

- the complete Git tree object plus a canonical SHA-256 inventory of every
  tracked path, mode, object type and byte sequence;
- SHA-256, Git blob identity and byte length for the required review files;
- ordered argv arrays for every required build command, avoiding shell parsing;
- the Node, npm, Git, Python, unzip and shell versions and executable hashes,
  operating system, fixed command environment, checkout directory name and
exact package-lock bytes;
- complete stdout and stderr bytes, digests, exit status and timing for every
  reproduction command; and
- whether a detached checkout changed tracked files or created unexpected
  files outside the dependency and tool-owned runtime-control directories.

The explicit file list is the legible entry surface. The complete Git tree and
independent SHA-256 inventory are the backstop against an omitted tracked
dependency. Commands run against a detached clone of the exact commit, so
Git-aware tests work while later branch movement or unrelated working-tree
files cannot alter the selected inputs.
The fixed npm environment ignores operator-level user and global npm files,
uses an empty configuration inside the disposable sandbox, and resolves the
public lockfile through `https://registry.npmjs.org`. This prevents a local
private-registry setting or credential requirement from changing the result.
The command `PATH` contains only checkout-local links to the recorded
executables. npm also receives `/bin/sh` as its explicit script shell. This
narrows inherited tool-resolution drift in the nested test suite. The links and
tracked tree are checked before and after each command, but mutate-use-restore
behaviour inside a command remains invisible.
The detached checkout is named `mind-flow` because a frozen Round 04 regression
test explicitly checks that basename. Recording it turns that hidden assumption
into a visible runtime input.
Some POSIX shells do not implement a `--version` flag. In that case the runtime
record preserves the nonzero probe exit and output as `version unavailable`
while still binding the exact shell path and executable bytes. It never invents
a shell version.

The Round 04 policy intentionally preserves the brief's `npm install` command.
That is weaker than `npm ci` as a lockfile reproduction contract. The tool
therefore compares the entire tracked tree after the run and fails mechanical
dispatch readiness if installation rewrites it. A later review round should
change the brief and policy together rather than silently substituting a
different command during this freeze.

The Round 06 policy is additive. It retains the Round 04 review surface, uses
`npm ci` first, and binds the NERO source capture, condition-change impact,
governance records and lineage, prospective forecast issuance, rendered
comparison, public narrative, pilot evidence bridge, and Observatory changes.
The full suite discovers the nested tests. The policy also runs the most
material lineage, issuance-binding and rendered-parity attacks explicitly so
their receipts remain easy to locate in a large full-suite transcript.

Round 08 moves retained inputs above 5 MB to Git LFS without rewriting older
Git history. The tree inventory still binds the exact committed pointer bytes.
Detached reproduction hydrates only the pointer's SHA-256 and size from the
source repository's local LFS object cache, then checks those content bytes
before and after commands. Missing or changed objects fail closed; there is no
implicit network fetch. Run `git lfs pull` before creating a freeze in a fresh
checkout. A working-checkout verification also compares hydrated bytes to the
committed pointer, not to the pointer's text hash.

Policies may name exact generated output paths, bound by their policy checksum.
Only those paths are exempt from unexpected-file checks; ignore patterns are
not exemptions. The Round 08 build contract regenerates and checks them.
Historical policies remain unchanged, including the generated files tracked in
their original candidates. Their coverage tests use the immutable retained
Round 07 candidate, rather than requiring those old files in a new tree.

When the selected policy requires the generator and schema, their recorded
hashes must equal those files in the reviewed commit. Generator parity with the
reviewer's local executable remains a separate optional check.

## Create and verify

`round-04.review-freeze.json` is a historical freeze of commit
`3259dc1bbb755695a89f60a774b4ac9104c702ed`, not a live pointer to the evolving
programme branch. Any later review target requires a new coordinator-selected
commit and a newly generated artifact. Do not silently relabel this freeze.

Create a candidate freeze with retained reproduction output:

```sh
node meta/review-freeze/review-freeze.mjs create \
  --policy=round-04 \
  --commit=HEAD \
  --output=meta/review-freeze/round-04.review-freeze.json \
  --run
```

Verify the content address, policy, commit objects and required files:

```sh
node meta/review-freeze/review-freeze.mjs verify \
  --policy=round-04 \
  --manifest=meta/review-freeze/round-04.review-freeze.json
```

Select `--policy=round-06` with the Round 06 output path only after the review
coordinator has chosen and committed the exact candidate. Omitting `--policy`
continues to select Round 04 for compatibility with the historical freeze.

`--checkout` additionally requires the current working checkout to be the exact
clean reviewed commit. `--runtime-parity` requires the current OS and executable
bytes to equal the creator's environment. `--generator-parity` requires the
current verifier and schema bytes to equal the creator's copies. Runtime and
generator parity are optional so a retained artifact can still receive
deterministic content review after a tool or OS upgrade.

A failing command is preserved inside a valid freeze with reproduction status
`failed`; it is not repaired or hidden.
`creator_reported_local_reproduction_passed` means only that the unauthenticated
creator reported successful local exits and no sampled drift. Receipts can be
fabricated and the manifest coherently resealed. Independent rerun or signed CI
attestation is required before anyone relies on that report.

Never overwrite a retained freeze. For the Round 08.1 repair, reuse the unchanged
`round-08` policy with a new `round-08.1.review-freeze.json` output and the exact
new candidate commit. The original Round 08 receipt remains historical evidence.
Plain verification binds LFS pointer identity, not hydrated source bytes; use
`--checkout` at the exact candidate, detached reproduction, and source-capture
checks for those bytes. A seal commit is not the candidate: `--checkout` there
correctly reports the added receipt/workflow changes as drift.

The current generated-output check compares against the retained
`meta/build-artifacts.lock.json` before and after rebuilding. A consistent but
changed builder cannot bless its own output. Intentional input or renderer
changes require separate diff review and an explicit
`node meta/build-artifacts.mjs --write-lock`, then `--check`. The lock is a
reviewed comparison reference, not independent authentication of the builder.

## Trust boundary

The SHA-256 content address detects change relative to the retained freeze. It
does not authenticate the Git host, dependency publishers, source publishers,
operator clock, generator, coordinator or reviewers against an external trust
root. Coordinated local resealing remains possible.

The detached checkout is not a process sandbox. Network and host filesystem
access are not isolated, installed dependency bytes and registry responses are
not retained, and the tool does not contain untrusted code. Review a commit
before executing it, or reproduce it inside an independently governed
container. A timeout limits duration but not CPU, memory, network or filesystem
effects.

The schema hard-codes that the freeze grants no review approval, empirical
truth, scope-mapping truth, legal authority, action permission, publication
approval or recruitment approval. External findings and affected-party review
remain separate evidence, and review agreement is not truth.
