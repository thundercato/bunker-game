"""World reference/safety checks and binary accounting without a renderer."""
import copy
import importlib.util
import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('world_audit', ROOT / 'tools/audit_world.py')
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


def make_glb(doc):
    raw = json.dumps(doc).encode()
    raw += b' ' * (-len(raw) % 4)
    return struct.pack('<III', 0x46546C67, 2, len(raw) + 20) + struct.pack('<II', len(raw), 0x4E4F534A) + raw


class BinaryMetrics(unittest.TestCase):
    def test_indexed_mesh_counts_triangles_and_deduplicates_interleaved_views(self):
        raw = make_glb({
            'accessors': [
                {'count': 4, 'componentType': 5126, 'type': 'VEC3', 'bufferView': 0},
                {'count': 4, 'componentType': 5126, 'type': 'VEC3', 'bufferView': 0},
                {'count': 6, 'componentType': 5123, 'type': 'SCALAR', 'bufferView': 1}],
            'bufferViews': [{'byteLength': 96}, {'byteLength': 12}, {'byteLength': 1000}],
            'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1}, 'indices': 2}]}],
            'materials': [{}, {}], 'nodes': [{'mesh': 0}, {'mesh': 0}], 'images': [{'bufferView': 2}],
        })
        metrics = AUDIT.glb_metrics(raw)
        self.assertEqual(metrics['triangles'], 2)
        self.assertEqual(metrics['meshInstances'], 2)
        self.assertEqual(metrics['geometryBufferBytes'], 108)
        self.assertEqual(metrics['decodedAccessorBytes'], 108)
        self.assertEqual(metrics['materials'], 2)

    def test_nonindexed_strip_and_line_primitives(self):
        metrics = AUDIT.glb_metrics(make_glb({
            'accessors': [{'count': 6, 'componentType': 5126, 'type': 'VEC3', 'bufferView': 0}],
            'bufferViews': [{'byteLength': 72}],
            'meshes': [{'primitives': [{'attributes': {'POSITION': 0}},
                                        {'attributes': {'POSITION': 0}, 'mode': 5},
                                        {'attributes': {'POSITION': 0}, 'mode': 1}]}],
        }))
        self.assertEqual(metrics['triangles'], 6)
        self.assertEqual(metrics['nonTrianglePrimitives'], 1)
        self.assertEqual(metrics['geometryBufferBytes'], 72)

    def test_invalid_binary_length_is_rejected(self):
        raw = make_glb({'meshes': []})
        with self.assertRaisesRegex(ValueError, 'length'):
            AUDIT.glb_metrics(raw[:-1])


class FootprintGeometry(unittest.TestCase):
    def test_crossing_edge_touch_and_endpoint_are_distinguished(self):
        building = {'x': 0, 'z': 0, 'w': 10, 'd': 8}
        self.assertEqual(AUDIT.footprint_interval((-10, 0), (10, 0), building), (.25, .75))
        self.assertIsNone(AUDIT.footprint_interval((-10, 4), (10, 4), building))
        self.assertEqual(AUDIT.footprint_interval((-10, 0), (0, 0), building), (.5, 1.))


class WorldReferences(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world = AUDIT.read_json(ROOT / 'site/world.json')

    def issues_after(self, mutate):
        world = copy.deepcopy(self.world)
        mutate(world)
        return AUDIT.reference_issues(world)

    def test_reviewed_source_has_valid_campaign_references(self):
        self.assertEqual(AUDIT.reference_issues(self.world), [])

    def test_missing_fixed_retrieval_guarantee_is_rejected(self):
        issues = self.issues_after(lambda w: next(c for c in w['containers'] if c['id'] == 'hut_c1')['guaranteed'].clear())
        self.assertTrue(any(i['code'] == 'mission-guarantee' and i['id'] == 'signal' for i in issues))

    def test_missing_container_and_source_are_rejected(self):
        def mutate(w):
            w['missions'][0].update(container='missing', source='missing')
        codes = {i['code'] for i in self.issues_after(mutate)}
        self.assertTrue({'mission-container', 'mission-source'} <= codes)

    def test_cyclic_prerequisites_are_rejected(self):
        issues = self.issues_after(lambda w: w['missions'][0].update(requires=['tides']))
        self.assertTrue(any(i['code'] == 'mission-cycle' for i in issues))

    def test_duplicate_stable_container_id_is_rejected(self):
        issues = self.issues_after(lambda w: w['containers'].append(copy.deepcopy(w['containers'][0])))
        self.assertTrue(any(i['code'] == 'duplicate-id' for i in issues))

    def test_unknown_profile_and_floor_outside_building_are_rejected(self):
        issues = self.issues_after(lambda w: w['containers'][0].update(profile='missing', floor=3.2))
        self.assertEqual({i['code'] for i in issues}, {'container-profile', 'container-floor'})

    def test_building_outside_field_is_rejected_without_rejecting_underground_zones(self):
        issues = self.issues_after(lambda w: w['buildings'][0].update(x=w['bounds']['maxX']))
        self.assertTrue(any(i['code'] == 'building-bounds' and i['id'] == 'hut' for i in issues))
        self.assertFalse(any(i['id'] in self.world['zones'] for i in issues))


class RealEngineAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.effective_world = AUDIT.runtime_source(ROOT / 'site')
        cls.report = AUDIT.audit(world=cls.effective_world, include_assets=False)

    def test_every_building_entrance_opens_and_blocks_when_closed(self):
        entrances = [c for c in self.report['navigation']['checks'] if c['check'].startswith('entrance-')]
        self.assertTrue(entrances)
        self.assertTrue(all(c['passed'] for c in entrances), entrances)

    def test_stair_centres_bridge_centres_and_portal_destinations_are_clear(self):
        checks = [c for c in self.report['navigation']['checks'] if c['check'] in
                  ('stair-centre', 'bridge-centre', 'portal-destination', 'compound-ingress', 'river-blocks')]
        self.assertTrue(checks)
        self.assertTrue(all(c['passed'] for c in checks), checks)

    def test_every_container_has_an_approach_accepted_by_actual_search(self):
        approaches = self.report['navigation']['containerApproaches']
        self.assertEqual(len(approaches), self.report['counts']['containers'])
        self.assertTrue(all(c['approach'] is not None for c in approaches),
                        [c['id'] for c in approaches if c['approach'] is None])

    def test_effective_world_has_no_structural_or_navigation_errors(self):
        self.assertEqual(self.report['summary']['errors'], 0, self.report['issues'])

    def test_land_rail_geometry_is_not_buried_beyond_the_old_straight_extent(self):
        grounding = self.report['navigation']['railGrounding']
        self.assertGreater(grounding['landSamples'], 100)
        self.assertEqual(grounding['samplesAboveRailGeometry'], [])

    def test_underground_markers_remain_entrances(self):
        missions = {m['id']: m for m in self.report['missions']}
        for identity in ('cave', 'shelter', 'tunnels'):
            self.assertEqual(missions[identity]['mapTargetRole'], 'entrance')
            self.assertIsNone(missions[identity]['fieldTargetDriftMetres'])

    def test_partition_origin_is_not_mistaken_for_inaccessible_container(self):
        approaches = {c['id']: c for c in self.report['navigation']['containerApproaches']}
        self.assertFalse(approaches['freight_c2']['originWalkable'])
        self.assertIsNotNone(approaches['freight_c2']['approach'])

    def test_report_serialisation_is_deterministic(self):
        self.assertEqual(AUDIT.serialise(self.report), AUDIT.serialise(AUDIT.audit(world=self.effective_world, include_assets=False)))


if __name__ == '__main__':
    unittest.main()
