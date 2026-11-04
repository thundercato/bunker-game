import unittest,copy,json,math,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import engine as E
class DeadAir(unittest.TestCase):
 def setUp(self):self.s=E.new_game()
 def at(self,x,z,y=None):self.s['player'].update(x=x,z=z,y=E.surface_height(x,z)if y is None else y,yaw=0,pitch=0);self.s['zone']=E.zone_at(x,z);return self.s
 def quiet(self):
  for e in self.s['enemies']:e['health']=0
 def do(self,**a):self.s=E.dispatch(self.s,a);return self.s
 def tick(self,n=1,dt=1):
  for _ in range(n):self.do(type='tick',dt=dt,player=self.s['player'])
 def test_new_schema(self):self.assertEqual(E.validate_save(self.s)['version'],9)
 def test_base_clock_one_minute_per_minute(self):self.tick(60);self.assertAlmostEqual(self.s['clock'],901,6)
 def test_field_clock_one_hour_per_five_minutes(self):self.quiet();self.at(0,-20);self.tick(300);self.assertAlmostEqual(self.s['clock'],960,6)
 def test_idle_tick_advances_elapsed(self):self.tick(5);self.assertAlmostEqual(self.s['playSeconds'],5)
 def test_pure_state_query_does_not_advance_clock(self):self.do(type='state');self.assertEqual(self.s['clock'],900)
 def test_actions_do_not_double_count_time(self):self.s['weapon']['owned']=True;self.do(type='safe');self.assertEqual(self.s['elapsed'],0)
 def test_initial_only_first_assignment(self):self.assertEqual([k for k,v in self.s['missions'].items()if v in ['active','available']],['signal'])
 def test_first_completion_offers_two_radio_jobs(self):
  self.at(-500,43);self.s['bag']['recorder']=1;self.do(type='deliver',id='signal');self.assertEqual(E.radio_unread(self.s),['tides','rail'])
 def test_first_completion_does_not_unlock_everything(self):
  self.at(-500,43);self.s['bag']['recorder']=1;self.do(type='deliver',id='signal');self.assertEqual(self.s['missions']['beacon'],'locked');self.assertEqual(self.s['missions']['post'],'available')
 def test_mission_owner_required(self):
  self.s['missions']['post']='active';self.s['bag']['postbag']=1;self.at(-500,43);self.do(type='deliver',id='post');self.assertEqual(self.s['missions']['post'],'active')
 def test_npc_can_accept_near_owner(self):
  self.s['missions']['post']='available';self.at(-488,10);self.do(type='accept',id='post');self.assertEqual(self.s['missions']['post'],'active')
 def test_remote_accept_refused(self):
  self.s['missions']['post']='available';self.at(0,-20);self.do(type='accept',id='post');self.assertEqual(self.s['missions']['post'],'available')
 def test_completion_logs_time_and_duration(self):
  self.at(-500,43);self.s['bag']['recorder']=1;self.tick(20);self.do(type='deliver',id='signal');log=self.s['missionLog']['signal'];self.assertAlmostEqual(log['completedPlay'],20);self.assertGreater(log['completedAt'],900)
 def test_completed_mission_cannot_pay_twice(self):
  self.at(-500,43);self.s['bag']['recorder']=2;self.do(type='deliver',id='signal');c=self.s['credits'];self.do(type='deliver',id='signal');self.assertEqual(self.s['credits'],c)
 def test_radio_acknowledgement(self):self.at(-500,43);self.do(type='read_missions',source='radio');self.assertEqual(E.radio_unread(self.s),[])
 def test_tuna_count_required(self):
  self.at(-512,25);self.s['missions']['provisions']='active';self.s['bag']['tuna']=2;self.do(type='deliver',id='provisions');self.assertEqual(self.s['missions']['provisions'],'active')
 def test_tuna_side_quest_consumes_exactly_three(self):
  self.at(-512,25);self.s['missions']['provisions']='active';self.s['bag']['tuna']=4;self.do(type='deliver',id='provisions');self.assertEqual(self.s['bag']['tuna'],1)
 def test_anomalies_begin_hidden(self):self.assertEqual(self.s['revealed'],[])
 def test_detector_does_not_draw_anomaly(self):
  self.at(-11,-39);self.s['bag']['detector']=1;self.do(type='scan');self.assertTrue(self.s['scanned']);self.assertEqual(self.s['revealed'],[])
 def test_probe_reveals_only_its_throw_path(self):
  self.at(-11,-38);self.do(type='probe',land={'x':-11,'z':-50});self.assertIn('glass',self.s['revealed']);self.assertNotIn('quarry',self.s['revealed'])
 def test_revealed_field_persists_after_wait(self):
  self.at(-11,-38);self.do(type='probe',land={'x':-11,'z':-50});self.quiet();self.tick(40);self.assertIn('glass',self.s['revealed'])
 def test_base_return_resets_field_visibility(self):
  self.s['revealed']=['glass'];self.at(0,2.9);self.do(type='portal',id='enter_base');self.assertEqual(self.s['zone'],'base');self.assertEqual(self.s['revealed'],[])
 def test_probe_no_immunity_in_centre(self):
  self.quiet();self.at(-11,-48);self.s['revealed']=['glass'];self.tick();self.assertLess(self.s['health'],100)
 def test_river_requires_bridge(self):self.assertFalse(E.land(99,-310));self.assertTrue(E.land(99,-280));self.assertTrue(E.land(99,-465));self.assertTrue(E.land(170,-300))
 def test_swamp_has_hard_limit(self):self.assertTrue(E.land(0,120));self.assertFalse(E.land(0,149))
 def test_swamp_sink_and_recovery(self):
  self.quiet();self.at(0,115);self.tick(12);self.assertGreater(self.s['swampDepth'],.7);self.at(0,50);self.tick(4);self.assertAlmostEqual(self.s['swampDepth'],0)
 def test_sewer_route_portals(self):
  self.at(154,-346);self.do(type='portal',id='enter_sewer');self.assertEqual(self.s['zone'],'sewer');self.at(-1100,110);self.do(type='portal',id='sewer_fort');self.assertEqual(self.s['zone'],'field');self.assertEqual(self.s['player']['x'],222)
 def test_military_rear_gap_real(self):self.assertTrue(E.walkable(self.s,202,-602));self.assertFalse(E.walkable(self.s,215,-602))
 def test_window_blocks_visibility(self):
  self.assertFalse(E.clear_line(self.s,(8,-31.5),(14,-31.5)))
 def test_closed_door_blocks_visibility(self):self.assertFalse(E.clear_line(self.s,(14,-26),(14,-30)))
 def test_open_door_allows_visibility(self):self.s['doors']['hut']=True;self.assertTrue(E.clear_line(self.s,(14,-26),(14,-30)))
 def test_shooter_max_chance_is_half(self):self.assertEqual(E.shooter_chance(2),.5);self.assertLess(E.shooter_chance(50),.15)
 def test_running_and_crouching_reduce_hit_chance(self):self.assertLess(E.shooter_chance(10,True),E.shooter_chance(10));self.assertLess(E.shooter_chance(10,False,True),E.shooter_chance(10))
 def test_enemy_fov_matters(self):
  self.at(0,-20);e=E.new_enemy({'id':'test','kind':'drifter','x':0,'z':-25,'yaw':0,'zone':'field'});self.assertFalse(E.sees_player(self.s,e));e['yaw']=math.pi;self.assertTrue(E.sees_player(self.s,e))
 def test_torch_increases_indoor_detection(self):
  self.at(14,-32);e=E.new_enemy({'id':'test','kind':'drifter','x':14,'z':-27.8,'yaw':0,'zone':'field'});self.s['doors']['hut']=True;self.s['hand']='gun';dark=E.sees_player(self.s,e);self.s['hand']='torch';self.s['torchOn']=True;lit=E.sees_player(self.s,e);self.assertFalse(dark);self.assertTrue(lit)
 def test_idle_enemy_approaches(self):
  self.quiet();self.at(0,-20);e=self.s['enemies'][0];e.update(health=48,x=0,z=-25,yaw=math.pi,home=[0,-25],zone='field');before=e['z'];self.tick(2);self.assertGreater(self.s['enemies'][0]['z'],before)
 def test_rifleman_enters_movement_cycle(self):
  self.quiet();self.at(160,-300);e=next(e for e in self.s['enemies']if e['kind']=='rifleman');e.update(health=95,x=160,z=-320,yaw=math.pi,home=[160,-320]);self.tick();e=next(e for e in self.s['enemies']if e['kind']=='rifleman');self.assertEqual(e['mode'],'relocate')
 def test_knife_grip_without_gun(self):self.s['hand']='knife';self.do(type='safe');self.assertEqual(self.s['knifeGrip'],'reverse')
 def test_torch_cycles_off(self):
  self.s['hand']='torch';self.do(type='safe');self.assertEqual(self.s['torchMode'],'low');self.do(type='safe');self.assertFalse(self.s['torchOn'])
 def test_signal_torch_colours(self):self.s['bag']['signal_torch']=1;self.do(type='use',kind='signal_torch');self.do(type='safe');self.assertEqual(self.s['torchMode'],'red')
 def test_rifle_ammo_is_separate(self):
  E.add_item(self.s,'rifle',1);E.add_item(self.s,'rifle_mag',1);self.s['bag']['rifle_ammo']=9;mid=self.s['magazines'][-1]['id'];base=self.s['bag']['ammo'];self.do(type='fill',id=mid);self.assertEqual(self.s['bag']['ammo'],base);self.assertEqual(self.s['bag']['rifle_ammo'],4)
 def test_rifle_loaded_and_valid(self):
  E.add_item(self.s,'rifle',1);E.add_item(self.s,'rifle_mag',1);self.s['bag']['rifle_ammo']=8;self.do(type='weapon_select',weapon='rifle');self.do(type='fill',id=self.s['magazines'][-1]['id']);self.do(type='insert');self.do(type='rack');self.assertEqual(self.s['weapon']['chamber'],1);E.validate_save(self.s)
 def test_plain_save_roundtrip(self):self.assertEqual(E.validate_save(json.loads(json.dumps(self.s)))['missionLog'],self.s['missionLog'])
 def test_legacy_campaign_migrates(self):
  p=Path(__file__).with_name('fixtures')/'v8-campaign.json';old=json.loads(p.read_text());s=E.validate_save(E.migrate_dead_air(old));self.assertEqual(s['credits'],old['credits']);self.assertEqual(s['bag']['ammo'],old['bag']['ammo']);self.assertEqual(s['app'],E.APP)
 def test_no_invented_old_completion_times(self):
  p=Path(__file__).with_name('fixtures')/'v8-campaign.json';old=json.loads(p.read_text());old['missions']['signal']='done';s=E.migrate_dead_air(old);self.assertIsNone(s['missionLog']['signal']['completedAt'])
if __name__=='__main__':unittest.main(verbosity=2)
