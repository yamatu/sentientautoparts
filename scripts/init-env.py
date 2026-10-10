"""Create local deployment credentials without copying any existing site's secrets."""
from pathlib import Path
import secrets
import os

root = Path(__file__).resolve().parents[1]
target = root / '.env'
if target.exists():
    raise SystemExit('.env already exists; refusing to overwrite credentials')
values = (root / '.env.example').read_text(encoding='utf-8')
keys = ['MYSQL_ROOT_PASSWORD', 'MYSQL_PASSWORD', 'JWT_SECRET', 'SETTINGS_ENCRYPTION_KEY', 'REVALIDATE_SECRET', 'DEFAULT_ADMIN_PASSWORD']
lines = []
for line in values.splitlines():
    key = line.split('=', 1)[0]
    lines.append(f'{key}={secrets.token_hex(24)}' if key in keys else line)
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines) + '\n')
print('Created modern/.env. Read DEFAULT_ADMIN_PASSWORD locally to log in; do not commit this file.')
