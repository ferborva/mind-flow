// Optional browser check, not part of the dependency-free Node test contract.
// Supply an installed Puppeteer entry point, Chromium executable and temporary
// screenshot directory. All network requests are blocked; only built HTML runs.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildRegressionControl } from './primary-care-layout-control.mjs';

const [modulePath, executablePath, screenshotDirectory] = process.argv.slice(2);
if (!modulePath || !executablePath || !screenshotDirectory || process.argv.length !== 5) {
  throw new Error('Usage: node dashboard/tools/check-primary-care-layout.mjs <puppeteer-entry> <chromium-executable> <temporary-screenshot-directory>');
}
const { default: puppeteer } = await import(pathToFileURL(resolve(modulePath)).href);
const html = readFileSync(new URL('../../pilots/australia/web/index.html', import.meta.url), 'utf8');
const regressionControl = buildRegressionControl(html);
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  mkdirSync(resolve(screenshotDirectory), { recursive: true });
  for (const width of [1280, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', request => request.abort());
    for (const version of ['regression-control', 'repaired']) {
      const content = version === 'repaired' ? html : regressionControl;
      await page.setContent(content, { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
      const result = await page.evaluate(async () => {
        const tables = [...document.querySelectorAll('#primary-care table')];
        const rows = [...document.querySelectorAll('#primary-care tbody th')];
        const styles = rows.map(cell => {
          const computed = getComputedStyle(cell);
          return { position: computed.position, fontSize: computed.fontSize,
            adjacentFontSize: getComputedStyle(cell.nextElementSibling).fontSize };
        });
        const scrolls = [];
        for (const table of tables) {
          const wrapper = table.closest('.table-wrap');
          wrapper.scrollIntoView();
          wrapper.scrollTop = 0;
          const cell = table.querySelector('tbody th');
          const start = cell.getBoundingClientRect().top - wrapper.getBoundingClientRect().top;
          wrapper.scrollTop = 700;
          await new Promise(requestAnimationFrame);
          scrolls.push({ id: table.id, scrollTop: wrapper.scrollTop,
            moved: start - (cell.getBoundingClientRect().top - wrapper.getBoundingClientRect().top),
            columnPosition: getComputedStyle(table.querySelector('thead th')).position });
        }
        const view = document.querySelector('#gp-condition-table').closest('.table-wrap');
        window.scrollTo(0, window.scrollY + view.getBoundingClientRect().top - 180);
        return { rowCount: rows.length, styles, scrolls };
      });
      assert.equal(result.rowCount, 15);
      if (version === 'regression-control') {
        assert.equal(result.styles.filter(style => style.position === 'sticky').length, 15);
        assert.ok(result.scrolls.some(scroll => Math.abs(scroll.moved - scroll.scrollTop) > 1));
      } else {
        for (const style of result.styles) {
          assert.equal(style.position, 'static');
          assert.equal(style.fontSize, style.adjacentFontSize);
        }
        for (const scroll of result.scrolls) {
          assert.ok(scroll.scrollTop > 0, `${scroll.id} must actually scroll`);
          assert.ok(Math.abs(scroll.moved - scroll.scrollTop) < 1, JSON.stringify(scroll));
          assert.equal(scroll.columnPosition, 'sticky');
        }
      }
      await page.screenshot({ path: resolve(screenshotDirectory, `${version}-${width}.png`) });
      console.log(JSON.stringify({ browser: await browser.version(), width, version, ...result }));
    }
    await page.close();
  }
} finally {
  await browser.close();
}
