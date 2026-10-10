"""Snapshot the migration database and create a separate automotive database.
Never drops or rewrites the previous database and never prints credentials.
"""
from pathlib import Path
import datetime
import os
import re
import subprocess

root = Path(__file__).resolve().parents[1]
values = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
source = values['MYSQL_DATABASE']
target = 'sentientautoparts'
user = values['MYSQL_USER']
for value in (source, target, user):
    if not re.fullmatch(r'[A-Za-z0-9_]+', value):
        raise SystemExit('Unsafe database/user identifier')
if source == target:
    raise SystemExit('Already configured for automotive database; no action taken')

folder = root / '.runtime/backups'
folder.mkdir(parents=True, exist_ok=True)
backup = folder / ('pre-automotive-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S') + '.sql')
with open(backup, 'xb') as out:
    os.chmod(backup, 0o600)
    result = subprocess.run(['docker', 'compose', 'exec', '-T', 'mysql', 'sh', '-c',
        'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --no-tablespaces "$1"', 'sh', source], cwd=root, stdout=out, stderr=subprocess.PIPE, timeout=120)
if result.returncode:
    raise SystemExit('Database snapshot failed (credentials suppressed)')
sql = f"CREATE DATABASE IF NOT EXISTS `{target}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON `{target}`.* TO '{user}'@'%';"
result = subprocess.run(['docker', 'compose', 'exec', '-T', 'mysql', 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot'], cwd=root, input=sql.encode(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
if result.returncode:
    raise SystemExit('Database creation failed (credentials suppressed)')
print('Snapshot saved to ' + str(backup.relative_to(root)))
print('Created independent sentientautoparts database; previous ' + source + ' database retained unchanged.')
