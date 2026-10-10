"""Rebuild legacy assets/data in modern/ without changing the PHP archive.
Usage: python scripts/prepare-assets.py [path/to/php-root]
Only passive media is copied. PHP/scripts and private config never enter public/.
"""
from pathlib import Path
import shutil
import sys
from catalog_dump import content_only

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root.parent
allowed = {'.css', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.svg', '.avif', '.ttf', '.otf', '.woff', '.woff2', '.eot', '.pdf', '.mp4', '.webm'}
count = 0
for src, dest in [(source / 'Apps/Tpl/Home/Default/Public', root / 'frontend/public/legacy/theme'), (source / 'Uploads', root / 'frontend/public/legacy/uploads')]:
    if not src.is_dir():
        raise SystemExit(f'Missing source folder: {src}')
    for p in src.rglob('*'):
        if p.is_file() and not p.is_symlink() and p.suffix.lower() in allowed:
            target = dest / p.relative_to(src)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, target)
            count += 1
(root / 'data').mkdir(exist_ok=True)
filtered = content_only((source / 'spex_db.sql').read_text(encoding='utf-8-sig'))
(root / 'data/spex_db.sql').write_text(filtered, encoding='utf-8')
print(f'Prepared {count} passive assets and content-only data/spex_db.sql; account/config tables excluded.')
