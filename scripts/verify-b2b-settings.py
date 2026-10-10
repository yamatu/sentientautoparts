"""Local B2B configuration integration regression. Temporarily updates public
settings/social/home sections and restores ALL originals in finally.
No external requests/AI calls. Uses test-only .invalid email and removes its lead.
"""
from pathlib import Path
import json
import urllib.request
import urllib.error
import uuid
import re

root=Path(__file__).resolve().parents[1]
base='http://127.0.0.1:8090'
env=dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
checks=[];token='';site=None;social=None;email_enabled=None;stored={};touched=set();created_banner=None;created_lead=None;complete=False
marker='B2B regression '+uuid.uuid4().hex[:8]

def request(path,body=None,method=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=40) as r:return r.status,r.read().decode('utf8'),r.headers
 except urllib.error.HTTPError as e:return e.code,e.read().decode('utf8'),e.headers

def api(path,body=None,method=None):
 status,text,_=request('/api/v1'+path,body,method)
 if status>=400:raise RuntimeError(f'{status} {path}: '+text[:500])
 value=json.loads(text)
 if isinstance(value,dict) and 'section_key' in value:return value
 return value.get('data',value) if isinstance(value,dict) else value

def check(name,ok):
 checks.append({'check':name,'passed':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name)

def section(name,patch):
 touched.add(name)
 return api('/admin/homepage-content/section/'+name,patch,'PUT')

def html(path='/'):return request(path)[1]
def site_patch(value):return {k:v for k,v in value.items() if k not in ('id','updated_at')}
def social_patch(value):return {k:value.get(k,'') for k in ('x_url','facebook_url','instagram_url','linkedin_url','youtube_url','whatsapp_url')}

try:
 status,_,_=request('/api/v1/admin/storefront-settings')
 check('Website settings require authentication',status in (401,403))
 token=api('/auth/login',{'username':env['DEFAULT_ADMIN_USERNAME'],'password':env['DEFAULT_ADMIN_PASSWORD']})['token']
 site=api('/admin/storefront-settings');social=api('/admin/social-media')
 email_enabled=api('/admin/email/settings')['contact_notifications_enabled']
 api('/admin/email/settings',{'contact_notifications_enabled':False},'PUT')
 original_home=api('/admin/homepage-content/b2b');stored={v['section_key']:v for v in original_home['stored']}
 backup=root/'.runtime/backups';backup.mkdir(parents=True,exist_ok=True)
 (backup/('b2b-settings-test-'+uuid.uuid4().hex+'.json')).write_text(json.dumps({'site':site,'social':social,'homepage':original_home,'contact_notifications_enabled':email_enabled},ensure_ascii=False),encoding='utf8')
 api('/admin/storefront-settings',{'brand_name':'B2B Regression Brand','contact_email':'b2b-test@example.invalid','contact_phone':'+1 555 0100','address':'Temporary regression address','business_hours':'UTC weekdays','social_header':True,'social_footer':True,'whatsapp_floating':True,'home_meta_title':marker,'home_meta_description':'B2B settings metadata regression','catalog_enabled':True,'catalog_url':'/legacy/theme/images/SENTIENT%20Official%20Catalogue%20-15m.pdf'},'PUT')
 configured={'x_url':'https://x.com/b2b-regression','facebook_url':'https://www.facebook.com/b2b-regression','instagram_url':'','linkedin_url':'https://www.linkedin.com/company/b2b-regression','youtube_url':'https://www.youtube.com/@b2b-regression','whatsapp_url':'https://wa.me/15550100'}
 api('/admin/social-media',configured,'PUT')
 body=html();check('Stored social links visible in SSR',all(v in body for v in configured.values() if v))
 check('Header footer social positions rendered','Social media header' in body and 'Social media footer' in body)
 check('WhatsApp floating button linked','Chat with us on WhatsApp' in body and configured['whatsapp_url'] in body)
 check('Blank social platform hidden','aria-label="Instagram"' not in body)
 check('Homepage metadata uses stored configuration',bool(re.search('<title>'+re.escape(marker),body)) and 'B2B settings metadata regression' in body)
 schemas=re.findall(r'<script type="application/ld\+json">(.*?)</script>',body,re.S)
 org=next(json.loads(s) for s in schemas if json.loads(s).get('@type')=='Organization')
 check('Organization sameAs uses configured profiles',configured['linkedin_url'] in org.get('sameAs',[]) and all('instagram' not in u for u in org.get('sameAs',[])))
 contact=html('/contact_us');check('Contacts propagate to contact page','b2b-test@example.invalid' in contact and 'Temporary regression address' in contact and 'UTC weekdays' in contact)
 api('/admin/storefront-settings',{'social_header':False,'social_footer':False,'whatsapp_floating':False},'PUT')
 body=html();check('Social placement switches respected','Social media header' not in body and 'Social media footer' not in body and 'Chat with us on WhatsApp' not in body)
 api('/admin/social-media',{**configured,'linkedin_url':''},'PUT');check('Cleared social profile removed immediately',configured['linkedin_url'] not in html())
 before=api('/admin/storefront-settings')
 check('Unsafe site URL rejected',request('/api/v1/admin/storefront-settings',{'logo_url':'javascript:alert(1)'},'PUT')[0]==400)
 check('Failed validation preserves other settings',api('/admin/storefront-settings')['brand_name']==before['brand_name'])
 check('Unsafe social URL rejected',request('/api/v1/admin/social-media',{**configured,'x_url':'https://x.com.attacker.invalid/p'},'PUT')[0]==400)
 section('hero_section',{'title':marker,'subtitle':'B2B hero eyebrow','button_text':'Test partner link','button_url':'https://example.com/b2b-partner','is_active':True})
 body=html();check('Hero admin fields render','<h1>'+marker+'</h1>' in body and 'B2B hero eyebrow' in body)
 check('Hero external CTA safely linked','href="https://example.com/b2b-partner"' in body and 'rel="noopener noreferrer"' in body)
 section('hero_section',{'is_active':False});body=html();check('Disabled hero is not resurrected','data-section="hero_section"' not in body and '<h1>'+marker+'</h1>' not in body)
 data=api('/public/storefront/b2b-home');hidden=next(s for s in data['sections'] if s['section_key']=='hero_section');check('Disabled section text not exposed by public API',hidden['title']=='')
 section('product_range',{'title':'Temporary range title','sort_order':5,'is_active':True});section('search_section',{'sort_order':9,'is_active':True})
 body=html();check('Section titles and ordering match admin','Temporary range title' in body and body.index('data-section="product_range"')<body.index('data-section="search_section"'))
 section('featured_products',{'data':{'mode':'featured','limit':2},'is_active':True})
 products=api('/public/storefront/b2b-home')['products'];check('Featured-only mode does not fall back to other products',len(products)<=2 and all(p['is_featured'] for p in products))
 custom='custom_b2b_'+uuid.uuid4().hex[:8];section(custom,{'title':'Temporary custom section','description':'<p>B2B custom body</p>','button_text':'Contact team','button_url':'/contact_us','is_active':True,'sort_order':12})
 check('Custom content actually renders','Temporary custom section' in html() and '<p>B2B custom body</p>' in html())
 check('Unsafe section CTA rejected',request('/api/v1/admin/homepage-content/section/'+custom,{'button_url':'/%5cevil.invalid'},'PUT')[0]==400)
 section('home_banners',{'is_active':True})
 banner=api('/admin/banners',{'title':marker+' banner','image_url':'/legacy/theme/images/pro1.png','link_url':'/contact_us','position':'home','content_type':'hero','sort_order':-999,'is_active':False},'POST');created_banner=banner['id']
 check('New banner can remain hidden',not api('/admin/banners/'+str(created_banner))['is_active'])
 api('/admin/banners/'+str(created_banner),{'is_active':True},'PUT')
 check('Banner management controls homepage',marker+' banner' in html())
 api('/admin/banners/'+str(created_banner),{'start_date':'2099-01-01T00:00:00Z'},'PUT')
 check('Banner schedule enforced',marker+' banner' not in html())
 api('/admin/banners/'+str(created_banner),{'start_date':None,'link_url':''},'PUT')
 check('Banner dates/links can be cleared',api('/admin/banners/'+str(created_banner))['start_date'] is None and api('/admin/banners/'+str(created_banner))['link_url']=='')
 section('inquiry_section',{'title':'Configured inquiry strip','is_active':True});check('Shared inquiry CTA uses homepage settings','Configured inquiry strip' in html('/products'))
 api('/admin/storefront-settings',{'catalog_enabled':False,'distributor_enabled':False,'news_enabled':False},'PUT');body=html()
 check('Optional public navigation can be hidden','href="/download"' not in body and 'href="/dujia"' not in body and 'href="/news"' not in body)
 check('Disabled catalog page unavailable',request('/download')[0]==404)
 check('Disabled catalog omitted from sitemap','/download</loc>' not in html('/sitemap-static.xml'))
 api('/admin/storefront-settings',{'catalog_enabled':True},'PUT')
 lead=api('/public/contact',{'name':marker,'email':'b2b-test@example.invalid','company':'B2B Regression','subject':marker,'message':'B2B requirement test','country':'Canada','product_reference':'ST-10025 / 88320-0C010','vehicle_details':'Land Cruiser 2003','quantity':'20 pcs','source_page':'/products/ST-10025','inquiry_type':'quote','status':'closed','admin_notes':'untrusted'},'POST');created_lead=lead['id']
 saved=api('/admin/contacts/'+str(created_lead));check('B2B structured inquiry reaches admin',saved['quantity']=='20 pcs' and saved['country']=='Canada' and saved['product_reference']=='ST-10025 / 88320-0C010')
 check('Public input cannot set workflow fields',saved['status']=='read' and not saved['admin_notes'])
 rows=api('/admin/contacts?search='+urllib.parse.quote(marker));check('Admin inquiry search finds lead',any(v['id']==created_lead for v in rows))
 api('/admin/contacts/'+str(created_lead),{'status':'read','admin_notes':'internal note'},'PUT');api('/admin/contacts/'+str(created_lead),{'status':'read','admin_notes':''},'PUT');check('Admin notes can be cleared',api('/admin/contacts/'+str(created_lead))['admin_notes']=='')
 complete=True
finally:
 restoration=[]
 def restore(name,fn):
  try:fn()
  except Exception as e:restoration.append(name+': '+str(e))
 if created_lead:restore('test lead',lambda:api('/admin/contacts/'+str(created_lead),method='DELETE'))
 if created_banner:restore('test banner',lambda:api('/admin/banners/'+str(created_banner),method='DELETE'))
 for name in touched:
  if name in stored:restore(name,lambda name=name:api('/admin/homepage-content/section/'+name,{k:v for k,v in stored[name].items() if k not in ('id','section_key','created_at','updated_at')},'PUT'))
  else:
   def reset(name=name):
    row=api('/admin/homepage-content/section/'+name)
    # Newly-created virtual defaults cannot be deleted by the standard API.
    default=next((s for s in original_home['sections'] if s['section_key']==name),None)
    if default:api('/admin/homepage-content/section/'+name,{k:v for k,v in default.items() if k not in ('id','section_key','created_at','updated_at')},'PUT')
    else:api('/admin/homepage-content/'+str(row['id']),method='DELETE')
   restore(name,reset)
 if social is not None:restore('social settings',lambda:api('/admin/social-media',social_patch(social),'PUT'))
 if site is not None:restore('site settings',lambda:api('/admin/storefront-settings',site_patch(site),'PUT'))
 if email_enabled is not None:restore('notification flag',lambda:api('/admin/email/settings',{'contact_notifications_enabled':email_enabled},'PUT'))
 checks.append({'check':'All B2B integration stages completed','passed':complete});checks.append({'check':'Original user configuration restored','passed':not restoration})
 (root/'reports/b2b-settings-test.json').write_text(json.dumps(checks,indent=2),encoding='utf8')
 if restoration:raise RuntimeError('; '.join(restoration))
 print('Restored original site, social and section settings',flush=True)
