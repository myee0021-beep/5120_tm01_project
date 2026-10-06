#!/usr/bin/env python3
"""Extract / re-embed the Emergency flow page that index0914.html loads into
#emergency__frame as a base64 srcdoc.

  python3 scripts/emergency-frame.py extract   # -> frontend-src/emergency-frame.html
  python3 scripts/emergency-frame.py embed     # writes it back into index0914.html
"""
import base64, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / 'public' / 'index0914.html'
SRC = ROOT / 'frontend-src' / 'emergency-frame.html'
PAT = re.compile(r"(f\.srcdoc = decodeURIComponent\(escape\(atob\(')([A-Za-z0-9+/=]+)('\)\)\))")

def main(cmd):
    html = INDEX.read_text(encoding='utf-8')
    m = PAT.search(html)
    if not m:
        sys.exit('emergency srcdoc not found')
    if cmd == 'extract':
        SRC.parent.mkdir(exist_ok=True)
        SRC.write_text(base64.b64decode(m.group(2)).decode('utf-8'), encoding='utf-8')
        print('wrote', SRC)
    elif cmd == 'embed':
        b64 = base64.b64encode(SRC.read_text(encoding='utf-8').encode('utf-8')).decode('ascii')
        INDEX.write_text(html[:m.start(2)] + b64 + html[m.end(2):], encoding='utf-8')
        print('embedded into', INDEX)
    else:
        sys.exit(__doc__)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '')
