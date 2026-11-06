import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialWorld,validate,clone} from '../editor/world-core.js';
import {brushSettings,previewScatter,paintScatter,eraseScatter,segmentDistance} from '../editor/tools/environment-brush-core.js';
const source=JSON.parse(fs.readFileSync('site/world.json','utf8'));
const open={avoidBuildings:false,avoidPaths:false,avoidWater:false,avoidSlopes:false};
let cases=0;
const check=(name,fn)=>{fn();cases++;console.log('PASS',name);};
check('preview is deterministic, seeded and leaves canonical document unchanged',()=>{
 const doc=initialWorld(source),before=clone(doc),settings={...open,seed:0,count:40,radius:30};
 const a=previewScatter(doc,source,0,-100,settings),b=previewScatter(doc,source,0,-100,settings);
 assert.deepEqual(a,b);assert.deepEqual(doc,before);assert.equal(a.accepted.length,40);
 assert.notDeepEqual(a.accepted,previewScatter(doc,source,0,-100,{...settings,seed:1}).accepted);
});
check('spacing protects existing locked and ordinary instances and each new neighbour',()=>{
 const doc=initialWorld(source);doc.foliage=[{id:'kept',kind:'rock',x:0,z:-100,scale:1,yaw:0,offset:0,locked:true,y:2}];
 const result=paintScatter(doc,source,0,-100,{...open,spacing:5,count:50,radius:30,seed:19});
 assert.equal(result.accepted.length,50);for(let i=0;i<doc.foliage.length;i++)for(let j=i+1;j<doc.foliage.length;j++)assert.ok(Math.hypot(doc.foliage[i].x-doc.foliage[j].x,doc.foliage[i].z-doc.foliage[j].z)>=5-1e-8);
 assert.equal(doc.foliage[0].id,'kept');assert.equal(doc.foliage[0].y,2);assert.ok(result.rejections.spacing>0);
});
check('scale/yaw controls affect only new instances, with no reload reroll',()=>{
 const doc=initialWorld(source);paintScatter(doc,source,0,-100,{...open,count:20,seed:22,minScale:.5,maxScale:.75,minYaw:45,maxYaw:90});
 for(const instance of doc.foliage){assert.ok(instance.scale>=.5&&instance.scale<=.75);assert.ok(instance.yaw>=Math.PI/4-1e-6&&instance.yaw<=Math.PI/2+1e-6);}
 const before=clone(doc.foliage);paintScatter(doc,source,60,-100,{...open,count:10,seed:44,minScale:2,maxScale:2,minYaw:180,maxYaw:180});
 assert.deepEqual(doc.foliage.slice(0,20),before);assert.deepEqual(validate(JSON.parse(JSON.stringify(doc)),source),doc);
});
check('instance allocation skips existing IDs even with stale nextId metadata',()=>{
 const doc=initialWorld(source);doc.nextId=0;doc.foliage=[1,2].map(i=>({id:'plant-'+i,kind:'pine',x:i,z:0,scale:1,yaw:0,offset:0,locked:false}));
 const result=paintScatter(doc,source,0,-100,{...open,count:3});assert.deepEqual(result.accepted.map(f=>f.id),['plant-3','plant-4','plant-5']);assert.equal(doc.nextId,5);
});
check('bounds reject out-of-world candidates rather than clamping them into a pile',()=>{
 const doc=initialWorld(source),b=doc.bounds;const result=previewScatter(doc,source,b.minX+1,b.minZ+1,{...open,count:80,radius:20,spacing:0});
 assert.equal(result.accepted.length,80);assert.ok(result.rejections.bounds>0);for(const f of result.accepted)assert.ok(f.x>=b.minX&&f.z>=b.minZ);
});
check('moved and rotated source footprint and doorway approach exclude vegetation',()=>{
 const doc=initialWorld(source),building={...doc.buildings[0],x:0,z:-100,yaw:Math.PI/2};doc.buildings=[building];
 const custom={...source,buildings:[{...source.buildings[0],w:4,d:20}]};const options={...open,avoidBuildings:true,buildingClearance:0,radius:.1,count:3,spacing:0};
 assert.equal(previewScatter(doc,custom,8,-100,options).accepted.length,0);
 assert.equal(previewScatter(doc,custom,0,-108,options).accepted.length,3);
 assert.equal(previewScatter(doc,custom,13,-100,options).accepted.length,0);
});
check('curved path mask uses current road/rail width and clearance',()=>{
 const doc=initialWorld(source);doc.roads=[{id:'curve',kind:'road',width:6,points:[[-20,-100],[0,-100],[20,-90]],fit:'auto'}];doc.rail={id:'far',kind:'rail',width:2,points:[[100,0],[110,0]],fit:'auto'};
 const result=previewScatter(doc,source,0,-100,{...open,avoidPaths:true,pathClearance:1,radius:.1,count:3,spacing:0});
 assert.equal(result.accepted.length,0);assert.ok(result.rejections.path>0);assert.equal(result.masks.paths[0].radius,4);
 assert.equal(segmentDistance(2,3,[0,0],[4,0]),3);assert.equal(segmentDistance(1,0,[0,0],[0,0]),1);
});
check('global and local water avoid only submerged ground, with explicit bypass',()=>{
 const doc=initialWorld(source),options={...open,avoidWater:true,radius:.1,count:3,spacing:0};doc.waterLevel=1;
 assert.equal(previewScatter(doc,source,0,-100,options).accepted.length,0);
 assert.equal(previewScatter(doc,source,0,-100,{...options,avoidWater:false}).accepted.length,3);
 doc.waterLevel=-2;doc.water=[{x:0,z:-100,radius:10,level:1}];assert.equal(previewScatter(doc,source,0,-100,options).accepted.length,0);
 doc.water[0].level=-2;assert.equal(previewScatter(doc,source,0,-100,options).accepted.length,3);
});
check('terrain slope mask samples the existing height grid',()=>{
 const doc=initialWorld(source);for(let ix=-5;ix<=5;ix++)for(let iz=-15;iz<=5;iz++)doc.heights[ix+','+iz]=ix*6;
 const result=previewScatter(doc,source,0,-100,{...open,avoidSlopes:true,maxSlope:.1,radius:1,count:3});assert.equal(result.accepted.length,0);assert.ok(result.rejections.slope>0);
});
check('a bounded attempt budget reports fully excluded regions without mutation',()=>{
 const doc=initialWorld(source);doc.waterLevel=2;const before=clone(doc),result=previewScatter(doc,source,0,-100,{...open,avoidWater:true,count:100});
 assert.equal(result.attempts,4000);assert.equal(result.rejections.water,4000);assert.equal(result.samples.length,150);assert.deepEqual(doc,before);
});
check('erase is selective, preserving locked IDs, transforms and unrelated instances',()=>{
 const doc=initialWorld(source);doc.foliage=[{id:'locked',x:0,z:0,locked:true,y:2},{id:'erase',x:1,z:0,locked:false},{id:'away',x:40,z:0,locked:false}];
 const result=eraseScatter(doc,0,0,5);assert.deepEqual(result.removed.map(f=>f.id),['erase']);assert.deepEqual(result.locked.map(f=>f.id),['locked']);assert.deepEqual(doc.foliage.map(f=>f.id),['locked','away']);assert.equal(doc.foliage[0].y,2);
});
check('capacity limits are explicit and never replace existing foliage',()=>{
 const doc=initialWorld(source);doc.foliage=Array.from({length:11999},(_,i)=>({id:'plant-'+i,x:100,z:100,scale:1,yaw:0,locked:false,offset:0,kind:'pine'}));
 const result=paintScatter(doc,source,0,-100,{...open,count:5,spacing:0});assert.equal(result.accepted.length,1);assert.equal(result.rejections.capacity,4);assert.equal(doc.foliage.length,12000);assert.equal(doc.foliage[0].id,'plant-0');
});
check('invalid numeric settings, unknown kinds and nonfinite centres reject early',()=>{
 for(const settings of [{seed:NaN},{seed:1.5},{seed:-1},{count:101},{radius:0},{spacing:-1},{minScale:2,maxScale:1},{minYaw:90,maxYaw:45},{maxYaw:361},{avoidPaths:'yes'},{kind:'unknown'},{maxSlope:Infinity}])assert.throws(()=>brushSettings(settings));
 assert.throws(()=>previewScatter(initialWorld(source),source,NaN,0));assert.throws(()=>eraseScatter(initialWorld(source),0,0,Infinity));
});
console.log(`${cases} environment-brush tests passed`);
