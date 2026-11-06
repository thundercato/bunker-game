"""Committed paint polygons follow the same candidate centre lines and terrain."""
import copy
import hashlib
import importlib.util
import json
import math
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);loaded=importlib.util.module_from_spec(spec);spec.loader.exec_module(loaded);return loaded
compiler=module('surface_compiler',ROOT/'tools/compile_campaign_road_surfaces.py')
audit=module('surface_audit',ROOT/'tools/audit_world.py')
try:
    from shapely.geometry import LineString,Polygon,box
    from shapely.ops import unary_union
    HAS_SHAPELY=True
except ImportError:HAS_SHAPELY=False


class CommittedRoadSurfaces(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=json.loads((ROOT/'site/world.json').read_text())
        cls.routes=json.loads((ROOT/'site/campaign-routes.json').read_text())

    def test_fingerprints_tie_polygons_to_generator_routes_and_building_footprints(self):
        meta=self.routes['surfaceCompilation']
        self.assertEqual(meta['generatorSha256'],hashlib.sha256((ROOT/meta['generator']).read_bytes()).hexdigest())
        self.assertEqual(meta['inputsSha256'],compiler.input_fingerprint(self.source,self.routes))
        self.assertEqual(meta['surfacesSha256'],compiler.content_hash(self.routes['surfaces']))
        changed=copy.deepcopy(self.routes);changed['roads'][0][1][0]+=.1
        self.assertNotEqual(meta['inputsSha256'],compiler.input_fingerprint(self.source,changed))
        source=copy.deepcopy(self.source);source['buildings'][0]['w']+=.1
        self.assertNotEqual(meta['inputsSha256'],compiler.input_fingerprint(source,self.routes))
        source=copy.deepcopy(self.source);source['roads'][0][1][0]+=.1
        self.assertNotEqual(meta['inputsSha256'],compiler.input_fingerprint(source,self.routes))
        polygons=copy.deepcopy(self.routes['surfaces']);polygons['asphalt'][0]['outer'][0][0]+=.1
        self.assertNotEqual(meta['surfacesSha256'],compiler.content_hash(polygons))

    def test_every_polygon_vertex_and_edge_is_supported_by_actual_land_terrain(self):
        world=audit.runtime_source(ROOT/'site');engine=audit.load_engine(ROOT/'site',world)
        river=world['river'];points=set()
        for material in ['asphalt','dirt']:
            for row in self.routes['surfaces'][material]:
                for ring in [row['outer'],*row['holes']]:
                    self.assertEqual(ring[0],ring[-1])
                    for a,b in zip(ring,ring[1:]):
                        steps=max(1,math.ceil(math.dist(a,b)/2))
                        for i in range(steps+1):points.add((a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps))
        land_count=0;bridge_count=0
        for x,z in points:
            if river['west']<=x<=river['east']and any(abs(z-b['z'])<=b['halfWidth']for b in river['bridges']):
                self.assertGreater(engine['surface_height'](x,z,0),.1,'River paint is covered by its authored bridge deck')
                bridge_count+=1;continue
            land_count+=1
            self.assertLess(abs(engine['terrain_height'](x,z)),.00001,f'Painted road is unsupported at {(x,z)}')
        self.assertGreater(land_count,1000);self.assertGreater(bridge_count,20)


@unittest.skipUnless(HAS_SHAPELY,'Developer-only Shapely unavailable; committed-data/terrain tests still run')
class RoadSurfaceUnion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=json.loads((ROOT/'site/world.json').read_text())
        cls.routes=json.loads((ROOT/'site/campaign-routes.json').read_text())

    def polygons(self,key):return [Polygon(p['outer'],p['holes'])for p in self.routes['surfaces'][key]]

    def test_regeneration_is_exact_and_all_emitted_polygons_are_valid(self):
        self.assertEqual(compiler.compile_surfaces(self.source,self.routes),self.routes)
        for key in ['asphalt','dirt']:
            for polygon in self.polygons(key):self.assertTrue(polygon.is_valid);self.assertGreater(polygon.area,0)

    def test_check_command_rejects_stale_road_and_paint_data(self):
        for kind in ['route','paint']:
            stale=copy.deepcopy(self.routes)
            if kind=='route':stale['roads'][0][1][0]+=.1
            else:stale['surfaces']['asphalt'][0]['outer'][0][0]+=.1
            with tempfile.TemporaryDirectory()as folder:
                path=Path(folder)/'routes.json';path.write_text(json.dumps(stale))
                with self.assertRaisesRegex(ValueError,'Stale candidate road surfaces'):
                    compiler.main(['--routes',str(path),'--source',str(ROOT/'site/world.json'),'--check'])

    def test_material_union_matches_true_runtime_widths_without_overlap(self):
        painted=unary_union(self.polygons('asphalt')+self.polygons('dirt'))
        buffered=unary_union([LineString(line).buffer((5.4 if i in[1,2,3]else 3.5)/2,
                    cap_style='flat',join_style='round',quad_segs=4)for i,line in enumerate(self.routes['roads'])])
        self.assertLess(painted.symmetric_difference(buffered).area,.01)
        self.assertLess(unary_union(self.polygons('asphalt')).intersection(unary_union(self.polygons('dirt'))).area,.000001)

    def test_painted_geometry_never_intersects_a_building_footprint(self):
        painted=unary_union(self.polygons('asphalt')+self.polygons('dirt'))
        for b in self.source['buildings']:
            rect=box(b['x']-b['w']/2,b['z']-b['d']/2,b['x']+b['w']/2,b['z']+b['d']/2)
            self.assertLess(painted.intersection(rect).area,.000001,b['id'])

    def test_loop_routes_keep_real_holes_and_bad_routes_are_rejected(self):
        source={'roads':[[]],'buildings':[]}
        routes={'format':'field-signal-campaign-routes/1','roads':[[[0,0],[10,0],[10,10],[0,10],[0,0]]]}
        result=compiler.compile_surfaces(source,routes)
        self.assertTrue(result['surfaces']['dirt'][0]['holes'])
        self.assertTrue(Polygon(result['surfaces']['dirt'][0]['outer'],result['surfaces']['dirt'][0]['holes']).is_valid)
        source['buildings']=[{'id':'blocked','x':5,'z':0,'w':2,'d':2}]
        with self.assertRaisesRegex(ValueError,'overlaps building blocked'):compiler.compile_surfaces(source,routes)


if __name__=='__main__':unittest.main()
