---
id: early-action-and-negotiation-framework
title: Public Early-Action and Negotiation Framework
type: communications-proposal
status: proposed
provenance: commissioned-agent-proposal
author: Ren (Codex agent)
reviewer: Fernando Bordallo
created: 2026-09-08
approval_state: requires-human-and-affected-party-review
authority: none
---

# Public Early-Action and Negotiation Framework

> **Agent-proposed options. Not policy. Not authorised.** Ren, a Codex agent, drafted this framework at Fernando Bordallo's request. It does not describe existing services, legal rights, public policy, institutional commitments or Fernando's approved position. Every option requires review by the named actor, affected parties and the relevant authority before adoption. Unknown authority, consent, funding, service level, help or appeal means the option cannot activate.

## Decision

Replace generic playbook imperatives with **conditional option contracts**. A public page should never tell an individual to stabilise, a union to negotiate, an enterprise to slow deployment, or a country to activate support without answering:

1. What protected outcome is this option for?
2. Which actor could legitimately choose it?
3. Which observable IF permits watching, preparing or acting?
4. Which IF requires pause, reversal, repair or graduation?
5. Who has authority, who must consent and who pays?
6. What is actually delivered, by when and for how long?
7. Which rights, safeguards, help and appeal remain available?
8. Which other actors must be ready?
9. What happens when actors disagree about an IF?
10. When does the option expire if nobody renews it?

The Observatory may display an option. It may not approve, activate or enforce one.

## Core distinction

| Object | Public meaning | May the Observatory create it? |
|---|---|---|
| Observation | A scoped measurement with evidence and uncertainty | It may report a validated record. |
| IF evaluation | A recorded condition state under a declared evidence rule | It may calculate and display a reviewable evaluation. |
| Agent-proposed option | A possible response for legitimate actors to debate | It may draft and label it as unapproved. |
| Commitment | An authorised, funded and appealable promise by a named institution | No. It may display a separately verified commitment. |
| Activation | A commitment entering operation after its approved act rule passes | No. Only the authorised owner may activate it. |
| Individual choice | A person's voluntary decision within their rights and circumstances | No. The page may support, never replace, that choice. |

## The option lifecycle

Each option must define seven independent gates. A missing gate is `unknown`, never implicitly false or true.

| Gate | Meaning | Permitted consequence |
|---|---|---|
| `watch_if` | Evidence is relevant enough to inspect on a named cadence. | Observe, validate and communicate. No material intervention. |
| `prepare_if` | Plausible harm or opportunity plus low-cost, reversible preparation justifies readiness work. | Map, rehearse, reserve capacity, consult and negotiate. No claim that the event will occur. |
| `act_if` | The approved trigger, authority, consent, funding, service readiness and safeguards all pass. | Deliver only the action and scope already authorised. |
| `pause_if` | Evidence, authority, service readiness or a safeguard is unresolved or temporarily breached. | Stop expansion or new decisions while preserving essential support and rights. |
| `reverse_if` | The action causes material harm, loses authority, breaches a hard safeguard or is dominated by a safer option. | Undo reversible effects, restore the prior safe state where possible and begin remedy. |
| `recover_if` | People, services or institutions need repair after harm, shock, pause or reversal. | Continue protection, compensation, repair and learning until person-centred recovery tests pass. |
| `graduate_if` | The protected outcome is sustained, appeals are resolved, alternatives remain and dependency is acceptably low. | End or convert the temporary option through review, without cutting individual support from an aggregate result alone. |

### Evaluation states

Every predicate used by a gate is one of:

- `true`: passes under the current evidence rule;
- `false`: fails under the current evidence rule;
- `unknown`: not enough valid evidence;
- `conflicted`: credible evidence supports incompatible evaluations;
- `stale`: evidence is older than its declared maximum age.

`Unknown`, `conflicted` and `stale` are information states, not risk scores.
Applicability is a separate scope axis. `out_of_scope` must stop evaluation for
that entity; it must not enter `NOT`, `ALL` or `ANY` as if it were evidence truth.

### Precedence and parallel duties

1. A true `reverse_if` blocks new action and creates a reversal and remedy candidate for the authorised owner.
2. A true hard-safeguard `pause_if` blocks new action and creates a pause candidate. In a stateless evaluation, an unknown, conflicted, stale or invalid hard safeguard creates a lifecycle-neutral `precautionary_hold`. Only the stateful layer may convert that hold into a precautionary-pause proposal for preparing, active or recovering work. Inactive and watching options simply hold.
3. `recover_if` may operate alongside pause or reversal. Repair does not wait for blame or causal certainty when an authorised no-fault remedy applies.
4. `act_if` can pass only when every required authority, consent, funding, delivery and safeguard predicate is true and current.
5. `prepare_if` may permit only low-regret, reversible preparation. It cannot be used to smuggle in the material action.
6. `watch_if` is the default when evidence is relevant but no higher gate passes.
7. `graduate_if` is evaluated last. It cannot cancel unresolved individual claims, appeals, remedies or rights. `act_if` and `graduate_if` true together, or `recover_if` and `graduate_if` true together, is a transition conflict and fails closed.

No gate may infer urgency, causation or authority from data coverage. Gate truth produces eligibility only on the candidate-phase, concurrent-duty or exit-candidate axis. It cannot approve or perform a transition.

The deterministic result keeps four concerns separate: safety control (`reverse > pause > precautionary_hold`), candidate phase (`act > prepare > watch > idle`), concurrent watch or recovery duties, and a graduation candidate. Each non-safety axis records its own eligibility, so recover-only and graduate-only results remain meaningful. A prior lifecycle is required before proposing a transition. The evaluation record persists the versioned proposal, its prior and proposed lifecycle, duties and conflicts. Every transition proposal has no authority effect, performs no automatic transition and cannot automatically withdraw support. Reversal and graduation cannot silently reactivate; a paused option needs a fresh, safe `act_if` result before an authorised owner may resume it.

