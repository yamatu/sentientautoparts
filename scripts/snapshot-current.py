"""Create a private snapshot of the CURRENT independent deployment database.
No source project credentials are read or printed. Does not modify the database.
"""
from pathlib import Path
import datetime
import os
import re
import subprocess
root=Path(__file__).resolve().parents[1]
values=dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
name=values['MYSQL_DATABASE']
if not re.fullmatch(r'[A-Za-z0-9_]+',name):raise SystemExit('Invalid database name')
folder=root/'.runtime/backups';folder.mkdir(parents=True,exist_ok=True)
target=folder/('pre-b2b-settings-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.sql')
with target.open('xb') as output:
 os.chmod(target,0o600)
 result=subprocess.run(['docker','compose','exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --no-tablespaces "$1"','sh',name],cwd=root,stdout=output,stderr=subprocess.PIPE,timeout=180)
if result.returncode:raise SystemExit('Snapshot failed; no credentials printed')
print('Private database snapshot:',target.relative_to(root))
