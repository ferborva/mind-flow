// Planning attention from retained records. No network, timers, lifecycle writes,
// resolution, scoring, appointments or trusted-clock assertions exist here.
function utcInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new Error('A complete UTC instant with Z is required');
  const stamp = Date.parse(value), canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString() !== canonical) throw new Error('Invalid UTC instant');
  return stamp;
}
const text = value => typeof value === 'string' && value.trim().length > 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const labels = {
  'before-recorded-issuance': 'Before recorded issuance',
  'not-open': 'Resolution window not yet open',
  'window-open': 'Within the recorded resolution window',
  'deadline-passed': 'Past the recorded resolution deadline',
};
const next = {
  'before-recorded-issuance': 'Inspect the chronology. This retained record had not been issued at the planning instant; this desk is not a reconstruction of knowledge available then.',
  'not-open': 'Review the frozen target, intake procedure and required appointments before the window. The opening date does not guarantee a source release or permit collection.',
  'window-open': 'Check whether qualifying independently retained source evidence is available, then inspect it, authority and the exact intake chronology. A date alone cannot supply an outcome or authorise resolution; collector bounds may differ.',
  'deadline-passed': 'Review the retained pending state and seek an independently recorded disposition. Do not infer a missed human duty, unavailable source, false event, void or score from this clock.',
};

export function reviewDesk(forecasts, trust, asOf) {
  const instant = utcInstant(asOf);
  if (!Array.isArray(forecasts) || !forecasts.length) throw new Error('Forecast review contract requires retained records');
  if (!trust || !/^\d{4}-\d{2}-\d{2}$/.test(trust.reviewDate) || !text(trust.path) || !hash(trust.sourceSha256)) throw new Error('Trust review contract missing or invalid');
  try { utcInstant(trust.reviewDate + 'T00:00:00Z'); }
  catch { throw new Error('Trust review contract has an invalid calendar date'); }
  const day = new Date(instant).toISOString().slice(0, 10);
  const calendarPosition = day < trust.reviewDate ? 'before-review-date' : day === trust.reviewDate ? 'on-review-date' : 'past-review-date';
  const ids = new Set();
  const rows = forecasts.map(f => {
    if (!f || !text(f.id) || !text(f.place) || !text(f.path) || !hash(f.sourceSha256)
      || f.resolutionStatus !== 'pending' || !['issued-research', 'blocked-defect'].includes(f.operationalStatus)) throw new Error('Forecast review contract changed; review the new record edition');
    if (ids.has(f.id)) throw new Error('Forecast review contract contains a duplicate identity');
    ids.add(f.id);
    let issue, open, close;
    try { issue = utcInstant(f.issuedAt); open = utcInstant(f.resolveAfter); close = utcInstant(f.resolveBy); }
    catch (cause) { throw new Error('Forecast review contract has an invalid UTC instant', {cause}); }
    if (issue >= open || open > close) throw new Error('Forecast review contract requires issuance before opening and an ordered resolution window');
    // Registry accepted-resolution chronology includes both endpoints.
    // This does not model the separately close-exclusive collection window.
    const windowPhase = instant < issue ? 'before-recorded-issuance' : instant < open ? 'not-open' : instant <= close ? 'window-open' : 'deadline-passed';
    const admissionBlocked = f.operationalStatus === 'blocked-defect';
    return {
      id: f.id, place: f.place, issuedAt: f.issuedAt, resolveAfter: f.resolveAfter, resolveBy: f.resolveBy,
      windowPhase, phaseLabel: labels[windowPhase], admissionBlocked,
      attention: admissionBlocked ? 'blocked-defect' : windowPhase,
      nextReview: admissionBlocked ? 'Review the disclosed target defect and independent authority/policy requirements. This predecessor remains admission-blocked, not formally voided or excluded; moving the clock cannot repair it.' : next[windowPhase],
      resolutionStatus: f.resolutionStatus, source: {path:f.path,sha256:f.sourceSha256},
      outcome: null, score: null, authority: 'none',
    };
  });
  return {
    asOf: new Date(instant).toISOString(), kind: 'retained-record-review-attention',
    clockAuthenticated: false, sourceAvailabilityChecked: false, liveLifecycleVerified: false,
    mutatesRecords: false, forecasts: rows,
    trustReview: {
      reviewDate: trust.reviewDate, calendarPosition,
      label: calendarPosition === 'before-review-date' ? 'Engineering trust review ahead' : calendarPosition === 'on-review-date' ? 'Engineering trust review date reached' : 'Past the engineering trust review date',
      path: trust.path, sourceSha256: trust.sourceSha256, sourceTimeZone: null,
      calendarConvention: 'UTC date comparison for desk display only; the source specifies no hour or time zone',
      dispositionProvided: false, acceptanceRenewed: false, authority: 'none',
    },
  };
}
