import unittest,json,copy,sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import engine as E
R=Path(__file__).resolve().parents[1]
class Stillwater(unittest.TestCase):
 def test_no_collinear_wall_overlap(self):
  walls=E.DATA['interiorWalls']['base']
  for i,(x,z,w,d)in enumerate(walls):
   for xx,zz,ww,dd in walls[i+1:]:
    if w<.5 and ww<.5 and abs(x-xx)<1e-6:self.assertLessEqual(min(z+d/2,zz+dd/2)-max(z-d/2,zz-dd/2),1e-5)
    if d<.5 and dd<.5 and abs(z-zz)<1e-6:self.assertLessEqual(min(x+w/2,xx+ww/2)-max(x-w/2,xx-ww/2),1e-5)
 def test_road_surface_types_do_not_overlap(self):self.assertEqual(E.DATA['roadsUnified']['overlapArea'],0)
 def test_road_polygons_have_closed_finite_rings(self):
  for name in ['asphalt','dirt']:
   for polygon in E.DATA['roadsUnified'][name]:
    for ring in [polygon['outer']]+polygon['holes']:
     self.assertEqual(ring[0],ring[-1]);self.assertTrue(all(math.isfinite(v)for xy in ring for v in xy))
 def test_campaign_still_uses_compatible_schema(self):
  s=E.new_game();self.assertEqual(s['version'],6);self.assertEqual(s['app'],'FieldSignalBelowPines');E.validate_save(s)
 def test_existing_contracts_not_lost(self):
  s=E.new_game();s['missions']['signal']='done';s['credits']=1700
  q=E.validate_save(E.migrate_refit_save(json.loads(json.dumps(s))))
  self.assertEqual(q['credits'],1700);self.assertEqual(q['missions']['signal'],'done')
 def test_no_build_time_browser_in_release(self):
  self.assertFalse((R/'webkit-libs').exists());self.assertFalse((R/'pw-browsers').exists())
 def test_controller_clinic_does_not_load_game(self):
  s=(R/'controller.html').read_text();self.assertNotIn('src="app.js"',s);self.assertIn('controller-core.js',s)
 def test_launcher_loads_game_only_after_start(self):
  s=(R/'index.html').read_text();self.assertNotIn('src="app.js"',s);self.assertIn('launch.js',s)
if __name__=='__main__':unittest.main()
