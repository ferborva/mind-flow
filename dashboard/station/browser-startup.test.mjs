import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { waitForBrowserStartup } from './browser-startup.mjs';

function harness(overrides = {}) {
  let time = 0, serial = 0;
  const timers = new Map();
  const browser = Object.assign(new EventEmitter(), { exitCode: null, signalCode: null });
  const options = {
    browser, readReady: () => false, getDiagnostics: () => 'retained stderr',
    timeoutMs: 1000, pollIntervalMs: 200, now: () => time,
    setTimer: (callback, delay) => { const id = ++serial; timers.set(id, { at: time + delay, callback }); return id; },
    clearTimer: id => timers.delete(id), ...overrides,
  };
  function advance(ms) {
    const end = time + ms;
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      time = next[1].at; timers.delete(next[0]); next[1].callback();
    }
    time = end;
  }
  return { browser, options, advance, timers, clean() {
    assert.equal(timers.size, 0);
    assert.equal(browser.listenerCount('error'), 0);
    assert.equal(browser.listenerCount('exit'), 0);
  } };
}

test('immediate readiness returns the probe value without waiting', async () => {
  const h = harness({ readReady: () => '9222' });
  assert.equal(await waitForBrowserStartup(h.options), '9222'); h.clean();
});

test('polls a synchronous readiness probe and cleans up after delayed success', async () => {
  let ready = false;
  const h = harness({ readReady: () => ready });
  const pending = waitForBrowserStartup(h.options);
  h.advance(200); ready = { port: 9222 }; h.advance(200);
  assert.deepEqual(await pending, { port: 9222 }); h.clean();
});

test('timeout includes all diagnostics and clamps the final poll to its deadline', async () => {
  const diagnostics = 'dbus warning\n' + 'x'.repeat(5000);
  const h = harness({ timeoutMs: 450, getDiagnostics: () => diagnostics });
  const pending = waitForBrowserStartup(h.options);
  h.advance(449); assert.equal(h.timers.size, 1); h.advance(1);
  await assert.rejects(pending, error => {
    assert.equal(error.code, 'BROWSER_STARTUP_TIMEOUT');
    assert.equal(error.elapsedMs, 450);
    assert.equal(error.diagnostics, diagnostics);
    assert.ok(error.message.includes(diagnostics)); return true;
  }); h.clean();
});

test('a configurable longer bound waits but does not imply a startup cause or fix', async () => {
  const h = harness({ timeoutMs: 60000, pollIntervalMs: 10000 });
  const pending = waitForBrowserStartup(h.options);
  h.advance(20000); assert.equal(h.timers.size, 1); h.advance(40000);
  await assert.rejects(pending, { code: 'BROWSER_STARTUP_TIMEOUT', elapsedMs: 60000 }); h.clean();
});

test('45-second configuration admits readiness after 20 seconds without retrying the child', async () => {
  const h = harness({ timeoutMs: 45000 });
  h.options.readReady = () => h.options.now() >= 25000 ? '9222' : null;
  const pending = waitForBrowserStartup(h.options);
  h.advance(20000); assert.equal(h.timers.size, 1); h.advance(5000);
  assert.equal(await pending, '9222'); h.clean();
});

test('spawn error rejects immediately, preserving the original error and current log', async () => {
  const h = harness(); const cause = Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' });
  const pending = waitForBrowserStartup(h.options);
  h.advance(75); h.browser.emit('error', cause);
  await assert.rejects(pending, error => {
    assert.equal(error.code, 'BROWSER_SPAWN_ERROR'); assert.equal(error.cause, cause);
    assert.equal(error.elapsedMs, 75); assert.match(error.message, /retained stderr/); return true;
  }); h.clean();
});

