import unittest,json,struct,sys,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));import engine as E
class Fieldcraft(unittest.TestCase):
 def test_save_schema_still_compatible(self):self.assertEqual(E.VERSION,9);self.assertEqual(E.APP,'FieldSignalDeadAir')
 def test_all_catalogue_items_have_models(self):
  v=json.loads((ROOT/'assets/v10/item-visuals.json').read_text());self.assertEqual(set(v),set(E.CAT));self.assertEqual(len(v),61)
 def test_all_catalogue_items_have_rendered_images(self):
  thumbs=json.loads((ROOT/'assets/v10/thumbnails/manifest.json').read_text());self.assertEqual(set(thumbs),set(E.CAT))
  for key,p in thumbs.items():self.assertGreater((ROOT/p).stat().st_size,100,key)
 def test_previews_are_not_one_placeholder(self):
  paths=json.loads((ROOT/'assets/v10/thumbnails/manifest.json').read_text());hashes={hashlib.sha256((ROOT/p).read_bytes()).hexdigest()for p in paths.values()};self.assertGreater(len(hashes),40)
 def test_downloaded_models_are_self_contained_glb(self):
  rows=json.loads((ROOT/'assets/v10/model-manifest.json').read_text());self.assertEqual(len(rows),25)
  for row in rows:
   data=(ROOT/row['path']).read_bytes();magic,version,size=struct.unpack('<III',data[:12]);self.assertEqual(magic,0x46546c67);self.assertEqual(version,2);self.assertEqual(size,len(data))
 def test_credits_exist_for_each_new_asset(self):
  for row in json.loads((ROOT/'assets/v10/model-manifest.json').read_text()):self.assertEqual(row['licence'],'CC0-1.0');self.assertTrue(row['authors']);self.assertTrue(row['source'].startswith('https://polyhaven.com/a/'))
 def test_offline_manifest_contains_all_new_runtime_assets(self):
  paths=set(json.loads((ROOT/'precache.json').read_text()))
  for name in ['atlas.js','atlas-core.js','item-studio.js','item-models.js','world-v10.js','fieldcraft.css']:self.assertIn(name,paths)
  for p in (ROOT/'assets/v10').rglob('*'):
   if p.is_file():self.assertIn(str(p.relative_to(ROOT)),paths)
 def test_no_raw_font_files_shipped(self):
  self.assertFalse(any(p.suffix.lower()in['.ttf','.otf','.woff','.woff2']for p in ROOT.rglob('*')))
 def test_existing_progress_roundtrips(self):
  s=E.new_game();s['credits']=1537;s['missions']['signal']='done';q=E.validate_save(E.migrate_dead_air(json.loads(json.dumps(s))));self.assertEqual(q['credits'],1537);self.assertEqual(q['missions']['signal'],'done')
 def test_build_version_is_eleven_but_save_is_nine(self):
  release=json.loads((ROOT/'release.json').read_text());self.assertEqual(release['version'].split('.')[0],'11');self.assertEqual(release['saveSchema'],9)
if __name__=='__main__':unittest.main()
