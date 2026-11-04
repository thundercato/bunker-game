import unittest,json,copy,sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import engine as E
class Refit(unittest.TestCase):
 def test_every_base_door_has_connected_land(self):
  for room in E.DATA['rooms']:
   wall=-500+room['side']*3
   for n in range(-55,56):
    self.assertTrue(E.land(wall+n/100,room['doorZ']),room['id'])
 def test_door_bridge_does_not_open_sealed_walls(self):
  self.assertFalse(E.land(-503.1,18))
 def test_v6_migration_keeps_values(self):
  s=E.new_game();s['doors'].pop('barracks');s['credits']=1234;s['bag']['ammo']=53
  q=E.validate_save(E.migrate_refit_save(s))
  self.assertEqual(q['credits'],1234);self.assertEqual(q['bag']['ammo'],53);self.assertFalse(q['doors']['barracks'])
 def test_migration_does_not_mutate_original(self):
  s=E.new_game();s['doors'].pop('barracks');E.migrate_refit_save(s);self.assertNotIn('barracks',s['doors'])
 def test_camp_loot_exists(self):
  self.assertEqual(len([c for c in E.DATA['containers'] if c['id'].startswith('camp_')]),3)
 def test_barracks_loot_exists(self):
  self.assertEqual(len([c for c in E.DATA['containers'] if c['id'].startswith('barracks_')]),3)
 def test_camp_floor_is_flat(self):
  for x,z in [(-147,-263),(-138,-264),(-150,-253)]:self.assertAlmostEqual(E.terrain_height(x,z),0)
 def test_new_guaranteed_supplies(self):
  s=E.new_game();s['player']={'x':-147,'z':-261,'y':0,'yaw':0,'pitch':0};s['zone']='field'
  for e in s['enemies']:e['health']=0
  s=E.dispatch(s,{'type':'search','id':'camp_c0'})
  self.assertGreaterEqual(s['containers']['camp_c0']['items']['water'],1)
 def test_new_save_roundtrip(self):
  s=E.new_game();self.assertEqual(E.validate_save(json.loads(json.dumps(s)))['bag'],s['bag'])
 def test_v5_not_silently_migrated(self):
  s=E.new_game();s['app']='FieldSignalColdCoast';s['version']=5
  with self.assertRaises(ValueError):E.migrate_refit_save(s)
if __name__=='__main__':unittest.main()
