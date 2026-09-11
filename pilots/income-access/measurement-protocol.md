---
id: income-access-measurement-protocol.round-11
title: Income-access transition laboratory protocol
type: pilot-protocol-proposal
status: review
provenance: commissioned-proposal
created: 2026-09-11
updated: 2026-09-11
---

# Income-access transition laboratory protocol

## 🦅 Purpose and boundary

**Test what can be measured before giving the measurement a stronger name.** This protocol proposes a historical employment-to-income transition exercise, conditional on the [feasibility gates](feasibility.v1.json). It does not define a national storm, approve a live pilot, collect participant data or issue a forecast.

The [research dossier](../../research/round-11-income-access-feasibility.md) supports the data-route comparison. Everything below is a proposed method, not an empirical result or an instruction attributed to Fernando.

## 🔎 Release-specific variable crosswalk

Before acquisition, retain one row per required concept. A row must identify:

- Dataset edition, file, exact variable and source dictionary locator.
- Question wording, respondent universe and routing.
- Observation unit: person, job, household or period.
- Collection-to-output mapping: identify job-spell fields copied into person-month rows, genuinely varying monthly fields and derived recodes. Do not treat duplicated values as independent repeated measurements. See the [2025 SIPP guide, pp69-70](https://www2.census.gov/programs-surveys/sipp/tech-documentation/methodology/2025_SIPP_Users_Guide.pdf), inspected 2026-09-11.
- Reference period and interview date semantics.
- Missing, inapplicable, refusal and imputed-value codes.
- Linkage identifier and its scope, without retaining participant values in the public repository.
- Revisions, coding changes and comparable editions.
- Which proposed claim the field supports and which claim it cannot support.

**An unfilled row remains unfilled.** Do not supply a plausible field name from another release. A variable named “income” does not establish period alignment or a feasible income route.

The required concept map is: realised employment, job separation and reason where available, self-employment, earnings, observed alternative income flows, job-search/availability information where available, household composition, relevant barriers, linkage, sample weights, design variables and imputation flags. If an important concept is absent, narrow the question before examining outcomes.

## 🧩 Three distinct layers

| Layer | Proposed record | Allowed interpretation |
|---|---|---|
| Observation | Work/earnings transition within a defined person-period cohort | The recorded fields changed. |
| Interpretation | Evidence for loss, voluntary transition, recovery or unresolved alternatives | A bounded interpretation with competing explanations. |
| Preparation | An option with costs, prerequisites, owner and reversal conditions | A proposal to review, not a personalised recommendation or authorised action. |

**A missing third layer does not invalidate a sound first layer.** It limits the product promise. The station must show that limit in its primary text, not hide it behind a source drawer.

## 🧮 Analysis specification before outcome inspection

Write and independently approve these choices before producing results:

1. **Entry cohort.** Specify why people are included, the baseline date and the question this cohort can answer. Include self-employment explicitly if the construct requires it.
2. **Transitions.** Predeclare observed endpoints and ambiguous states. Keep voluntary, involuntary and unknown separate whenever the instrument permits. Do not infer voluntariness from earnings alone.
3. **Time.** Preserve monthly histories, interview timing and release timing as separate clocks. Align tax-year, calendar-year and current-period fields before combining them.
4. **Denominator.** Keep baseline population, observed follow-up population and missing follow-up counts visible. Do not let attrition silently redefine the target population.
5. **Uncertainty.** Use the survey's relevant design and weight guidance, then report effective precision for the selected cohort. Do not count each month from the same person as an independent respondent.
6. **Missingness.** Distinguish nonresponse, inapplicability, structurally unasked fields and imputation. Publish sensitivity to important classification and attrition assumptions where disclosure rules permit.
7. **Comparison.** Compare a simple employment-change rule with the more complete transition interpretation using the same outcome data and population. Added complexity must earn its value.
8. **Failure.** Define the finding that would reject the planned estimand, not merely the result that would make a compelling demonstration.

No numeric severity or persistence threshold is chosen by this protocol. Research on observed transitions can proceed under an approved narrow estimand while the broader affected-share definition remains unanswered. Results must retain the narrow title.

## ⚖️ Negative controls and rival explanations

The candidate analysis should be challenged with:

- Stable employment with a measurement revision.
- Job exit followed by a voluntary change or education, where identifiable.
- Earnings interruption without job loss.
- Another observed job or income flow that does not meet the proposed adequacy criterion.
- Apparently stable household income despite a person's loss of control over resources.
- Incomplete follow-up concentrated among the most disrupted people.
- Apparent occupation changes at a questionnaire or coding boundary.

These are proposed test cases, not claims that the retained surveys observe each scenario. Documentary mapping determines which are feasible. A failed mapping belongs in the result.

Do not choose the cohort because its historical crisis looks dramatic. Do not select a threshold on the same episodes used to evaluate it. If there are too few independent events for a credible performance estimate, report that limitation rather than manufacturing a large sample from repeated time points.

## 🔄 IF evolution record

For every consequential discovery, record:

> Previous claim → new evidence or interpretation → type of change → affected scope → dependent records → explicit adoption or refusal.

Use separate categories for new observations, revised values, changed policy assumptions, changed construct meaning and changed authority. A newly accessible dataset can remove an acquisition gap while leaving construct validity unresolved. An improved questionnaire can change what an indicator means even if its name stays the same.

No country placeholder becomes operational merely because this protocol cites a national survey. A future admitted definition requires a real country/cohort identity, source-linked extraction, construct review and explicit downstream adoption under the existing executable-IF rules.

## 🛡 Data minimisation and approval

Only approved operators in an approved environment may acquire the exact files needed. Do not commit microdata, participant identifiers, credentials, raw linked records or disclosive extracts. Public provenance should identify editions, permitted source hashes, extraction code and disclosure-reviewed aggregates, not expose people.

Data access is not participant-recruitment approval. Secondary analysis, a new interview study, paid access and publication have distinct requirements. An agent cannot sign confidentiality terms, appoint a human custodian or claim an ethics determination for this project.

## ✅ Output and go/no-go decision

The completed benchmark should contain an independently reproduced transition table or a precise infeasibility result, the retained specification, uncertainty, denominator and missingness accounting, source and revision provenance, counterexamples, and exact claim limits.

Advance to an income-access pilot only if the reviewed evidence supports more than realised income transitions. Advance to warning evaluation only if information available at the proposed decision time can be connected to later outcomes without look-ahead leakage. Advance to public use only through a separate decision-experience and release gate.

**The next action is the exact variable crosswalk, not a download disguised as progress.** If it reveals that viable alternatives are unobserved, the appropriate output is a separately approved acquisition or study proposal. It is not a red storm badge.
