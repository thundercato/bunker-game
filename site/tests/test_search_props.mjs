import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.js';
import {validateSearchPropCatalogue,getSearchProp,createSearchProp,setSearchPropOpen,searchPropCollider} from '../search-props.js';

const catalogue=JSON.parse(fs.readFileSync(new URL('../search-props.json',import.meta.url)));
const before=JSON.stringify(catalogue);
let checks=0,maxMeshes=0,maxTriangles=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
const meshes=root=>{const out=[];root.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
const moving=root=>{const out=[];root.traverse(o=>{if(o.userData.searchMotion)out.push(o);});return out;};
const pose=o=>[...o.position.toArray(),...o.rotation.toArray()].map(n=>n===0?0:n);
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-5,`${message}: ${actual} != ${expected}`);
const signatures=new Set();

await check('Catalogue has at least 50 meaningful variants across domestic, medical and industrial rooms',()=>{
 assert.equal(validateSearchPropCatalogue(catalogue),catalogue);
 assert.equal(catalogue.props.length,69);
 const categories=new Set(catalogue.props.map(p=>p.category));
 for(const category of ['cabinet','drawers','wardrobe','desk','kitchen','sink','cooker','fridge','bathroom','medical','locker','safe','filing','tools','cargo'])assert.ok(categories.has(category),category);
 assert.equal(catalogue.props.filter(p=>p.provenance.type==='original-composite').length,65);
 assert.equal(catalogue.props.filter(p=>p.licensedAsset).length,4);
});

await check('All 69 editor thumbnails are distinct local 192 by 160 WebP files below the total asset budget',()=>{
 const hashes=new Set();let totalBytes=0;
 for(const p of catalogue.props){
  assert.equal(p.editor.thumbnail,`assets/search-props/thumbnails/${p.id}.webp`);
  const bytes=fs.readFileSync(new URL('../'+p.editor.thumbnail,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(bytes.readUInt32LE(4)+8,bytes.length,'complete WebP container');
  let dimensions;
  for(let cursor=12;cursor+8<=bytes.length;){
   const kind=bytes.toString('ascii',cursor,cursor+4),length=bytes.readUInt32LE(cursor+4),start=cursor+8;
   assert.ok(start+length<=bytes.length,'complete WebP chunk');
   if(kind==='VP8 '){assert.equal(bytes.toString('hex',start+3,start+6),'9d012a');dimensions=[bytes.readUInt16LE(start+6)&0x3fff,bytes.readUInt16LE(start+8)&0x3fff];}
   if(kind==='VP8X')dimensions=[1+bytes.readUIntLE(start+4,3),1+bytes.readUIntLE(start+7,3)];
   if(kind==='VP8L'){const bits=bytes.readUInt32LE(start+1);dimensions=[1+(bits&0x3fff),1+((bits>>>14)&0x3fff)];}
   cursor=start+length+(length&1);
  }
  assert.deepEqual(dimensions,[192,160],p.id+' thumbnail dimensions');
  const hash=createHash('sha256').update(bytes).digest('hex');assert.ok(!hashes.has(hash),'duplicate thumbnail '+p.id);hashes.add(hash);totalBytes+=bytes.length;
 }
 assert.equal(hashes.size,69);assert.ok(totalBytes<1024*1024,'thumbnail corpus below 1 MiB');
});

for(const p of catalogue.props){
 await check('Render, collision, independent opening and close round trip: '+p.id,async()=>{
  const root=await createSearchProp(p.id,{catalogue}),second=await createSearchProp(p.id,{catalogue});
  assert.notEqual(root,second);assert.ok(root.isGroup);
  assert.equal(root.userData.searchProp.id,p.id);
  const objects=meshes(root),parts=moving(root);assert.ok(objects.length);assert.ok(parts.length,p.id+' must open');
  const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
  close(bounds.min.y,0,'floor pivot');close(centre.x,0,'centred X');close(centre.z,0,'centred Z');
  p.dimensions.forEach((n,i)=>close(size.getComponent(i),n,'dimension '+i));
  assert.ok(objects.every(o=>o.material.vertexColors&&o.geometry.attributes.color));
  assert.ok(objects.every(o=>o.geometry.attributes.position.array.every(Number.isFinite)));
  assert.ok(objects.every(o=>o.geometry.boundingSphere.radius>0));
  const coll=searchPropCollider(p,{x:3,y:4,z:5,yaw:Math.PI/2});
  close(coll.w,p.dimensions[2],'90 degree collider width');close(coll.d,p.dimensions[0],'90 degree collider depth');
  close(coll.maxY,4+p.dimensions[1],'collider height');assert.equal(coll.x,3);assert.equal(coll.z,5);
  const rest=parts.map(pose);
  const secondRest=moving(second).map(pose);
  setSearchPropOpen(root,.5);assert.ok(parts.some((o,i)=>JSON.stringify(pose(o))!==JSON.stringify(rest[i])));
  assert.deepEqual(moving(second).map(pose),secondRest,'cached clone motions must be independent');
  setSearchPropOpen(root,1);setSearchPropOpen(root,0);
  assert.deepEqual(parts.map(pose),rest,'reversible opening');
  const stats=root.userData.searchProp;
  assert.ok(stats.meshes<=5,'at most five submissions, got '+stats.meshes);
  assert.ok(stats.triangles<=3300,'original geometry triangle budget');
  maxMeshes=Math.max(maxMeshes,stats.meshes);maxTriangles=Math.max(maxTriangles,stats.triangles);
  if(!p.licensedAsset){
   const hash=createHash('sha256');
   // Positions, dimensions and assembled transforms distinguish silhouettes/layouts;
   // vertex colours are intentionally omitted so colour renames cannot satisfy this.
   root.updateMatrixWorld(true);
   for(const o of objects){hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));hash.update(JSON.stringify(o.matrixWorld.elements));}
   const signature=hash.digest('hex');assert.ok(!signatures.has(signature),'duplicate geometry layout: '+p.id);signatures.add(signature);
  }
 });
}

