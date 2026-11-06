"""Exact candidate sight-line geometry and parity with the former sampler."""
import math
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from campaign_rules import CampaignGeometry


def box(**extra):
    return {'x':0.,'z':0.,'w':2.,'d':1.,'minY':0.,'maxY':2.,'yaw':0.,**extra}


def geometry(*colliders):
    return CampaignGeometry({'campaignGeometry':{'colliders':list(colliders)},'containers':[]})


def old_sampler(scene,a,b,y=0,doors=None):
    count=max(1,int(math.dist(a,b)/.15))
    return any(scene.blocked(a[0]+(b[0]-a[0])*i/count,
                             a[1]+(b[1]-a[1])*i/count,y,doors or {},.02)
               for i in range(count+1))


def world_point(x,z,c):
    angle=c.get('yaw',0)
    return c['x']+x*math.cos(angle)+z*math.sin(angle),c['z']-x*math.sin(angle)+z*math.cos(angle)


class CampaignSightLines(unittest.TestCase):
    def test_crossings_endpoints_zero_length_and_reversed_direction(self):
        scene=geometry(box())
        for a,b,expected in [((-3,0),(3,0),True),((0,-3),(0,3),True),
                              ((-3,-2),(3,2),True),((0,0),(3,3),True),
                              ((0,0),(0,0),True),((2,2),(2,2),False),
                              ((-3,2),(3,2),False),((-3,-3),(-2,-2),False)]:
            with self.subTest(a=a,b=b):
                self.assertEqual(scene.line_blocked(a,b,0,{}),expected)
                self.assertEqual(scene.line_blocked(b,a,0,{}),expected)

    def test_strict_padding_edges_and_corner_tangency(self):
        scene=geometry(box());x=1.02;z=.52
        for a,b,expected in [((-3,z),(3,z),False),((x,-3),(x,3),False),
                              ((-3,z-1e-6),(3,z-1e-6),True),
                              ((x-1e-6,-3),(x-1e-6,3),True),
                              ((x-1,z+1),(x+1,z-1),False),
                              ((x,z),(3,3),False),((x,z),(0,0),True)]:
            with self.subTest(a=a,b=b):self.assertEqual(scene.line_blocked(a,b,0,{}),expected)

    def test_rotated_translated_boxes_keep_local_footprints(self):
        for angle in [math.pi/2,math.pi/4,-.67,2.1]:
            collider=box(x=13.4,z=-27.2,yaw=angle);scene=geometry(collider)
            for a,b,expected in [((-3,0),(3,0),True),((0,-3),(0,3),True),
                                  ((-3,.53),(3,.53),False),
                                  ((1.03,-3),(1.03,3),False),
                                  ((-2,-2),(2,2),True)]:
                with self.subTest(angle=angle,a=a,b=b):
                    self.assertEqual(scene.line_blocked(world_point(*a,collider),world_point(*b,collider),0,{}),expected)

    def test_height_floor_and_door_filters_match_walking_geometry(self):
        a,b=(-3,0),(3,0)
        cases=[(box(maxY=1.2),0,{},True),(box(maxY=1.2),1.2,{},False),
               (box(minY=2,maxY=3),0,{},False),(box(minY=1.5,maxY=3),0,{},True),
               (box(minY=3.8,maxY=4,kind='floor'),4,{},False),
               (box(minY=3.8,maxY=4,kind='floor'),3.8,{},True),
               (box(doorId='gate'),0,{'gate':False},True),
               (box(doorId='gate'),0,{'gate':True},False),
               (box(doorId='gate'),0,{},False)]
        for collider,y,doors,expected in cases:
            with self.subTest(collider=collider,y=y,doors=doors):
                scene=geometry(collider)
                self.assertEqual(scene.line_blocked(a,b,y,doors),expected)
                self.assertEqual(old_sampler(scene,a,b,y,doors),expected)

    def test_exact_intersection_catches_thin_obstacle_between_old_samples(self):
        scene=geometry(box(x=.075,w=.002,d=.1))
        a,b=(0,0),(.3,0)
        self.assertFalse(old_sampler(scene,a,b))
        self.assertTrue(scene.line_blocked(a,b,0,{}))

    def test_seeded_sampler_parity_never_loses_a_detected_collision(self):
        rng=random.Random(1979);colliders=[]
        for i in range(12):
            colliders.append(box(x=rng.uniform(-6,6),z=rng.uniform(-6,6),
                                 w=rng.uniform(.3,2),d=rng.uniform(.3,2),yaw=rng.uniform(-math.pi,math.pi),
                                 minY=i%3,maxY=i%3+1.8,**({'doorId':'gate'} if i%4==0 else {})))
        scene=geometry(*colliders);old_hits=0;extra_hits=0
        for i in range(300):
            a=[rng.uniform(-8,8),rng.uniform(-8,8)];b=[rng.uniform(-8,8),rng.uniform(-8,8)]
            y=i%3;doors={'gate':bool(i%2)}
            old=old_sampler(scene,a,b,y,doors);exact=scene.line_blocked(a,b,y,doors)
            if old:old_hits+=1;self.assertTrue(exact,'Exact clipping must retain every sampled collision')
            if exact and not old:
                extra_hits+=1
                self.assertTrue(any(scene.blocked(a[0]+(b[0]-a[0])*j/8192,
                                                  a[1]+(b[1]-a[1])*j/8192,y,doors,.02)
                                    for j in range(8193)),'A new exact hit must have an independently sampled interior')
            self.assertEqual(exact,scene.line_blocked(b,a,y,doors),'Sight lines are symmetric')
        self.assertGreater(old_hits,50)
        self.assertLess(extra_hits,10,'Extra exact hits should be rare corner/thin intersections')


if __name__=='__main__':unittest.main()
