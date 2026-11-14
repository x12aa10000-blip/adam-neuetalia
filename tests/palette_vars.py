"""Links every palette colour in the CSS to the four theme variables so the owner can change them in the admin."""
import re, sys
MAP = {'254,144,190': 'pk', '100,37,254': 'pu', '1,202,201': 'tq', '51,51,51': 'ink'}
HEX = {'#fe90be': 'pk', '#6425fe': 'pu', '#01cac9': 'tq', '#333333': 'ink', '#333': 'ink'}
def rgba(m):
    parts = [p.strip() for p in m.group(1).split(',')]
    key = ','.join(parts[:3])
    if key not in MAP: return m.group(0)
    a = float(parts[3]) if len(parts) > 3 else 1
    v = MAP[key]
    return f'var(--{v})' if a >= .999 else f'color-mix(in srgb,var(--{v}) {round(a*100,1):g}%,transparent)'
for p in sys.argv[1:]:
    s = open(p).read(); o = s
    s = re.sub(r'rgba?\(([^()]*)\)', rgba, s)
    s = re.sub(r'(?<![\w&%])(#[0-9a-fA-F]{6}|#333)\b', lambda m: f'var(--{HEX[m.group(1).lower()]})' if m.group(1).lower() in HEX else m.group(0), s)
    if s != o: open(p, 'w').write(s); print('linked', p)
