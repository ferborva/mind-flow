import { describeChange, preparationFor } from './model.mjs';
import { caseFor } from './cases.mjs';

// Proposed inquiries, not findings, instructions to affected people or evaluated IFs.
const guided = {
  PER: {
    object: 'the feasibility of measuring individual income-route transitions for Peru, 2019 to 2020',
    evidence: 'Linked observations for the same people, with disruption duration, hours and earnings, and evidence about viable alternative routes. Aggregate stock changes alone cannot identify these transitions.',
  },
  IRL: {
    object: 'whether a linked-person design can distinguish Ireland\'s labour-market transitions from 2008 to 2009 without double counting',
    evidence: 'Linked entry, exit, job-loss and hours histories, with overlap accounting and each denominator kept explicit. A sum of the two aggregate rate changes would not answer the question.',
  },
  KAZ: {
    object: 'the survey-method and common-population basis of Kazakhstan\'s 2005 to 2006 poverty comparison',
    evidence: 'Survey-method and population comparability evidence for both endpoints, preserving the $3/day 2021 PPP threshold. Comparable endpoints would support a narrower poverty comparison, not establish newly feasible income routes or improved agency.',
  },
  ARG: {
    object: 'available documentation for a scope-matched Argentine national poverty comparison, 2024 to 2025',
    evidence: 'An available source with matching national population coverage, reference years, poverty threshold and method, or a documented failure to find a suitable source. Another economy or an unmatched subnational estimate cannot fill this national gap.',
  },
};

export function researchBrief(station, selection) {
  const {country,compare,family:familyId,year} = selection;
  const a = describeChange(station,country,familyId,year), b = describeChange(station,compare,familyId,year);
  const family = station.families.find(f=>f.id===familyId), entity = station.countries.find(c=>c.code===country);
  const story = caseFor(station,country,familyId,year);
  const assessment = entity.assessments.find(x=>x.year===year);
  const assessmentInput = station.inputs.find(x=>x.path==='signals/countries/storm-review.v1.json');
  if (year !== station.years[0] && (!assessment || !Array.isArray(assessment.missing) || !assessmentInput)) throw new Error('Retained assessment lineage is missing; no partial handoff is exported');
  const spec = story ? guided[country] : {
    object: `the population, timing and comparability of ${family.fullLabel} for ${entity.name}, ${year}`,
    evidence: 'Scope-matched source documentation can clarify the native comparison. A separate, reviewed person-linked design is needed to investigate disrupted income routes, duration and viable alternatives. An absent field remains a gap.',
  };
  const inquiry = {
    edition:'research-inquiry.v1', author:'Ren (AI agent)', provenance:'commissioned-proposal',
    status:'proposal-not-commissioned-action', questionKind:story ? 'reviewed-guided-case-question' : 'generic-scope-question',
    guidedCase:story ? {country,family:familyId,year,heading:story.heading} : null,
    question:story?.nextQuestion || `For ${entity.name}, what can the retained ${year === station.years[0] ? `${year} baseline` : `${year-1} to ${year} comparison`} establish about ${family.fullLabel}, and what separate evidence would be needed to investigate income-access transitions?`,
    interpretationBoundary:story?.claimLimit || 'A native indicator is not a disrupted-person count or a diagnosis of income-access conditions. Missing evidence is neither stability nor a confirmed crisis.',
    discriminatingEvidence:spec.evidence,
    nextStep:{verb:'Review', object:spec.object,
      if:'The research team has capacity, a legitimate desk-research remit, and expected information could materially inform or confirm a decision relative to opportunity cost. These conditions have not been evaluated.'},
    conditionsEvaluated:false, owner:{role:'Research or measurement lead',appointed:false},
    stopIf:'The work requires unapproved personal data, paid access or participant contact, or would be mistaken for advice or an authorised consequential action.',
    reviseIf:'The source population, reference period, units or construct meaning differs from the proposed question. Record the scope change and explicitly review the new question before reusing this handoff.',
    deferIf:'The opportunity cost of this inquiry outweighs its expected information value. A proposed owner and review point would need agreement; deferral does not establish safety.',
    admitEvidenceOnlyIf:'A separate source, construct and authority review supports the exact population, period and claim. Completing the inquiry does not automatically admit evidence or change an IF state.',
    missingAccessEvidence:assessment?.missing || [],
    assessmentBoundary:assessment ? 'Missing requirements are copied from the retained country-period review, not discovered or resolved by this handoff.' : 'This baseline is not a country-period assessment. An empty missing-evidence list does not establish measurement adequacy or safety.',
    assessmentSource:assessment ? {...assessmentInput,selector:{country,periodTo:year}} : null,
    nativeEvidence:{before:a.before,after:a.after,sourceSha256:family.sourceSha256,sourcePath:family.nativeSource,
      vintage:family.vintage,denominator:family.denominator,
      boundary:'Same retained vintage, not a reconstruction of real-time information. Selectors identify retained rows, not publisher authentication.'},
    actionTaken:false, authority:'none',
  };
  // Detached export object: edits to a downloaded proposal cannot mutate the station.
  return structuredClone({
    title:'Weather Station research brief', classification:'Research only; not a crisis warning or personal advice',
    evidenceCut:station.evidenceCut,selection:{country,compare,family:familyId,year},
    nativeSeries:family.fullLabel,denominator:family.denominator,vintage:family.vintage,
    selected:{country,...a},comparison:{country:compare,...b},limits:family.limitation,
    sourceSha256:family.sourceSha256,sourceUrl:family.sourceUrl,inputs:station.inputs,
    preparation:preparationFor(station,country,year),inquiry,authority:'none',publicReleaseApproved:false,
  });
}
