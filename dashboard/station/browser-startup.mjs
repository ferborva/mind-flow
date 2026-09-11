// Readiness waiting only. The caller owns spawning, stderr capture and cleanup.
// A longer configured wait is not a diagnosis or a fix for a browser failure.
export const MAX_STARTUP_TIMEOUT_MS = 120000;

/**
 * Attach immediately after spawn, before yielding, so spawn errors are observed.
 * readReady must be synchronous and return null/undefined/false until ready.
 * It should handle expected transient states (e.g. ENOENT or a partial file);
 * other probe failures are surfaced immediately. Readiness is not CDP health.
 * getDiagnostics should return the caller's entire retained stderr log. Nothing
 * is truncated here; callers may also stream diagnostics to their CI log.
 * Use a monotonic clock. Injectable clock/timers are for deterministic tests.
 */
export async function waitForBrowserStartup({
  browser, readReady, getDiagnostics = () => '',
  timeoutMs = 20000, pollIntervalMs = 200,
  now = () => performance.now(), setTimer = setTimeout, clearTimer = clearTimeout,
}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_STARTUP_TIMEOUT_MS) {
    throw new RangeError(`timeoutMs must be an integer from 1 to ${MAX_STARTUP_TIMEOUT_MS}`);
  }
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1 || pollIntervalMs > 10000) {
    throw new RangeError('pollIntervalMs must be an integer from 1 to 10000');
  }
  if (!browser?.on || !browser?.off || typeof readReady !== 'function' || typeof getDiagnostics !== 'function') {
    throw new TypeError('A child process, synchronous readReady and getDiagnostics functions are required');
  }
  const started = now();
  return new Promise((resolve, reject) => {
    let settled = false, timer;
    const elapsed = () => Math.max(0, now() - started);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimer(timer);
      browser.off('error', onError); browser.off('exit', onExit);
      error ? reject(error) : resolve(value);
    }
    function fail(code, reason, detail = {}) {
      let diagnostics;
      try { diagnostics = String(getDiagnostics()); }
      catch (error) { diagnostics = `Diagnostics collector failed: ${error?.message || String(error)}`; }
      const elapsedMs = elapsed();
      const error = new Error(`${reason} after ${elapsedMs}ms (startup bound ${timeoutMs}ms).\nBrowser diagnostics:\n${diagnostics || '(none captured)'}`, detail.cause ? { cause: detail.cause } : undefined);
      Object.assign(error, { code, elapsedMs, timeoutMs, diagnostics }, detail);
      finish(error);
    }
    function onError(cause) { fail('BROWSER_SPAWN_ERROR', `Browser process error: ${cause.message}`, { cause }); }
    function onExit(exitCode, signalCode) {
      fail('BROWSER_EXITED_BEFORE_READY', `Browser exited before readiness (code ${exitCode}, signal ${signalCode})`, { exitCode, signalCode });
    }
    function poll() {
      if (settled) return;
      if (browser.exitCode != null || browser.signalCode != null) return onExit(browser.exitCode, browser.signalCode);
      if (elapsed() >= timeoutMs) return fail('BROWSER_STARTUP_TIMEOUT', 'Browser readiness deadline expired');
      let value;
      try {
        value = readReady();
        if (value && typeof value.then === 'function') {
          // Consume a rejected accidental promise to prevent an unhandled error;
          // the contract violation still fails immediately, without awaiting it.
          Promise.resolve(value).catch(() => {});
          throw new TypeError('readReady must be synchronous; promises are not supported');
        }
      } catch (cause) { return fail('BROWSER_READINESS_ERROR', `Browser readiness probe failed: ${cause.message}`, { cause }); }
      if (settled) return;
      // A probe cannot rescue a deadline it exhausted, or mask an observed exit.
      if (browser.exitCode != null || browser.signalCode != null) return onExit(browser.exitCode, browser.signalCode);
      const remaining = timeoutMs - elapsed();
      if (remaining <= 0) return fail('BROWSER_STARTUP_TIMEOUT', 'Browser readiness deadline expired');
      if (value !== false && value != null) return finish(null, value);
      timer = setTimer(poll, Math.min(pollIntervalMs, remaining));
    }
    browser.on('error', onError); browser.on('exit', onExit);
    poll();
  });
}
