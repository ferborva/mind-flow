// Local browser checks, not human comprehension or accessibility certification.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, realpathSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const dir = mkdtempSync(resolve(tmpdir(), 'mind-flow-station-browser-'));
const chrome = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(chrome)) throw new Error('Set CHROME_BIN to an installed Chrome/Chromium binary');
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (statSync(file).isDirectory()) file = resolve(file, 'index.html');
    file = realpathSync(file);
    if (!file.startsWith(root + sep)) throw new Error('Outside repository');
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end('Not available'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const profile = resolve(dir, 'profile');
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--disable-extensions', '--disable-component-update', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let log = '', ws, browserError;
browser.stderr.on('data', b => { log += b.toString(); });
browser.on('error', error => { browserError = error; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const deadline = setTimeout(() => { browser.kill('SIGTERM'); server.close(); process.exitCode = 1; }, 90000);
try {
  for (let i = 0; i < 100 && !existsSync(resolve(profile, 'DevToolsActivePort')) && !browserError; i++) await sleep(200);
  if (browserError) throw browserError;
  if (!existsSync(resolve(profile, 'DevToolsActivePort'))) throw new Error('Browser failed to start: ' + log.slice(-1000));
  const port = readFileSync(resolve(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let serial = 0;
  const pending = new Map(), errors = [];
  ws.addEventListener('message', event => {
    const value = JSON.parse(event.data);
    if (value.method === 'Runtime.exceptionThrown') errors.push(value.params);
    if (!pending.has(value.id)) return;
    const { resolve, reject, timer } = pending.get(value.id); pending.delete(value.id); clearTimeout(timer);
    value.error ? reject(new Error(JSON.stringify(value.error))) : resolve(value.result);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const value = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
    return value.result.value;
  };
  const navigate = async suffix => {
    await call('Page.navigate', { url: base + '/dashboard/station/' + suffix });
    for (let i = 0; i < 60; i++) {
      if (await evaluate(`location.href === ${JSON.stringify(base + '/dashboard/station/' + suffix)} && !!document.body?.dataset.stationReady`)) break;
      await sleep(100);
    }
  };
  const screenshot = async name => {
    const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(resolve(dir, name + '.png'), Buffer.from(result.data, 'base64'));
  };
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await navigate('?country=AUS&compare=USA&family=income-employment-population.v1&year=2025');
  assert.equal(await evaluate('document.body.dataset.stationReady'), 'true');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await screenshot('desktop');
  const forecasts = await evaluate('document.getElementById("forecast-cards").innerText');
  await evaluate('document.getElementById("compare-select").value="CAN"; document.getElementById("compare-select").dispatchEvent(new Event("change",{bubbles:true})); document.getElementById("year-control").value="2005"; document.getElementById("year-control").dispatchEvent(new Event("input",{bubbles:true}))');
  assert.match(await evaluate('document.getElementById("reading-grid").innerText'), /Canada/);
  assert.equal(await evaluate('document.getElementById("storm-state").innerText'), 'Baseline only');
  assert.equal(await evaluate('document.getElementById("forecast-cards").innerText'), forecasts);
  await evaluate('document.getElementById("compare-select").value="USA"; document.getElementById("compare-select").dispatchEvent(new Event("change",{bubbles:true}))');
  for (const index of [0, 1, 2, 3]) {
    await evaluate(`document.querySelector('[data-story="${index}"]').click()`);
    assert.equal(await evaluate('document.getElementById("case-narrative").hidden'), false);
    assert.equal(await evaluate('document.getElementById("forecast-cards").innerText'), forecasts);
  }
  await evaluate('document.querySelector("[data-story=\\"0\\"]").click()');
  assert.match(await evaluate('document.getElementById("reading-grid").innerText'), /-10.772 pp/);
  await evaluate('document.getElementById("explore").scrollIntoView({behavior:"instant"})'); await screenshot('peru');
  assert.match(await evaluate('document.getElementById("case-narrative").innerText'), /not the share of people/);
  await evaluate('document.getElementById("case-narrative").scrollIntoView({behavior:"instant"})'); await screenshot('evidence-tour');
  for (const section of ['if-evolution', 'forecast-ledger', 'preparation']) {
    await evaluate(`document.getElementById(${JSON.stringify(section)}).scrollIntoView({behavior:"instant"})`);
    await screenshot(section);
  }
  await evaluate('document.querySelector("[data-story=\\"3\\"]").click()');
  assert.match(await evaluate('document.getElementById("reading-grid").innerText'), /Unavailable/);
  assert.match(await evaluate('document.getElementById("chart-label").textContent'), /3.*2021.*PPP/);
  // Capture the generated Blob, not a participant response or a browser download.
  const brief = await evaluate(`(async () => {
    const originalCreate = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click;
    let blob;
    try {
      URL.createObjectURL = value => { blob = value; return originalCreate(value); };
      HTMLAnchorElement.prototype.click = function () {};
      document.getElementById('export-brief').click();
      return JSON.parse(await blob.text());
    } finally { URL.createObjectURL = originalCreate; HTMLAnchorElement.prototype.click = originalClick; }
  })()`);
  assert.equal(brief.selection.country, 'ARG'); assert.equal(brief.selection.year, 2025);
  assert.equal(brief.selected.after, null); assert.equal(brief.selected.disruptedPopulationShare, null);
  assert.equal(brief.authority, 'none'); assert.equal(brief.publicReleaseApproved, false);
  assert.match(brief.nativeSeries, /3.*2021.*PPP/); assert.ok(brief.inputs.length > 10);
  await evaluate('document.querySelector(".matrix-details").open = true; document.querySelector(".matrix-cell[tabindex=\\"0\\"]").focus()');
  const before = await evaluate('({country:document.activeElement.dataset.country,year:Number(document.activeElement.dataset.year)})');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft' });
  assert.equal(await evaluate('Number(document.activeElement.dataset.year)'), before.year - 1);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate('Number(document.getElementById("year-control").value)'), before.year - 1);
  assert.equal(await evaluate('document.activeElement.dataset.country'), before.country);
  await evaluate('document.querySelector(".matrix-details").open = false');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (let i = 0; i < 20 && await evaluate('document.getElementById("history-chart").viewBox.baseVal.width') !== 340; i++) await sleep(50);
  assert.equal(await evaluate('document.getElementById("history-chart").viewBox.baseVal.width'), 340, 'mobile chart must reflow, not shrink desktop ticks');
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false); await screenshot('mobile');
  await evaluate('document.getElementById("explore").scrollIntoView({behavior:"instant"})'); await screenshot('mobile-explore');
  await evaluate('document.getElementById("preparation").scrollIntoView({behavior:"instant"})'); await screenshot('mobile-preparation');
  await navigate('?country=UNKNOWN');
  assert.equal(await evaluate('document.body.dataset.stationReady'), 'false');
  assert.equal(await evaluate('document.getElementById("main").hidden'), true);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ status: 'passed', checks: ['real-data boot', 'comparison and year controls', 'all four guided narratives', 'fixed forecasts across years', 'Peru native change', 'Argentina no substitution', 'poverty threshold', 'exported research brief contents', 'matrix keyboard and focus', 'mobile chart reflow and overflow', 'invalid scope fails closed', 'runtime errors'], screenshots: dir, humanTesting: false }, null, 2));
} finally {
  clearTimeout(deadline); ws?.close(); browser.kill('SIGTERM'); server.close();
}
