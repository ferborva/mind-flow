// Keep the browser control honest when the repaired template changes.
// An unfamiliar or ambiguous template requires a reviewed control update.
export function buildRegressionControl(html) {
  const changes = [
    ['thead th{position:sticky', 'th{position:sticky'],
    ['tbody th{font-size:inherit;font-weight:inherit;color:inherit;letter-spacing:normal}', ''],
  ];
  for (const [anchor] of changes) {
    const count = html.split(anchor).length - 1;
    if (count !== 1) {
      throw new Error(`LAYOUT_CONTROL_ANCHOR_MISMATCH: expected one occurrence of ${anchor}; found ${count}. Review the regression control before running the browser check.`);
    }
  }
  return changes.reduce((content, [before, after]) => content.replace(before, after), html);
}
