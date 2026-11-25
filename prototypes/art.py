"""Web-sized art for the prototypes. Run: uv run --with pillow python prototypes/art.py"""
import os, glob, base64, io, json, re, shutil
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = R + '/assets/'; O = R + '/prototypes/art/'
norm = lambda n: re.sub(r'[^a-z0-9]+', '_', n.lower().replace('с', 'c')).strip('_')
def put(src, dst, w, q=78):
    im = Image.open(src).convert('RGBA'); im.thumbnail((w, w * 2)); os.makedirs(os.path.dirname(O + dst), exist_ok=True); im.save(O + dst + '.webp', quality=q)
for d, name, w in [('Agents', 'agent', 260), ('Buildings', 'building', 300), ('Founding Fathers', 'father', 220), ('Indians', 'tribe', 260), ('Colony', 'nation', 1400), ('Units', 'unit', 220)]:
    for f in glob.glob(A + d + '/*.*g'):
        n = norm(os.path.splitext(os.path.basename(f))[0]).replace('colony_', '')
        if n in ('back', 'emblems'): continue
        put(f, f'{name}/{n}', w)
put(A + 'Europe/back raw.png', 'europe', 1600); put(A + 'crate.png', 'crate', 80)
for k in ('global-event-back', 'burial-back', 'wreck-back', 'indian-event-back'): put(A + f'Events/Backs/{k}.png', 'event/' + norm(k), 500)
os.makedirs(O + 'emblem', exist_ok=True)
for f in glob.glob(A + 'Emblems/*.svg'): open(O + 'emblem/' + os.path.basename(f).lower(), 'w').write(re.sub(r'fill:#0[06]0[06]0[06]', 'fill:#ffffff', open(f).read()).replace('<svg\n', '<svg\n   fill="#fff"\n', 1))
tex = {}
for t in ('ocean', 'forest', 'grassland', 'mountains', 'desert', 'tundra'):
    im = Image.open(A + f'Terrain/{t}.png').convert('RGB').resize((224, 224)); b = io.BytesIO(); im.save(b, 'WEBP', quality=80); tex[t] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
open(R + '/prototypes/textures.js', 'w').write('window.TEXTURES = ' + json.dumps(tex) + ';\n')
