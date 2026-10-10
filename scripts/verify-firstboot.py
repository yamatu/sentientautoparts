"""Verify clean Compose first boot without touching the working deployment.
Creates a randomly named sentient-check-* automotive project on port 18090, reuses built
images, and removes ONLY that temporary project's volumes in finally.
"""
from pathlib import Path
import json
import os
import subprocess
import urllib.request
import uuid

root = Path(__file__).resolve().parents[1]
project = 'sentient-check-' + uuid.uuid4().hex[:8]
env = dict(os.environ, HTTP_PORT='18090', SITE_URL='http://localhost:18090')
checks = []


def compose(*args, timeout=240):
    return subprocess.run(['docker', 'compose', '-p', project, *args], cwd=root,
        env=env, text=True, encoding='utf-8', errors='replace',
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)


def check(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    if not condition:
        raise AssertionError(name)


try:
    result = compose('up', '-d', '--wait', '--wait-timeout', '180', '--no-build')
    if result.returncode:
        print(result.stdout[-6000:], flush=True)
    check('Clean Compose boot succeeds', result.returncode == 0)
    with urllib.request.urlopen('http://127.0.0.1:18090/api/v1/public/storefront/products?page_size=100', timeout=15) as response:
        data = json.load(response)['data']
    check('First boot imports 1581 automotive products automatically', data['total'] == 1581)
    check('Distinct product identities on first page', len({p['sku'] for p in data['products']}) == len(data['products']) == 100)
    with urllib.request.urlopen('http://127.0.0.1:18090/api/v1/public/storefront/navigation', timeout=15) as response:
        data = json.load(response)['data']
    check('Automotive taxonomy imported', len(data['categories']) == 52)
    check('Imported single pages available', len(data['pages']) == 11)
    with urllib.request.urlopen('http://127.0.0.1:18090/products/ST-10025', timeout=15) as response:
        body = response.read().decode()
        check('Fresh frontend renders automotive product', response.status == 200 and '88320-0C010' in body and 'canonical' in body)
    state = compose('ps', '-a', '--format', 'json', timeout=30)
    services = [json.loads(line) for line in state.stdout.splitlines() if line.startswith('{')]
    initialization = next(s for s in services if s['Service'] == 'init-catalog')
    check('Initializer exits successfully', initialization['State'] == 'exited' and initialization['ExitCode'] == 0)
finally:
    cleanup = compose('down', '--volumes', '--remove-orphans', timeout=60)
    checks.append({'check': 'Temporary project and volumes removed', 'passed': cleanup.returncode == 0})
    (root / 'reports/automotive-firstboot-test.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
    if cleanup.returncode:
        raise RuntimeError('Temporary project cleanup failed: ' + project)
    print('Removed temporary project ' + project + '; working sentient deployment untouched', flush=True)
