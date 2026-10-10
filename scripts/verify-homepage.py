"""Test the supported homepage contract against the isolated local deployment.
Temporarily sets hero_section, restores its original fields (or disables a newly
created one), and checks the public HTML. No demo copy is permanently published.
"""
from pathlib import Path
import json
import urllib.request
import urllib.parse
import sys

root = Path(__file__).resolve().parents[1]
base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8090').rstrip('/')
parts = urllib.parse.urlsplit(base)
if parts.hostname == 'localhost':
    base = urllib.parse.urlunsplit(parts._replace(netloc='127.0.0.1' + (':' + str(parts.port) if parts.port else '')))
env = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
checks = []
token = ''


def api(path, body=None, method=None):
    request = urllib.request.Request(base + '/api/v1' + path, data=None if body is None else json.dumps(body).encode(), method=method,
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)
        return data.get('data', data) if isinstance(data, dict) else data


def check(name, passed):
    checks.append({'check': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    if not passed:
        raise AssertionError(name)


original = None
changed = False
try:
    token = api('/auth/login', {'username': env['DEFAULT_ADMIN_USERNAME'], 'password': env['DEFAULT_ADMIN_PASSWORD']})['token']
    rows = api('/admin/homepage-content')
    original = next((row for row in rows if row['section_key'] == 'hero_section'), None)
    payload = {'title': 'Migration homepage test', 'subtitle': 'Temporary subtitle', 'description': '<p>Temporary hero body.</p>', 'image_url': '/legacy/theme/images/icon_tact1.png', 'button_text': 'Migration CTA test', 'button_url': '/products', 'is_active': True, 'sort_order': 1}
    api('/admin/homepage-content/section/hero_section', payload, 'PUT')
    changed = True
    with urllib.request.urlopen(base + '/', timeout=30) as response:
        body = response.read().decode()
    check('Hero heading visible in SSR', '<h1>' + payload['title'] + '</h1>' in body)
    check('Hero subtitle and body visible', payload['subtitle'] in body and payload['description'] in body)
    check('Hero image visible', 'src="' + payload['image_url'] + '"' in body)
    check('Hero CTA points to supported route', 'href="/products">Migration CTA test</a>' in body)
    api('/admin/homepage-content/section/hero_section', dict(payload, is_active=False), 'PUT')
    with urllib.request.urlopen(base + '/', timeout=30) as response:
        body = response.read().decode()
    check('Disabled hero removed from page', '<h1>' + payload['title'] + '</h1>' not in body)
    check('Banners shown when no hero active', 'Homepage banners' in body)
finally:
    try:
        if changed:
            restore = original or {'title': '', 'subtitle': '', 'description': '', 'image_url': '', 'button_text': '', 'button_url': '', 'is_active': False, 'sort_order': 1}
            api('/admin/homepage-content/section/hero_section', restore, 'PUT')
            print('Homepage original state restored', flush=True)
    finally:
        (root / 'reports/verify-homepage.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
