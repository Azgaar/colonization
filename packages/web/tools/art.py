"""Web-sized art for the prototypes. Run: uv run --with pillow python packages/web/tools/art.py"""
import os, glob, base64, io, json, re, shutil
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))); A = R + '/assets/'; O = R + '/packages/web/art/'
norm = lambda n: re.sub(r'[^a-z0-9]+', '_', n.lower().replace('с', 'c')).strip('_')
def put(src, dst, w, q=78):
    im = Image.open(src).convert('RGBA'); im.thumbnail((w, w * 2)); os.makedirs(os.path.dirname(O + dst), exist_ok=True); im.save(O + dst + '.webp', quality=q)
for d, name, w in [('Agents', 'agent', 260), ('Buildings', 'building', 300), ('Founding Fathers', 'father', 220), ('Indians', 'tribe', 260), ('Colony', 'nation', 1400)]:
    for f in glob.glob(A + d + '/*.*g'):
        n = norm(os.path.splitext(os.path.basename(f))[0]).replace('colony_', '')
        if n in ('back', 'emblems'): continue
        put(f, f'{name}/{n}', w)
put(A + 'Europe/back raw.png', 'europe', 1600); put(A + 'crate.png', 'crate', 80)
# One picture for each event, from the art there is.
EVENTS = {'sugar_act': 'custom house', 'silver_fleet': 'galleon', 'seven_years_war': 'soldier', 'the_great_awakening': 'church', 'smallpox_epidemic': 'iroquois', 'stamp_act': 'newspaper', 'atlantic_storms': 'caravel', 'pontiacs_rebellion': 'cherokee', 'broken_treaties': 'sioux', 'black_market': 'smuggler', 'starving_time': 'colonist', 'prison_ships': 'criminal', 'common_sense': 'politician', 'industrial_boom': 'factory', 'salem_witch_trials': 'puritan', 'mutiny': 'sailor', 'sacred_forest': 'indian', 'el_dorado_rumors': 'inca', 'slave_rebellion': 'slave', 'treaty_of_paris': 'negotiant', 'the_boston_tea_party': 'docks', 'pirate_blockade': 'privateer'}
# And one for each ruin and wreck.
EVENTS |= {'natives_ambush': 'cherokee', 'predators_lair': 'trapper', 'golden_city': 'aztec', 'silver_mines': 'miner', 'survivor': 'adventurer', 'abandoned_fort': 'fort', 'hidden_granaries': 'farmer', 'smugglers_cave': 'smuggler', 'mere_rumors': 'scout', 'native_burial': 'apache', 'desecrated_burial': 'comanche', 'sacred_totem_circle': 'tupi', 'guide': 'indian', 'warrior_burial': 'sioux', 'bandeirante_tracks': 'conquistador', 'stone_wall': 'inca', 'protective_amulet': 'pueblo', 'defiled_shrine': 'arawak', 'lost_tomb': 'mapuche', 'trail_marker': 'caribs',
           'shipwreck': 'caravel', 'sunken_galleon': 'galleon', 'man_overboard': 'sailor', 'floating_cargo': 'fluyt', 'plague_ship': 'fluyt', 'drifting_frigate': 'frigate', 'pirate_ambush': 'privateer', 'sea_charts': 'navigator', 'smugglers_cache': 'smuggler', 'surviving_crew': 'captain', 'treacherous_reefs': 'frigate', 'slave_ship': 'slave', 'gutted_hull': 'shipyard', 'calm_seas': 'docks', 'capricious_official': 'politician', 'lost_relic': 'priest', 'message_in_a_bottle_1': 'negotiant', 'message_in_a_bottle_2': 'politician', 'message_in_a_bottle_3': 'fisherman', 'rich_reefs': 'corsair'}
found = {norm(os.path.splitext(os.path.basename(f))[0]): f for d in ('Units', 'Indians', 'Agents', 'Buildings') for f in glob.glob(A + d + '/*.*g')}
for e, n in EVENTS.items():
    # The whole picture: square art stays square, tall art is trimmed to 3:4 from the bottom.
    im = Image.open(found[norm(n)]).convert('RGB'); w, h = im.size; im = im.crop((0, 0, w, min(h, round(w * 4 / 3)))); im.thumbnail((720, 960)); im.save(O + f'event/{e}.webp', quality=80)
os.makedirs(O + 'emblem', exist_ok=True)
for f in glob.glob(A + 'Emblems/*.svg'): open(O + 'emblem/' + os.path.basename(f).lower(), 'w').write(re.sub(r'fill:#0[06]0[06]0[06]', 'fill:#ffffff', open(f).read()).replace('<svg\n', '<svg\n   fill="#fff"\n', 1))
tex = {}
for t in ('ocean', 'forest', 'grassland', 'mountains', 'desert', 'tundra'):
    im = Image.open(A + f'Terrain/{t}.png').convert('RGB').resize((224, 224)); b = io.BytesIO(); im.save(b, 'WEBP', quality=80); tex[t] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
os.makedirs(R + '/packages/web/src/generated', exist_ok=True); open(R + '/packages/web/src/generated/textures.json', 'w').write(json.dumps(tex) + '\n')
# Report (FR-D-5): entities without a picture, and pictures that no entity uses. Paths follow `art` in src/data.ts.
game = json.load(open(R + '/packages/data/generated/gamedata.json'))
want = {'agent': {a['base'] for a in game['agents'].values()}, 'building': {('blacksmiths_shop' if b == 'blacksmith_shop' else b) for b in game['buildings']},
        'father': {('edward_colston' if f == 'benedict_arnold' else f) for f in game['fathers']}, 'tribe': set(game['tribes']), 'nation': set(game['nations']),
        'event': set(game['events']) | set(game['ruins']) | set(game['wrecks'])}
for kind, ids in want.items():
    have = {os.path.splitext(f)[0] for f in os.listdir(O + kind)}
    missing, unused = sorted(ids - have), sorted(have - ids - ({'seven_years_war'} if kind == 'event' else set()))
    print(f'{kind}: {len(ids)} needed, {len(missing)} missing{": " + ", ".join(missing) if missing else ""}; {len(unused)} unused{": " + ", ".join(unused) if unused else ""}')
