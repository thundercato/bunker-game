"""Bounded candidate save repair preserves progress and supported floor identity."""
import copy
import importlib.util
import json
import math
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('clearance_audit',ROOT/'tools/audit_world.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)


class CampaignSaveClearance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world=audit.runtime_source(ROOT/'site')
        cls.engine=audit.load_engine(ROOT/'site',cls.world)
        cls.baseline=audit.load_engine(ROOT/'site',json.loads((ROOT/'site/world.json').read_text()))

    def saved(self,x,z,y=0):
        s=self.engine['new_game']();s['zone']='field'
        s['player'].update(x=x,z=z,y=y,yaw=.73,pitch=-.18)
        s['credits']=937;s['health']=67.5;s['food']=42.;s['thirst']=53.
        s['bag']['med']+=2
        return s

    def check_repair(self,s):
        e=self.engine;before=copy.deepcopy(s);p=before['player'];scene=e['_CAMPAIGN'].scene_at(p['x'],p['z'],0)
        self.assertTrue(e['_CAMPAIGN'].blocked(p['x'],p['z'],p['y'],s['doors']))
        out=e['validate_save'](s);q=out['player']
        self.assertGreater(math.hypot(q['x']-p['x'],q['z']-p['z']),0)
        self.assertLessEqual(math.hypot(q['x']-p['x'],q['z']-p['z']),4.)
        self.assertEqual(out['zone'],before['zone']);self.assertEqual(q['y'],p['y'])
        self.assertEqual(q['yaw'],p['yaw']);self.assertEqual(q['pitch'],p['pitch'])
        self.assertTrue(e['walkable'](out,q['x'],q['z'],.29),'Repaired pose also clears the client body radius')
        self.assertIs(e['_CAMPAIGN'].scene_at(q['x'],q['z'],0),scene)
        self.assertEqual({k:v for k,v in out.items()if k not in['player','events']},
                         {k:v for k,v in before.items()if k not in['player','events']})
        self.assertTrue(any(event.get('id')=='candidate-player-clearance'for event in out['events']))
        self.assertEqual(s,before,'Repair must preserve the original imported snapshot')
        return out

    def test_old_ground_cupboard_position_moves_to_nearest_clear_same_house_pose(self):
        s=self.saved(-34.55,-57.95);out=self.check_repair(s)
        again=self.engine['validate_save'](copy.deepcopy(s))
        self.assertEqual(out['player'],again['player'],'The bounded search is deterministic')

    def test_old_upstairs_bed_position_stays_on_upper_floor(self):
        out=self.check_repair(self.saved(-32.8,-59.9,3.2))
        self.assertEqual(out['player']['y'],3.2)

    def test_changed_base_cupboard_keeps_the_player_in_the_base(self):
        c=next(c for c in self.world['containers']if c['zone']=='base'and c.get('searchDimensions')and not c.get('searchMount'))
        s=self.saved(c['x'],c['z'],c.get('floor',0));s['zone']='base'
        self.assertEqual(self.check_repair(s)['zone'],'base')

    def test_valid_saved_pose_is_preserved_exactly(self):
        e=self.engine;s=e['new_game']();before=copy.deepcopy(s)
        self.assertFalse(e['_CAMPAIGN'].blocked(s['player']['x'],s['player']['z'],s['player']['y'],s['doors']))
        out=e['validate_save'](s)
        self.assertEqual(out['player'],before['player'])
        self.assertFalse(any(event.get('id')=='candidate-player-clearance'for event in out['events']))
        self.assertEqual(s,before)

    def test_every_canonical_crane_endpoint_is_preserved(self):
        e=self.engine
        for route in self.world['campaignGeometry']['climbs']:
            for pose in [route['from'],route['to']]:
                with self.subTest(route=route['id'],pose=pose):
                    s=self.saved(pose['x'],pose['z'],pose['y']);s['player'].update(pose)
                    self.assertEqual(e['validate_save'](s)['player'],s['player'])

    def test_repaired_pose_round_trips_without_another_adjustment(self):
        first=self.check_repair(self.saved(-32.8,-59.9,3.2))
        second=self.engine['validate_save'](json.loads(json.dumps(first)))
        self.assertEqual(second['player'],first['player'])
        self.assertFalse(any(event.get('id')=='candidate-player-clearance'for event in second['events']))

    def test_no_clear_same_floor_pose_rejects_without_mutating_snapshot(self):
        e=self.engine;s=self.saved(-32.8,-59.9,3.2);before=copy.deepcopy(s)
        collision=e['_CAMPAIGN'].blocked
        try:
            # A lower storey is clear, but must never become a fallback landing.
            e['_CAMPAIGN'].blocked=lambda x,z,y,*args,**kwargs:y>2
            with self.assertRaisesRegex(ValueError,'No clear position within four metres'):
                e['validate_save'](s)
        finally:e['_CAMPAIGN'].blocked=collision
        self.assertEqual(s,before)

    def test_normal_campaign_has_no_candidate_relocation(self):
        e=self.baseline;s=e['new_game']();s['zone']='field';s['player'].update(x=-32.8,z=-59.9,y=3.2)
        self.assertEqual(e['validate_save'](s)['player'],s['player'])


if __name__=='__main__':unittest.main()
