"""JS-compiled preview data exercised by the real Python engine, with parity samples."""
import unittest, json, subprocess, runpy, math
from pathlib import Path
SITE=Path(__file__).resolve().parents[1]

class WorldPreview(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  script="""
import fs from 'node:fs';
import {createWorldDocument,toWorld} from './world-document.js';
import {seedLayout} from './layout-core.js';
import {compilePreviewWorld,previewSurface} from './world-preview.js';
const source=JSON.parse(fs.readFileSync('world.json'));
const sourceRevision=JSON.parse(fs.readFileSync('world-source.json')).revision;
const context={source,sourceRevision},cases=[];
for(const id of ['hut','forester']){
 const doc=createWorldDocument({...context,layouts:[seedLayout(source,id)]});
 Object.assign(doc.authoring.buildings.find(b=>b.id===id),{x:35,z:-48,y:2,yaw:Math.PI/2,foundation:'manual'});
 if(id==='forester')doc.interiors[0].objects.find(o=>o.binding?.type==='container').position=[-2,3.2,0];
 const world=compilePreviewWorld(doc,id,context),b=world.editorBuilding;
 const samples=[];for(const y of [0,1.6,3.2])for(let x=-3;x<=3;x+=1)for(let z=-3;z<=3;z+=1){
  const p=toWorld(b.transform,[x,y,z]);samples.push({p,height:previewSurface(b,p[0],p[2],p[1])});
 }
 cases.push({world,samples});
}console.log(JSON.stringify(cases));
"""
  cls.cases=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=SITE,text=True))
  cls.engines=[runpy.run_path(str(SITE/'engine.py'),init_globals={'WORLD_JSON':json.dumps(c['world'])})for c in cls.cases]
 def test_js_python_floor_and_stair_parity(self):
  for case,engine in zip(self.cases,self.engines):
   for sample in case['samples']:
    x,y,z=sample['p'];self.assertAlmostEqual(engine['surface_height'](x,z,y),sample['height'])
 def test_spawn_is_transformed_and_raised(self):
  s=self.engines[0]['new_game']();self.assertAlmostEqual(s['player']['x'],39.9);self.assertEqual(s['player']['y'],2);self.assertAlmostEqual(s['player']['yaw'],math.pi/2)
 def test_moved_door_closed_and_open(self):
  e=self.engines[0];s=e['new_game']();self.assertFalse(e['walkable'](s,38.5,-48));s=e['dispatch'](s,{'type':'door','id':'hut'});self.assertTrue(s['doors']['hut']);self.assertTrue(e['walkable'](s,38.5,-48))
 def test_old_door_and_wall_no_longer_block(self):
  e=self.engines[0];s=e['new_game']();self.assertTrue(e['walkable'](s,14,-28));self.assertTrue(e['walkable'](s,10,-31.5))
 def test_search_uses_moved_position_and_height(self):
  e=self.engines[0];s=e['new_game']();s['player'].update(x=32.6,z=-50.5,y=2);s=e['dispatch'](s,{'type':'search','id':'hut_c1'});self.assertIn('hut_c1',s['containers']);self.assertGreaterEqual(s['containers']['hut_c1']['items']['recorder'],1)
 def test_search_at_old_location_is_rejected(self):
  e=self.engines[0];s=e['new_game']();s['player'].update(x=17.5,z=-33.9,y=0);s=e['dispatch'](s,{'type':'search','id':'hut_c1'});self.assertNotIn('hut_c1',s['containers'])
 def test_upstairs_container_rejects_ground_floor(self):
  e=self.engines[1];c=next(c for c in self.cases[1]['world']['containers']if c.get('editorScene'));s=e['new_game']();s['player'].update(x=c['x'],z=c['z'],y=2);s=e['dispatch'](s,{'type':'search','id':c['id']});self.assertNotIn(c['id'],s['containers']);s['player']['y']=5.2;s=e['dispatch'](s,{'type':'search','id':c['id']});self.assertIn(c['id'],s['containers'])
 def test_mission_target_is_the_container(self):
  w=self.cases[0]['world'];c=next(c for c in w['containers']if c['id']=='hut_c1');m=next(m for m in w['missions']if m['id']=='signal');self.assertEqual((m['x'],m['z']),(c['x'],c['z']))
 def test_preview_save_reloads_without_reroll(self):
  e=self.engines[0];s=e['new_game']();s['player'].update(x=32.6,z=-50.5,y=2);s=e['dispatch'](s,{'type':'search','id':'hut_c1'});self.assertEqual(e['validate_save'](json.loads(json.dumps(s)))['containers'],s['containers'])
 def test_raised_tick_remains_valid(self):
  e=self.engines[0];s=e['new_game']();s=e['dispatch'](s,{'type':'tick','player':s['player'],'dt':.18});self.assertEqual(s['player']['y'],2);self.assertFalse(any('terrain' in x['text']for x in s['events']))
 def test_line_crossing_moved_wall_blocks_with_both_endpoints_outside(self):
  e=self.engines[0];s=e['new_game']();s['doors']['hut']=True
  self.assertFalse(e['clear_line'](s,(35,-60),(35,-37)))

if __name__=='__main__':unittest.main()
