"""Keep only legacy content tables; never copy accounts/config/credentials.

This is a non-executing statement filter for the Navicat dump supported by the
Go importer. It preserves quoted/multiline values and fails on incomplete SQL.
"""
import re

TABLES = frozenset('mqu_' + name for name in (
    'category', 'product', 'article', 'page', 'picture', 'block', 'slide_data'
))
HEADER = re.compile(r'^\s*(CREATE TABLE|INSERT INTO)\s+`([A-Za-z0-9_]+)`\s', re.I)


def statements(text):
    buf = []
    quoted = False
    i = 0
    text = text.lstrip('\ufeff')
    while i < len(text):
        char = text[i]
        if not quoted and text.startswith('--', i):
            end = text.find('\n', i)
            i = len(text) if end < 0 else end + 1
            buf.append('\n')
            continue
        if not quoted and text.startswith('/*', i):
            end = text.find('*/', i + 2)
            if end < 0:
                raise ValueError('Unterminated SQL comment')
            i = end + 2
            buf.append(' ')
            continue
        if quoted and char == '\\':
            if i + 1 >= len(text):
                raise ValueError('Unterminated SQL escape')
            buf.extend(text[i:i + 2])
            i += 2
            continue
        if char == "'":
            if quoted and i + 1 < len(text) and text[i + 1] == "'":
                buf.extend("''")
                i += 2
                continue
            quoted = not quoted
        if char == ';' and not quoted:
            yield ''.join(buf).strip()
            buf.clear()
        else:
            buf.append(char)
        i += 1
    if quoted or ''.join(buf).strip():
        raise ValueError('Incomplete SQL dump')


def content_only(text):
    output = []
    schemas = set()
    for stmt in statements(text):
        match = HEADER.match(stmt)
        if not match or match[2] not in TABLES:
            continue
        if match[1].upper() == 'CREATE TABLE':
            schemas.add(match[2])
        output.append(stmt + ';\n')
    if 'mqu_product' not in schemas:
        raise ValueError('No supported product schema found')
    return '-- Content-only migration data; account/config tables excluded.\n' + '\n'.join(output)
