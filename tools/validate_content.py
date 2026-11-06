from pathlib import Path
import json, hashlib
root=Path(__file__).resolve().parents[1]/'site'
w=json.loads((root/'world.json').read_text());catalogue=w['catalogue']
world_source=json.loads((root/'world-source.json').read_text())
if world_source['sha256']!=hashlib.sha256((root/'world.json').read_bytes()).hexdigest():raise ValueError('World source snapshot digest must match reviewed content')
for key in ['buildings','containers','enemies','missions']:
 ids=[x['id']for x in w[key]]
 if len(ids)!=len(set(ids)):raise ValueError(f'Duplicate {key} ids')
missions={x['id']:x for x in w['missions']};visited=set();current=set()
def visit(name):
 if name in current:raise ValueError('Circular mission dependency')
 if name in visited:return
 current.add(name)
 for dep in missions[name].get('requires',[]):
  if dep not in missions:raise ValueError('Missing prerequisite '+dep)
  visit(dep)
 current.remove(name);visited.add(name)
for m in missions.values():
 visit(m['id'])
 if m['item']not in catalogue:raise ValueError('Missing mission item')
 if m['source']not in w['missionSources']:raise ValueError('Missing mission source')
photos=json.loads((root/'assets/v9/briefings.json').read_text())
for name in missions:
 image=root/photos.get(name,'__missing__')
 if not image.is_file()or image.stat().st_size<1000:raise ValueError('Missing recon image '+name)
for c in w['containers']:
 for item in c.get('guaranteed',{}):
  if item not in catalogue:raise ValueError('Missing guaranteed item '+item)
print(f'Content valid: {len(missions)} missions, {len(w["containers"])} containers, {len(w["enemies"])} enemies')

visuals=json.loads((root/'assets/v10/item-visuals.json').read_text())
thumbs=json.loads((root/'assets/v10/thumbnails/manifest.json').read_text())
if set(visuals)!=set(catalogue):raise ValueError('Item model registry does not cover catalogue exactly')
if set(thumbs)!=set(catalogue):raise ValueError('Thumbnail registry does not cover catalogue exactly')
for key in catalogue:
 p=root/thumbs[key]
 if not p.is_file() or p.stat().st_size<100:raise ValueError('Missing model thumbnail '+key)
for row in json.loads((root/'assets/v10/model-manifest.json').read_text()):
 if row.get('licence')!='CC0-1.0' or not row.get('authors'):raise ValueError('Uncredited new model')
 p=root/row['path']
 if p.read_bytes()[:4]!=b'glTF':raise ValueError('Invalid GLB '+row['id'])
print(f'Fieldcraft visuals valid: {len(visuals)} items and {len(thumbs)} previews')
