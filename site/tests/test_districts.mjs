import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.js';
import {buildDistrictScene,validateDistrictDefinition,districtWorldPoint} from '../district-scene.js';

const definition=JSON.parse(fs.readFileSync(new URL('../districts.json',import.meta.url)));
const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
const campaign=JSON.parse(fs.readFileSync(new URL('../assets/campaign/registry.json',import.meta.url)));
const routes=JSON.parse(fs.readFileSync(new URL('../campaign-routes.json',import.meta.url)));
const all=definition.districts.flatMap(d=>d.objects.map(object=>({...object,zone:d.zone})));
const before=JSON.stringify(definition);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
assert.deepEqual(validateDistrictDefinition(definition),[]);
assert.equal(new Set(all.map(q=>q.id)).size,all.length);
assert.ok(all.length>=90&&all.length<=definition.budgets.maxObjectCount);
assert.ok(new Set(definition.districts.map(d=>d.id)).size>=8);
const moved=districtWorldPoint({x:10,y:3,z:20,yaw:Math.PI/2},{x:2,y:4,z:1,yaw:Math.PI/4});
near(moved.x,11);near(moved.y,7);near(moved.z,18);near(moved.yaw,3*Math.PI/4);
for(const change of [
 d=>{d.districts[0].objects[1].id=d.districts[0].objects[0].id;},
 d=>{d.districts[0].objects[0].transform.y=Infinity;},
 d=>{d.districts[0].objects[0].size[0]=-1;},
 d=>{d.districts[0].objects[0].colliders[0].h=0;},
 d=>{d.districts.at(-1).zone='nowhere';},
 d=>{d.districts.flatMap(x=>x.objects).find(x=>x.climb).climb.routes[0].to.y=31;},
]){const invalid=structuredClone(definition);change(invalid);assert.ok(validateDistrictDefinition(invalid).length);}

const crane=all.find(q=>q.id==='docks-crane-01');
assert.equal(crane.climb.routes.length,3);
assert.deepEqual(crane.surfaces.map(s=>s.y),[4,8,12]);
for(const route of crane.climb.routes){
 const top=crane.surfaces.find(s=>s.y===route.to.y);
 assert.ok(top,'Every climb destination has a real deck');
 assert.ok(Math.abs(route.to.x-top.x)+.3<top.w/2);
 assert.ok(Math.abs(route.to.z-top.z)+.3<top.d/2);
 assert.ok(route.via.every(p=>p.x<-top.w/2-.3),'Ladder animation stays outside the solid deck');
 for(const collider of crane.colliders){
  const blocks=Math.abs(route.to.x-collider.x)<collider.w/2+.3&&Math.abs(route.to.z-collider.z)<collider.d/2+.3&&route.to.y+.05<collider.y+collider.h/2&&route.to.y+1.65>collider.y-collider.h/2;
  assert.ok(!blocks,'A crane landing must clear its rails and structure: '+collider.id);
 }
 const p=districtWorldPoint(crane.transform,route.to);
 assert.ok(p.x>source.pier.minX+.35&&p.x<source.pier.maxX-.35&&p.z>source.pier.minZ+.35&&p.z<source.pier.maxZ-.35);
}
const p=districtWorldPoint(crane.transform,crane.climb.routes[0].from);
near(p.x,109.4);near(p.y,0);near(p.z,-151);

// New hard scenery must not intersect source buildings or their front door approaches.
for(const q of all.filter(q=>q.zone==='field'))for(const c of q.colliders){
 const p=districtWorldPoint(q.transform,c),yaw=q.transform.yaw+(c.yaw||0),w=Math.abs(Math.cos(yaw))*c.w+Math.abs(Math.sin(yaw))*c.d,d=Math.abs(Math.sin(yaw))*c.w+Math.abs(Math.cos(yaw))*c.d;
 for(const b of source.buildings){
  const overlap=Math.abs(p.x-b.x)<(w+b.w)/2-.03&&Math.abs(p.z-b.z)<(d+b.d)/2-.03;
  assert.ok(!overlap,`${q.id}/${c.id} overlaps ${b.id}`);
  const doorZ=b.z+b.d/2+.9;
  const blocksDoor=Math.abs(p.x-b.x)<w/2+1.1&&Math.abs(p.z-doorZ)<d/2+.85&&p.y+c.h/2>.2&&p.y-c.h/2<2;
  assert.ok(!blocksDoor,`${q.id}/${c.id} blocks ${b.id} entrance`);
 }
}
for(const q of all.filter(q=>q.asset.startsWith('campaign_'))){
 const asset=campaign.assets.find(a=>a.id===q.asset);assert.ok(asset,'Missing licensed registry asset '+q.asset);
 assert.ok(fs.statSync(new URL('../'+asset.path,import.meta.url)).size>100);
 assert.equal(asset.licence,'CC0-1.0');
}

