# Primary-care workbook supplement, 10 September 2026

The Productivity Commission's [RoGS 2026 primary-care page](https://www.pc.gov.au/ongoing/report-on-government-services/health/primary-and-community-health/) links this workbook and directs readers to its table footnotes. Section 10 was released on 5 February 2026. The original Excel file is retained unchanged in Git LFS, with the exact paired HTTP response headers. Its response date is 9 September 2026 at 22:16:28 UTC, which is 10 September in Sydney.

- Body: `pc-primary-care-tables.xlsx`, 1,024,226 bytes; SHA256 `99c6ff08e0a48026b780370aa4d02a8edb36b1b11049dd6ce92087005481a36c`.
- Headers: `pc-primary-care-tables.response-headers.txt`; SHA256 `6278b4551a3efdf9e733615a1e1ddb3913c8610226d599a0e4e83b76d55be2d2`.
- Acquisition: one `curl --fail --silent --show-error --location --max-time 45 --dump-header HEADER --output BODY URL` invocation. No workbook resave or recalculation.

The [measurement correction](../../../data/primary-care-2026-09-10.json) contains the exact URL, paired hashes, byte count, per-source licence review status, table/cell locators and hashes of decoded footnote text. The complete footnotes remain in the original workbook. `primary-care-workbook.mts` reads only the retained workbook's ZIP/XML and does not evaluate formulas, follow workbook links or write a workbook. The spreadsheet runtime was unavailable in this environment, so this narrow read-only extraction is the declared fallback.

Licence coverage is **unreviewed**, not an assertion that government-hosted content is universally reusable. Third-party material and source-specific exceptions have not been cleared. No new questionnaire items are reproduced. The earlier capture is unchanged; this supplement adds definitions and qualifications, not new measurement scope.