## Required option record

Every actor-specific option must publish these fields from one source object:

```yaml
id: option.<actor>.<verb>.<object>
claim_class: agent-proposed-option
approval_state: not-authorised
proposer: Ren, Codex agent
protected_outcome: <what must remain possible for whom>
actor_class: <individual | household-community | worker-union | enterprise | local | national | cross-border>
actor_ref: <versioned named actor and role; never inferred from the verb>
verb: <one observable action>
object: <one bounded object with explicit people, place, service and period scope>
scope:
  people: <included and excluded>
  place: <jurisdiction or community>
  service: <service or system>
  period: <valid time window>
watch_if: <predicate expression>
prepare_if: <predicate expression>
act_if: <predicate expression>
pause_if: <predicate expression>
reverse_if: <predicate expression>
recover_if: <predicate expression>
graduate_if: <predicate expression>
evidence_rule: <sources, uncertainty, confirmation, staleness and conflict treatment>
authority: <named role and instrument, or Unknown>
consent: <whose consent, how captured, refusal and withdrawal>
funding: <source, amount or capacity, status and validity, or Unknown>
service_level: <what is delivered, acknowledgement, delivery and update times>
safeguards: <rights, privacy, harm ceilings, alternatives and prohibited uses>
help: <reachable route, owner, hours, languages and response time, or None>
appeal: <independent route, decision time and remedy, or None>
review: <date or event, participants, evidence and possible decisions>
expiry: <calendar time and automatic consequence>
coordination_dependencies: <other actors, commitments, hand-offs and failure treatment>
public_wording: <approved public text, if approval ever occurs>
```

The compiler binds `actor_ref + verb + bounded object and scope + gate_ref + condition checksum`. Before a separately verified commitment and owner event exist, it must render only `[PROPOSED, NOT AUTHORISED] [actor] could consider [verb] [object] if [condition]`. An axis-specific eligibility value is evidence eligibility, not permission. A bare phrase such as `Protect income IF...` is invalid because it omits the actor and silently implies authority.

An option with `Unknown` authority, consent, funding, service level, help or appeal may be shown only as a research proposal. It cannot use `will`, `must`, `activates`, `available now` or other commitment language.

## Common safeguards for every actor

- No coercion, retaliation, forced political agreement or emergency framing merely because an IF changes.
- No automated denial of an essential service, employment, benefit, housing, healthcare, education or legal right.
- No unrelated surveillance, profiling or secondary data use.
- No individual decision from a population average.
- No action based only on a scenario, forecast, data-coverage count or single unconfirmed observation.
- No loss of appeal, representation, privacy, collective bargaining, community authority or the right to refuse.
- No public promise without secured funding and tested delivery capacity.
- No actor may transfer cost or duty to another actor without that actor's knowledge and agreement.
- No graduation from a temporary protection while material harm, exclusion, appeal or remedy remains unresolved.
- A stricter lawful, cultural, community or rights safeguard prevails over this agent proposal.

## Actor options

Every section below is an architecture example, not a recommendation to adopt the option or its predicates.

### 1. Individual

**Protected outcome:** a person retains informed choice, essential continuity, privacy and the ability to seek help without being blamed for system-level change.

| Field | Agent-proposed option |
|---|---|
| `watch_if` | A validated, scoped observation concerns the person's actual occupation, service, place or eligibility, and the evidence does not rely only on a national average. |
| `prepare_if` | The exposure is plausible, available preparation is low-cost and reversible, and preparation expands options without requiring the person to predict the future. |
| `act_if` | A directly relevant event is confirmed, a real help or representation route is verified, the person freely chooses the step, and no urgent specialist route should take priority. |
| `pause_if` | Advice is unverified, creates pressure, requires sensitive data without necessity, conflicts with urgent professional help, or asks for an irreversible decision under acute stress. |
| `reverse_if` | The step caused financial, employment, privacy, service or wellbeing harm, was induced by a false claim, or no longer reflects the person's choice. |
| `recover_if` | Essential continuity, income, housing, health, safety, relationships or agency were disrupted by the underlying event or the response. |
| `graduate_if` | The person, not an aggregate dashboard, confirms stable continuity and meaningful options across the agreed period, with no unresolved help or appeal need. |
| Authority | The person has authority over their voluntary choices. Any service, payment, employment or legal decision requires the separately verified authority of its provider. The Observatory has none. |
| Consent | Specific, informed, revocable and free of employer, service-provider or family pressure. Refusal must not remove unrelated rights or help. |
| Funding | Personal preparation may not be presented as adequate if it shifts a system cost to the person. Any proposed service must show secured institutional funding before being described as available. |
| Service level | The page must distinguish information from help. If help is verified, show acknowledgement, human response, delivery and update times. If not, say `No Observatory-linked service exists`. |
| Safeguards | Data minimisation, no personal risk score, no forced retraining, no blame, no irreversible advice, and visible urgent-help boundaries. |
| Help | A verified external or committed service with jurisdiction, hours, languages and response time. Otherwise `None verified`. |
| Appeal | The independent route attached to the actual service or decision. Otherwise `No Observatory appeal exists`. |
| Review | At each material evidence change and before any escalation, with affected-person feedback and explicit check for anxiety, stigma and false action. |
| Expiry | The displayed option expires at the next evidence review or after 30 days, whichever is earlier. Personal support, if separately committed, follows its own person-centred exit rule. |
| Coordination dependencies | Household consent where shared resources are affected, worker representation for employment matters, service providers for actual help, and public authorities for rights or benefits. No dependency may be assumed complete. |

**Public wording:**

