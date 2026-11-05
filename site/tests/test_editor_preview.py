"""Real Python engine checks with a world compiled by the same JS editor core."""
import unittest, json, subprocess, runpy, math, copy
from pathlib import Path
SITE=Path(__file__).resolve().parents[1]
class EditorPreview(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  script="""import fs from 'node:fs';import{seedLayout,compiledWorld}from'./layout-core.js';const world=JSON.parse(fs.readFileSync('world.json'));const d=seedLayout(world,'hut');d.objects.find(o=>o.binding?.id==='hut_c1').position=[1.2,0,-2.4];const t=d.objects.find(o=>o.binding?.type==='loose');t.position=[-.9,0,-.6];t.yaw=Math.PI/2;console.log(JSON.stringify(compiledWorld(d,world)));"""
  cls.world=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=SITE,text=True))
  cls.api=runpy.run_path(str(SITE/'engine.py'),init_globals={'WORLD_JSON':json.dumps(cls.world)})
 def fresh(self):return self.api['new_game']()
 def test_preview_starts_at_layout_marker(self):
  s=self.fresh();self.assertEqual(s['player']['x'],14);self.assertAlmostEqual(s['player']['z'],-26.6);self.assertEqual(s['zone'],'field')
 def test_preview_enemies_disabled(self):self.assertTrue(all(e['health']==0 for e in self.fresh()['enemies']))
 def test_moved_container_keeps_mission_binding(self):
  c=next(c for c in self.world['containers']if c['id']=='hut_c1');m=next(m for m in self.world['missions']if m['id']=='signal');self.assertAlmostEqual(c['x'],15.2);self.assertEqual(m['x'],c['x']);self.assertEqual(m['z'],c['z'])
 def test_existing_door_can_be_opened(self):
  s=self.api['dispatch'](self.fresh(),{'type':'door','id':'hut'});self.assertTrue(s['doors']['hut']);self.assertTrue(self.api['walkable'](s,14,-28))
 def test_closed_door_blocks_layout_collision(self):self.assertFalse(self.api['walkable'](self.fresh(),14,-28))
 def test_relocated_container_search_uses_real_rules(self):
  s=self.fresh();s['player'].update(x=15.2,z=-32.2,y=0);s=self.api['dispatch'](s,{'type':'search','id':'hut_c1'});self.assertGreaterEqual(s['containers']['hut_c1']['items']['recorder'],1)
 def test_relocated_table_offsets_follow_rotation(self):
  s=self.fresh();q=next(q for q in self.world['looseSlots']if q.get('editorSurface'));i=self.world['looseSlots'].index(q);items=[v for k,v in s['loose'].items()if k.startswith('loose_'+str(i)+'_')]
  for j,v in enumerate(items):
   dx=(j%3-1)*.24;dz=(j//3)*.19
   self.assertAlmostEqual(v['x'],q['x']+dz);self.assertAlmostEqual(v['z'],q['z']-dx);self.assertAlmostEqual(v['y'],q['y'])
 def test_preview_save_roundtrips(self):
  s=self.fresh();q=self.api['validate_save'](json.loads(json.dumps(s)));self.assertEqual(q['player'],s['player']);self.assertEqual(q['bag'],s['bag'])
 def test_source_world_never_contains_preview(self):self.assertNotIn('editorLayout',json.loads((SITE/'world.json').read_text()))
if __name__=='__main__':unittest.main()
