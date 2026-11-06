import unittest,json,struct,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Overgrowth(unittest.TestCase):
 def setUp(self):self.models=json.loads((ROOT/'assets/v11/models.json').read_text())
 def test_all_new_models_have_source_and_licence(self):
  for m in self.models:self.assertTrue(m['source'].startswith('https://'));self.assertIn(m['licence'],['CC0-1.0','CC-BY-4.0','MIT']);self.assertTrue(m['authors'])
 def test_only_selected_sources_in_runtime(self):
  paths=json.loads((ROOT/'precache.json').read_text());self.assertFalse(any(('preview' in p and p not in ('layout-preview.js','editor/preview-launcher.js')) or 'buildonly' in p or 'map-source' in p for p in paths));self.assertFalse(any(p.endswith('.glb') and 'fir_tree_01.glb' in p for p in paths))
 def test_all_selected_models_valid(self):
  for m in self.models:
   raw=(ROOT/m['path']).read_bytes();magic,v,n=struct.unpack_from('<III',raw);self.assertEqual(magic,0x46546c67);self.assertEqual(v,2);self.assertEqual(n,len(raw))
 def test_model_ids_unique(self):self.assertEqual(len(self.models),len({x['id']for x in self.models}))
 def test_pine_variants_are_real_meshes(self):
  for m in self.models:
   if not m['id'].startswith('pine_'):continue
   raw=(ROOT/m['path']).read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);tris=sum(j['accessors'][p['indices']]['count']//3 for mesh in j['meshes']for p in mesh['primitives']);self.assertGreater(tris,5000);self.assertLess(tris,12000)
 def test_five_material_sets_have_three_maps(self):
  rows=json.loads((ROOT/'assets/v11/surfaces.json').read_text());self.assertEqual(len(rows),5)
  for r in rows:
   self.assertEqual(set(r['files']),{'colour','normal','rough'})
   for p in r['files'].values():self.assertTrue((ROOT/p).is_file())
 def test_render_detail_does_not_change_rules(self):
  import engine as E
  s=E.new_game();self.assertEqual(s['version'],9);self.assertEqual(len(E.DATA['missions']),15);self.assertEqual(len(E.DATA['vehicles']),8)
 def test_save_key_remains_compatible(self):self.assertIn(":'field-signal-dead-air-v9'",(ROOT/'app.js').read_text());self.assertIn("field-signal-editor-game:",(ROOT/'app.js').read_text())
 def test_refuge_music_still_present(self):self.assertIn('Relay Lanterns',(ROOT/'release.json').read_text());self.assertTrue((ROOT/'audio-bank.json').is_file())
 def test_new_model_manifest_is_cached(self):self.assertIn('assets/v11/models.json',json.loads((ROOT/'precache.json').read_text()))
if __name__=='__main__':unittest.main()
