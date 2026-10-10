// Local CSS diagnostic only; does not replace testing a rebuilt production image.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const route of ['/', '/products', '/products/LEGACY-35', '/contact_us']) {
      await page.goto('http://127.0.0.1:8090' + route, { waitUntil: 'networkidle' });
      await page.addStyleTag({ path: path.join(__dirname, '../src/app/storefront.css') });
      const data = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        overflow: Array.from(document.querySelectorAll('body *')).filter(el => {
          const r = el.getBoundingClientRect();
          return r.width && r.height && (r.right > innerWidth + 1 || r.left < -1);
        }).slice(0, 15).map(el => ({ tag: el.tagName, class: el.className, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })),
        brokenImages: Array.from(document.images).filter(i => i.complete && !i.naturalWidth).map(i => i.src)
      }));
      report.push({ route, ...data });
      console.log(JSON.stringify(report.at(-1)));
    }
  } finally {
    fs.writeFileSync(path.join(__dirname, '../../reports/layout-diagnostic.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
