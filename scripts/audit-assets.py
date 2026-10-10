"""Audit media references in the supplied dump; never print credentials/rows."""
from pathlib import Path
import re
import json
import sys
from catalog_dump import content_only

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'data/automotive-20260131.sql'
text = source.read_text(encoding='utf-8-sig')
# Include media embedded in multiline HTML, not just the first INSERT line.
text = content_only(text)
pattern = r"/(?:Uploads|Apps/Tpl/Home/Default/Public)/[^\s\x22\x27<>|\\]+"
refs = sorted(set(re.findall(pattern, text)))
missing, present = [], []
for ref in refs:
    public_path = ref.replace('/Uploads/', '/legacy/uploads/').replace('/Apps/Tpl/Home/Default/Public/', '/legacy/theme/')
    target = root / 'frontend/public' / public_path.lstrip('/')
    (present if target.is_file() else missing).append(public_path)
map_path = root / 'frontend/src/lib/legacy-image-fallbacks.json'
fallback_map = json.loads(map_path.read_text()) if map_path.exists() else {}
recovered = {key: fallback_map[key] for key in missing if key in fallback_map}
report = {'checked': len(refs), 'present': len(present), 'missing': missing, 'matching_thumbnail_fallbacks': recovered, 'unresolved': [key for key in missing if key not in recovered], 'note': 'Original stored URLs are retained. Only matching resized files are used as fallbacks; remaining images show a placeholder. Supply the matching media backup.'}
(root / 'reports').mkdir(exist_ok=True)
(root / 'reports/missing-assets.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Checked {len(refs)} references: {len(present)} present, {len(missing)} missing. See reports/missing-assets.json')