> **[AGENT-PROPOSED OPTION, NOT AUTHORISED]** This evidence may be relevant to people in `[scope]`, but it does not predict your outcome. No Observatory action or help service has activated. You could review verified options if the evidence applies to you and the step remains voluntary and reversible. Do not make an urgent or irreversible decision from this page. Verified help: `[route or none]`. Appeal: `[route or none]`. Next review: `[date]`.

### 2. Household and community

**Protected outcome:** households and communities can preserve essential access, mutual support and local voice without assigning one person control over others or replacing institutional duties with unpaid care.

| Field | Agent-proposed option |
|---|---|
| `watch_if` | Cohort and place evidence indicates a possible access, service, income or trust change, and local testimony can be gathered safely without exposing individuals. |
| `prepare_if` | A material local dependency or service gap is plausible, mutual-aid preparation is voluntary, and responsible institutions are also preparing rather than offloading duty. |
| `act_if` | A scoped local need is confirmed, affected people define the priority, the coordinating body has a valid mandate, resources are secured and individual participation remains voluntary. |
| `pause_if` | Stigma, unsafe disclosure, gatekeeping, family coercion, volunteer overload, inequitable access, unverified rumours or substitution for a legal service duty appears. |
| `reverse_if` | The option concentrates control, excludes a subgroup, causes retaliation or privacy harm, worsens essential access, or violates a community decision. |
| `recover_if` | Households or local services have experienced avoidable loss, exclusion, conflict, burnout or trust damage that requires repair and remedy. |
| `graduate_if` | Essential access and local delivery are sustained, institutional capacity has replaced emergency volunteer load where appropriate, excluded groups are reached and unresolved remedies are complete. |
| Authority | A named community organisation, local service or elected body acting within its mandate. Community representation does not erase each person's rights or consent. |
| Consent | Community-level agreement for collective resources plus individual consent for personal participation and data. A household head or local representative cannot consent for competent adults by default. |
| Funding | A transparent, secured fund that values coordination, care, translation and accessibility. Unpaid community labour is not treated as free capacity. |
| Service level | One local entry point, acknowledgement within two business days, a named human hand-off, status updates at the published cadence and an urgent external route where relevant. These are candidate terms for negotiation, not current promises. |
| Safeguards | Non-discrimination, confidential access, choice of channel, no proof burden beyond necessity, no volunteer substitution for statutory duty and protection for dissenting community members. |
| Help | A verified local front door that names what it can and cannot provide, languages, access modes, opening hours and escalation. Otherwise `No coordinated help is authorised`. |
| Appeal | Independent review outside the initial local gatekeeper, with a published acknowledgement and decision time plus remedy for wrongful exclusion. |
| Review | Fortnightly during an active local response, then at each evidence cycle, with affected households, service workers and minority reports represented. Candidate cadence only. |
| Expiry | Preparation authority expires after 60 days unless renewed through the stated community and institutional process. Active help follows its separate service and individual exit rules. |
| Coordination dependencies | Individuals, community organisations, unions, enterprises, local services and public funders. Each hand-off names an owner, capacity and failure fallback. |

**Public wording:**

> **[AGENT-PROPOSED COMMUNITY OPTION, NOT AUTHORISED]** A local group could prepare a voluntary support map if `[prepare_if]`. It could coordinate help only if affected people set priorities, a named body accepts responsibility, funding and service capacity are verified, and privacy and appeal safeguards pass. This page is not a local service. Current help: `[route or none]`. Current authority: `[named or unknown]`. Expiry: `[date]`.

### 3. Worker and union

**Protected outcome:** workers retain income security, voice, safe work, collective representation and credible choices during technological or organisational change.

| Field | Agent-proposed option |
|---|---|
| `watch_if` | Privacy-preserving cohort evidence shows a change in roles, hours, exits, hiring, workload, safety or replacement earnings, and the cause remains explicitly unresolved. |
| `prepare_if` | A verified deployment or restructuring could materially affect work and there is time to negotiate notice, data, staffing, training, income continuity, redeployment and alternatives before decisions become difficult to reverse. |
| `act_if` | The agreed worker-protection trigger passes, the representative body has a valid member or statutory mandate, the employer's duties and funding are verified, affected workers can choose among credible pathways, and retaliation safeguards pass. |
| `pause_if` | Required notice, consultation, safety evidence, bargaining, worker data, delivery capacity, accessibility or non-retaliation protection is missing, stale, conflicted or breached. |
| `reverse_if` | The change produces material unanticipated harm, unsafe work, discriminatory outcomes, unlawful conduct, broken commitments or a validated safer alternative that dominates the active design. |
| `recover_if` | Workers experience lost income, hours, employment, health, dignity, representation or career continuity, including harm caused by a failed transition response. |
| `graduate_if` | Replacement earnings, secure work, hours, safety, choice and access are sustained for the scoped cohort, with contractor and excluded-worker evidence complete and appeals resolved. |
| Authority | The named union, worker council or representative acts only under its member mandate, agreement or lawful role. The employer and public authority retain their separate duties. |
| Consent | Collective authorisation follows the representative body's rules. Individual consent remains necessary for personal data, services and voluntary pathways. Non-members and contractors require explicit treatment. |
| Funding | Pre-positioned employer, sector or public transition resources with stated allocation, validity and insolvency protection. Worker-funded preparation cannot substitute for employer or public obligations. |
| Service level | Negotiated notice and information period, named worker contact, timely access to independent advice, response to representation, and delivery times for any income, training, redeployment or remedy. No universal time is implied by this framework. |
| Safeguards | No retaliation, no forced retraining, no automated dismissal or discipline, privacy-preserving cohort data, independent safety review, accessible participation and protected collective action. |
| Help | Union or independent worker-advice route, plus service-specific help, with eligibility, confidentiality, hours and response time. Otherwise `No worker service is verified`. |
| Appeal | Independent employment, agreement or service route appropriate to the jurisdiction, without requiring waiver of collective or legal rights. |
| Review | Before deployment, at each agreed trigger, after any pause or incident, and on a fixed active cadence with workers and excluded cohorts represented. |
| Expiry | Preparation and pilot permissions expire on the agreement date or evidence-validity limit. No silent rollover. Worker remedies and claims keep their own lawful timeframes. |
| Coordination dependencies | Individual workers, union or representative body, enterprise owner, contractors, training and service providers, local delivery bodies and public authorities. A failed dependency prevents activation where it is required. |

