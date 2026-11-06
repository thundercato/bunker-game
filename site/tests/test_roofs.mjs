import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.js';
import {seedLayout,validateLayout,geometryPieces,roofRenderPieces,collidersFor,blocked,surfaceAt,clone} from '../layout-core.js';
import {createObject,LayoutScene} from '../layout-renderer.js';
import {createCampaignInteriors} from '../campaign-interiors.js';
import {createWorldDocument,compileBuilding,toWorld} from '../world-document.js';

const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
const before=JSON.stringify(source),make=()=>seedLayout(source,'hut');
const roof=doc=>doc.objects.find(o=>o.type==='roof');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const pointNear=(a,b)=>a.forEach((n,i)=>near(n,b[i]));
const materials=Object.fromEntries(['plaster','wood','roof'].map((name,i)=>[name,new T.MeshStandardMaterial({color:[0xb9afa1,0x76634d,0x52635b][i]})]));
let count=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name);}

await check('Legacy documents round trip byte-for-byte without adding roof metadata',()=>{
 for(const building of source.buildings){const doc=seedLayout(source,building.id);assert.equal(JSON.stringify(validateLayout(doc,{world:source})),JSON.stringify(doc));assert.equal(roof(doc).roofRise,undefined);}
});
await check('Optional numeric zero and pitched rise survive portable layout validation and export',()=>{
 for(const rise of [0,.25,2.1,6]){const doc=make();roof(doc).roofRise=rise;const saved=validateLayout(JSON.parse(JSON.stringify(doc)),{world:source});assert.equal(roof(saved).roofRise,rise);assert.equal(roof(saved).id,'roof');}
});
for(const value of [-.1,6.01,NaN,Infinity,'2',null,true,{},[]])await check('Reject invalid roof rise '+String(value),()=>{
 const doc=make();roof(doc).roofRise=value;assert.throws(()=>validateLayout(doc,{world:source}),/Roof rise/);
});
await check('Roof rise cannot be assigned to walls, furniture or a floor',()=>{
 for(const type of ['wall','prop','floor']){const doc=make();doc.objects.find(o=>o.type===type).roofRise=2;assert.throws(()=>validateLayout(doc,{world:source}),/Roof rise/);}
});
await check('Absent and zero rise keep the original flat slab pieces and renderer bounds',async()=>{
 for(const rise of [undefined,0]){
  const doc=make(),o=roof(doc);if(rise!==undefined)o.roofRise=rise;
  assert.deepEqual(geometryPieces(doc,o),[{position:[0,o.size[1]/2,0],size:[...o.size]}]);
  assert.deepEqual(roofRenderPieces(o),[{kind:'box',position:[0,o.size[1]/2,0],size:[...o.size],material:'surface'}]);
  const node=await createObject(doc,o,{materials}),bounds=new T.Box3().setFromObject(node);
  pointNear(bounds.getSize(new T.Vector3()).toArray(),o.size);near(bounds.min.y,o.position[1]);assert.equal(node.children.length,1);
 }
});
await check('Pitched render pieces are finite, pure and within exact eave and ridge dimensions',()=>{
 const doc=make(),o=roof(doc);o.roofRise=2.1;const before=JSON.stringify(o),[w,h,d]=o.size;
 for(const part of roofRenderPieces(o)){
  if(part.kind==='box'){
   assert.ok(part.size.every(n=>Number.isFinite(n)&&n>0));assert.ok(part.position.every(Number.isFinite));
   part.position.forEach((n,i)=>{const low=n-part.size[i]/2,high=n+part.size[i]/2;assert.ok(low>=[-w/2,0,-d/2][i]-1e-8);assert.ok(high<=[w/2,h+o.roofRise,d/2][i]+1e-8);});
  }else{
   assert.ok(part.depth>0);assert.ok(Math.abs(part.z)+part.depth/2<=d/2+1e-8);
   for(const [x,y]of part.profile){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(Math.abs(x)<=w/2+1e-8);assert.ok(y>=h&&y<=h+o.roofRise);}
  }
 }
 assert.equal(JSON.stringify(o),before);
});
await check('Actual pitched meshes have two material batches, sound normals and exact closed dimensions',async()=>{
 const doc=make(),o=roof(doc);o.roofRise=2;const node=await createObject(doc,o,{materials}),b=new T.Box3().setFromObject(node);
 pointNear(b.getSize(new T.Vector3()).toArray(),[o.size[0],o.size[1]+2,o.size[2]]);near(b.min.y,o.position[1]);
 assert.equal(node.children.length,2);assert.deepEqual(new Set(node.children.map(o=>o.material)),new Set([materials.roof,materials.wood]));
 let triangles=0;
 for(const mesh of node.children){assert.ok(mesh.castShadow&&mesh.receiveShadow);for(const name of ['position','normal','uv'])assert.ok(mesh.geometry.attributes[name].array.every(Number.isFinite));triangles+=mesh.geometry.attributes.position.count/3;assert.ok(mesh.geometry.boundingSphere.radius>0);}
 assert.ok(triangles>24&&triangles<400,'small solid pitched roof with gable ends and trim');
});
await check('Minimum roof dimensions and a tiny positive rise retain finite nonempty geometry',async()=>{
 const doc=make(),o=roof(doc);o.size=[.02,.02,.02];o.roofRise=.001;const node=await createObject(doc,o,{materials});
 const b=new T.Box3().setFromObject(node);pointNear(b.getSize(new T.Vector3()).toArray(),[.02,.021,.02]);
 for(const mesh of node.children)assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));
});
await check('Visual pitch leaves the sealed ceiling collision and existing floor sampling unchanged',()=>{
 const pitched=make();roof(pitched).roofRise=2;const flat=clone(pitched);delete roof(flat).roofRise;
 assert.deepEqual(collidersFor(pitched),collidersFor(flat));
 for(const y of [0,1.5,3.1,3.25,4.5,5])for(const x of [-3,0,3]){
  assert.equal(blocked(pitched,x,0,y),blocked(flat,x,0,y));assert.equal(surfaceAt(pitched,x,0,y),surfaceAt(flat,x,0,y));
 }
 const c=collidersFor(pitched).find(c=>c.kind==='roof');near(c.y,roof(pitched).position[1]);near(c.h,roof(pitched).size[1]);
});
await check('Roof children follow their object and parent building transforms exactly once',async()=>{
 const doc=make(),o=roof(doc);o.position=[1,6.4,-2];o.yaw=.37;o.roofRise=2.1;
 const node=await createObject(doc,o,{materials}),parent=new T.Group(),transform={position:[80,2,-100],yaw:Math.PI/2};parent.position.fromArray(transform.position);parent.rotation.y=transform.yaw;parent.add(node);parent.updateMatrixWorld(true);
 const local=[0,o.size[1]+o.roofRise,o.size[2]/2];let actual;
 for(const mesh of node.children){const vertices=mesh.geometry.attributes.position;for(let i=0;i<vertices.count;i++){const p=new T.Vector3().fromBufferAttribute(vertices,i);if(p.distanceTo(new T.Vector3(...local))<1e-5){actual=p.applyMatrix4(mesh.matrixWorld).toArray();break;}}}
 assert.ok(actual,'ridge endpoint is actual rendered geometry');pointNear(actual,toWorld(transform,toWorld({position:o.position,yaw:o.yaw},local)));
 assert.equal(node.userData.layoutId,o.id);assert.ok(node.children.every(c=>c.userData.layoutId===o.id));
});
await check('World-document compile preserves optional pitch while keeping physical ceiling pieces',()=>{
 const sourceRevision='0'.repeat(40),layout=make();roof(layout).roofRise=2.1;
 const document=createWorldDocument({source,sourceRevision,layouts:[layout]}),placement=document.authoring.buildings.find(b=>b.id==='hut');Object.assign(placement,{x:-70,z:-100,y:2,yaw:Math.PI/2,foundation:'manual'});
 const output=compileBuilding(JSON.parse(JSON.stringify(document)),'hut',{source,sourceRevision}),o=output.objects.find(o=>o.id==='roof');
 assert.equal(o.roofRise,2.1);pointNear(o.position,toWorld(output.transform,roof(layout).position));near(o.yaw,Math.PI/2);
 assert.deepEqual(o.pieces,geometryPieces(layout,roof(layout)));assert.equal(output.colliders.filter(c=>c.kind==='roof').length,1);
});
await check('Every authored home retains its stable roof ID, two-metre pitch and 35 cm overhang',async()=>{
 for(const doc of createCampaignInteriors(source)){
  const o=roof(doc);assert.equal(o.id,'roof');assert.ok(o.roofRise>=1.9&&o.roofRise<=2.1);near((o.size[0]-doc.bounds[0])/2,.35);near((o.size[2]-doc.bounds[1])/2,.35);
  const original=roof(seedLayout(source,doc.buildingId));assert.deepEqual(o.position,original.position);near(o.size[1],original.size[1]);
  const node=await createObject(doc,o,{materials}),bounds=new T.Box3().setFromObject(node);near(bounds.max.y,o.position[1]+o.size[1]+o.roofRise);
 }
 assert.equal(JSON.stringify(source),before);
});
await check('Existing hide-roof view hides the full pitched assembly',async()=>{
 const doc=make();doc.objects=[doc.objects.find(o=>o.type==='floor'),roof(doc),doc.objects.find(o=>o.type==='spawn')];roof(doc).roofRise=2;
 const view=new LayoutScene({materials,editor:false});await view.load(doc);view.view({hideRoof:true});assert.equal(view.objects.get('roof').visible,false);
 view.view({hideRoof:false});assert.equal(view.objects.get('roof').visible,true);assert.equal(view.objects.get('roof').children.length,2);
});
console.log(`${count} roof geometry and compatibility tests passed.`);
