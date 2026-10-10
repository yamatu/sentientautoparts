"""Isolated-deployment URL/SSR regression. Restores the product and deletes the
labelled test article in finally. Do not run against a production database.
"""
from pathlib import Path
import base64
import json
import re
import sys
import urllib.request
import urllib.parse
import uuid

root = Path(__file__).resolve().parents[1]
base = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090').rstrip('/')
parts = urllib.parse.urlsplit(base)
if parts.hostname == 'localhost':
    base = urllib.parse.urlunsplit(parts._replace(netloc='127.0.0.1' + (':' + str(parts.port) if parts.port else '')))
env = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
checks = []
token = ''


def api(path, body=None, method=None):
    request = urllib.request.Request(base + '/api/v1' + path,
        data=None if body is None else json.dumps(body).encode(), method=method,
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)
        return data.get('data', data) if isinstance(data, dict) else data


def html(path):
    with urllib.request.urlopen(base + path, timeout=30) as response:
        return response.read().decode('utf-8'), urllib.parse.urlsplit(response.url).path


def check(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition:
        raise AssertionError(name)


def path_id(sku):
    if re.fullmatch(r'[A-Za-z0-9_.-]+', sku) and sku not in ('.', '..'):
        return sku
    return '~' + base64.urlsafe_b64encode(sku.encode()).decode().rstrip('=')


original = None
article_id = None
completed = False
try:
    token = api('/auth/login', {'username': env['DEFAULT_ADMIN_USERNAME'], 'password': env['DEFAULT_ADMIN_PASSWORD']})['token']
    products = api('/public/storefront/products?page_size=100')['products']
    product = next(p for p in products if p['sku'] == 'LEGACY-35')
    original = api('/admin/products/' + str(product['id']))
    for name in ('images', 'attributes', 'translations'):
        original[name] = original.get(name) or []
    edited = dict(original, meta_title='Migration SSR verification', meta_description='Migration description verification', description='<p>Migration live content verification.</p>')
    seen = set()
    for sku in ['MIGRATION-TEST', 'MIGRATION TEST', 'MIGRATION/TEST', 'MIGRATION#TEST', '~TUlHUkFUSU9O', '迁移型号']:
        identifier = path_id(sku)
        check('Distinct URL identifier ' + identifier, identifier not in seen)
        seen.add(identifier)
        api('/admin/products/' + str(product['id']), dict(edited, sku=sku), method='PUT')
        fetched = api('/public/storefront/products/' + identifier)
        check('Exact SKU lookup ' + identifier, fetched['sku'] == sku and fetched['id'] == product['id'])
        body, path = html('/products/' + identifier)
        check('SSR URL ' + identifier, path == '/products/' + identifier)
        check('Live SEO and content ' + identifier, bool(re.search(r'<title>Migration SSR verification[^<]*</title>', body)) and 'Migration description verification' in body and '<p>Migration live content verification.</p>' in body)
        home, _ = html('/')
        check('Homepage uses canonical SKU link ' + identifier, f'href="/products/{identifier}"' in home)
    api('/admin/products/' + str(product['id']), original, method='PUT')
    original = None

    slug = 'migration-regression-' + uuid.uuid4().hex[:10]
    payload = {'title': 'Migration Routing Test (temporary)', 'slug': slug, 'content': '<p>Local regression test, removed after verification.</p>', 'is_published': True, 'content_type': 'news', 'custom_path': '/news/' + slug + '-alias'}
    article = api('/admin/news', payload)
    article_id = article['id']
    for prefix in ['/news/', '/categories/', '/products/', '/legacy-test/']:
        alias = prefix + slug + '-alias'
        api('/admin/news/' + str(article_id), dict(payload, custom_path=alias), method='PUT')
        target = api('/public/storefront/resolve?path=' + urllib.parse.quote(alias))['target']
        check('Custom alias API ' + prefix, target == '/news/' + slug)
        body, path = html(alias)
        check('Custom alias HTTP redirect ' + prefix, path == '/news/' + slug and payload['title'] in body)
    completed = True
finally:
    try:
        if original:
            api('/admin/products/' + str(original['id']), original, method='PUT')
            print('Original product restored', flush=True)
    finally:
        try:
            if article_id:
                api('/admin/news/' + str(article_id), method='DELETE')
                print('Temporary article removed', flush=True)
        finally:
            checks.append({'check': 'All routing stages completed', 'passed': completed})
            (root / 'reports/verify-routing.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