**Public wording:**

> **[AGENT-PROPOSED WORKER OPTION, NOT AN AGREEMENT]** Worker representatives and the enterprise could negotiate `[option]` if the scoped evidence, member mandate, employer duty, funding, worker choice and delivery safeguards all pass. No bargaining outcome or worker service is created by this page. A missing consultation, safety or non-retaliation condition would pause the option. Representation: `[route or none]`. Review: `[date]`. Expiry: `[date]`.

### 4. Enterprise

**Protected outcome:** an enterprise can adopt useful capability while protecting users, workers, suppliers, service continuity, competition and legitimate public obligations.

| Field | Agent-proposed option |
|---|---|
| `watch_if` | Validated capability, reliability, access, worker-flow, safety, concentration or service-continuity evidence changes within the defined product, workplace or supply-chain scope. |
| `prepare_if` | A plausible deployment has material benefit or harm potential and reversible readiness work can improve evidence, worker transition, user support, interoperability and incident response. |
| `act_if` | The named decision owner has authority, the use case passes capability and safety evidence, affected-party review is complete, worker and user conditions pass, funding and support are ready, and no hard pause condition is unresolved. |
| `pause_if` | Safety, privacy, security, discrimination, worker consultation, service quality, access, legal authority, auditability, help, appeal or rollback readiness is false, unknown, conflicted, stale or breached. |
| `reverse_if` | Deployment causes material harm, fails the stated objective, violates authority or consent, creates unacceptable dependency, defeats contestability, or cannot meet its service level. |
| `recover_if` | Users, workers, suppliers or communities need continuity, compensation, reinstatement, data repair, service restoration or other remedy after the change or response. |
| `graduate_if` | The deployment delivers the protected outcome across affected cohorts over the agreed period, residual harms and appeals are resolved, competition and alternatives remain, and temporary controls can end safely. |
| Authority | Named board, executive or delegated product or workplace owner within current law, contracts, agreements and regulatory obligations. The Observatory supplies no authority. |
| Consent | User and worker consent where required, plus meaningful notice, refusal or alternative where consent would otherwise be coerced or bundled. Consultation is not automatically consent. |
| Funding | Board-approved or delegated budget covering delivery, transition, audit, accessibility, help, appeal, rollback, remedy and the full active period. Benefits cannot be counted without these costs. |
| Service level | Published reliability, human support, incident response, notice, appeal, rollback and continuity commitments for the defined use. The act gate fails if the enterprise cannot staff them. |
| Safeguards | Human review for consequential decisions, no prohibited secondary use, worker and user non-retaliation, independent audit, interoperability, data minimisation, accessible alternatives and tested rollback. |
| Help | Product, worker and supplier routes separated by purpose, each naming owner, jurisdiction, eligibility and response time. Marketing or a chatbot alone is not a help route. |
| Appeal | Independent human reconsideration with access to reasons, correction, restoration and external routes preserved. |
| Review | Before pilot, before scale, after each material incident, on each evidence refresh and before expiry, with worker, user and external challenge evidence. |
| Expiry | Pilot or exceptional authority expires on a calendar date no later than the evidence and funding validity. Renewal requires fresh evidence and affected-party review. |
| Coordination dependencies | Workers and unions, users, suppliers, local services, regulators, sector bodies, public buyers and cross-border data or infrastructure authorities. The enterprise may not mark another actor ready. |

**Public wording:**

> **[ENTERPRISE OPTION PROPOSED BY AN AGENT, NOT APPROVED]** The enterprise could test or deploy `[bounded use]` only if capability, safety, worker, user, access, authority, funding, help, appeal and rollback conditions all pass. Current condition state: `[states]`. Current decision owner: `[named or unknown]`. This page does not approve deployment. Pause condition: `[condition]`. Review and expiry: `[dates]`.

### 5. Local or regional institution

**Protected outcome:** a local or regional institution can maintain essential access and respond to concentrated place-based change without inventing powers or waiting for national averages.

| Field | Agent-proposed option |
|---|---|
| `watch_if` | Local service, employment, access, housing, health, trust or delivery evidence changes for a defined cohort, including evidence hidden by a national average. |
| `prepare_if` | Concentrated local harm is plausible, existing delivery capacity may be insufficient and reversible mapping, staffing, funding, procurement or rehearsal can reduce delay. |
| `act_if` | A validated local trigger passes, the institution has lawful authority, affected groups helped define the action, funding and delivery capacity are secured, eligibility is reachable, and safeguards and appeal are operational. |
| `pause_if` | Legal authority, funding, registry quality, delivery capacity, privacy, equity, community trust, appeal or coordination with another required institution is false, unknown, conflicted, stale or breached. |
| `reverse_if` | The action excludes or harms the target cohort, exceeds local authority, displaces a better community-led response, causes surveillance or stigma, or fails its stated outcome and remedy. |
| `recover_if` | Local people, services, workers or institutions need continuity, backlog clearance, compensation, rebuilding, trust repair or restored democratic participation. |
| `graduate_if` | Outcomes are sustained across places and cohorts, institutional delivery is durable, emergency measures end, community control and alternatives remain, and appeals and remedies are complete. |
| Authority | Named council, regional authority, service institution or delegated official under a cited current instrument and geographic scope. |
| Consent | Public or community authorisation for collective choices, affected-party co-design for thresholds and services, and individual consent for personal participation and data. |
| Funding | Appropriated local funding, a verified reserve or a binding transfer from another level, including staffing, accessibility, community partners, appeal and recovery. |
| Service level | A single accessible local entry point, published eligibility, human acknowledgement, decision and delivery times, status cadence, languages and offline route. Candidate values must be negotiated and capacity-tested. |
| Safeguards | No automated denial, no emergency power by dashboard, no exclusion from missing registry data, privacy and data-sovereignty protection, independent appeal, local choice above any minimum floor and public override records. |
| Help | Named local service with boundaries, hours, languages, accessibility, escalation and continuity if the digital system fails. Otherwise `No local service has activated`. |
| Appeal | Independent reviewer outside the original decision chain, published decision time, backdating or restoration for error and further external rights preserved. |
| Review | At each trigger evaluation, at least monthly while active as a candidate default, after incidents and before renewal, with community, service-worker and excluded-cohort evidence. |
| Expiry | Exceptional or temporary action expires after 90 days or sooner under its authority. Renewal requires a public review and cannot be inferred from continuing need alone. |
| Coordination dependencies | Community organisations, service providers, enterprises, unions, national funders, neighbouring jurisdictions and cross-border bodies. Each dependency has an owner, hand-off time and fallback. |

