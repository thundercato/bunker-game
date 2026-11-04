import unittest,copy,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import engine as E
class RegressionV9(unittest.TestCase):
 def setUp(self):self.s=E.new_game()
 def at(self,x,z):self.s['player'].update(x=x,z=z,y=E.surface_height(x,z),yaw=0,pitch=0);self.s['zone']=E.zone_at(x,z)
 def do(self,**a):self.s=E.dispatch(self.s,a);return self.s
 def test_ammunition_stash_conserves_total(self):
  self.at(-514,35);n=self.s['bag']['ammo'];self.do(type='stash_put',kind='ammo',count=10);self.assertEqual(self.s['bag']['ammo']+self.s['stash']['ammo'],n);self.do(type='stash_take',kind='ammo',count=10);self.assertEqual(self.s['bag']['ammo'],n)
 def test_remote_stash_refused(self):
  self.at(0,-20);self.do(type='stash_put',kind='ammo',count=1);self.assertEqual(self.s['stash']['ammo'],0)
 def test_mission_item_not_storable(self):
  self.at(-514,35);self.s['bag']['recorder']=1;self.do(type='stash_put',kind='recorder',count=1);self.assertEqual(self.s['bag']['recorder'],1)
 def test_loaded_magazine_storage_keeps_rounds(self):
  self.at(-514,35);self.do(type='stash_mag',id='m1');self.assertEqual(self.s['storedMagazines'][0]['rounds'],8);self.do(type='unstash_mag',id='m1');self.assertEqual(self.s['magazines'][0]['rounds'],8)
 def test_buy_sell_has_no_profit_loop(self):
  self.at(-510,9);self.s['credits']=1000;self.do(type='buy',kind='tuna');self.do(type='sell',kind='tuna');self.assertLess(self.s['credits'],1000)
 def test_eating_costs_money_and_restores_hunger(self):
  self.at(-512,24);self.s['food']=30;c=self.s['credits'];self.do(type='meal');self.assertGreater(self.s['food'],79);self.assertEqual(c-self.s['credits'],25)
 def test_drinking_consumes_water(self):
  self.s['thirst']=30;self.s['bag']['water']=1;self.do(type='use',kind='water');self.assertGreater(self.s['thirst'],70);self.assertEqual(self.s['bag']['water'],0)
 def test_poster_requires_purchase(self):
  self.at(-514,38);self.do(type='decorate',slot='wallA',kind='poster_orbit');self.assertEqual(self.s['decor']['wallA'],'none')
 def test_poster_save_roundtrip(self):
  self.at(-514,38);self.s['roomOwned']=['poster_orbit'];self.do(type='decorate',slot='wallA',kind='poster_orbit');self.assertEqual(E.validate_save(json.loads(json.dumps(self.s)))['decor']['wallA'],'poster_orbit')
 def test_chest_does_not_reroll(self):
  c=E.CONTAINERS['base_locker'];self.at(c['x'],c['z']-1);self.do(type='search',id=c['id']);contents=copy.deepcopy(self.s['containers'][c['id']]);self.do(type='search',id=c['id']);self.assertEqual(self.s['containers'][c['id']],contents)
 def test_essential_supply_locker_has_detector(self):
  self.at(-487.8,29.2);self.do(type='search',id='base_locker');self.assertGreaterEqual(self.s['containers']['base_locker']['items']['detector'],1)
 def test_higher_floor_container_unreachable_from_ground(self):
  c=E.CONTAINERS['lodge_chest'];self.at(c['x'],c['z']);self.s['player']['y']=0;self.do(type='search',id=c['id']);self.assertNotIn(c['id'],self.s['containers'])
 def test_weapon_safety_blocks_firing(self):
  self.s['weapon'].update(owned=True,safe=True,chamber=1);before=self.s['stats']['shots'];self.do(type='fire');self.assertEqual(self.s['stats']['shots'],before);self.assertEqual(self.s['weapon']['chamber'],1)
 def test_unloaded_weapon_cannot_fire(self):
  self.s['weapon'].update(owned=True,safe=False,chamber=0);self.do(type='fire');self.assertEqual(self.s['stats']['shots'],0)
 def test_cleaning_refused_away_from_bench(self):
  self.s['weapon'].update(owned=True,condition=30);self.at(0,-20);self.do(type='clean');self.assertEqual(self.s['weapon']['condition'],30)
 def test_cleaning_costs_exactly_two_credits(self):
  self.at(-486,27);self.s['weapon'].update(owned=True,condition=30);c=self.s['credits'];self.do(type='clean');self.assertEqual(self.s['weapon']['condition'],31);self.assertEqual(self.s['credits'],c-2)
 def test_doors_have_same_keys_after_migration(self):
  old=json.loads((Path(__file__).with_name('fixtures')/'v8-campaign.json').read_text());q=E.validate_save(E.migrate_dead_air(old));self.assertEqual(set(q['doors']),set(E.DOORS))
 def test_all_missions_have_target_and_owner(self):
  for m in E.DATA['missions']:self.assertIn(m['source'],E.DATA['missionSources']);self.assertIn(m['item'],E.CAT);self.assertTrue(m['target'])
 def test_all_mission_photographs_present(self):
  R=Path(__file__).resolve().parents[1];photos=json.loads((R/'assets/v9/briefings.json').read_text())
  for m in E.DATA['missions']:self.assertIn(m['id'],photos);self.assertTrue((R/photos[m['id']]).is_file())
 def test_recovery_key_explicitly_different(self):self.assertEqual(E.new_game()['app'],'FieldSignalDeadAir');self.assertEqual(E.VERSION,9)
 def test_v5_save_cannot_be_silently_upgraded(self):
  old=copy.deepcopy(self.s);old.update(app='FieldSignalColdCoast',version=5)
  with self.assertRaises(ValueError):E.migrate_dead_air(old)
 def test_calm_track_in_runtime_bank(self):
  R=Path(__file__).resolve().parents[1];bank=json.loads((R/'audio-bank.json').read_text());self.assertTrue(len(bank['base'])>100000);self.assertIn('radio_third',bank)
if __name__=='__main__':unittest.main()
