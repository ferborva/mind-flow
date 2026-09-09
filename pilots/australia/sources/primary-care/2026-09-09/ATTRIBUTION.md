# Australian primary-care source retention

The Australian Bureau of Statistics, Productivity Commission, Australian
Institute of Health and Welfare and Australian Government Department of Health,
Disability and Ageing are the publishers identified in `capture.json`.
Original URLs, publisher dates where established, response dates, exact byte
lengths and SHA-256 digests are recorded there. `.source.txt` files contain the
unchanged HTML response bodies, not authored or built front-end pages.

The Productivity Commission dataset is Report on Government Services 2026,
Part E, section 10. Its cells retain the original data-source attribution,
including ABS Patient Experience Survey estimates and Department Medicare
statistics. An unchanged copy of the official CSV is retained; derived JSON
is separately identified. Source labels saying unpublished refer to inputs
supplied to the Commission, not to the public status of this downloaded CSV.

Publisher copyright notices and third-party exclusions remain in the raw
responses. The ABS health literacy page contains a separately copyrighted
Health Literacy Questionnaire. No questionnaire item is reproduced in the
derived measurement or narrative; the retained response is source evidence,
not permission to reuse that instrument. The capture does not complete a legal
review or claim that all embedded material shares a single licence.

Run `node pilots/australia/tools/primary-care.mts --check` on Node 22 to check
the retained digests and reproduce the derived measurements. Acquisition used
one curl invocation per header/body pair. A transport response date is not a
publisher release time. Neither hashes nor headers independently authenticate
the publisher. The Services Australia 403 response is a recorded failed lead;
the official MBS note supplies the rule evidence instead.