**Public wording:**

> **[AGENT-PROPOSED LOCAL OPTION, NOT COUNCIL OR GOVERNMENT POLICY]** `[Named local role]` could consider `[action]` only if the local trigger, authority, community review, funding, delivery, privacy, help and appeal conditions pass. Current status: `not authorised`. This page does not establish eligibility or emergency powers. Local help: `[verified route or none]`. Pause rule: `[rule]`. Expiry: `[date]`.

### 6. National institution

**Protected outcome:** a national institution can protect broad capability, economic security, rights and equitable access while preserving local adaptation, democratic authority and fiscal transparency.

| Field | Agent-proposed option |
|---|---|
| `watch_if` | National and cohort evidence shows a material change in capability, productivity transmission, access, displacement, essential work, concentration, fiscal capacity or legitimacy, with uncertainty and alternatives visible. |
| `prepare_if` | Potential harm or opportunity is systemically significant, delay could compound it, and reversible preparation such as data standards, delivery rehearsal, reserve funding, procurement design or negotiated compacts has broad value. |
| `act_if` | The legislated or otherwise lawful trigger passes under independent evidence, the accountable minister or statutory role confirms authority, funding is appropriated, delivery and appeals are ready, affected-party and intergovernmental review pass, and hard safeguards hold. |
| `pause_if` | Authority, appropriation, rights, constitutional allocation, delivery capacity, cohort evidence, equality, privacy, local or Indigenous governance, help, appeal or independent oversight is false, unknown, conflicted, stale or breached. |
| `reverse_if` | The action creates material rights, distributional, fiscal, market, service or democratic harm; exceeds authority; fails its objective; or a safer effective alternative is verified. |
| `recover_if` | People, places, sectors, services or institutions require income continuity, access, reinstatement, compensation, fiscal support, capacity rebuilding, correction or trust repair. |
| `graduate_if` | The protected outcome is sustained across cohorts and jurisdictions, structural delivery is stable, emergency or temporary powers end, concentration and dependency remain contestable, and outstanding remedies are resolved. |
| Authority | A named parliamentary, executive, judicial, regulatory or statutory basis with scope, constraints, responsible role and expiry. `Government` is not a sufficient owner. |
| Consent | Democratic authorisation and affected-party review for collective action, plus individual consent and refusal wherever the service or data use permits. Legal compulsion, if any, must be explicit and independently reviewable. |
| Funding | Current appropriation or legally available fund with amount, duration, distribution formula, administrative cost, contingency and downstream transfers. Unfunded entitlement language cannot pass `act_if`. |
| Service level | National floor for eligibility, access, human response, delivery, update, appeal and remedy, with stricter local or community protections preserved. Capacity must be stress-tested before activation. |
| Safeguards | Rights and equality review, no automated consequential denial, data minimisation, independent audit, parliamentary or equivalent oversight, protected dissent, local choice, Indigenous data governance, sunset and judicial or lawful review. |
| Help | Verified national and local routes with consistent eligibility facts, multilingual and offline access, escalation and continuity during system failure. Otherwise `No national action has activated`. |
| Appeal | Independent merits or lawful review appropriate to the decision, human reasons, published time, interim protection where delay causes harm and remedy for wrongful exclusion. |
| Review | At each evidence release, at a fixed active cadence, after override or incident and before sunset, with parliamentary, independent, jurisdictional and affected-party scrutiny. |
| Expiry | Preparation and emergency authorities have explicit sunsets. Candidate default for a temporary national option is 90 days before affirmative renewal; ordinary programmes use their approved review law and funding period. |
| Coordination dependencies | Individuals, communities, Indigenous authorities, worker representatives, enterprises, local and regional governments, delivery institutions, courts or reviewers and cross-border partners. National authority cannot silently overwrite another actor's lawful or cultural authority. |

**Public wording:**

> **[AGENT-PROPOSED NATIONAL OPTION, NOT GOVERNMENT POLICY]** A named national authority could consider `[action]` if the published evidence rule, legal authority, appropriation, delivery, rights, affected-party, jurisdictional, help and appeal gates all pass. Current status: `not authorised and not funded unless separately verified`. No action is created by this dashboard. Owner: `[named or unknown]`. Review and sunset: `[dates]`.

### 7. Cross-border or international compact

**Protected outcome:** people can retain portable, equitable access across jurisdictions while each participating people and jurisdiction preserves legitimate authority, data sovereignty, rights and the ability to leave.

