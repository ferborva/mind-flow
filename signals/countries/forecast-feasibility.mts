type ClockProposal={issueClosesAt:string,referencePeriodStart:string,referencePeriodEnd:string,publicationNotBefore:string,sourceKind:'publisher-estimate'|'reported'};

// Read-only feasibility guard for the existing protocol chronology. This is
// neither an issuer nor a substitute for its full validator and prerequisites.
export function assessForecastObservationClock(proposal:ClockProposal) {
  const instant=(value:string)=>{
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().replace('.000Z','Z')!==value)throw new Error('exact UTC instant required');
    return Date.parse(value);
  };
  const issue=instant(proposal.issueClosesAt),start=instant(proposal.referencePeriodStart),end=instant(proposal.referencePeriodEnd),publication=instant(proposal.publicationNotBefore);
  if(!['publisher-estimate','reported'].includes(proposal.sourceKind))throw new Error('known source-kind label required');
  const blockers=[];
  if(start<=issue)blockers.push('REFERENCE_PERIOD_ALREADY_STARTED');
  if(end<=start)blockers.push('REFERENCE_PERIOD_NOT_POSITIVE');
  if(publication<end)blockers.push('PUBLICATION_PRECEDES_REFERENCE_PERIOD_END');
  return {clock_eligible:blockers.length===0,blockers,issuance_authorised:false,publication_date_can_override_reference_period:false,public_conclusion:blockers.includes('REFERENCE_PERIOD_ALREADY_STARTED')?'A later publisher estimate cannot turn a past reference period into a future observation.':'Clock compatibility only; source admission, baseline execution, review and external registration remain separate prerequisites.'};
}
