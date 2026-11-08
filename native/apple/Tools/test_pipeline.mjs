#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parseGLB,accessor,validateScene,verifySourceLock,nativeApproachSpawn} from './convert_scene.mjs';
import {compileBuilding} from '../../../site/world-document.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const scene=json('native/apple/NativeContent/scene.json');
const lock=json('native/apple/Tools/source-lock.json');
const source=json('site/world.json');
let count=0;const test=(name,body)=>{body();count++;console.log('PASS '+name);};
const approx=(a,b)=>assert.ok(Math.abs(a-b)<.00001,`${a} != ${b}`);
const copy=x=>JSON.parse(JSON.stringify(x));

test('generated resources reproduce byte-for-byte',()=>{
 const r=spawnSync(process.execPath,['native/apple/Tools/convert_scene.mjs','--check'],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
});
test('source lock verifies actual current source; rejects changed world bytes',()=>{
 verifySourceLock(lock,read);assert.throws(()=>verifySourceLock(lock,p=>p==='site/world.json'?Buffer.concat([read(p),Buffer.from(' ')]):read(p)),/Pinned source changed: site\/world.json/);
 assert.throws(()=>verifySourceLock({...lock,revision:'main'},read),/Invalid source lock/);
});
test('GLB header/version/length and out of range accessors are rejected',()=>{
 const bytes=read('site/assets/campaign/models/bed_single.glb');assert.ok(parseGLB(bytes).doc.meshes.length);
 for(const index of [0,4,8]){const b=Buffer.from(bytes);b.writeUInt32LE(0,index);assert.throws(()=>parseGLB(b),/Invalid GLB header/);}
 assert.throws(()=>parseGLB(bytes.subarray(0,bytes.length-10)),/Invalid GLB header/);
 const {doc,bin}=parseGLB(bytes),a=copy(doc);a.accessors[0].count+=100000;assert.throws(()=>accessor(a,bin,0),/outside buffer view/);
 const sparse=copy(doc);sparse.accessors[0].sparse={};assert.throws(()=>accessor(sparse,bin,0),/sparse/);
});
test('source transforms and every retained collider agree with the world compiler',()=>{
 const b=compileBuilding(json('native/apple/NativeContent/world-document.json'),'forester',{source,sourceRevision:lock.revision});
 assert.deepEqual(scene.sourceSpawn,b.spawn.position);assert.deepEqual(scene.stairs[0].position,b.objects.find(x=>x.type==='stairs').position);
 const expected=b.colliders.filter(c=>!c.doorId||b.interactions.some(i=>i.type==='door'&&i.id===c.doorId));assert.ok(scene.colliders.length>expected.length);
 expected.forEach((c,i)=>{const n=scene.colliders[i];assert.equal(n.parentID,c.id);[c.x,c.y,c.z].forEach((v,j)=>approx(n.position[j],v));[c.w,c.h,c.d].forEach((v,j)=>approx(n.size[j],v));approx(n.yaw,c.yaw);});
 assert.deepEqual(scene.objects.find(o=>o.id==='entrance-leaf').position,[-30,0,-54.5]);
 assert.deepEqual(scene.objects.find(o=>o.id==='container-forester_c0').position,[-34.69,1.38,-62.4]);
});
test('native spawn follows the source marker outside the cottage and within the garden',()=>{
 const compiled=compileBuilding(json('native/apple/NativeContent/world-document.json'),'forester',{source,sourceRevision:lock.revision});
 assert.deepEqual(scene.spawn,nativeApproachSpawn(compiled));assert.deepEqual(scene.spawn,[-30,0,-46.5]);
 const building=source.buildings.find(b=>b.id===scene.buildingID);assert.ok(scene.spawn[2]>building.z+building.d/2+6);
 const garden=scene.objects.find(o=>o.id==='native-outdoor');assert.ok(Math.abs(scene.spawn[0]-garden.position[0])<garden.size[0]/2&&Math.abs(scene.spawn[2]-garden.position[2])<garden.size[2]/2);
 // A rotated root rotates only the offset once, never the world-space source pose.
 assert.deepEqual(nativeApproachSpawn({spawn:{position:[10,2,20]},transform:{yaw:Math.PI/2}}),[16.6,2,20]);
});
test('upper floor cutout remains empty over the staircase; floor tops stay at 3.2m',()=>{
 const stair=scene.stairs[0];for(const o of scene.objects.filter(o=>o.kind==='floor'&&o.position[1]>1)){
  approx(o.position[1],3.2);const contains=Math.abs(stair.position[0]-o.position[0])<o.size[0]/2&&Math.abs(stair.position[2]-o.position[2])<o.size[2]/2;assert.equal(contains,false);
 }
});
test('stable interactions retain source IDs and every test item exists in catalogue',()=>{
 const ids=scene.interactions.filter(x=>x.kind==='container'&&x.id.startsWith('forester_')).map(x=>x.id).sort();assert.deepEqual(ids,source.containers.filter(x=>x.building==='forester').map(x=>x.id).sort());
 for(const item of scene.items)assert.equal(source.catalogue[item.id].name,item.name);
 assert.ok(scene.interactions.some(x=>x.kind==='loose'&&x.id==='forester_table'));
 assert.ok(scene.interactions.filter(x=>x.kind==='door').length>=5);
 assert.ok(scene.terrain.heights.some(h=>h>1)); assert.equal(scene.terrain.heights.length,71*71);
});
test('malformed scene dimensions, IDs, bindings and orphans are rejected',()=>{
 validateScene(scene);for(const mutate of [s=>s.spawn[0]=Infinity,s=>s.sourceSpawn=[0,0],s=>s.objects[0].size[0]=-1,s=>s.objects[0].position[0]=NaN,s=>s.objects[1].id=s.objects[0].id,s=>s.interactions[0].objectID='missing',s=>s.interactions[2].itemID='missing',s=>s.colliders[0].parentID='missing']){const s=copy(scene);mutate(s);assert.throws(()=>validateScene(s));}
});
test('meshes have valid triangles, bottom-centred bounds, provenance and local textures',()=>{
 const provenance=json('native/apple/NativeContent/provenance.json');assert.ok(provenance.assets.length>=20);let textured=0;
 for(const a of provenance.assets){assert.ok(a.source&&a.licence&&a.sourceSHA256);const mesh=json('native/apple/NativeContent/Meshes/'+a.id+'.json');assert.equal(mesh.format,'field-signal-native-mesh');const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];
  for(const m of mesh.meshes){assert.equal(m.positions.length,m.normals.length);assert.equal(m.positions.length%3,0);assert.equal(m.indices.length%3,0);assert.ok(m.indices.every(i=>Number.isInteger(i)&&i>=0&&i<m.positions.length/3));for(let i=0;i<m.positions.length;i++){assert.ok(Number.isFinite(m.positions[i]));mins[i%3]=Math.min(mins[i%3],m.positions[i]);maxs[i%3]=Math.max(maxs[i%3],m.positions[i]);}if(m.colors.length)assert.equal(m.colors.length,m.positions.length/3*4);if(m.texture){assert.match(m.texture,/^[\w-]+\.(png|jpg)$/);assert.ok(read('native/apple/NativeContent/Textures/'+m.texture).length>100);assert.equal(m.uvs.length,m.positions.length/3*2);textured++;}}
  approx(mins[1],0);approx(mins[0]+maxs[0],0);approx(mins[2]+maxs[2],0);a.dimensions.forEach((n,i)=>approx(n,maxs[i]-mins[i]));
 }assert.ok(textured>=3,'actual furniture and vegetation textures exported');
});
console.log(`Native pipeline: ${count} meaningful checks passed.`);
