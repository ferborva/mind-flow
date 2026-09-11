// Pure display selectors. The browser never evaluates a storm or admits evidence.
export function selectSeries(station, country, familyId) {
  const entity = station.countries.find(x => x.code === country);
  if (!entity) throw new Error('Unknown economy');
  if (!station.families.some(x => x.id === familyId)) throw new Error('Unknown family');
  return entity.series[familyId];
}

export function describeChange(station, country, familyId, year) {
  if (!Number.isInteger(year) || !station.years.includes(year)) throw new Error('Not a retained year');
  const series = selectSeries(station, country, familyId);
  const after = series.find(x => x.year === year) ?? null;
  const before = series.find(x => x.year === year - 1) ?? null;
  const assessment = station.countries.find(x => x.code === country).assessments.find(x => x.year === year);
  const context = assessment?.native.find(x => x.family === familyId);
  return {
    before, after, change: context?.change ?? null,
    stormState: assessment?.state ?? 'not-assessed',
    beneficialShiftUnassessed: assessment?.beneficialShiftUnassessed ?? false,
    disruptedPopulationShare: null, actionAuthorised: false,
    gap: !after ? 'No retained observation; no substitute used.' : !before ? 'Baseline year; no retained earlier comparison.' : null,
  };
}

export function preparationFor(station, country, year) {
  if (!station.countries.some(x => x.code === country) || !station.years.includes(year)) throw new Error('Unknown preparation scope');
  return { country, year, status: 'research-options-only', authority: 'none', options: [
    { id: 'verify', title: 'Verify the change', ownerRole: 'Research analyst, role not appointed',
      startIf: 'The same population, period, unit and publisher vintage can be compared.',
      stopIf: 'A source revision, scope break or unresolved measurement error changes the comparison.',
      next: 'Inspect the native series, source selector and comparability notes.' },
    { id: 'investigate', title: 'Find the missing access evidence', ownerRole: 'Measurement lead, role not appointed',
      startIf: 'An unanswered income-access question could change a decision, and desk review of permitted public metadata can reduce the uncertainty.',
      stopIf: 'Investigation would require unapproved personal data, paid access or contact with participants. Revise the question if available sources cannot answer it.',
      next: 'Compare candidate sources and document gaps. Source adequacy is a separate admission gate, not a prerequisite for inquiry.' },
    { id: 'rehearse', title: 'Rehearse a reversible response', ownerRole: 'Accountable service owner and affected-party reviewers, not appointed',
      startIf: 'A separate approved exercise defines the scope, consent, resources, authority and alternatives.',
      stopIf: 'The option is mistaken for a commitment, causes harm or cannot be declined or reversed.',
      next: 'Review the decision-experience protocol. No real action or participant contact is authorised here.' },
  ] };
}

export function formatValue(value, digits = 3) {
  return value === null || value === undefined ? 'Unavailable' : new Intl.NumberFormat('en-AU', { maximumFractionDigits: digits }).format(value);
}
export function formatChange(value) { return value === null ? 'Unavailable' : `${value > 0 ? '+' : ''}${formatValue(value)} pp`; }

export function publisherClassification(point) {
  if (!point) return 'No retained point';
  if (point.estimateType === 'modelled-vintage-no-row-actual-status' && point.estimationType === 'ILO-modelled') return 'ILO modelled estimate; row-level actual/estimate status is not supplied. One retained vintage, not real-time history.';
  return `Publisher status: ${point.estimateType || 'not supplied'}; method: ${point.estimationType || 'not supplied'}. These labels alone do not establish contemporaneous fieldwork or comparability.`;
}
