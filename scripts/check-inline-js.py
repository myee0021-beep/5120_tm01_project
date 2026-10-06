#!/usr/bin/env python3
"""Syntax-check every inline <script> in public/index0914.html and the
embedded Emergency frame (frontend-src/emergency-frame.html) with node."""
import re, subprocess, sys, tempfile, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
bad = 0
for f in [ROOT/'public'/'index0914.html', ROOT/'frontend-src'/'emergency-frame.html']:
    html = f.read_text(encoding='utf-8')
    for i, m in enumerate(re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)):
        code = m.group(1)
        if not code.strip():
            continue
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as t:
            t.write(code)
        r = subprocess.run(['node', '--check', t.name], capture_output=True, text=True)
        if r.returncode:
            bad += 1
            line = html[:m.start()].count('\n') + 1
            print(f'{f.name}: script #{i} (line {line}) failed:\n{r.stderr[:600]}')
print('ok' if not bad else f'{bad} failing script(s)')
sys.exit(1 if bad else 0)
