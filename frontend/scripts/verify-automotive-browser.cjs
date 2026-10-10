const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
 const base='http://127.0.0.1:8090';const reports=path.join(__dirname,'../../reports');
 const browser=await chromium.launch({headless:true});const checks=[];let complete=false;
 const check=(name,passed)=>{checks.push({check:name,passed:!!passed});console.log(`${passed?'PASS':'FAIL'} ${name}`);assert.ok(passed,name);};
 try {
  for(const viewport of [{width:1440,height:1000},{width:768,height:1024},{width:390,height:844}]){
   const context=await browser.newContext({viewport});const page=await context.newPage();page.setDefaultTimeout(20000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const [label,route] of [['home','/'],['catalog','/products'],['product','/products/ST-10025'],['contact','/contact_us']]){
    const response=await page.goto(base+route,{waitUntil:'networkidle'});check(`${label} ${viewport.width} HTTP 200`,response.status()===200);
    const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));check(`${label} ${viewport.width} no overflow`,dimensions.scroll<=dimensions.width+1);
    // Scroll once so lazily loaded content appears in the full-page evidence.
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=innerHeight){scrollTo(0,y);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}scrollTo(0,0);});
    await page.screenshot({path:path.join(reports,`automotive-${label}-${viewport.width}.png`),fullPage:true});
    check(`${label} has new brand`,(await page.textContent('body')).includes('sentientautoparts')&&!(await page.textContent('body')).toLowerCase().includes('vibocnc'));
    if(label==='home'){
     check('Real automotive hero image',await page.locator('.sap-hero-visual > img').evaluate(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('placeholder')));
     if(viewport.width<760){const menu=page.getByRole('button',{name:'Toggle navigation'});check('Mobile menu initially closed',!await page.locator('#mobile-menu').isVisible());await menu.click();check('Mobile search available',await page.locator('#mobile-menu input').isVisible());await menu.click();}
    }
    if(label==='contact') {check(`Inquiry fields usable ${viewport.width}`,await page.locator('input[name="name"]').evaluate(el=>el.getBoundingClientRect().width>190));}
    if(label==='product'){
     check('OE and compressor data visible',(await page.textContent('body')).includes('88320-0C010')&&(await page.textContent('body')).includes('10S17C'));
     check('Product image real',await page.locator('.proimg img').evaluate(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('placeholder')));
     check('Canonical preserves supplier SKU',(await page.locator('link[rel=canonical]').getAttribute('href')).endsWith('/products/ST-10025'));
     const thumbs=page.locator('.sap-gallery-thumbs button');if(await thumbs.count()>1){await thumbs.nth(1).click();check('Gallery interaction',await thumbs.nth(1).getAttribute('aria-pressed')==='true');}
    }
   }
   check('No browser exceptions '+viewport.width,errors.length===0);await context.close();
  }
  const context=await browser.newContext({viewport:{width:1440,height:1100}});const page=await context.newPage();
  await page.goto(base+'/products');await page.locator('.sap-filter-form input[name="q"]').fill('883200C010');await page.getByRole('button',{name:'Find parts',exact:true}).click();await page.waitForURL(/q=883200C010/);await page.locator('.sap-product-card').first().waitFor();check('OE search via browser',(await page.textContent('.sap-catalog-results')).includes('88320-0C010'));
  await page.goto(base+'/contact_us');await page.locator('input[name="name"]').fill('Automotive Browser Test');await page.locator('input[name="email"]').fill('automotive-test@example.com');await page.locator('input[name="vehicle"]').fill('Toyota Land Cruiser 2003');await page.locator('input[name="product"]').fill('ST-10025 / 88320-0C010');await page.locator('textarea[name="message"]').fill('Local automotive migration regression; not a customer inquiry.');await page.getByRole('button',{name:'Send Inquiry',exact:true}).click();await page.getByRole('status').filter({hasText:'Your inquiry has been received'}).waitFor();check('Automotive inquiry submitted',true);
  await page.goto(base+'/download');await page.locator('input[name="name"]').fill('Automotive Browser Test');await page.locator('input[name="email"]').fill('automotive-test@example.com');await page.getByRole('button',{name:'Download Catalog',exact:true}).click();const pdfLink=page.getByRole('link',{name:'Download PDF'});await pdfLink.waitFor();const pdf=await context.request.get(base+await pdfLink.getAttribute('href'));check('Automotive catalog PDF download',pdf.status()===200&&(await pdf.body()).subarray(0,4).toString()==='%PDF');
  const env=Object.fromEntries(fs.readFileSync(path.join(__dirname,'../../.env'),'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
  await page.goto(base+'/admin/login');check('Login branding',!(await page.textContent('body')).toLowerCase().includes('vibocnc'));await page.locator('input[name="username"]').fill(env.DEFAULT_ADMIN_USERNAME);await page.locator('input[name="password"]').fill(env.DEFAULT_ADMIN_PASSWORD);await page.locator('button[type=submit]').click();await page.waitForURL(u=>u.pathname==='/admin');
  const productsResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/admin/products'&&r.request().method()==='GET');await page.goto(base+'/admin/products',{waitUntil:'domcontentloaded'});check('Admin product API',(await productsResponse).status()===200);await page.getByText(/管理汽配目录|Manage automotive parts/).waitFor();check('Automotive admin copy',!(await page.textContent('body')).toLowerCase().includes('vibocnc'));
  await page.screenshot({path:path.join(reports,'automotive-admin-products.png'),fullPage:true});
  const listing=await context.request.get(base+'/api/v1/public/storefront/products?q=ST-10025');const product=(await listing.json()).data.products.find(p=>p.sku==='ST-10025');
  await page.goto(base+`/admin/products/${product.id}/edit`,{waitUntil:'domcontentloaded'});const editor=page.getByRole('region',{name:'Automotive product fields'});await editor.waitFor({state:'visible'});check('Automotive form loads existing OE reference',(await editor.locator('textarea').first().inputValue()).includes('88320-0C010'));await editor.screenshot({path:path.join(reports,'automotive-admin-fields.png')});
  const backup=(await (await context.request.get(base+`/api/v1/admin/products/${product.id}`)).json()).data;
  try {
   await editor.getByLabel(/制冷剂|Refrigerant/).fill('Regression Refrigerant');
   const saveResponse=page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/admin/products/${product.id}`&&r.request().method()==='PUT');await page.locator('button[type="submit"]').last().click();check('Automotive fields save through form',(await saveResponse).status()===200);
   const saved=(await (await context.request.get(base+'/api/v1/public/storefront/products/ST-10025')).json()).data;check('Form preserves OE and fitment arrays',saved.refrigerant==='Regression Refrigerant'&&JSON.stringify(saved.oe_numbers)===JSON.stringify(backup.oe_numbers)&&JSON.stringify(saved.fitments)===JSON.stringify(backup.fitments));
  } finally {for(const key of ['images','attributes','translations'])backup[key]=backup[key]||[];const restored=await context.request.put(base+`/api/v1/admin/products/${product.id}`,{data:backup});assert.equal(restored.status(),200,'original product restored');}
  const stats=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/admin/ai-agent/seo/stats');await page.goto(base+'/admin/ai-seo',{waitUntil:'domcontentloaded'});check('AI SEO data retained',(await stats).status()===200);await page.locator('h1').filter({hasText:'AI SEO'}).last().waitFor();await page.screenshot({path:path.join(reports,'automotive-admin-seo.png'),fullPage:true});
  await context.close();complete=true;
 } finally {checks.push({check:'All automotive browser stages completed',passed:complete});fs.writeFileSync(path.join(reports,'automotive-browser-test.json'),JSON.stringify(checks,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
