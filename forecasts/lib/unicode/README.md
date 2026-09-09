# Unicode identity collision data

`confusables-16.0.0.txt` retains the complete Unicode Consortium mapping table
for Unicode 16.0.0 (dated 2024-08-14), with terminal blank lines removed.
No mapping is added, removed or replaced by a project-specific dictionary.

- Primary source: https://www.unicode.org/Public/security/16.0.0/confusables.txt
- Official retrieval mirror (retrieved 2026-09-09): https://raw.githubusercontent.com/unicode-org/unicodetools/main/unicodetools/data/security/16.0.0/confusables.txt
- Retained SHA-256: `c85129dccd1f7325e5863bcd9ad5ad44a3dc618e948746882d3c3997af3df086`
- Algorithm reference: Unicode UTS #39, section 4, https://www.unicode.org/reports/tr39/tr39-30.html
- Copyright and licence: Unicode, Inc.; https://www.unicode.org/license.txt

`identity.mjs` uses the section 4 NFD / mapping / NFD skeleton operation.
Before that operation, the application strips Unicode control (`Cc`), format
(`Cf`) and default-ignorable code points, applies NFKC, lowercases and trims.
It strips again after normalisation. These additional application rules preserve
the registry's case-insensitive comparison and reject invisible-only IDs.
Unicode character properties and normalisation come from the required Node 22
runtime. The confusable mapping version is pinned independently.

Skeleton equality rejects a claimed adjudicator matching either the provenance
author or issuance actor. This conservative collision check can reject genuinely
different names; distinct skeletons do not prove different people or independent
authority. This is not identity authentication or full UTS #39 conformance.
