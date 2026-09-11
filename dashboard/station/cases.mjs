// Narrative projections of four reviewed retained selections, not an evaluator.
// Call only with the station's source-validated projection. Exact semantic guards
// prevent a refreshed source from silently inheriting an old explanatory story.
const E = 'income-employment-population.v1';
const U = 'income-unemployment.v1';
const P = 'income-poverty-lineup.v1';
const definitions = [
  { country: 'PER', family: E, year: 2020, before: 74.748, after: 63.976, change: -10.772 },
  { country: 'IRL', family: U, year: 2009, before: 6.774, after: 12.609, change: 5.835 },
  { country: 'KAZ', family: P, year: 2006, before: 14.56, after: 2.3800000000000003, change: -12.18 },
  { country: 'ARG', family: P, year: 2025, before: null, after: null, change: null },
];
const denominators = {
  [E]: 'Population aged 15 years and over, not total population',
  [U]: 'Labour force aged 15 years and over, employed plus unemployed',
  [P]: 'Persons in the national reporting population; household income or consumption is assigned per person',
};
const number = value => new Intl.NumberFormat('en-AU', { maximumFractionDigits: 3 }).format(value);
const failure = () => { throw new Error('Case semantics changed: review the retained values, scope, classification and narrative before reusing this story.'); };

/** Returns a four-field narrative for an exact retained example, otherwise null.
 * Missing/changed inputs for a recognised example fail visibly, never backfill.
 */
export function caseFor(station, country, familyId, year) {
  const definition = definitions.find(d => d.country === country && d.family === familyId && d.year === year);
  if (!definition) return null;
  const families = station?.families?.filter(f => f.id === familyId);
  const entities = station?.countries?.filter(c => c.code === country);
  if (families?.length !== 1 || entities?.length !== 1) failure();
  const family = families[0], entity = entities[0];
  if (family.denominator !== denominators[familyId]
    || family.vintage !== (familyId === P ? '20260324_2021_01_02_PROD' : 'ILO modelled estimates, November 2025')
    || (familyId === P && family.fullLabel !== 'Poverty headcount at $3 per day, 2021 PPP, publisher lineup')) failure();
  const assessments = entity.assessments?.filter(a => a.year === year);
  if (assessments?.length !== 1 || assessments[0].state !== 'cannot-say' || !Array.isArray(entity.series?.[familyId])) failure();
  const assessment = assessments[0];
  const points = [year - 1, year].map(y => entity.series[familyId].filter(p => p.year === y));
  const context = assessment.native?.filter(n => n.family === familyId);
  if (!Array.isArray(context)) failure();
  if (definition.after === null) {
    if (points.some(p => p.length !== 0) || context.length !== 0 || !assessment.missingSeries?.includes(familyId)) failure();
  } else {
    if (context.length !== 1 || context[0].change !== definition.change || points.some(p => p.length !== 1)) failure();
    if (points[0][0].value !== definition.before || points[1][0].value !== definition.after) failure();
    const type = familyId === P ? 'actual' : 'modelled-vintage-no-row-actual-status';
    const estimation = familyId === P ? 'survey' : 'ILO-modelled';
    if (points.some(p => p[0].estimateType !== type || p[0].estimationType !== estimation)) failure();
  }
  const before = points[0][0], after = points[1][0];
  const movement = context[0]?.change;
  const stormLimit = 'The retained evidence cannot assess a storm; missing evidence is neither an all-clear nor a confirmed crisis.';
  if (country === 'PER') return {
    heading: 'A large movement asks a more precise question.',
    changeExplanation: `Peru's employment-to-population ratio moves from ${number(before.value)}% in ${year - 1} to ${number(after.value)}% in ${year}, a fall of ${number(Math.abs(movement))} percentage points among people aged 15 and over. These are ILO modelled estimates from one retained vintage, not what was known in real time.`,
    claimLimit: `This is not the share of people who lost an income route, and it does not establish a cause. Entries, exits, hours, income and alternative routes are not identified by the stock difference. ${stormLimit}`,
    nextQuestion: 'Which people lost viable income routes, for how long, and which alternatives remained open? A worthwhile inquiry can start by checking whether those transitions can be measured.',
  };
  if (country === 'IRL') return {
    heading: 'Two indicators do not identify two separate groups.',
    changeExplanation: `Ireland's unemployment rate moves from ${number(before.value)}% in ${year - 1} to ${number(after.value)}% in ${year}, an increase of ${number(movement)} percentage points within the labour force aged 15 and over. These are ILO modelled estimates, not a count of new individual disruptions.`,
    claimLimit: `You cannot add this change to an employment-to-population change to count affected people: the indicators have different denominators and may concern overlapping people. Neither diagnoses the condition blocking an income route. ${stormLimit}`,
    nextQuestion: 'Can linked observations distinguish job loss, labour-force entry or exit, reduced hours and alternative income routes for the same people? That would tell us more than adding aggregate changes.',
  };
  if (country === 'KAZ') return {
    heading: 'Promising directions deserve careful investigation too.',
    changeExplanation: `Kazakhstan's retained poverty headcount moves from ${number(before.value)}% in ${year - 1} to ${number(after.value)}% in ${year}, a fall of ${number(Math.abs(movement))} percentage points. The threshold is $3 per day in 2021 purchasing-power-parity terms, not current US dollars or a complete essentials budget.`,
    claimLimit: `The endpoints are publisher survey-typed rows, not evidence that the surveys are comparable. Retained comparability fields are missing. A favourable poverty-stock direction does not identify newly available income routes or establish improved agency. ${stormLimit}`,
    nextQuestion: 'Does this apparent improvement survive a common-population and survey-method review? If it does, what changed in feasible income routes, and could that learning help others without assuming the same context?',
  };
  return {
    heading: 'An honest gap keeps the next question open.',
    changeExplanation: `No retained national poverty-lineup observation is available for Argentina in ${year - 1} or ${year} in this frame. The intended series uses $3 per day in 2021 purchasing-power-parity terms. No change is calculated and no other economy is substituted.`,
    claimLimit: `Missing is not zero, and it does not mean that no poverty data exist elsewhere. Another series may cover a different population or method and cannot silently stand in for this national comparison. ${stormLimit}`,
    nextQuestion: 'Which available source, if any, fits the intended national population and scope? Keep the gap visible while reviewing coverage, rather than manufacturing a reassuring number.',
  };
}
