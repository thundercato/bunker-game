import unittest,copy,json,math,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import engine as E
class V6(unittest.TestCase):
 def setUp(self):self.s=E.new_game()
 def at(self,x,z,y=0):self.s['player'].update(x=x,z=z,y=y);self.s['zone']=E.zone_at(x,z);return self.s
 def action(self,**a):self.s=E.dispatch(self.s,a);return self.s
 def quiet(self):
  for e in self.s['enemies']:e['health']=0
 def test_new_save(self):self.assertEqual(E.validate_save(self.s)['zone'],'base')
 def test_old_save_rejected(self):
  s=copy.deepcopy(self.s);s['version']=5
  with self.assertRaises(ValueError):E.validate_save(s)
 def test_portal_needs_proximity(self):self.action(type='portal',id='leave_base');self.assertEqual(self.s['zone'],'base');self.assertEqual(self.s['events'][0]['level'],'warning')
 def test_portal_changes_zone(self):self.at(-500,2);self.action(type='portal',id='leave_base');self.assertEqual(self.s['zone'],'field');self.assertAlmostEqual(self.s['player']['z'],-2.3)
 def test_cave_portal(self):self.at(-123,-283);self.action(type='portal',id='enter_cave');self.assertEqual(self.s['zone'],'cave');E.validate_save(self.s)
 def test_bunker_portal(self):self.at(35,-274);self.action(type='portal',id='enter_bunker');self.assertEqual(self.s['zone'],'bunker');E.validate_save(self.s)
 def test_zone_teleport_rejected(self):self.action(type='tick',player={'x':-800,'z':2,'y':0,'yaw':0,'pitch':0},dt=.2,active=True);self.assertEqual(self.s['zone'],'base')
 def test_thirst_drains(self):self.quiet();before=self.s['thirst'];self.action(type='tick',player=self.s['player'],dt=.5,active=True);self.assertLess(self.s['thirst'],before)
 def test_water_restores_thirst(self):self.s['thirst']=30;self.s['bag']['water']=1;self.action(type='use',kind='water');self.assertGreater(self.s['thirst'],74);self.assertEqual(self.s['bag']['water'],0)
 def test_empty_drink_refused(self):self.s['bag']['water']=0;self.s['thirst']=10;self.action(type='use',kind='water');self.assertEqual(self.s['thirst'],10)
 def test_weather_override(self):self.action(type='weather',mode='storm');self.assertEqual(self.s['weather']['mode'],'storm')
 def test_weather_automatic(self):self.s['weather']['nextAt']=0;self.action(type='tick',player=self.s['player'],dt=.5,active=True);self.assertEqual(self.s['weather']['mode'],'rain')
 def test_stash_conservation(self):self.at(-514,35);n=self.s['bag']['ammo'];self.action(type='stash_put',kind='ammo',count=10);self.assertEqual(self.s['bag']['ammo']+self.s['stash']['ammo'],n);self.action(type='stash_take',kind='ammo',count=10);self.assertEqual(self.s['bag']['ammo'],n)
 def test_stash_remote_refused(self):self.action(type='stash_put',kind='ammo',count=10);self.assertEqual(self.s['stash']['ammo'],0)
 def test_stash_no_mission(self):self.at(-514,35);self.s['bag']['recorder']=1;self.action(type='stash_put',kind='recorder',count=1);self.assertEqual(self.s['bag']['recorder'],1)
 def test_mag_storage_rounds(self):self.at(-514,35);self.action(type='stash_mag',id='m1');self.assertEqual(self.s['storedMagazines'][0]['rounds'],8);self.assertEqual(len(self.s['magazines']),0);E.validate_save(self.s);self.action(type='unstash_mag',id='m1');self.assertEqual(self.s['magazines'][0]['rounds'],8)
 def test_carbine_family(self):E.add_item(self.s,'carbine',1);E.add_item(self.s,'carbine_mag',1);self.action(type='weapon_select',weapon='carbine');self.action(type='insert');self.assertEqual(E.mag(self.s)['family'],'carbine');self.assertEqual(self.s['activeWeapon'],'carbine')
 def test_carbine_capacity(self):E.add_item(self.s,'carbine',1);E.add_item(self.s,'carbine_mag',1);mid=self.s['magazines'][-1]['id'];self.action(type='fill',id=mid);self.assertEqual(self.s['magazines'][-1]['rounds'],12);E.validate_save(self.s)
 def test_weapon_store_loaded_refused(self):self.at(-514,35);self.s['weapons']['pm']['owned']=True;self.s['weapon']['chamber']=1;self.action(type='stash_weapon',weapon='pm');self.assertTrue(self.s['weapons']['pm']['owned'])
 def test_weapon_storage(self):self.at(-514,35);self.s['weapons']['pm']['owned']=True;self.action(type='stash_weapon',weapon='pm');self.assertFalse(self.s['weapons']['pm']['owned']);self.action(type='unstash_weapon',weapon='pm');self.assertTrue(self.s['weapons']['pm']['owned'])
 def test_market_no_arbitrage(self):self.at(-510,11);self.s['credits']=1000;self.action(type='buy',kind='tuna');self.action(type='sell',kind='tuna');self.assertLess(self.s['credits'],1000)
 def test_daily_demand(self):self.assertEqual(E.market(self.s)['kind'],'tuna') # 15:00 day zero actually tuna
 def test_buy_room_fitting(self):self.at(-510,11);self.s['credits']=1000;self.action(type='buy',kind='poster_orbit');self.assertIn('poster_orbit',self.s['roomOwned']);before=self.s['credits'];self.action(type='buy',kind='poster_orbit');self.assertEqual(before,self.s['credits'])
 def test_decor_requires_owned(self):self.at(-514,38);self.action(type='decorate',slot='wallA',kind='poster_orbit');self.assertEqual(self.s['decor']['wallA'],'none')
 def test_decor_persists(self):self.at(-514,38);self.s['roomOwned']=['poster_orbit'];self.action(type='decorate',slot='wallA',kind='poster_orbit');self.assertEqual(E.validate_save(self.s)['decor']['wallA'],'poster_orbit')
 def test_meal_cost_and_effect(self):self.at(-512,25);self.s['food']=30;before=self.s['credits'];self.action(type='meal');self.assertGreater(self.s['food'],79);self.assertEqual(self.s['credits'],before-25)
 def test_scan_requires_detector(self):self.at(-11,-39);self.action(type='scan');self.assertFalse(self.s['scanned'])
 def test_scan_reveals(self):self.at(-11,-39);self.s['bag']['detector']=1;self.action(type='scan');self.assertIn('artefact_glass',self.s['scanned'])
 def test_unscanned_loot_refused(self):it=self.s['loose']['artefact_glass'];self.at(it['x'],it['z']);self.action(type='pickup',id='artefact_glass');self.assertNotIn('artefact_glass',self.s['taken'])
 def test_upstairs_container_rejects_ground(self):c=E.CONTAINERS['lodge_chest'];self.at(c['x'],c['z']);self.action(type='search',id=c['id']);self.assertNotIn(c['id'],self.s['containers'])
 def test_upstairs_chest_has_carbine(self):c=E.CONTAINERS['lodge_chest'];self.at(c['x'],c['z'],3.2);self.quiet();self.action(type='search',id=c['id']);self.assertGreater(self.s['containers'][c['id']]['items']['carbine'],0)
 def test_cave_chest_floor(self):c=E.CONTAINERS['cave_crate'];self.at(c['x'],c['z'],-5);self.quiet();self.action(type='search',id=c['id']);self.assertEqual(self.s['containers'][c['id']]['items']['cave_log'],1)
 def test_jump_cost(self):v=self.s['stamina'];self.action(type='jump');self.assertGreater(self.s['stats']['jumps'],0);self.assertLess(self.s['stamina'],v)
 def test_jump_cooldown(self):self.action(type='jump');n=self.s['stats']['jumps'];self.action(type='jump');self.assertEqual(self.s['stats']['jumps'],n)
 def test_terrain_height(self):self.assertGreater(E.terrain_height(-150,-320),8);self.assertAlmostEqual(E.terrain_height(14,-31.5),0)
 def test_stairs(self):b=next(b for b in E.BUILDINGS if b['id']=='lodge');x=b['x']+b['w']/2-1.5;self.assertAlmostEqual(E.surface_height(x,b['z']-b['d']/2+1),3.2)
 def test_skitter_commits_then_misses(self):
  self.at(-100,-310,E.terrain_height(-100,-310));self.quiet();e=next(e for e in self.s['enemies']if e['kind']=='skitter');e.update(health=36,x=-100,z=-315,home=[-100,-315],zone='field');E.advance(self.s,.1);self.assertEqual(e['mode'],'windup');target=e['leapTo'][:];self.s['player']['x']=-97;E.advance(self.s,.7);E.advance(self.s,.95);self.assertEqual(e['leapTo'],target);self.assertEqual(self.s['health'],100);self.assertEqual(e['mode'],'recover')
 def test_skitter_hit_damage(self):
  self.at(-100,-310,E.terrain_height(-100,-310));self.quiet();e=next(e for e in self.s['enemies']if e['kind']=='skitter');e.update(health=36,x=-100,z=-315,home=[-100,-315],zone='field');E.advance(self.s,.1);E.advance(self.s,.7);E.advance(self.s,.95);self.assertLess(self.s['health'],100);self.assertGreater(self.s['health'],0)
 def test_death_returns_room(self):self.at(14,-30);self.s['health']=0;E.die(self.s);self.assertEqual(self.s['zone'],'base');self.assertEqual(self.s['player']['x'],-510);E.validate_save(self.s)
 def test_rules_stay_independent(self):profiles=copy.deepcopy(self.s['rules']);profiles['chest']['carbine']['chance']=100;self.action(type='rules',profiles=profiles);self.assertEqual(self.s['rules']['chest']['carbine']['chance'],100)
 def test_no_nan_height(self):q=copy.deepcopy(self.s['player']);q['y']=float('nan');self.action(type='tick',player=q,dt=.1,active=True);self.assertTrue(math.isfinite(self.s['player']['y']))
if __name__=='__main__':unittest.main(verbosity=2)
