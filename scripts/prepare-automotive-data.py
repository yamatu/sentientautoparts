"""Extract only business tables from a supplied SQL/SQL ZIP backup.
Usage: python scripts/prepare-automotive-data.py /path/to/backup.sql.zip
Does not execute SQL, import accounts/configuration, or overwrite source files.
"""
from pathlib import Path
import sys
import zipfile
from catalog_dump import content_only

if len(sys.argv) != 2:
    raise SystemExit('Usage: python scripts/prepare-automotive-data.py backup.sql[.zip]')
source = Path(sys.argv[1])
if source.suffix.lower() == '.zip':
    with zipfile.ZipFile(source) as archive:
        candidates = [i for i in archive.infolist() if i.filename.lower().endswith('.sql')]
        if len(candidates) != 1 or candidates[0].file_size > 128 * 1024 * 1024:
            raise SystemExit('Expected one SQL file smaller than 128 MiB')
        text = archive.read(candidates[0]).decode('utf-8-sig')
else:
    if source.stat().st_size > 128 * 1024 * 1024:
        raise SystemExit('SQL exceeds 128 MiB')
    text = source.read_text(encoding='utf-8-sig')
filtered = content_only(text)
if 'homeAbout' not in filtered or 'COMPRESSORS' not in filtered:
    raise SystemExit('Backup does not contain the expected automotive catalogue; refused')
root = Path(__file__).resolve().parents[1]
(root / 'data').mkdir(exist_ok=True)
(root / 'data/automotive-20260131.sql').write_text(filtered, encoding='utf8')
print('Prepared data/automotive-20260131.sql with business tables only. Existing source and credentials untouched.')
