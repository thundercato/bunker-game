"""Real candidate rules: legacy continuity, complete mission and guarded crane routes."""
import copy,importlib.util,json,math,unittest,heapq
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('campaign_audit',ROOT/'tools/audit_world.py');audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

class Campaign(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.world=audit.runtime_source(ROOT/'site');cls.engine=audit.load_engine(ROOT/'site',cls.world)
  cls.source_engine=audit.load_engine(ROOT/'site',audit.read_json(ROOT/'site/world.json'))
 def fresh(self):
  s=self.engine['new_game']()
  for e in s['enemies']:e['health']=0
  return s
 def test_every_crane_route_is_authorised_only_at_its_own_landing(self):
  e=self.engine
  for route in self.world['campaignGeometry']['climbs']:
   s=self.fresh();s['zone']='field';s['player']={**s['player'],**route['from']}
   out=e['dispatch'](s,{'type':'climb','id':route['id']})
   self.assertEqual(out['player']['y'],route['to']['y']);self.assertTrue(any(v.get('climb')==route['id']for v in out['events']))
   self.assertAlmostEqual(e['surface_height'](out['player']['x'],out['player']['z'],out['player']['y']),out['player']['y'])
   self.assertEqual(e['validate_save'](json.loads(json.dumps(out)))['player'],out['player'])
 def test_crane_cannot_be_triggered_from_ground_at_an_upper_landing(self):
  route=next(r for r in self.world['campaignGeometry']['climbs']if r['from']['y']==8);s=self.fresh();s['zone']='field';s['player'].update(x=route['from']['x'],z=route['from']['z'],y=0)
  out=self.engine['dispatch'](s,{'type':'climb','id':route['id']});self.assertEqual(out['player']['y'],0);self.assertTrue(any(v['level']=='warning'for v in out['events']))
 def test_crane_refuses_unknown_routes_without_altering_inventory(self):
  s=self.fresh();q=self.engine['dispatch'](s,{'type':'climb','id':'not-a-route'});self.assertEqual(q['bag'],s['bag']);self.assertEqual(q['player'],s['player'])
 def test_legacy_inventory_credits_and_searched_contents_survive(self):
  old=json.loads((ROOT/'site/tests/fixtures/v8-campaign.json').read_text());out=self.engine['validate_save'](self.engine['migrate_dead_air'](old));self.assertEqual(out['credits'],old['credits']);self.assertEqual(out['bag']['ammo'],old['bag']['ammo']);self.assertEqual(out['containers'],old['containers'])
 def test_raised_bound_cupboards_use_physical_floor_for_search(self):
  for scene in self.world['campaignScenes']:
   for o in scene['layout']['objects']:
    if o.get('binding',{}).get('type')!='container':continue
    c=next(c for c in self.world['containers']if c['id']==o['binding']['id']);self.assertEqual(c['floor'],o['binding']['floor'])
 def test_pier_and_buried_car_fix_use_the_same_rule_as_movement(self):
  self.assertEqual(self.engine['surface_height'](110,-151),0);c=self.engine['CONTAINERS']['car7'];self.assertAlmostEqual(c['floor'],self.engine['surface_height'](c['x'],c['z']))
 def old_quayside_patrol(self,health=37):
  state=self.source_engine['new_game']();state['credits']=732;state['bag']['ammo']=27
  patrol=next(e for e in state['enemies']if e['id']=='st4');patrol['health']=health
  adjustment=next(a for a in self.world['campaignSpawnAdjustments']if a['id']=='st4')
  self.assertEqual([patrol['x'],patrol['z']],adjustment['from'])
  return state,patrol,adjustment
 def test_new_quayside_patrol_starts_at_clear_authored_spawn_without_changing_identity(self):
  state=self.engine['new_game']();patrol=next(e for e in state['enemies']if e['id']=='st4')
  adjustment=next(a for a in self.world['campaignSpawnAdjustments']if a['id']=='st4')
  old=next(e for e in self.source_engine['new_game']()['enemies']if e['id']=='st4')
  self.assertEqual([patrol['x'],patrol['z']],adjustment['to'])
  self.assertEqual(patrol['home'],adjustment['to']);self.assertEqual(patrol['target'],adjustment['to'])
  self.assertEqual((patrol['id'],patrol['kind'],patrol['health']),(old['id'],old['kind'],old['health']))
  self.assertTrue(self.engine['walkable'](state,patrol['x'],patrol['z']))
  self.assertEqual(self.engine['validate_save'](json.loads(json.dumps(state)))['enemies'],state['enemies'])
 def test_alive_old_patrol_moves_clear_preserving_save_progress_and_input(self):
  state,patrol,adjustment=self.old_quayside_patrol();before=copy.deepcopy(state)
  self.assertTrue(self.engine['_CAMPAIGN'].blocked(patrol['x'],patrol['z'],patrol['y'],state['doors']))
  out=self.engine['validate_save'](state);moved=next(e for e in out['enemies']if e['id']=='st4')
  self.assertEqual([moved['x'],moved['z']],adjustment['to'])
  self.assertEqual(moved['home'],adjustment['to']);self.assertEqual(moved['target'],adjustment['to'])
  self.assertEqual(moved['health'],37);self.assertEqual(moved['y'],self.engine['surface_height'](*adjustment['to']))
  self.assertTrue(self.engine['walkable'](out,moved['x'],moved['z']))
  for key in state:
   if key not in ('enemies','events'):self.assertEqual(out[key],state[key],key)
  self.assertEqual([e for e in out['enemies']if e['id']!='st4'],[e for e in state['enemies']if e['id']!='st4'])
  self.assertEqual(state,before,'Validation must not mutate the supplied save')
  self.assertEqual([e['id']for e in out['events']],['candidate-patrol-clearance:st4'])
 def test_dead_old_patrol_is_not_relocated_or_resurrected(self):
  state,patrol,_=self.old_quayside_patrol(health=0)
  out=self.engine['validate_save'](state);dead=next(e for e in out['enemies']if e['id']=='st4')
  self.assertEqual(dead,patrol);self.assertEqual(out['events'],[])
 def test_patrol_relocation_is_idempotent_after_serialised_reload(self):
  state,_,_=self.old_quayside_patrol();first=self.engine['validate_save'](state)
  second=self.engine['validate_save'](json.loads(json.dumps(first)));expected=copy.deepcopy(first);expected['events']=[]
  self.assertEqual(second,expected)
 def test_patrol_already_away_from_old_cargo_keeps_its_live_position(self):
  state,patrol,_=self.old_quayside_patrol();patrol.update(x=84,z=-147.75)
  out=self.engine['validate_save'](state)
  self.assertEqual(next(e for e in out['enemies']if e['id']=='st4'),patrol);self.assertEqual(out['events'],[])
 def test_relocated_patrol_keeps_an_existing_pursuit_target(self):
  state,patrol,adjustment=self.old_quayside_patrol();patrol.update(mode='chase',target=[90,-145],memory=8.5)
  out=self.engine['validate_save'](state);moved=next(e for e in out['enemies']if e['id']=='st4')
  self.assertEqual(moved['home'],adjustment['to']);self.assertEqual(moved['target'],[90,-145])
  self.assertEqual((moved['mode'],moved['memory'],moved['health']),('chase',8.5,37))
 def test_full_first_signal_expedition_search_return_deliver_reload_is_idempotent(self):
  e=self.engine;s=self.fresh();credits=s['credits']
  # Static collision navigation uses real engine geometry. Browser tests separately
  # cover actual keyboard/Use, rendering, dialogue and new interiors/ladder controls.
  s['doors']={k:True for k in s['doors']}
  def walk(state,goal):
   start=(round(state['player']['x']*2),round(state['player']['z']*2));target=(round(goal[0]*2),round(goal[1]*2));
   margin=30;bounds=(min(start[0],target[0])-margin,max(start[0],target[0])+margin,min(start[1],target[1])-margin,max(start[1],target[1])+margin)
   queue=[(0,start)];cost={start:0};previous={};done=set()
   while queue:
    _,p=heapq.heappop(queue)
    if p in done:continue
    done.add(p)
    if p==target:break
    for dx,dz in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)]:
     q=(p[0]+dx,p[1]+dz)
     if not bounds[0]<=q[0]<=bounds[1]or not bounds[2]<=q[1]<=bounds[3]or not e['walkable'](state,q[0]/2,q[1]/2):continue
     new=cost[p]+math.hypot(dx,dz)
     if new<cost.get(q,1e9):cost[q]=new;previous[q]=p;heapq.heappush(queue,(new+math.hypot(q[0]-target[0],q[1]-target[1]),q))
   self.assertIn(target,cost,'Destination reachable using real collision rules')
   route=[];p=target
   while p!=start:route.append(p);p=previous[p]
   for x,z in reversed(route):
    pose={**state['player'],'x':x/2,'z':z/2,'y':e['surface_height'](x/2,z/2,state['player'].get('y',0))};state=e['dispatch'](state,{'type':'tick','player':pose,'dt':0});self.assertAlmostEqual(state['player']['x'],x/2)
   return state
  s=walk(s,(-500,.5));s=e['dispatch'](s,{'type':'portal','id':'leave_base'});self.assertEqual(s['zone'],'field')
  s=walk(s,(17.5,-33));s=e['dispatch'](s,{'type':'search','id':'hut_c1'});self.assertGreaterEqual(s['containers']['hut_c1']['items']['recorder'],1)
  s=e['dispatch'](s,{'type':'take','id':'hut_c1','kind':'recorder','count':1});self.assertEqual(s['bag']['recorder'],1)
  s=walk(s,(0,-.5));s=e['dispatch'](s,{'type':'portal','id':'enter_base'});self.assertEqual(s['zone'],'base')
  s=walk(s,(-500,43));s=e['dispatch'](s,{'type':'read_missions','source':'radio'});s=e['dispatch'](s,{'type':'deliver','id':'signal'})
  self.assertEqual(s['missions']['signal'],'done');self.assertEqual(s['credits'],credits+350);self.assertEqual(s['missionLog']['signal']['reward'],350)
  s=e['validate_save'](json.loads(json.dumps(s)));q=e['dispatch'](s,{'type':'deliver','id':'signal'});self.assertEqual(q['credits'],s['credits']);self.assertEqual(q['bag'],s['bag'])
  output=ROOT/'test-results';output.mkdir(exist_ok=True);(output/'candidate-completed-mission.json').write_text(json.dumps(s))

if __name__=='__main__':unittest.main()
