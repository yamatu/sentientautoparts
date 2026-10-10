const {chromium}=require('@playwright/test');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const base='http://127.0.0.1:8090';const root=path.join(__dirname,'../..');const reports=path.join(root,'reports');
 const env=Object.fromEntries(fs.readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
 const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(25000);
 const checks=[];let originalSite,originalSocial,originalHero,originalEmailFlag,leadID,complete=false;const marker='B2B browser '+Date.now();
 const check=(name,passed)=>{checks.push({check:name,passed:!!passed});console.log(`${passed?'PASS':'FAIL'} ${name}`);assert.ok(passed,name);};
 const api=async(p,body,method='GET')=>{const r=await context.request.fetch(base+'/api/v1'+p,{method,data:body});if(!r.ok())throw new Error(`${r.status()} ${p}: ${(await r.text()).slice(0,300)}`);const j=await r.json();return j.section_key?j:(j.data??j);};
 const patchSite=s=>Object.fromEntries(Object.entries(s).filter(([k])=>!['id','updated_at'].includes(k)));
 const patchSocial=s=>Object.fromEntries(['x_url','facebook_url','instagram_url','linkedin_url','youtube_url','whatsapp_url'].map(k=>[k,s[k]||'']));
 try{
  await page.goto(base+'/admin/login');await page.locator('[name=username]').fill(env.DEFAULT_ADMIN_USERNAME);await page.locator('[name=password]').fill(env.DEFAULT_ADMIN_PASSWORD);await page.locator('button[type=submit]').click();await page.waitForURL(u=>u.pathname==='/admin');
  await page.getByRole('heading',{name:/B2B 询盘工作台|B2B inquiry dashboard/}).waitFor();check('B2B dashboard displayed',true);
  for(const href of ['/admin/orders','/admin/customers','/admin/paypal','/admin/coupons','/admin/shipping-rates','/admin/tickets'])check('Unused navigation hidden '+href,await page.locator(`a[href="${href}"]`).count()===0);
  check('Website configuration entry visible',await page.locator('a[href="/admin/storefront"]').first().isVisible());
  await page.screenshot({path:path.join(reports,'b2b-dashboard.png'),fullPage:true});
  originalSite=await api('/admin/storefront-settings');originalSocial=await api('/admin/social-media');originalHero=await api('/admin/homepage-content/section/hero_section');
  originalEmailFlag=(await api('/admin/email/settings')).contact_notifications_enabled;await api('/admin/email/settings',{contact_notifications_enabled:false},'PUT');
  fs.mkdirSync(path.join(root,'.runtime/backups'),{recursive:true});fs.writeFileSync(path.join(root,'.runtime/backups',`b2b-browser-${Date.now()}.json`),JSON.stringify({site:originalSite,social:originalSocial,hero:originalHero,contact_notifications_enabled:originalEmailFlag}),{mode:0o600});
  await page.goto(base+'/admin/storefront',{waitUntil:'domcontentloaded'});
  await page.getByLabel(/公开联系邮箱|Public email/).fill('browser-b2b@example.invalid');await page.getByLabel(/公开电话|Public phone/).fill('+1 555 0101');await page.getByLabel(/页脚介绍|Footer introduction/).fill(marker+' footer copy');
  await page.getByLabel(/页头显示社媒|Social links in header/).check();await page.getByLabel(/页脚显示社媒|Social links in footer/).check();await page.getByLabel(/显示 WhatsApp|Floating WhatsApp/).check();
  const saveSite=page.waitForResponse(r=>r.url().endsWith('/admin/storefront-settings')&&r.request().method()==='PUT');await page.getByRole('button',{name:/保存网站设置|Save website settings/}).click();check('Website settings save from UI',(await saveSite).status()===200);
  await page.screenshot({path:path.join(reports,'b2b-website-settings.png'),fullPage:true});
  await page.goto(base+'/admin/social-media');await page.getByLabel('LinkedIn',{exact:true}).fill('https://www.linkedin.com/company/b2b-browser-test');await page.getByLabel('WhatsApp',{exact:true}).fill('https://wa.me/15550101');
  const saveSocial=page.waitForResponse(r=>r.url().endsWith('/admin/social-media')&&r.request().method()==='PUT');await page.getByRole('button',{name:/保存社媒|Save social links/}).click();check('Social links save from UI',(await saveSocial).status()===200);
  await page.goto(base+'/admin/homepage',{waitUntil:'domcontentloaded'});await page.getByLabel(/^标题$|^Title$/).fill(marker+' hero');
  const saveHero=page.waitForResponse(r=>r.url().includes('/admin/homepage-content/section/hero_section')&&r.request().method()==='PUT');await page.getByRole('button',{name:/保存区块|Save section/}).click();check('Homepage hero save from UI',(await saveHero).status()===200);
  await page.screenshot({path:path.join(reports,'b2b-homepage-editor.png'),fullPage:true});
  await page.getByLabel(/启用此区块|Enable this section/).uncheck();const hideHero=page.waitForResponse(r=>r.url().includes('/admin/homepage-content/section/hero_section')&&r.request().method()==='PUT');await page.getByRole('button',{name:/保存区块|Save section/}).click();await hideHero;
  const preview=await context.newPage();await preview.goto(base+'/');check('Disabled hero removed in browser',await preview.locator('[data-section=hero_section]').count()===0);await preview.close();
  await api('/admin/homepage-content/section/hero_section',{is_active:true},'PUT');
  for(const width of [1440,390]){
   const publicContext=await browser.newContext({viewport:{width,height:1000}});const p=await publicContext.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/',{waitUntil:'networkidle'});check('Configured hero shown '+width,await p.getByRole('heading',{name:marker+' hero',exact:true}).isVisible());
   check('Header social link visible '+width,await p.getByRole('navigation',{name:'Social media header'}).getByRole('link',{name:'LinkedIn',exact:true}).isVisible());
   const footerLink=p.getByRole('navigation',{name:'Social media footer'}).getByRole('link',{name:'LinkedIn',exact:true});check('Footer uses saved URL '+width,(await footerLink.getAttribute('href'))==='https://www.linkedin.com/company/b2b-browser-test');check('Social opens safely '+width,(await footerLink.getAttribute('target'))==='_blank'&&(await footerLink.getAttribute('rel')).includes('noopener'));
   check('WhatsApp floating visible '+width,await p.getByRole('link',{name:'Chat with us on WhatsApp',exact:true}).isVisible());
   check('Configured footer copy visible '+width,(await p.textContent('body')).includes(marker+' footer copy'));
   const dimensions=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));check('B2B home no overflow '+width,dimensions.scroll<=dimensions.width+1);await p.screenshot({path:path.join(reports,`b2b-home-${width}.png`),fullPage:true});
   await p.goto(base+'/contact_us');check('Public contact details from admin '+width,(await p.textContent('body')).includes('browser-b2b@example.invalid'));await p.screenshot({path:path.join(reports,`b2b-contact-${width}.png`),fullPage:true});check('No browser exceptions '+width,errors.length===0);await publicContext.close();
  }
  await page.goto(base+'/contact_us');await page.getByLabel('Name *',{exact:true}).fill(marker);await page.getByLabel('Email *',{exact:true}).fill('b2b-browser@example.invalid');await page.getByLabel('Country',{exact:true}).fill('Canada');await page.getByLabel('Vehicle / VIN',{exact:true}).fill('Land Cruiser 2003');await page.getByLabel('Product / OE reference',{exact:true}).fill('ST-10025');await page.getByLabel('Required quantity',{exact:true}).fill('25 pcs');await page.getByLabel('Requirements *',{exact:true}).fill('Local B2B browser acceptance; delete after test.');
  const submission=page.waitForResponse(r=>r.url().endsWith('/public/contact')&&r.request().method()==='POST');await page.getByRole('button',{name:'Send Inquiry',exact:true}).click();const submitted=await submission;check('Structured B2B inquiry submitted',submitted.status()===201);leadID=(await submitted.json()).id;
  await page.goto(base+'/admin/contacts');await page.getByLabel(/搜索姓名|Search name/).fill(marker);await page.getByText(marker,{exact:true}).first().waitFor();check('Inquiry visible in admin',(await page.textContent('body')).includes('25 pcs'));
  const saved=await api('/admin/contacts/'+leadID);check('Structured inquiry fields retained',saved.country==='Canada'&&saved.quantity==='25 pcs'&&saved.vehicle_details==='Land Cruiser 2003');
  await page.screenshot({path:path.join(reports,'b2b-leads.png'),fullPage:true});
  await page.goto(base+'/admin/products');await page.getByRole('heading',{name:/产品管理|Products/}).last().waitFor();check('Retail bulk-fill button hidden',await page.getByRole('button',{name:/填充商务参数|Fill Commerce Fields/}).count()===0);check('Default demo image button hidden',await page.getByRole('button',{name:/应用默认图片|Apply Default Image/}).count()===0);
  await page.goto(base+'/admin/banners');await page.getByRole('heading',{name:/首页横幅|Homepage banners/}).last().waitFor();check('Banner editor is connected',await page.getByRole('button',{name:/保存横幅|Save banner/}).isVisible());
  complete=true;
 }finally{
  const failures=[];const restore=async(name,fn)=>{try{await fn();}catch(e){failures.push(name+': '+e.message);}};
  if(leadID)await restore('test lead',()=>api('/admin/contacts/'+leadID,undefined,'DELETE'));
  if(originalHero)await restore('hero',()=>api('/admin/homepage-content/section/hero_section',originalHero,'PUT'));
  if(originalSocial)await restore('social',()=>api('/admin/social-media',patchSocial(originalSocial),'PUT'));
  if(originalSite)await restore('site',()=>api('/admin/storefront-settings',patchSite(originalSite),'PUT'));
  if(originalEmailFlag!==undefined)await restore('notification flag',()=>api('/admin/email/settings',{contact_notifications_enabled:originalEmailFlag},'PUT'));
  checks.push({check:'All B2B browser stages completed',passed:complete},{check:'Original configuration restored',passed:failures.length===0});fs.writeFileSync(path.join(reports,'b2b-browser-test.json'),JSON.stringify(checks,null,2));await browser.close();if(failures.length)throw new Error(failures.join('; '));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
