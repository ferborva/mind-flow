// Local browser checks, not human comprehension or accessibility certification.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, realpathSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForBrowserStartup } from './browser-startup.mjs';

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
const deadline = setTimeout(() => { browser.kill('SIGTERM'); server.close(); process.exitCode = 1; }, 120000);
try {
  const port = await waitForBrowserStartup({ browser, timeoutMs: 45000, getDiagnostics: () => log,
    readReady: () => {
      let contents;
      try { contents = readFileSync(resolve(profile, 'DevToolsActivePort'), 'utf8'); }
      catch (error) { if (error.code === 'ENOENT') return false; throw error; }
      const [port, endpoint] = contents.split('\n');
      // A file can be present before its complete port/endpoint pair is written.
      return /^\d+$/.test(port) && Number(port) > 0 && Number(port) <= 65535 && endpoint?.startsWith('/devtools/browser/') ? port : false;
    },
  });
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
  // Inspect the generated local Blob without saving responses or initiating downloads.
  const downloadBrief = () => evaluate(`(async () => {
    const originalCreate = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click;
    let blob;
    try {
      URL.createObjectURL = value => { blob = value; return originalCreate(value); };
      HTMLAnchorElement.prototype.click = function () {};
      document.getElementById('export-brief').click();
      return JSON.parse(await blob.text());
    } finally { URL.createObjectURL = originalCreate; HTMLAnchorElement.prototype.click = originalClick; }
  })()`);
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await navigate('?country=AUS&compare=USA&family=income-employment-population.v1&year=2025');
  assert.equal(await evaluate('document.body.dataset.stationReady'), 'true');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await screenshot('desktop');
  const forecasts = await evaluate('document.getElementById("forecast-cards").innerText');
  const retainedForecasts = await evaluate('JSON.stringify(window.WEATHER_STATION.forecasts)');
  for (const [instant, neroPhase, canadaPhase] of [
    ['2026-09-16T00:00:00Z', 'not-open', 'not-open'],
    ['2026-11-03T00:00:00Z', 'window-open', 'not-open'],
    ['2026-12-07T00:00:00Z', 'window-open', 'window-open'],
    ['2026-12-07T00:00:00.001Z', 'deadline-passed', 'window-open'],
    ['2027-01-01T00:00:00Z', 'deadline-passed', 'deadline-passed'],
  ]) {
    await evaluate(`document.getElementById('review-clock').value=${JSON.stringify(instant)}; document.getElementById('review-clock-apply').click()`);
    const rows = await evaluate(`Array.from(document.querySelectorAll('#review-desk-rows [data-forecast-id]'), el => ({id:el.dataset.forecastId,phase:el.dataset.windowPhase,attention:el.dataset.attention}))`);
    assert.equal(rows.length, 4);
    for (const row of rows) {
      assert.equal(row.phase, row.id.includes('nero') ? neroPhase : canadaPhase);
      if (row.id === 'forecast.nero.5311.102.october-2026.v1') assert.equal(row.attention, 'blocked-defect');
    }
    if (instant === '2026-09-16T00:00:00Z') assert.equal(await evaluate('document.getElementById("review-trust").dataset.calendarPosition'), 'on-review-date');
    if (instant === '2026-11-03T00:00:00Z') {
      await evaluate('document.getElementById("review-clock").scrollIntoView({behavior:"instant"})');
      await screenshot('review-desk-open-window');
    }
    assert.equal(await evaluate('document.getElementById("forecast-cards").innerText'), forecasts);
    assert.equal(await evaluate('JSON.stringify(window.WEATHER_STATION.forecasts)'), retainedForecasts);
  }
  await evaluate('document.getElementById("review-clock").value="2026-02-30T00:00:00Z"; document.getElementById("review-clock-apply").click()');
  assert.equal(await evaluate('document.querySelectorAll("#review-desk-rows [data-forecast-id]").length'), 0);
  assert.equal(await evaluate('document.getElementById("review-trust").textContent.trim()'), '');
  assert.match(await evaluate('document.getElementById("review-clock-status").textContent'), /invalid|UTC|unavailable/i);
  assert.equal(await evaluate('document.body.dataset.stationReady'), 'true');
  assert.equal(await evaluate('document.getElementById("forecast-cards").innerText'), forecasts);
  await evaluate('document.getElementById("review-clock-reset").click()');
  assert.equal(await evaluate('document.querySelectorAll("#review-desk-rows [data-forecast-id]").length'), 4);
  await evaluate('document.getElementById("compare-select").value="CAN"; document.getElementById("compare-select").dispatchEvent(new Event("change",{bubbles:true})); document.getElementById("year-control").value="2005"; document.getElementById("year-control").dispatchEvent(new Event("input",{bubbles:true}))');
  assert.match(await evaluate('document.getElementById("reading-grid").innerText'), /Canada/);
  assert.equal(await evaluate('document.getElementById("storm-state").innerText'), 'Baseline only');
  assert.equal(await evaluate('document.getElementById("forecast-cards").innerText'), forecasts);
  await evaluate('document.getElementById("compare-select").value="USA"; document.getElementById("compare-select").dispatchEvent(new Event("change",{bubbles:true}))');
  for (const index of [0, 1, 2, 3]) {
    await evaluate(`document.querySelector('[data-story="${index}"]').click()`);
    assert.equal(await evaluate('document.getElementById("case-narrative").hidden'), false);
    assert.equal(await evaluate('document.getElementById("forecast-cards").innerText'), forecasts);
    await evaluate('document.getElementById("brief-preview").open=true');
    const exported = await downloadBrief();
    assert.equal(exported.selection.country, await evaluate('document.getElementById("country-select").value'));
    assert.equal(exported.inquiry.question, await evaluate('document.querySelector("[data-handoff-question]").innerText'));
    assert.equal(exported.inquiry.question, await evaluate('document.querySelector("#case-narrative section:last-child p").innerText'));
    assert.equal(exported.inquiry.nextStep.verb, 'Review');
    assert.equal(exported.inquiry.conditionsEvaluated, false);
    assert.equal(exported.inquiry.actionTaken, false);
    assert.match(exported.inquiry.stopIf, /unapproved personal data/);
    assert.ok(exported.inquiry.missingAccessEvidence.length > 0);
    assert.equal(exported.inquiry.assessmentSource.selector.country, exported.selection.country);
  }
  await evaluate('document.getElementById("brief-handoff").scrollIntoView({behavior:"instant"})'); await screenshot('research-handoff');
  await evaluate('document.getElementById("brief-preview").open=false');
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
  const brief = await downloadBrief();
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
  await evaluate('document.getElementById("review-clock").scrollIntoView({behavior:"instant"})'); await screenshot('mobile-review-desk');
  await evaluate('document.getElementById("brief-preview").open=true;document.getElementById("brief-handoff").scrollIntoView({behavior:"instant"})');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false); await screenshot('mobile-research-handoff');
  await navigate('?country=UNKNOWN');
  assert.equal(await evaluate('document.body.dataset.stationReady'), 'false');
  assert.equal(await evaluate('document.getElementById("main").hidden'), true);
  // Read rendered material against the source-bound pack, not against its HTML generator.
  // These legacy pages expose feedback for review; they are not a held-out human test.
  const pack = JSON.parse(readFileSync(resolve(root, 'experiments/decision-experience/task-pack.json'), 'utf8'));
  const expectedMaterials = pack.materials.map(({ id, label, value }) => ({ id, label, value }));
  const expectedOptions = pack.tasks.flatMap(task => task.options.map(option => ({ label: option.label, feedback: 'Proposed feedback: ' + option.feedback })));
  for (const kind of ['conventional', 'station']) {
    const url = base + `/experiments/decision-experience/${kind}.html`;
    await call('Page.navigate', { url });
    for (let i = 0; i < 60; i++) {
      if (await evaluate(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete' && document.querySelectorAll('[data-material-id]').length === 14`)) break;
      await sleep(100);
    }
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-material-id]'), el => ({id:el.dataset.materialId,label:el.querySelector('h2').innerText,value:el.querySelector('p').innerText}))`), expectedMaterials);
    assert.equal(await evaluate('document.querySelectorAll("script,form,input,textarea,select,iframe").length'), 0);
    assert.match(await evaluate('document.body.innerText'), /Recruitment blocked/);
    // Native disclosure keyboard behaviour and exact exposed author feedback.
    for (let i = 0; i < expectedOptions.length; i++) {
      await evaluate(`document.querySelectorAll('summary')[${i}].focus()`);
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      assert.equal(await evaluate(`document.querySelectorAll('details')[${i}].open`), true);
    }
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('details'), el => ({label:el.querySelector('summary').innerText,feedback:el.querySelector('p').innerText}))`), expectedOptions);
    for (const width of [1440, 320]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await evaluate('window.scrollTo(0,0)');
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `${kind}: overflow at ${width}px`);
      for (const material of pack.materials) {
        assert.equal(await evaluate(`(() => {
          const el = document.querySelector('[data-material-id="${material.id}"]');
          el.scrollIntoView({behavior:'instant'});
          return [el, ...el.querySelectorAll('h2,p')].every(node => {
            const style = getComputedStyle(node), rect = node.getBoundingClientRect();
            return style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0
              && rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.right <= innerWidth + 1;
          });
        })()`), true, `${kind}: rendered ${material.id} at ${width}px`);
      }
      await evaluate('window.scrollTo(0,0)'); await screenshot(`rehearsal-${kind}-${width}`);
    }
    await evaluate('document.body.style.fontSize="36px"');
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `${kind}: text enlargement overflow`);
    const tree = await call('Accessibility.getFullAXTree');
    const names = tree.nodes.filter(node => !node.ignored).map(node => node.name?.value);
    for (const material of pack.materials) assert.ok(names.includes(material.label), `${kind}: accessibility tree heading ${material.id}`);
    assert.ok(names.includes('59.467%') && names.includes('59.114%'), `${kind}: accessibility tree exact values`);
  }
  // A separately identified static slice, not the full interactive station treatment.
  // Both layouts move assessment and authority alongside the native reading.
  const sliceOrder = ['scope', 'before', 'after', 'change', 'denominator', 'vintage', 'storm', 'authority', 'limits', 'missing', 'if', 'forecast', 'source', 'correction'];
  const sliceMaterials = sliceOrder.map(id => expectedMaterials.find(material => material.id === id));
  for (const kind of ['conventional', 'station']) {
    const url = base + `/experiments/decision-experience/presentation-v2/${kind}.html`;
    await call('Page.navigate', { url });
    for (let i = 0; i < 60; i++) {
      if (await evaluate(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete' && document.querySelectorAll('[data-material-id]').length === 14`)) break;
      await sleep(100);
    }
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-material-id]'), el => ({id:el.dataset.materialId,label:el.querySelector('[data-material-label]').innerText,value:el.querySelector('[data-material-value]').innerText}))`), sliceMaterials, `${kind}: v2 exact rendered facts`);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-option-id]'), el => el.innerText)`), expectedOptions.map(option => option.label));
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-task-id]'), el => ({id:el.dataset.taskId,title:el.querySelector('[data-task-title]').innerText,prompt:el.querySelector('[data-task-prompt]').innerText}))`), pack.tasks.map(({id,title,prompt}) => ({id,title,prompt})));
    assert.equal(await evaluate('document.querySelectorAll("script,form,input,textarea,select,iframe,details").length'), 0);
    const bodyText = await evaluate('document.body.innerText');
    assert.match(bodyText, /Recruitment blocked/);
    for (const task of pack.tasks) for (const option of task.options) assert.ok(!bodyText.includes(option.feedback), `${kind}: feedback must remain on reviewer sheet`);
    for (const width of [1440, 320]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      for (const material of pack.materials) {
        assert.equal(await evaluate(`(() => {
          const el = document.querySelector('[data-material-id="${material.id}"]');
          el.scrollIntoView({behavior:'instant'});
          return [...el.querySelectorAll('[data-material-label],[data-material-value]')].every(node => {
            const style = getComputedStyle(node), rect = node.getBoundingClientRect();
            return style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0
              && rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.right <= innerWidth + 1;
          });
        })()`), true, `${kind}: v2 visible ${material.id} at ${width}px`);
      }
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `${kind}: v2 overflow at ${width}px`);
      if (kind === 'conventional' && width === 320) {
        assert.equal(await evaluate(`(() => {
          const row = document.querySelector('[data-material-id=scope]');
          const label = row.querySelector('[data-material-label]').getBoundingClientRect();
          const value = row.querySelector('[data-material-value]').getBoundingClientRect();
          return value.width >= 240 && value.top >= label.bottom - 1;
        })()`), true, 'narrow conventional release should stack complete label/value rows, not squeeze two text columns');
      }
      await evaluate('window.scrollTo(0,0)'); await screenshot(`slice-${kind}-${width}`);
      await evaluate('document.querySelector("[data-section-id=gates]").scrollIntoView({behavior:"instant"})'); await screenshot(`slice-${kind}-gates-${width}`);
    }
    await evaluate('document.body.style.fontSize="36px"');
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `${kind}: v2 enlarged text`);
    const tree = await call('Accessibility.getFullAXTree');
    const names = tree.nodes.filter(node => !node.ignored).map(node => node.name?.value);
    for (const material of pack.materials) assert.ok(names.includes(material.label), `${kind}: v2 accessibility tree label ${material.id}`);
    if (kind === 'conventional') assert.equal(tree.nodes.filter(node => !node.ignored && node.role?.value === 'table').length, 4, 'stacked conventional sections keep their table roles in Chrome');
    // Exercise a real local return link instead of merely checking its markup.
    assert.equal(await evaluate(`(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => new URL(a.href).pathname === '/dashboard/station/');
      if (!link) return false;
      link.focus(); return document.activeElement === link;
    })()`), true, `${kind}: return link keyboard focus`);
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    for (let i = 0; i < 60; i++) {
      if (await evaluate(`location.pathname === '/dashboard/station/' && document.body?.dataset.stationReady === 'true'`)) break;
      await sleep(100);
    }
    assert.equal(await evaluate('document.body.dataset.stationReady'), 'true', `${kind}: local return journey`);
  }
  if (browserError) throw browserError;
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ status: 'passed', checks: ['real-data boot', 'comparison and year controls', 'all four guided narratives', 'fixed forecasts across years', 'review desk exact boundary clocks', 'review desk preserved defect', 'review desk separate trust date', 'review desk local invalid input and reset', 'review desk immutable forecast records', 'Peru native change', 'Argentina no substitution', 'poverty threshold', 'exported research brief contents', 'four guided handoffs match preview and download', 'mobile research handoff reflow', 'matrix keyboard and focus', 'mobile chart reflow and overflow', 'invalid scope fails closed', 'rehearsal rendered fact and option parity', 'rehearsal disclosure keyboard', 'rehearsal 320px reflow and text enlargement', 'rehearsal accessibility tree headings and values', 'static slice exact facts and tasks', 'static slice feedback separated', 'static slice reflow and accessibility tree labels', 'static slice return journey', 'runtime errors'], screenshots: dir, humanTesting: false, accessibilityCertification: false }, null, 2));
} finally {
  clearTimeout(deadline); ws?.close(); browser.kill('SIGTERM'); server.close();
}
