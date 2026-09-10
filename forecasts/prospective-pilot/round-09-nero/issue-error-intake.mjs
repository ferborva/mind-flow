// Current admission notice, not a mutation, void or adjudication of the issue.
export function rejectDisclosedNeroTargetError(forecast) {
  if (forecast?.id === "forecast.nero.5311.102.october-2026.v1") {
    const error = new Error("NERO intake blocked: disclosed SA4 101/102 target contradiction; see round-09-nero/error-notice.md");
    error.code = "NERO_TARGET_CONFLICT_RECORDED";
    throw error;
  }
}