await check('Opening clamps invalid progress and is idempotent',async()=>{
 const p=await createSearchProp('search_wall_cupboard',{catalogue});
 setSearchPropOpen(p,5);assert.equal(p.userData.searchPropOpen,1);
 const rotations=moving(p).map(o=>o.rotation.y);setSearchPropOpen(p,1);assert.deepEqual(moving(p).map(o=>o.rotation.y),rotations);
 setSearchPropOpen(p,NaN);assert.equal(p.userData.searchPropOpen,0);setSearchPropOpen(p,-4);assert.equal(p.userData.searchPropOpen,0);
});

await check('Unknown IDs are rejected before any asset lookup',async()=>{
 let lookups=0;await assert.rejects(createSearchProp('https://untrusted.invalid/script',{catalogue,library:{get(){lookups++;}}}),/Unknown searchable prop/);assert.equal(lookups,0);
 await assert.rejects(getSearchProp('search_nonexistent',{catalogue}),/Unknown searchable prop/);
});

await check('Duplicate IDs, non-finite coordinates, mismatched collision and unsupported sources fail validation',()=>{
 for(const change of [
  data=>data.props.push({...data.props[0]}),
  data=>data.props[0].dimensions[0]=NaN,
  data=>data.props[0].collision.size[0]=9,
  data=>data.props[0].collision.offset[1]=12,
  data=>data.props[0].interaction.anchor[1]=Infinity,
  data=>data.props[0].recipe.kind='javascript',
  data=>data.props[0].recipe.rows=1000000,
  data=>data.props[0].rooms='kitchen',
  data=>data.props[0].editor.asset='search_other',
  data=>data.props[0].editor.thumbnail='https://untrusted.invalid/image.webp',
  data=>data.props[0].licensedAsset={id:'external',path:'https://untrusted.invalid/a.glb',movingParts:['a']},
 ]){const data=structuredClone(catalogue);change(data);assert.throws(()=>validateSearchPropCatalogue(data));}
});

await check('Per-slot custom materials are supported without contaminating default caches',async()=>{
 const material=new T.MeshStandardMaterial({color:0xff00ff});
 const custom=await createSearchProp('search_wall_cupboard',{catalogue,materials:{front:material}});
 assert.ok(meshes(custom).some(o=>o.material===material));
 const regular=await createSearchProp('search_wall_cupboard',{catalogue});assert.ok(!meshes(regular).some(o=>o.material===material));
});

await check('Nested moving detail preserves smoky pane colours when batches are merged',async()=>{
 const colour=new T.Color(0x51635d);
 for(const id of ['search_gas_cooker','search_electric_cooker','search_microwave_cabinet']){
  const root=await createSearchProp(id,{catalogue});
  assert.ok(meshes(root).some(o=>{const a=o.geometry.attributes.color;for(let i=0;i<a.count;i++)if(Math.abs(a.getX(i)-colour.r)<1e-6&&Math.abs(a.getY(i)-colour.g)<1e-6&&Math.abs(a.getZ(i)-colour.b)<1e-6)return true;return false;}),id+' pane colour');
 }
});