// Respect the repaired route catalogue as well as legacy building coordinates.
function intersectsRectangle(a,b,w,d){
 let lo=0,hi=1;
 for(const [axis,half]of [[0,w/2],[1,d/2]]){
  const delta=b[axis]-a[axis];
  if(Math.abs(delta)<1e-9){if(Math.abs(a[axis])>=half)return false;continue;}
  let u=(-half-a[axis])/delta,v=(half-a[axis])/delta;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>=hi)return false;
 }
 return true;
}
for(const q of all.filter(q=>q.zone==='field'))for(const collider of q.colliders){
 if(q.transform.y+collider.y-collider.h/2>1.7)continue;
 const p=districtWorldPoint(q.transform,collider),yaw=q.transform.yaw+(collider.yaw||0),c=Math.cos(yaw),s=Math.sin(yaw);
 const local=([x,z])=>[(x-p.x)*c-(z-p.z)*s,(x-p.x)*s+(z-p.z)*c];
 for(const [index,path]of routes.roads.entries())for(let i=1;i<path.length;i++){
  const half=index===0?1.75:2.7;
  assert.ok(!intersectsRectangle(local(path[i-1]),local(path[i]),collider.w+half*2,collider.d+half*2),`${q.id}/${collider.id} blocks road ${index}`);
 }
}

// Exercise real geometry construction and cell culling without a GPU or texture decode.
const material=new T.MeshStandardMaterial({color:'#7b8170'}),world={scene:new T.Scene(),occluders:[],currentZone:'field',quality:'balanced',renderSettings:{},state:{player:{x:110,z:-151}},mat:{wood:material,metal:material,rock:material,concrete:material},async model(id,spec){const group=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(...spec.dim),material);mesh.position.y=spec.dim[1]/2;group.add(mesh);return group;},label(){return new T.Mesh(new T.PlaneGeometry(1,.2),material);}};
const scene=await buildDistrictScene(world,definition);
assert.equal(scene.counts.objects,all.length);assert.equal(scene.errors.length,0);
assert.ok(scene.counts.mergedMeshes<definition.budgets.maxMergedDrawCalls);
assert.ok(scene.objects.get('docks-crane-01').group.children.some(o=>o.isMesh),'Crane interaction root retains actual merged meshes');
assert.ok(scene.counts.meshes<scene.counts.triangles);
scene.updateVisibility({x:113,z:-151},'field','balanced');
assert.ok(scene.objects.get('docks-crane-01').cell.visible);
assert.ok(!scene.objects.get('refuge-stencil-01').cell.visible);
scene.updateVisibility({x:-500,z:24},'base','low');
assert.ok(scene.objects.get('refuge-stencil-01').cell.visible);
assert.ok(!scene.objects.get('docks-crane-01').cell.visible);
scene.updateVisibility({x:-60,z:-60},'field','balanced');world.renderSettings.vegetation=false;scene.updateVisibility({x:-60,z:-60},'field','balanced');
assert.ok(scene.groups.filter(g=>g.userData.vegetation).every(g=>!g.visible));
assert.equal(JSON.stringify(definition),before,'Rendering does not mutate authored data');
assert.equal(world.scene.children[0],scene.root);
assert.ok(world.occluders.length>0);
console.log(`PASS district scene: ${all.length} stable objects, safe source approaches, licensed assets, crane decks/routes, ${scene.counts.mergedMeshes} merged meshes, zone/distance/vegetation culling`);
