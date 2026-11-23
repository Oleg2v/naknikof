#!/usr/bin/env python3
"""
Self-hosted, subset web fonts for the Kolbassnik homepage.

Takes the OFL woff2 files shipped in @fontsource packages (node_modules) and cuts them
down to the exact Unicode ranges we need per script, keeping variable axes.
Output: public/fonts/<name>-<subset>.woff2  (+ prints the @font-face unicode-range to use)

Usage:  pip install fonttools brotli && python3 scripts/subset-fonts.py
"""
import os, sys
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, 'node_modules')
OUT = os.path.join(ROOT, 'public', 'fonts')
os.makedirs(OUT, exist_ok=True)

# Unicode ranges per script (keep in sync with src/styles/fonts.css)
RANGES = {
    'latin': 'U+0020-007E,U+00A0-00BB,U+00D7,U+00F7,U+2010-2014,U+2018-201E,U+2022,U+2026,U+2116,U+20AA,U+2190-2193,U+2212,U+00B0,U+2032-2033,U+00BD,U+2153-2154',
    'cyrillic': 'U+0400-045F,U+0490-0491,U+00AB,U+00BB,U+2116',
    'hebrew': 'U+0590-05FF,U+FB1D-FB4F,U+200E-200F,U+20AA',
}

def unicodes(spec):
    out = []
    for part in spec.split(','):
        part = part.strip().replace('U+', '')
        if '-' in part:
            a, b = part.split('-')
            out.extend(range(int(a, 16), int(b, 16) + 1))
        else:
            out.append(int(part, 16))
    return out

def cut(src, dst, script):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes(RANGES[script]))
    sub.subset(font)
    subset.save_font(font, dst, opts)
    print(f'{os.path.relpath(dst, ROOT)}: {os.path.getsize(src)//1024}KB -> {os.path.getsize(dst)//1024}KB')

JOBS = [
    # (output name, fontsource package dir, file stem pattern, scripts)
    ('rubik', '@fontsource-variable/rubik/files', 'rubik-{s}-wght-normal.woff2', ['latin', 'cyrillic', 'hebrew']),
    ('bonanova-700', '@fontsource/bona-nova/files', 'bona-nova-{s}-700-normal.woff2', ['latin', 'cyrillic', 'hebrew']),
    ('bonanova-400i', '@fontsource/bona-nova/files', 'bona-nova-{s}-400-italic.woff2', ['latin', 'cyrillic', 'hebrew']),
    ('bonanova-400', '@fontsource/bona-nova/files', 'bona-nova-{s}-400-normal.woff2', ['latin', 'cyrillic', 'hebrew']),
]

if len(sys.argv) > 1 and sys.argv[1] == '--list':
    for j in JOBS: print(j)
    sys.exit()

for name, pkg, pattern, scripts in JOBS:
    for s in scripts:
        src = os.path.join(NM, pkg, pattern.format(s=s))
        if not os.path.exists(src):
            print('missing', src); continue
        cut(src, os.path.join(OUT, f'{name}-{s}.woff2'), s)
