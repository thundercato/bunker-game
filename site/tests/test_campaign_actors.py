"""Enemy navigation uses each actor's own floor without changing player rules."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('actor_audit',ROOT/'tools/audit_world.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)


class CampaignActorFloors(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world=audit.runtime_source(ROOT/'site')
        cls.engine=audit.load_engine(ROOT/'site',cls.world)
        cls.baseline=audit.load_engine(ROOT/'site',json.loads((ROOT/'site/world.json').read_text()))

    def state(self,player_y=3.2):
        state=self.engine['new_game']();state['zone']='field'
        state['player'].update(x=-30.,z=-59.,y=player_y)
        state['doors']={key:True for key in state['doors']}
        return state

    def test_ground_enemy_cannot_walk_through_wardrobe_when_player_is_upstairs(self):
        e=self.engine;s=self.state();actor={'x':-33.,'z':-57.95,'y':0.}
        self.assertTrue(e['walkable'](s,-34.55,-57.95),'Player-floor query is clear on the upper floor')
        self.assertFalse(e['actor_walkable'](s,actor,-34.55,-57.95),'Ground wardrobe remains solid for the enemy')
        before=copy.deepcopy(s)
        e['enemy_step'](s,actor,[-34.55,-57.95],1.,2.)
        self.assertGreater(actor['x'],-34.03,'Enemy stops before the rotated wardrobe footprint')
        self.assertEqual(actor['y'],0.)
        self.assertEqual(s,before,'A collision query must not alter the player or campaign state')

    def test_upper_actor_obeys_bed_collision_when_player_is_on_ground(self):
        e=self.engine;s=self.state(0);actor={'x':-31.3,'z':-59.9,'y':3.2}
        self.assertTrue(e['walkable'](s,-32.8,-59.9),'The ground below the upstairs bed is clear')
        self.assertFalse(e['actor_walkable'](s,actor,-32.8,-59.9),'Upstairs bed remains solid for an upstairs actor')
        self.assertTrue(e['actor_walkable'](s,{**actor,'y':0},-32.8,-59.9))

    def test_committed_skitter_leap_does_not_borrow_player_upper_floor(self):
        e=self.engine;s=self.state();skitter=next(q for q in s['enemies']if q['kind']=='skitter')
        skitter.update(x=-33.,z=-57.95,y=0.,mode='leap',leapTime=0.,
                       leapFrom=[-33.,-57.95],leapTo=[-36.,-57.95],leapHit=False)
        for other in s['enemies']:
            if other is not skitter:other['health']=0
        pose=copy.deepcopy(s['player'])
        e['advance'](s,.8)
        self.assertGreater(skitter['x'],-34.09,'Leap stops at the ground wardrobe using its existing radius')
        self.assertEqual(skitter['mode'],'recover')
        self.assertAlmostEqual(skitter['y'],0.)
        self.assertEqual(s['player'],pose)

    def test_actor_queries_preserve_player_height_jump_and_default_queries(self):
        e=self.engine;s=self.state();s['lastJump']=18.5;s['stats']['jumps']=4
        before=copy.deepcopy(s)
        for height in [0.,1.,3.2,12.]:
            e['actor_walkable'](s,{'x':-33.,'z':-57.95,'y':height},-34.55,-57.95,.16)
        self.assertEqual(s,before)
        self.assertTrue(e['walkable'](s,-34.55,-57.95),'Player query still uses the real player height')

    def test_ordinary_campaign_keeps_legacy_walkability(self):
        e=self.baseline;s=e['new_game']();actor={'x':-33.,'z':-57.95,'y':3.2}
        self.assertFalse(e['DATA'].get('campaign',False))
        for x,z,r in [(-33,-57.95,.22),(-34.55,-57.95,.16),(-500,25,.25),(110,-151,.22),(0,-3,.29)]:
            with self.subTest(x=x,z=z,r=r):
                self.assertEqual(e['actor_walkable'](s,actor,x,z,r),e['walkable'](s,x,z,r))


if __name__=='__main__':unittest.main()
