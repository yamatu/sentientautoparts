"""Integration acceptance for the separate automotive deployment.
Temporarily edits/restores one product. Does not call external AI services.
"""
from pathlib import Path
import json
import subprocess
import urllib.request
import urllib.error
import urllib.parse
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
base = 'http://127.0.0.1:8090'
env = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
checks = []
token = ''
original = None
completed = False

def request(path, body=None, method=None):
    req = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(), method=method,
        headers={'Content-Type':'application/json', 'Authorization':'Bearer '+token})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            return response.status, response.read(), response.headers, response.url
    except urllib.error.HTTPError as error:
        return error.code, error.read(), error.headers, error.url

def api(path, body=None, method=None):
    code, body, _, _ = request('/api/v1' + path, body, method)
    data = json.loads(body)
    if code >= 400:
        raise RuntimeError('API error '+str(code)+' '+path+': '+str(data.get('message') or data.get('error')))
    return data.get('data',data) if isinstance(data,dict) else data

def check(name, passed):
    checks.append({'check':name,'passed':bool(passed)})
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    if not passed: raise AssertionError(name)

try:
    listing = api('/public/storefront/products?page_size=12')
    check('1581 automotive products imported', listing['total']==1581)
    nav = api('/public/storefront/navigation')
    roots = [c for c in nav['categories'] if not c.get('parent_id')]
    check('Four automotive part-type roots', set(c['name'] for c in roots)=={'A/C Compressors','Auto Condensers','Evaporator Units','Expansion Valves'})
    check('No stale winecooler categories', not any('wine' in c['name'].lower() or 'refrigerator' in c['name'].lower() for c in nav['categories']))
    check('Vehicle make filters from real data', 'Toyota' in nav['makes'] and 'Hyundai' in nav['makes'])
    target = api('/public/storefront/products?q=883200C010')
    check('OE number search ignores display separators', target['total']>0)
    p = next(p for p in target['products'] if '88320-0C010' in (p.get('oe_numbers') or []))
    check('Real ST code preserved', p['sku']=='ST-10025')
    current = api('/public/storefront/products/'+p['sku'])
    check('Known automotive specifications extracted', current['part_type']=='A/C Compressor' and current['vehicle_make']=='Toyota' and current['pulley_diameter']=='120 mm' and current['compressor_type']=='10S17C')
    check('Fitment year ranges extracted', any(f.get('year_from')==2001 and f.get('year_to')==2006 for f in current['fitments']))
    check('Vehicle make not invented as part manufacturer', current['brand']=='')
    toyota = api('/public/storefront/products?make=Toyota&page_size=1000')
    check('Vehicle make filtering', toyota['total']>0 and all(p['vehicle_make']=='Toyota' for p in toyota['products']))
    year = api('/public/storefront/products?make=Toyota&year=2003&page_size=1000')
    check('Year filtering uses documented bounded ranges', year['total']>0 and all(any(f.get('year_from') and f.get('year_to') and f['year_from']<=2003<=f['year_to'] for f in p['fitments']) for p in year['products']))
    for path in ['/', '/products', '/about', '/news', '/contact_us', '/download', '/categories/ac-compressors', '/products/ST-10025']:
        status, body, _, _ = request(path)
        check('Automotive page '+path, status==200 and b'vibocnc' not in body.lower())
    body = request('/products/ST-10025')[1].decode()
    check('Fitment and OE specs render in SSR', '88320-0C010' in body and '120 mm' in body and '10S17C' in body and 'Vehicle fitment' in body)
    check('Missing product remains 404', request('/products/DOES-NOT-EXIST')[0]==404)
    token = api('/auth/login', {'username':env['DEFAULT_ADMIN_USERNAME'],'password':env['DEFAULT_ADMIN_PASSWORD']})['token']
    check('Admin login on independent automotive database', bool(token))
    original = api('/admin/products/'+str(p['id']))
    for key in ['images','attributes','translations']: original[key]=original.get(key) or []
    edited = dict(original, meta_title='Automotive migration regression', refrigerant='R134a', fitment_notes='Temporary automotive save regression', interchange_numbers=['TEST-INTERCHANGE'])
    edited['fitments']=[{'make':'Toyota','model':'Land Cruiser','year_from':2001,'year_to':2006,'engine':'Source reviewed test','notes':'Regression only'}]
    api('/admin/products/'+str(p['id']),edited,'PUT')
    saved=api('/public/storefront/products/'+p['sku'])
    check('Automotive admin fields persist', saved['refrigerant']=='R134a' and saved['interchange_numbers']==['TEST-INTERCHANGE'] and saved['fitments']==edited['fitments'])
    check('SEO and content preserved exactly',saved['meta_title']==edited['meta_title'] and saved['description']==original['description'])
    html=request('/products/'+p['sku'])[1].decode()
    check('Saved automotive data reaches SSR', 'TEST-INTERCHANGE' in html and 'Source reviewed test' in html)
    invalid=dict(edited,fitments=[{'make':'Toyota','model':'Test','year_from':2020,'year_to':2000}])
    check('Invalid fitment range rejected',request('/api/v1/admin/products/'+str(p['id']),invalid,'PUT')[0]==400)
    result=api('/admin/products/auto-optimize-categories', {'product_ids':[p['id']],'use_web_search':False,'create_missing_categories':False,'activate_resolved':False})
    check('Explicit category optimization uses automotive taxonomy',result['completed']==1 and result['failed']==0)
    run=subprocess.run(['docker','compose','--profile','tools','run','--rm','import-legacy'],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8',errors='replace',timeout=180)
    check('Automotive repeat import succeeds',run.returncode==0)
    report=json.loads(run.stdout[run.stdout.index('{'):]);check('Automotive repeat creates nothing',not report['created'])
    check('All 1581 products skipped on repeat',report['skipped']['product']==1581)
    check('Repeat preserves edited fitment',api('/public/storefront/products/'+p['sku'])['fitments']==edited['fitments'])
    api('/admin/products/'+str(original['id']),original,'PUT'); original=None
    namespaces={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    _,xml,_,_=request('/sitemap.xml');locations=ET.fromstring(xml).findall('.//s:loc',namespaces)
    product_count=0
    for loc in locations:
        path=urllib.parse.urlsplit(loc.text).path;status,xml,_,_=request(path);check('Child sitemap '+path,status==200)
        urls=ET.fromstring(xml).findall('.//s:loc',namespaces)
        if path.startswith('/sitemap-products/'):
            product_count+=len(urls)
            for url in urls[:2]+urls[-2:]:check('Sample sitemap product '+urllib.parse.urlsplit(url.text).path,request(urllib.parse.urlsplit(url.text).path)[0]==200)
    check('Sitemap includes all 1581 products',product_count==1581)
    check('AI SEO statistics endpoint retained',api('/admin/ai-agent/seo/stats') is not None)
    completed=True
finally:
    try:
        if original:
            api('/admin/products/'+str(original['id']),original,'PUT');print('Original automotive product restored',flush=True)
    finally:
        checks.append({'check':'All automotive acceptance stages completed','passed':completed})
        (root/'reports/automotive-test.json').write_text(json.dumps(checks,indent=2),encoding='utf8')
