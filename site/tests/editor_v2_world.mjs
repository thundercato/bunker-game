import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialWorld,scatter,stroke,objectHeight,clone} from '../editor/world-core.js';
import {snapValue,regionOf,inRegion,entityFor,updateEntity,moveEntity,insertPoint,deletePoint,checkDocument,detachedEdit,changed} from '../editor/tools/world-authoring.js';
const source=JSON.parse(fs.readFileSync('site/world.json')),d=initialWorld(source);
assert.equal(snapValue(1.37,.25),1.25);assert.equal(snapValue(1.37,0),1.37);
assert.equal(regionOf(-100),'north');assert.equal(regionOf(-300),'central');assert.equal(regionOf(-500),'south');assert.equal(inRegion('all',-500),true);assert.equal(inRegion('north',-500),false);
scatter(d,10,-90,{seed:42,count:4});const f=d.foliage[0],s={kind:'foliage',id:f.id};
stroke(d,f.x,f.z,{radius:30,strength:3});const altitude=objectHeight(d,f);updateEntity(d,s,'locked',true);assert.equal(objectHeight(d,f),altitude);
stroke(d,f.x,f.z,{radius:30,strength:5});assert.equal(objectHeight(d,f),altitude);assert.equal(moveEntity(d,s,15,-95),false);assert.throws(()=>updateEntity(d,s,'x',15),/Unlock/);
updateEntity(d,s,'locked',false);updateEntity(d,s,'offset',2);assert.ok(objectHeight(d,f)>altitude);updateEntity(d,s,'yaw',90);assert.equal(f.yaw,Math.PI/2);
const b={kind:'building',id:'hut'};moveEntity(d,b,-12.1,-13.4,.25);assert.equal(entityFor(d,b).x,-12);assert.equal(entityFor(d,b).z,-13.5);
const before=clone(d);assert.throws(()=>detachedEdit(d,source,x=>updateEntity(x,b,'x',-1000)),/bounds/);assert.deepEqual(d,before);
const p={kind:'node',id:d.roads[0].id,index:0},n=entityFor(d,p).points.length;insertPoint(d,p);assert.equal(entityFor(d,p).points.length,n+1);deletePoint(d,p);assert.equal(entityFor(d,p).points.length,n);
entityFor(d,p).points=entityFor(d,p).points.slice(0,2);assert.throws(()=>deletePoint(d,p),/two/);
entityFor(d,p).width=-1;assert.throws(()=>checkDocument(d,source),/width/);entityFor(d,p).width=3.5;
assert.deepEqual(checkDocument(JSON.parse(JSON.stringify(d)),source),d);assert.equal(changed(d,clone(d)),false);
for(const value of [NaN,Infinity,null]){const bad=clone(d);bad.buildings[0].offset=value;assert.throws(()=>checkDocument(bad,source),/offset/);}
assert.throws(()=>checkDocument({...d,region:'invented'},source),/region/);
assert.throws(()=>checkDocument({...d,layers:{...d.layers,terrain:'yes'}},source),/visibility/);
for(const value of ['',undefined,'<script>','x'.repeat(81)]){const bad=clone(d);bad.foliage[0].id=value;assert.throws(()=>checkDocument(bad,source),/foliage instance ID/);}
for(const value of [undefined,'bad id','x'.repeat(81),d.rail.id]){const bad=clone(d);bad.roads[0].id=value;assert.throws(()=>checkDocument(bad,source),/path ID/);}
console.log('PASS 37 editor world authoring constraints: grounding locks, bounds, snapping, paths, regions, JSON and detached invalid edits');

const districts=JSON.parse(fs.readFileSync('site/districts.json'));
const districtSourceBytes=JSON.stringify(districts);
const campaignSource={...source,campaignDistricts:districts},districtDraft=initialWorld(campaignSource);
districtDraft.layers.districts=true;
const districtSelection={kind:'district',id:districts.districts[0].objects[0].id};
const originalDistrict=clone(districts.districts[0].objects[0]),row=entityFor(districtDraft,districtSelection);
assert.equal(row,districtDraft.districts.districts[0].objects[0]);
updateEntity(districtDraft,districtSelection,'x',originalDistrict.transform.x+1.375);
updateEntity(districtDraft,districtSelection,'yaw',37.5);
assert.equal(row.transform.x,originalDistrict.transform.x+1.375);
assert.equal(row.transform.yaw,37.5*Math.PI/180);
assert.deepEqual({...row,transform:originalDistrict.transform},originalDistrict,'Transforms retain asset, colliders, source bindings and stable identity');
assert.equal(Object.hasOwn(row,'x'),false,'A district must not gain a second flat transform');
assert.equal(moveEntity(districtDraft,districtSelection,12,24,.25),false,'Overview districts only use numeric edits');
assert.deepEqual(checkDocument(JSON.parse(JSON.stringify(districtDraft)),campaignSource),districtDraft);
assert.equal(JSON.stringify(districts),districtSourceBytes,'Editor edits never mutate source district data');
assert.throws(()=>updateEntity(districtDraft,districtSelection,'locked',true),/position and yaw only/);
for(const value of [NaN,Infinity,null])assert.throws(()=>detachedEdit(districtDraft,campaignSource,d=>updateEntity(d,districtSelection,'z',value)),/finite/);
const missing=clone(districtDraft);delete entityFor(missing,districtSelection).transform.yaw;
assert.throws(()=>checkDocument(missing,campaignSource),/district transform/);
assert.throws(()=>checkDocument({...districtDraft,layers:{...districtDraft.layers,districts:'yes'}},campaignSource),/district layer/);
console.log('PASS district authoring integration: nested canonical transforms, degrees, retained identities/colliders, detached validation, source isolation and JSON');
