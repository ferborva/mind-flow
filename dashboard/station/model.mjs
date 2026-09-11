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
      startIf: 'A reviewed, permitted source can measure income routes and alternatives for the relevant population.',
      stopIf: 'The source only counts employment stocks, excludes failed attempts or cannot support the proposed denominator.',
      next: 'Assess the income-access pilot shortlist before admitting a new measurement.' },
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