await check('Lidded containers have a solid front beneath their opening lid',async()=>{
 for(const id of ['search_footlocker','search_chest_freezer','search_travel_trunk','search_cooler','search_cash_box','search_linen_hamper','search_suitcase']){
  const p=await getSearchProp(id,{catalogue}),root=await createSearchProp(id,{catalogue});root.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(0,p.dimensions[1]*.45,p.dimensions[2]*2),new T.Vector3(0,0,-1));
  const hit=ray.intersectObject(root,true)[0];assert.ok(hit&&hit.point.z>p.dimensions[2]*.35,id+' front wall');
 }
});

// Read actual shipped GLB metadata. A lightweight stand-in uses each source
// accessor's real bounds, node names and transforms without decoding textures.
function readGLB(path){
 const bytes=fs.readFileSync(new URL('../'+path,import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
 return JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
}
function sourceFromGLB(data){
 const source=new T.Group();
 for(const node of data.nodes){
  if(node.mesh==null)continue;
  const accessor=data.accessors[data.meshes[node.mesh].primitives[0].attributes.POSITION],size=accessor.max.map((n,i)=>n-accessor.min[i]),centre=accessor.max.map((n,i)=>(n+accessor.min[i])/2);
  const geometry=new T.BoxGeometry(...size);geometry.translate(...centre);
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());mesh.name=node.name;
  if(node.translation)mesh.position.fromArray(node.translation);if(node.rotation)mesh.quaternion.fromArray(node.rotation);if(node.scale)mesh.scale.fromArray(node.scale);source.add(mesh);
 }
 return source;
}
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/v10/model-manifest.json',import.meta.url)));
for(const p of catalogue.props.filter(p=>p.licensedAsset)){
 await check('Verified local licensed source, named movable parts and preserved source cache: '+p.id,async()=>{
  const asset=p.licensedAsset,record=manifest.find(r=>r.id===asset.id);assert.ok(record);assert.equal(record.path,asset.path);assert.equal(record.licence,p.provenance.licence);assert.equal(record.source,p.provenance.source);
  const glb=readGLB(asset.path),names=new Set(glb.nodes.map(n=>n.name));for(const name of asset.movingParts)assert.ok(names.has(name),'real named part: '+name);
  const source=sourceFromGLB(glb),sourceJSON=JSON.stringify(source.toJSON());let lookups=0;
  const library={async get(id){assert.equal(id,asset.id);lookups++;return source;}};
  const result=await createSearchProp(p.id,{catalogue,library});assert.equal(result.userData.searchProp.renderSource,'licensed-model');assert.ok(moving(result).length);
  assert.equal(JSON.stringify(source.toJSON()),sourceJSON,'source meshes are never reparented or mutated');
  setSearchPropOpen(result,1);const result2=await createSearchProp(p.id,{catalogue,library});assert.equal(lookups,1);assert.equal(result2.userData.searchPropOpen,undefined);
  const b=new T.Box3().setFromObject(result2),s=b.getSize(new T.Vector3());p.dimensions.forEach((n,i)=>close(s.getComponent(i),n,'imported dimensions'));close(b.min.y,0,'imported floor pivot');
 });
}

await check('Unavailable licensed assets retain a working original opening with explicit provenance',async()=>{
 const root=await createSearchProp('search_salvaged_crate',{catalogue,library:{get:async()=>{throw Error('offline fixture');}}});
 assert.equal(root.userData.searchProp.renderSource,'original-fallback');assert.match(root.userData.searchProp.fallbackReason,/offline fixture/);assert.ok(moving(root).length);setSearchPropOpen(root,1);
});

await check('Missing licensed parts produce a working fallback instead of animating a whole cabinet',async()=>{
 const root=await createSearchProp('search_salvaged_cabinet',{catalogue,library:{get:async()=>new T.Group()}});
 assert.equal(root.userData.searchProp.renderSource,'original-fallback');assert.match(root.userData.searchProp.fallbackReason,/part missing/);
});

await check('Rendering does not mutate catalogue or introduce gameplay state',()=>{
 assert.equal(JSON.stringify(catalogue),before);
 for(const p of catalogue.props)for(const field of ['loot','items','savedState','capacity','guaranteed','mission'])assert.equal(p[field],undefined);
});
console.log(`${checks} searchable prop tests passed; ${catalogue.props.length} variants; composite maximum ${maxMeshes} meshes, ${maxTriangles} triangles.`);