| Field | Agent-proposed option |
|---|---|
| `watch_if` | Comparable evidence shows widening cross-border differences in access, eligibility, quality, delivery, worker effects, infrastructure or fiscal capacity for the same defined service and cohort. |
| `prepare_if` | A shared dependency or foreseeable spillover exists and voluntary preparation can improve standards, mutual recognition, pooled procurement, finance, interoperability, appeals or crisis continuity without forcing participation. |
| `act_if` | Each required party has valid authority, implementing law or agreement is current, affected peoples and data authorities approve relevant terms, cost sharing and delivery are secured, minimum rights and service floors pass, and no sovereign or community safeguard is unresolved. |
| `pause_if` | A party's authority, consent, funding, rights, data sovereignty, security, service level, appeal, audit, reciprocity or implementation capacity is false, unknown, conflicted, stale, withdrawn or breached. |
| `reverse_if` | The compact creates exploitation, lowest-standard competition, dependency, unlawful transfer, exclusion, cultural or data harm, fiscal distress, retaliation or failure without effective remedy. |
| `recover_if` | Affected people or jurisdictions require restored access, finance, data return or deletion, compensation, capacity, service continuity, diplomatic repair or renewed community control. |
| `graduate_if` | Portable access and minimum floors are sustained, participating jurisdictions and communities can operate durable local rails, imbalances and appeals are resolved, and exit does not strand people. |
| Authority | Named treaty, compact, procurement agreement or institutional mandate plus each jurisdiction's implementation basis. An international body cannot create domestic authority merely by publishing a recommendation. |
| Consent | Voluntary party participation, democratic or lawful approval, affected-population review and Indigenous or community data authority where relevant. Individual rights and refusal survive the compact. |
| Funding | Binding cost-sharing and disbursement rules, pre-positioned finance, currency and validity, delivery capacity and a failure allocation. No party is assumed able to pay. |
| Service level | Common minimum for recognition, eligibility decision, delivery, language, accessibility, help, appeal, portability and continuity, with stronger local protections preserved. |
| Safeguards | No forced data sharing, no downward rights harmonisation, data localisation and sovereignty where required, independent audit, non-discrimination, exit continuity, anti-retaliation and remedy across borders. |
| Help | Interoperable local entry points plus a cross-border escalation route, language support, identity alternatives and published hand-off times. Otherwise `No portable service is active`. |
| Appeal | A reachable local first review and an independent cross-border escalation that cannot extinguish domestic, community or human-rights remedies. |
| Review | Joint evidence review on a declared cadence, local and community review before material change, public override records and independent distributional and rights review. |
| Expiry | Compact and funding periods are explicit. Pilots end automatically unless every required authority renews. Exit terms preserve active individual support and data obligations. |
| Coordination dependencies | Participating jurisdictions, local delivery bodies, Indigenous and community data authorities, providers, funders, worker representatives, identity and payment rails, independent reviewers and contingency providers. |

**Public wording:**

> **[AGENT-PROPOSED CROSS-BORDER OPTION, NOT AN AGREEMENT]** Participating authorities could negotiate `[portable service or compact]` if each authority, consent, rights, data-sovereignty, funding, delivery, help, appeal and exit condition passes. No country, community or person is committed by this page. Current parties: `[proposed, not confirmed]`. Current authority and funding: `[unknown unless verified]`. Pause and exit rules: `[rules]`.

## Negotiating when IFs conflict

Actors do not merely disagree about a number. They may use different evidence, protect different outcomes, hold different authority, bear different costs or reject the framing itself. The architecture must preserve those distinctions.

### Conflict types

| Conflict | Example | Proper response |
|---|---|---|
| Evidence | An enterprise reliability study passes while worker incident evidence is conflicted. | Preserve both records, examine scope and independence, and mark the shared predicate `conflicted`. |
| Threshold | A national trigger is not crossed, but one local cohort is below its agreed floor. | Apply each condition to its own scope. A national average cannot cancel a local compact. |
| Objective | Faster deployment benefits users while transition speed threatens worker continuity. | Name both protected outcomes and negotiate a package rather than hiding one as a technical parameter. |
| Timing | Preparation is ready nationally but local delivery is not. | Prepare where reversible, but block activation where a required dependency is false. |
| Authority | A provider can deploy technically but lacks workplace, service or data authority. | Authority failure blocks action. It is not resolved by evidence of benefit. |
| Consent | A collective compact supports a service but some individuals refuse personal data use. | Preserve collective action only where individual refusal and alternatives remain effective. |
| Burden | A national benefit relies on unpaid local or household labour. | Price and allocate the burden before agreement. No actor is a free dependency. |
| Rights or sovereignty | Cross-border access requires data a community authority does not permit to leave. | Redesign for local computation, minimum data or another route. Do not average or bargain away the right. |
| Distribution | Aggregate access improves while one subgroup loses quality or eligibility. | Keep the subgroup condition binding and attach remedy. Do not graduate from the aggregate. |

### Shared negotiation record

Every negotiation uses one public record:

```yaml
negotiation_id: negotiation.<scope>.<issue>
status: proposed | convened | negotiating | agreed | deadlocked | expired | withdrawn
facilitator: <independent named role>
decision_authorities: <one per party>
affected_parties: <represented, missing and dissenting>
shared_question: <who can do what, where, for how long, if what holds>
immutable_evidence: <records all parties see unchanged>
contested_evidence: <records, reasons and resolution route>
protected_outcomes: <one per affected party>
party_positions:
  - party: <name>
    offers_if: <reciprocal commitment conditions>
    requires_if: <conditions another party must meet>
    will_not_if: <red lines and prohibited outcomes>
    pause_if: <conditions that suspend this party's performance>
    exit_if: <conditions and continuity duties on exit>
hard_safeguards: <rights and authority floors not available for trade>
option_packages: <bundled commitments, costs and distribution>
interim_state: <watch or reversible preparation while unresolved>
verification: <source, cadence, uncertainty and independent reviewer>
funding_and_burdens: <who pays, works, waits and carries residual risk>
help_appeal_remedy: <routes across parties>
dissent: <minority positions and requested conditions>
agreement: <signed commitments or none>
review: <date and evidence>
expiry: <date and consequences>
```

