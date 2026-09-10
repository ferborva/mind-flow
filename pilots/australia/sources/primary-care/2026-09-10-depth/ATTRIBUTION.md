# Round 09 retained measurement sources

Original responses were fetched from the ABS and PBS official sites on 2026-09-10. `capture.json` records the exact requested URL, original body length and SHA-256, complete response headers and their SHA-256, HTTP date, publisher and publication-date status. Redirect response headers remain retained. The workbook is an original published source, not an authored workbook or a substitute for the earlier RoGS source.

The ABS workbook covers after-hours experience and 95% margins of error, including Table 7 annual observations from 2013-14 to 2024-25. Its Table 7 A37 and Table 9.2 A63 explain random confidentiality adjustment: do not subtract rounded component estimates to manufacture a missing category. Table 9.2 A64 says a displayed zero error need not mean absence of error. Every original footnote remains in the workbook. The read-only parser locates tables through workbook relationships and preserves cell addresses.

The ABS methodology response supplies the approximate standard-error-of-difference formula and its correlation qualification. PBS patient-charge and safety-net pages supply dated 2026 rule parameters. They do not measure household affordability, a specific atorvastatin transaction or current individual eligibility.

Licence coverage and exceptions have **not been reviewed** for these individual sources. Copyright remains with the respective publishers. Official-host acquisition and attribution are not a redistribution licence grant. The derived source reviews retain `licence_review_status: unreviewed` and make no blanket open-licence assertion.

Run on Node 22:

```sh
node pilots/australia/tools/measurement-depth.mts --check
```

Historical primary-care responses, measurement revisions and all issued forecast records remain unchanged.
