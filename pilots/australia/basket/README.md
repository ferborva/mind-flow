# What this tells a rural NSW clerical worker

This pilot cannot tell you whether you can get an appointment today. It can show where a barrier has been measured, who may be able to change it, and what remains unknown.

Construction revision `primary-care.r3.json` and `primary-care.kernel.r3.json` are the current research bindings. Independent review removed unsupported numeric upper bounds, made the missing specialist-pathway price measure explicit, and required observation-domain enforcement. Original and r2 artifacts and dashboard snapshot `2026-09-09.r1` remain unchanged for audit. Their old evaluator bindings are not current. No measured value or source period changed.

In 2024-25, an estimated **7.2% of NSW people in the survey who needed a GP delayed or went without because of cost**. The published 95% confidence-interval half-width is 0.7 percentage points. This is a state population estimate, not a finding about you, your occupation or your town. It is historical evidence, not a current service guarantee.

| What may stand in the way | What this pilot knows | Who has a relevant role |
| --- | --- | --- |
| Price | Cost-related GP delay was measured. Fully bulk-billed patients were 56.1% of patients with Medicare GP attendances. These have different denominators. | Practices set fees and bulk-billing choices; the Australian Government sets Medicare benefits. |
| Permission | MBS telehealth has published eligibility pathways and exceptions. A rule is not proof of your eligibility. | Australian Government rule setters and Services Australia administrators. |
| Proximity | GP workforce supply differs across remoteness strata. This does not measure your travel time or transport options. | Practices, workforce planners, governments and Primary Health Networks. |
| Availability | Some urgent GP users reported care within four hours. People unable to obtain care are not represented by that measure. | Practices, commissioners and workforce funders. |
| Capability | A 2018 national survey measured difficulty navigating the health system. It cannot diagnose your capability today. | Health organisations and governments responsible for accessible information and navigation. |

The four-item basket covers a GP consultation, a common prescription (atorvastatin as an example), a specialist referral and after-hours care. Prescription cost evidence covers all prescription medicines, not that medicine specifically. Specialist fees do not establish whether a referral was completed. After-hours delay combines several reasons.

The employment series is a separate NERO estimate of clerical occupations. Attaching NSW health context to those local employment series does **not** show that a particular worker lost work, cannot afford care or faces a particular barrier.

The honest next research step is to measure the same service, population, place and period across all five conditions. No personal records have been collected, no providers contacted and no clinical advice or eligibility decision made.

Sources: [Productivity Commission, RoGS 2026 primary care](https://www.pc.gov.au/ongoing/report-on-government-services/health/primary-and-community-health/), [ABS Patient Experiences 2024-25](https://www.abs.gov.au/statistics/health/health-services/patient-experiences/2024-25), [MBS telehealth explanatory note](https://www9.health.gov.au/mbs/fullDisplay.cfm?type=note&q=AN.1.1). Exact bytes, headers and hashes are retained in `../sources/primary-care/2026-09-09/`; derivation and limitations are in `primary-care.v1.json` and `../data/primary-care-2026-09-09.json`.
