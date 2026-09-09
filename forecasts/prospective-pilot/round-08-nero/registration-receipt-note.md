# Registration receipt, not issuance

The exact 3,414-byte JSON response body returned by GitHub's comment API is
retained reversibly in `registration-provider-response.base64.txt`. Decode its
base64 text before hashing or parsing. The decoded bytes have no final newline;
base64 avoids silently adding one during text-file retention. The JSON receipt
checksum addresses these decoded exact bytes, not the base64 transport text.

Protocol content seal: `2026-09-09T11:22:22Z`.
Provider-recorded comment creation: `2026-09-09T11:23:03Z`.
Issue opens: `2026-09-09T11:28:22Z`.

The receipt carries the sealed protocol hash and explicit no-exclusions cohort.
Its provider identity, source authenticity and clock remain externally
unverified. The API account is a collaborator, not an independently appointed
forecast registrar. `preregistration.json` adds the genuine receipt without
changing the sealed content digest. The earlier awaiting-receipt protocol is
preserved to make that chronology inspectable.

No forecast has been issued by this registration. Final coordinator clearance
and the frozen issue window still gate issuance. Bound source files remain at
reviewed revision `47b3021`; any later bound change requires disclosed abandonment.