### Negotiation sequence

1. **Scope the complete promise.** Write `[people] can [verb] [object] in [place] for [period] if [conditions]`.
2. **Name authority.** Record which party can decide which object. No party negotiates another party's powers into existence.
3. **Lock the evidence layer.** Separate observations from derived measures, forecasts, scenarios, values and proposals. Audience language cannot change the underlying records.
4. **Elicit each IF package.** Each party states `offers_if`, `requires_if`, `will_not_if`, pause and exit conditions, costs and protected outcomes.
5. **Map conflicts.** Mark predicates `conflicted`, not averaged. Identify scope, timing, evidence, objective, burden, consent, rights and authority conflicts separately.
6. **Set hard safeguards.** Rights, lawful authority, non-retaliation, individual remedy, community control and data sovereignty are constraints, not bargaining chips.
7. **Design packages.** Combine reciprocal commitments, funding and delivery rather than demanding one-sided virtue. Include the status quo and no-action option.
8. **Choose the least-regret interim state.** While a material IF is unresolved, watch or prepare reversibly. Do not treat delay as neutral if delay itself causes documented harm, but protect through separately authorised no-fault measures.
9. **Test distribution.** State who gains, pays, waits, works, supplies data and bears failure. Add compensation or redesign where burden is not agreed.
10. **Stress-test exit.** Simulate authority loss, funding failure, service failure, evidence reversal, party withdrawal and cross-border interruption.
11. **Record agreement and dissent.** Only signed, authorised and funded commitments become commitments. Everything else remains a proposal or deadlock record.
12. **Review and expire.** New data triggers review under the agreed rule, not automatic renegotiation or silent renewal.

### Conflict resolution rules

- A hard safeguard or authority failure cannot be outvoted by a larger expected benefit.
- The actor proposing a material change carries the burden of showing readiness, safeguards and remedy.
- The actor bearing the harm must not also carry the full burden of proving causation before reversible protection is considered.
- `Conflicted` evidence blocks irreversible or coercive action. It does not block evidence collection, negotiation, no-fault help or low-regret preparation.
- A higher-level actor may fund a stronger local floor. It may not use an aggregate improvement to erase a scoped local failure.
- Community or collective authority cannot silently remove individual rights. Individual refusal cannot silently appropriate a shared resource or impose unmitigated harm on others. The conflict must remain explicit.
- No package passes by hiding cost in unpaid care, volunteer work, small suppliers, future budgets or excluded countries.
- A forecast may inform preparation but cannot satisfy an observed `act_if` unless the authorised contract explicitly and lawfully defines a forecast trigger with calibration and review.
- Negotiation does not require consensus on the abundance thesis. It requires clarity about evidence, authority, reciprocal duties, safeguards and exit.

## Worked conflict example: enterprise deployment and worker continuity

This example is fictional and contains no evidence-backed threshold or policy recommendation.

### Proposed predicates

- Enterprise `act_if`: the bounded tool meets reliability and safety criteria, user benefit evidence passes and rollback is ready.
- Worker `pause_if`: material job, hours, workload or safety effects remain unknown because required consultation and cohort evidence are incomplete.
- Local `prepare_if`: the affected place has plausible concentrated exposure and limited transition-service capacity.
- National `prepare_if`: the sector may scale rapidly and portable worker support is not delivery-tested.

### Observed state

- technical capability: `true`;
- user benefit: `emerging` and not an action predicate yet;
- worker continuity: `unknown`;
- consultation: `false`;
- rollback readiness: `true`;
- local support capacity: `false`;
- national funding: `unknown`.

### Result under this architecture

The enterprise's material deployment does not pass because worker consultation and local dependencies fail. The result is not `technology stopped` and not `workers blocked progress`. Permitted options remain:

- negotiate a bounded, voluntary, reversible test that cannot make employment decisions;
- fund independent worker evidence and local delivery rehearsal;
- agree notice, data, workload, income-continuity, appeal and rollback terms;
- retain the no-deployment option;
- publish the unresolved predicates and dissent without predicting political behaviour.

### Reciprocal package for negotiation

> **[AGENT-PROPOSED PACKAGE, NOT AN AGREEMENT]** The enterprise could conduct a bounded voluntary test if worker representatives approve the test terms, no employment decision uses its output, privacy and safety review pass, and rollback is immediate. Worker representatives could support the test if independent evidence access, non-retaliation, paid participation, workload limits and a funded remedy pass. The local body could prepare a help route if national or enterprise funding and lawful delivery authority pass. Any party may pause under its recorded safeguard. No condition is satisfied merely because another party signs.

## Worked conflict example: cross-border access and data sovereignty

This example is fictional.

- A provider proposes shared data to improve a cross-border service.
- A national actor wants broader eligibility.
- A local or Indigenous data authority does not authorise export or secondary use.
- The provider's efficiency IF is `true`, but lawful and community authority are `false` or `unknown`.

The act gate fails. Permitted negotiation options include local computation, federated verification, less data, community-controlled infrastructure, a different provider, a narrower service or no agreement. Compensation cannot purchase authority that the relevant people or law do not permit. A cross-border compact must preserve data-return, deletion, exit and continuity duties.

## Public rendering

### First layer

```text
[AGENT-PROPOSED OPTION, NOT AUTHORISED]

WHO COULD CHOOSE     [named actor class and role]
PROTECTED OUTCOME    [for whom, where and for how long]
CURRENT MODE         [watch | prepare | no action; never inferred authority]
WHY                  [observed condition state, uncertainty and alternatives]
AUTHORITY             [named and verified | unknown]
FUNDING               [secured | conditional | unfunded | unknown]
HELP NOW              [verified route | none]
APPEAL NOW            [verified route | none]
NEXT REVIEW           [date or event]
EXPIRY                [date and automatic consequence]
```

