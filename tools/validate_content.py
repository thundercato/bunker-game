from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'site'
w=json.loads((root/'world.json').read_text());catalogue=w['catalogue']
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
