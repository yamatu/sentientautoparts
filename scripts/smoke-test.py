"""Exercise the deployed site without printing credentials. Standard library only.
Usage: python scripts/smoke-test.py http://localhost:8090
Creates one clearly-labelled test inquiry (DELETE it in admin after validation).
"""
import json
import sys
import urllib.request
import urllib.error
import urllib.parse
import http.cookiejar
from pathlib import Path
import xml.etree.ElementTree as ET

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090').rstrip('/')
# Windows may resolve localhost to an unreachable IPv6 listener before IPv4.
parts = urllib.parse.urlsplit(base)
if parts.hostname == 'localhost':
    base = urllib.parse.urlunsplit(parts._replace(netloc='127.0.0.1' + (':' + str(parts.port) if parts.port else '')))
root = Path(__file__).resolve().parents[1]
checks = []
completed = False
jar = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def request(path, body=None, token=None, method=None):
    headers = {'Accept': 'application/json'}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
    try:
        with client.open(req, timeout=30) as r:
            return r.status, r.read().decode('utf-8'), r.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8'), e.headers

def check(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition:
        raise AssertionError(name)

try:
    code, body, _ = request('/api/v1/public/storefront/products?page_size=100')
    check('Public product API', code == 200)
    products = json.loads(body)['data']['products']
    check('Existing dump products imported', len(products) == 7)
    for p in products:
        code, html, _ = request('/products/' + urllib.parse.quote(p['sku']))
        check('SSR product ' + p['sku'], code == 200 and p['name'] in html and 'application/ld+json' in html and 'canonical' in html)
    for path in ['/', '/products', '/news', '/contact_us', '/admin/login']:
        code, html, _ = request(path)
        check(path, code == 200 and '<html' in html)
    code, html, _ = request('/products/DOES-NOT-EXIST')
    check('Unknown product returns 404', code == 404)
    code, _, _ = request('/api/v1/admin/products')
    check('Admin API protected', code in (401, 403))
    code, _, _ = request('/api/v1/public/storefront/products?page=1000001')
    check('Out-of-range pagination rejected', code == 400)
    code, _, _ = request('/api/v1/public/storefront/resolve?path=//example.com')
    check('External legacy path rejected', code == 400)
    code, robots, _ = request('/robots.txt')
    check('Robots advertises sitemap and excludes admin', code == 200 and 'Disallow: /admin' in robots and '/sitemap.xml' in robots)
    code, _, _ = request('/api/v1/public/contact', {'name': 'Validation check', 'email': 'invalid'})
    check('Invalid inquiry rejected', code == 400)
    code, xml, _ = request('/sitemap.xml')
    check('Sitemap index', code == 200)
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    for loc in ET.fromstring(xml).findall('.//s:loc', ns):
        path = urllib.parse.urlsplit(loc.text).path
        code, body, _ = request(path)
        check('Child sitemap ' + path, code == 200)
        for url in ET.fromstring(body).findall('.//s:loc', ns):
            path = urllib.parse.urlsplit(url.text).path
            code, _, _ = request(path)
            check('Sitemap URL ' + path, code == 200)
    env = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    code, body, _ = request('/api/v1/auth/login', {'username': env['DEFAULT_ADMIN_USERNAME'], 'password': env['DEFAULT_ADMIN_PASSWORD']})
    check('Admin login', code == 200)
    payload = json.loads(body)
    token = payload['data']['token']
    for path in ['/api/v1/admin/products', '/api/v1/admin/ai-agent/seo/stats', '/api/v1/admin/site-pages']:
        code, _, _ = request(path, token=token)
        check('Preserved admin endpoint ' + path, code == 200)
    code, body, _ = request('/api/v1/admin/products/optimization-status', token=token)
    check('Automatic save enrichment disabled', code == 200 and json.loads(body)['data']['automatic_enrichment_enabled'] is False)
    code, _, _ = request('/api/v1/public/contact', {'name': 'Migration Smoke Test', 'email': 'migration-test@example.com', 'subject': 'Migration smoke test — delete after verification', 'message': 'Local deployment verification, not a customer inquiry.'})
    check('Inquiry submission', code == 201)
    completed = True
finally:
    checks.append({'check': 'All smoke stages completed', 'passed': completed})
    (root / 'reports').mkdir(exist_ok=True)
    (root / 'reports/smoke-test.json').write_text(json.dumps(checks, indent=2, ensure_ascii=False), encoding='utf-8')
