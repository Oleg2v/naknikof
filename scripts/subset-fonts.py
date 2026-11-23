#!/usr/bin/env python3
"""
Self-hosted, per-language subset web fonts for the Kolbassnik homepage.

Source: full OFL fonts from google/fonts in fonts-src/ (Bona Nova Regular/Bold/Italic, Rubik[wght]).
Output: public/fonts/<family>-<style>-<lang>.woff2 — ONE file per style per language page:
  ru → Basic Latin + Latin-1 + punctuation + Cyrillic + ₪
  he → Basic Latin + Latin-1 + punctuation + Hebrew + ₪
Variable axes (Rubik wght) are kept. Layout features needed for numerals, kerning and Hebrew marks are kept.

Usage:  pip install fonttools brotli opentype-feature-freezer && python3 scripts/subset-fonts.py

Bona Nova defaults to old-style figures; lining figures are frozen into the default glyphs
(opentype-feature-freezer, feature "lnum") so every number on the page lines up, whatever CSS shorthand is used.
"""
import os, subprocess, tempfile, shutil
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'fonts-src')
OUT = os.path.join(ROOT, 'public', 'fonts')
os.makedirs(OUT, exist_ok=True)

COMMON = 'U+0020-007E,U+00A0,U+00A9,U+00AB,U+00AE,U+00B0,U+00B7,U+00BB,U+00BD,U+00D7,U+2010-2014,U+2018-201E,U+2022,U+2026,U+2032-2033,U+2039-203A,U+2080-2084,U+20AA,U+2116,U+2190-2193,U+2212,U+2248'
RANGES = {
    'ru': COMMON + ',U+0400-045F,U+0490-0491',
    'he': COMMON + ',U+0590-05FF,U+FB1D-FB4F,U+200E-200F',
}
FEATURES = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'lnum', 'tnum', 'pnum', 'onum', 'case', 'frac', 'sups', 'subs', 'rlig', 'dlig']

FONTS = [
    ('bonanova-700', 'BonaNova-Bold.ttf'),
    ('bonanova-400', 'BonaNova-Regular.ttf'),
    ('bonanova-400i', 'BonaNova-Italic.ttf'),
    ('rubik', 'Rubik[wght].ttf'),
]

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

FREEZE = {'BonaNova-Bold.ttf', 'BonaNova-Regular.ttf', 'BonaNova-Italic.ttf'}
tmp = tempfile.mkdtemp()

def source(src):
    path = os.path.join(SRC, src)
    if src not in FREEZE:
        return path
    out = os.path.join(tmp, src)
    if not os.path.exists(out):
        subprocess.run(['pyftfeatfreeze', '-f', 'lnum', '-S', '-U', '', path, out], check=True, capture_output=True)
    return out

for name, src in FONTS:
    for lang, spec in RANGES.items():
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = FEATURES
        opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # keep copyright + license
        opts.notdef_outline = True
        opts.hinting = False
        opts.desubroutinize = True
        font = subset.load_font(source(src), opts)
        s = subset.Subsetter(opts)
        s.populate(unicodes=unicodes(spec))
        s.subset(font)
        dst = os.path.join(OUT, f'{name}-{lang}.woff2')
        subset.save_font(font, dst, opts)
        print(f'{os.path.relpath(dst, ROOT)}: {os.path.getsize(dst) // 1024} KB')

shutil.rmtree(tmp, ignore_errors=True)
