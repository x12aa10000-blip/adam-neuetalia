"""Maps every colour literal in the CSS onto the Figma palette (#FE90BE, #6425FE, #01CAC9, #333333, #FFFFFF).
Lighter shades become the same brand colour with transparency; greys become #333333 with transparency."""
import re, colorsys, sys
PAL = {'pink': (254, 144, 190), 'purple': (100, 37, 254), 'teal': (1, 202, 201), 'ink': (51, 51, 51)}
def lum(c): return colorsys.rgb_to_hls(*[x / 255 for x in c])[1]
def fmt(name, a):
    a = max(0.0, min(1.0, a))
    if a >= 0.995: return {'pink': '#FE90BE', 'purple': '#6425FE', 'teal': '#01CAC9', 'ink': '#333333'}[name]
    r, g, b = PAL[name]; return f'rgba({r},{g},{b},{round(a, 3):g})'
def map_rgb(r, g, b, a=1.0):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255); h *= 360
    if l >= 0.985 and a >= 0.99: return '#fff'
    if l >= 0.985: return f'rgba(255,255,255,{a:g})'
    if s < 0.14 or l < 0.12:  # grey / black
        return fmt('ink', a * min(1, (1 - l) / 0.8))
    if 150 <= h < 200: name = 'teal'
    elif 200 <= h < 300: name = 'purple'
    elif (h < 12 or h >= 350) and s > 0.5 and l < 0.55: name = 'purple'   # error reds -> Figma alert colour
    else: name = 'pink'
    lb = lum(PAL[name])
    alpha = 1.0 if l <= lb + 0.02 else (1 - l) / (1 - lb)
    return fmt(name, a * alpha)
def hexmap(m):
    h = m.group(1)
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    if len(h) != 6: return m.group(0)
    return map_rgb(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
def rgbamap(m):
    parts = [p.strip() for p in m.group(1).split(',')]
    if len(parts) < 3 or any('var' in p for p in parts): return m.group(0)
    try: r, g, b = (float(x) for x in parts[:3]); a = float(parts[3]) if len(parts) > 3 else 1.0
    except ValueError: return m.group(0)
    return map_rgb(r, g, b, a)
def enc(m):  # %23rrggbb inside data: SVGs
    out = hexmap(re.match(r'#([0-9a-fA-F]+)', '#' + m.group(1)))
    return out.replace('#', '%23') if out.startswith('#') else "%23333333"
for path in sys.argv[1:]:
    s = open(path).read(); o = s
    s = re.sub(r'%23([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', enc, s)
    s = re.sub(r'(?<![\w&])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![0-9a-fA-F])', hexmap, s)
    s = re.sub(r'rgba?\(([^()]*)\)', rgbamap, s)
    if s != o: open(path, 'w').write(s); print('mapped', path)
