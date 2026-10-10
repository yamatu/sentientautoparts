const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const base = process.env.TEST_SITE_URL || 'http://localhost:8090';
  const reports = path.join(__dirname, '../../reports');
  fs.mkdirSync(reports, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  let completed = false;
  const check = (name, value) => { checks.push({ check: name, passed: !!value }); console.log(`${value ? 'PASS' : 'FAIL'} ${name}`); assert.ok(value, name); };
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const [label, route] of [['home', '/'], ['catalog', '/products'], ['product', '/products/LEGACY-35'], ['contact', '/contact_us'], ['download', '/download'], ['distributor', '/dujia'], ['news', '/news']]) {
        const response = await page.goto(base + route, { waitUntil: 'networkidle' });
        check(`${label} ${viewport.width} HTTP 200`, response.status() === 200);
        await page.screenshot({ path: path.join(reports, `${label}-${viewport.width}.png`), fullPage: true });
        const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: innerWidth }));
        check(`${label} ${viewport.width} no horizontal overflow`, dimensions.page <= dimensions.view + 1);
        if (label === 'product') {
          const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
          check('Product canonical', canonical.endsWith('/products/LEGACY-35'));
          check('Product images visible', await page.locator('.proimg img').isVisible());
          const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
          check('Product JSON-LD valid', schema.some(s => JSON.parse(s)['@type'] === 'Product'));
        }
        if (label === 'home') {
          check(`Banner fallback loaded ${viewport.width}`, await page.locator('.home_banner img').evaluate(img => img.complete && img.naturalWidth > 0));
          const next = page.getByRole('button', { name: 'Next banner' });
          if (await next.count()) {
            const oldSource = await page.locator('.home_banner img').getAttribute('src');
            await next.click();
            await page.waitForFunction(() => document.querySelector('.legacy-banner-controls span')?.textContent.startsWith('2 /'));
            check(`Banner navigation ${viewport.width}`, (await page.locator('.home_banner img').getAttribute('src')) !== oldSource || (await page.locator('.legacy-banner-controls span').textContent()).startsWith('2 /'));
          }
          if (viewport.width < 736) {
            check('Mobile menu initially closed', !(await page.locator('#mobile-menu').isVisible()));
            await page.getByRole('button', { name: 'Toggle navigation' }).click();
            check('Mobile menu opens', await page.locator('#mobile-menu').isVisible());
            check('Mobile search accessible', await page.locator('#mobile-menu input[name="q"]').isVisible());
            await page.getByRole('button', { name: 'Toggle navigation' }).click();
            check('Mobile menu closes', !(await page.locator('#mobile-menu').isVisible()));
          }
        }
        if (label === 'contact') {
          check(`Inquiry form visible ${viewport.width}`, await page.locator('button[type="submit"]').filter({ hasText: 'Send Inquiry' }).first().isVisible());
        }
      }
      check(`No browser exceptions ${viewport.width}`, errors.length === 0);
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(base + '/products?q=LEGACY-35', { waitUntil: 'domcontentloaded' });
    await page.locator('.pro_list .item').first().waitFor({ state: 'visible' });
    check('Search filters exact imported SKU', await page.locator('.pro_list .item').count() === 1 && (await page.locator('.pro_list').textContent()).includes('LEGACY-35'));
    await page.goto(base + '/contact_us', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="name"]').fill('Migration Browser Test');
    await page.locator('input[name="email"]').fill('migration-browser@example.com');
    await page.locator('textarea[name="message"]').fill('Browser inquiry regression, not a customer inquiry. Delete after verification.');
    await page.getByRole('button', { name: 'Send Inquiry', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Thank you. Your inquiry has been received.' }).waitFor({ state: 'visible' });
    check('Browser inquiry submission', true);
    await page.goto(base + '/download', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="name"]').fill('Migration Browser Test');
    await page.locator('input[name="email"]').fill('migration-browser@example.com');
    await page.getByRole('button', { name: 'Download Catalog', exact: true }).click();
    const pdfLink = page.getByRole('link', { name: 'Download PDF' });
    await pdfLink.waitFor({ state: 'visible' });
    const pdf = await context.request.get(base + await pdfLink.getAttribute('href'));
    check('Catalog request unlocks actual PDF', pdf.status() === 200 && (await pdf.body()).subarray(0, 4).toString() === '%PDF');
    const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#') && l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
    await page.goto(base + '/admin/login');
    await page.locator('input[name="username"]').fill(env.DEFAULT_ADMIN_USERNAME);
    await page.locator('input[name="password"]').fill(env.DEFAULT_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => url.pathname === '/admin', { timeout: 30000 });
    check('Admin browser login', page.url().endsWith('/admin'));
    // The admin keeps background queries active; networkidle is not an
    // acceptance condition. Wait for the actual API result and rendered record.
    const productsResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/products' && r.request().method() === 'GET', { timeout: 30000 });
    await page.goto(base + '/admin/products', { waitUntil: 'domcontentloaded' });
    check('Admin products API response', (await productsResponse).status() === 200);
    await page.getByText('LEGACY-35', { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
    check('Admin products page', (await page.textContent('body')).includes('LEGACY-35'));
    await page.getByText(/普通保存时已关闭|Disabled for ordinary saves/).waitFor({ state: 'visible' });
    check('Admin shows real enrichment setting', true);
    await page.screenshot({ path: path.join(reports, 'admin-products.png'), fullPage: true });
    const seoStatsResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/ai-agent/seo/stats', { timeout: 30000 });
    const seoResponse = await page.goto(base + '/admin/ai-seo', { waitUntil: 'domcontentloaded' });
    await page.locator('h1').filter({ hasText: 'AI SEO' }).last().waitFor({ state: 'visible', timeout: 30000 });
    check('Preserved SEO data API', (await seoStatsResponse).status() === 200);
    check('Preserved SEO page accessible', seoResponse.status() === 200 && !page.url().includes('/login'));
    await page.screenshot({ path: path.join(reports, 'admin-seo.png'), fullPage: true });
    await context.close();
    completed = true;
  } finally {
    checks.push({ check: 'All browser stages completed', passed: completed });
    fs.writeFileSync(path.join(reports, 'browser-test.json'), JSON.stringify(checks, null, 2));
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