for (const [code, signal] of [[0, null], [1, null], [null, 'SIGTERM']]) {
  test(`early exit rejects even for code ${code}, signal ${signal}`, async () => {
    const h = harness(); const pending = waitForBrowserStartup(h.options);
    h.advance(20); h.browser.emit('exit', code, signal);
    await assert.rejects(pending, { code: 'BROWSER_EXITED_BEFORE_READY', exitCode: code, signalCode: signal, elapsedMs: 20 }); h.clean();
  });
}

test('already-exited child is rejected even if a stale readiness file is present', async () => {
  const h = harness({ readReady: () => 'stale file' }); h.browser.exitCode = 0;
  await assert.rejects(waitForBrowserStartup(h.options), { code: 'BROWSER_EXITED_BEFORE_READY' }); h.clean();
});

test('readiness probe failure is surfaced, not treated as a timeout', async () => {
  const cause = Object.assign(new Error('permission denied'), { code: 'EACCES' });
  const h = harness({ readReady: () => { throw cause; } });
  await assert.rejects(waitForBrowserStartup(h.options), { code: 'BROWSER_READINESS_ERROR', cause }); h.clean();
});

test('an async probe is rejected because an unbounded promise bypasses this deadline', async () => {
  const h = harness({ readReady: () => Promise.resolve(false) });
  await assert.rejects(waitForBrowserStartup(h.options), { code: 'BROWSER_READINESS_ERROR' }); h.clean();
});

test('invalid and unbounded timing configurations fail before registering listeners', async () => {
  for (const value of [0, -1, NaN, Infinity, 120001, '20000', 1.5]) {
    const h = harness({ timeoutMs: value });
    await assert.rejects(waitForBrowserStartup(h.options), /timeoutMs/); h.clean();
  }
  for (const value of [0, -1, Infinity, 10001, '200', 0.5]) {
    const h = harness({ pollIntervalMs: value });
    await assert.rejects(waitForBrowserStartup(h.options), /pollIntervalMs/); h.clean();
  }
});

test('timeout does not consume unrelated process listeners or kill the browser', async () => {
  const h = harness(); const listener = () => {};
  h.browser.on('exit', listener); h.browser.kill = () => assert.fail('cleanup belongs to caller');
  const pending = waitForBrowserStartup(h.options); h.advance(1000);
  await assert.rejects(pending, { code: 'BROWSER_STARTUP_TIMEOUT' });
  assert.deepEqual(h.browser.listeners('exit'), [listener]); h.browser.off('exit', listener); h.clean();
});

test('readiness appearing at the deadline cannot turn an expired wait into success', async () => {
  const h = harness(); h.options.readReady = () => h.options.now() >= 1000;
  const pending = waitForBrowserStartup(h.options); h.advance(1000);
  await assert.rejects(pending, { code: 'BROWSER_STARTUP_TIMEOUT' }); h.clean();
});

test('a slow synchronous probe cannot report readiness after consuming the bound', async () => {
  let time = 0;
  const h = harness({ now: () => time, readReady: () => { time = 1001; return 'late file'; } });
  await assert.rejects(waitForBrowserStartup(h.options), { code: 'BROWSER_STARTUP_TIMEOUT', elapsedMs: 1001 }); h.clean();
});

test('an exit observed during a readiness probe cannot be masked by its return value', async () => {
  const h = harness();
  h.options.readReady = () => { h.browser.emit('exit', 1, null); return 'stale file'; };
  await assert.rejects(waitForBrowserStartup(h.options), { code: 'BROWSER_EXITED_BEFORE_READY' }); h.clean();
});

test('failure of the diagnostics collector is visible without replacing the startup failure', async () => {
  const h = harness({ getDiagnostics: () => { throw new Error('collector unavailable'); } });
  const pending = waitForBrowserStartup(h.options); h.advance(1000);
  await assert.rejects(pending, error => {
    assert.equal(error.code, 'BROWSER_STARTUP_TIMEOUT');
    assert.match(error.message, /Diagnostics collector failed: collector unavailable/); return true;
  }); h.clean();
});
