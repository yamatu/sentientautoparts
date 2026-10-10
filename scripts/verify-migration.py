"""Integration regression: idempotent import + admin edit preservation.
Run ONLY on the isolated migration deployment. Temporarily changes one imported
product and restores it in a finally block. No external AI/email calls.
"""
from pathlib import Path
import json
import subprocess
import urllib.request
import urllib.parse
import sys

root = Path(__file__).resolve().parents[1]
base = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8090').rstrip('/')
parts = urllib.parse.urlsplit(base)
if parts.hostname == 'localhost':
    base = urllib.parse.urlunsplit(parts._replace(netloc='127.0.0.1' + (':' + str(parts.port) if parts.port else '')))
env = dict(s.split('=', 1) for s in (root / '.env').read_text().splitlines() if '=' in s and not s.startswith('#'))
checks = []

def api(path, body=None, method=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(base + '/api/v1' + path, data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)['data']

def check(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition:
        raise AssertionError(name)

def import_again():
    run = subprocess.run(['docker', 'compose', '--profile', 'tools', 'run', '--rm', 'import-legacy'], cwd=root, text=True, encoding='utf-8', errors='replace', stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if run.returncode:
        raise RuntimeError('Import failed: ' + run.stderr[-2000:])
    # Importer writes JSON to stdout; Go logging goes to stderr.
    report = json.loads(run.stdout[run.stdout.index('{'):])
    return report

original = None
token = None
try:
    token = api('/auth/login', {'username': env['DEFAULT_ADMIN_USERNAME'], 'password': env['DEFAULT_ADMIN_PASSWORD']})['token']
    listing = api('/public/storefront/products?page_size=100')
    check('Seven distinct imported products', listing['total'] == 7)
    product = listing['products'][0]
    original = api('/admin/products/' + str(product['id']), token=token)
    original['images'] = [{'url': i['url'], 'alt_text': i.get('alt_text', ''), 'is_primary': i.get('is_primary', False), 'sort_order': i.get('sort_order', n)} for n, i in enumerate(original.get('images') or [])]
    original['attributes'] = original.get('attributes') or []
    original['translations'] = original.get('translations') or []
    edited = dict(original)
    edited['meta_title'] = 'Migration preservation regression'
    edited['description'] = '<p>Migration preservation regression — original restored after test.</p>'
    edited['images'] = [{'url': '/legacy/theme/images/icon_tact1.png', 'alt_text': 'Regression image', 'is_primary': True, 'sort_order': 0}]
    api('/admin/products/' + str(product['id']), edited, method='PUT', token=token)
    current = api('/public/storefront/products/' + urllib.parse.quote(product['sku']))
    check('Admin SEO save remains exact', current['meta_title'] == edited['meta_title'])
    check('Admin content save is not auto-rewritten', current['description'] == edited['description'])
    check('Admin category is not auto-classified', current['category_id'] == original['category_id'])
    check('Admin images synchronize relation', len(current['images']) == 1 and current['images'][0]['url'] == edited['images'][0]['url'])
    report = import_again()
    check('Repeat import creates no records', not report['created'])
    check('Repeat import skips all products', report['skipped'].get('product') == 7)
    after = api('/public/storefront/products/' + urllib.parse.quote(product['sku']))
    check('Repeat import preserves admin content', after['description'] == edited['description'] and after['meta_title'] == edited['meta_title'])
    check('Repeat import preserves admin images', after['images'][0]['url'] == edited['images'][0]['url'])
    check('Repeat import product count unchanged', api('/public/storefront/products?page_size=1')['total'] == 7)
finally:
    try:
        if original and token:
            api('/admin/products/' + str(original['id']), original, method='PUT', token=token)
            print('Original product restored', flush=True)
    finally:
        (root / 'reports/verify-migration.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