### Conditional layer

```text
WATCH IF       [predicate]
PREPARE IF     [predicate and allowed reversible work]
ACT IF         [full trigger plus authority, consent, funding and readiness]
PAUSE IF       [hard safeguards and unresolved states]
REVERSE IF     [harm, authority loss or failed objective]
RECOVER IF     [repair and remedy conditions]
GRADUATE IF    [sustained person-centred outcome and unresolved exclusions]
```

### Accountability layer

Show evidence, condition versions, evaluations, approvals, dissent, funding, service rehearsal, incidents, appeals, overrides, reviews, expiry and corrections. Preserve historical states.

## Public wording rules

### Required

- Start with `[AGENT-PROPOSED OPTION, NOT AUTHORISED]` until an independent commitment record is verified.
- Use `could consider` for an unapproved option, not `should`, `must`, `will` or `activates`.
- Name the actor and role. Do not use `government`, `business`, `community` or `people` as if each were a single decision-maker.
- State `No action`, `No service`, `No authority`, `No funding`, `No help` or `No appeal` when true.
- Keep IF state, action state and data coverage separate.
- Say who is excluded and which dependency is missing.
- State the pause, reverse, recovery, graduation and expiry conditions with the proposed action.
- Provide the dissent and challenge route without requiring agreement.

### Prohibited

- `Prepare now` without naming a scoped option and `prepare_if`.
- `At warning` or `During crisis` when no validated state exists.
- `Countries should activate` or `business must fund` without authority and negotiation.
- `Use the named case owner` when no owner exists.
- `Support is available` when funding or service capacity is unverified.
- `The IF passed` when a predicate is unknown, conflicted or stale.
- `Recovery achieved` from an aggregate crossing while individuals remain harmed.
- `Graduated` as a euphemism for losing support.
- `Consensus` when dissent or an affected authority remains unresolved.

## Dashboard behaviour

1. Show no actor-specific option until the reader deliberately selects an actor.
2. Actor selection may change assistance and wording, never facts, uncertainty, IF state, authority or trigger state.
3. Proposals and commitments use different data types and visual treatments.
4. An agent proposal cannot be promoted to commitment by changing a label.
5. `act_if` must be evaluated from a versioned condition record, not free text.
6. Unknown authority, consent, funding, service, help or appeal forces `not authorised` and disables activation language.
7. A true pause or reverse gate visually and semantically overrides act.
8. Recovery may appear alongside pause or reversal and must expose remedy status.
9. Graduation must expose excluded cohorts and unresolved individual cases.
10. Every card preserves its provenance, status, scope, review and expiry in print, copy, export and screenshot crops.

## Acceptance tests

### Structure

1. Every option contains all seven IF gates and all required option-record fields.
2. Every gate references versioned predicates rather than narrative-only thresholds.
3. Every action verb has one bounded object, scope and protected outcome.
4. Unknown, conflicted or stale required predicates cannot produce `act` or `graduate`.
5. A true hard `pause_if` or `reverse_if` blocks new action.
6. Graduation cannot close an unresolved individual appeal, remedy or support record.

### Authority and language

7. Every agent option says `NOT AUTHORISED` in the same card as the proposed action.
8. No option implies an existing service, owner, authority, funding, help or appeal when its field is unknown.
9. No actor is selected by default.
10. No generic imperative appears without its actor, scope and IF.
11. The Observatory cannot create an approval, commitment or activation record.
12. Public wording survives screen, print, copy, export and screenshot crops.

### Coordination and negotiation

13. Each required dependency names owner, state, service level and fallback.
14. One actor cannot mark another actor's dependency ready.
15. Conflicting evidence is preserved as `conflicted` with both sources and a resolution route.
16. Hard safeguards, lawful authority and data sovereignty cannot be resolved by averaging or majority benefit.
17. Every negotiation package shows who gains, pays, waits, works and carries residual risk.
18. Every agreement includes pause, exit, continuity, remedy, review and expiry.
19. Dissent remains visible and does not become `resolved` merely because a majority agreed.

### Human comprehension

20. At least 95% of tested readers distinguish an agent option from policy or commitment.
21. At least 95% correctly identify whether any action or help is currently active.
22. At least 90% identify the actor with authority or correctly say none exists.
23. At least 90% distinguish `prepare_if` from a prediction that the event will occur.
24. At least 90% understand that `unknown`, `conflicted` and `stale` do not mean true or false.
25. At least 90% identify a pause or reverse condition and the effect it has on action.
26. At least 85% can find help, appeal, review and expiry, or correctly say they do not exist.
27. At least 85% can explain one coordination dependency and what happens if it fails.
28. At least 85% can explain a conflict without assigning blame or treating one actor's IF as universal.
29. No directly affected or accessibility cohort trails the overall rate by more than 10 percentage points.
30. Any participant who acts on a nonexistent service, obligation or emergency instruction blocks release and requires remediation.

## Adoption path

1. Fernando reviews whether this architecture reflects the intended goal. His approval would approve the direction, not any policy option.
2. Affected parties challenge the actor classes, protected outcomes, conditions, burden allocation and language.
3. Legal, institutional, accessibility, privacy, security and data-governance reviewers define where authority and safeguards differ by jurisdiction.
4. Engineers model option, negotiation and commitment as separate versioned contracts.
5. The team builds one fictional conflict fixture and proves gate precedence, coordination failure, dissent and expiry.
6. The public-comprehension protocol tests agent option versus commitment, `prepare_if` versus prediction, and help versus no help.
7. Only a named legitimate actor may convert a reviewed option into its own commitment through its own authority and approval process.

Until then, every item in this framework remains an agent-proposed option, not policy.
