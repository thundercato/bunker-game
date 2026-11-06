#!/usr/bin/env node
/** Dependency-free export of a bounded, pinned Field Signal scene. No browser state. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from '../../../site/vendor/three.js';
import {createCampaignInteriors} from '../../../site/campaign-interiors.js';
import {createWorldDocument, compileBuilding, toWorld} from '../../../site/world-document.js';
import {createSearchProp, validateSearchPropCatalogue} from '../../../site/search-props.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const native=path.join(root,'native/apple');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const fail=m=>{throw Error(m)};
const rounded=n=>{if(!Number.isFinite(n))fail('Non-finite exported number');return Math.round(n*1e6)/1e6||0};
const vector=v=>v.map(rounded);
const safeID=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]+$/.test(v);

export function parseGLB(bytes){
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)fail('Invalid GLB header');
 let doc,bin;for(let i=12;i<bytes.length;){const size=bytes.readUInt32LE(i),type=bytes.readUInt32LE(i+4);if(i+8+size>bytes.length)fail('Truncated GLB chunk');const b=bytes.subarray(i+8,i+8+size);if(type===0x4e4f534a)doc=JSON.parse(b.toString('utf8'));if(type===0x004e4942)bin=b;i+=size+8;}
 if(!doc||!bin||doc.extensionsRequired?.length)fail('Missing GLB payload or unsupported required extension');
 if(doc.buffers.length!==1||doc.buffers[0].uri)fail('Only embedded single-buffer GLB supported');
 return {doc,bin};
}
export function accessor(doc,bin,id){
 const a=doc.accessors[id];if(!a||a.sparse)fail('Missing/sparse accessor unsupported');
 const view=doc.bufferViews[a.bufferView];if(!view||view.buffer!==0)fail('Invalid buffer view');
 const count={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],spec={5121:['readUInt8',1,255],5123:['readUInt16LE',2,65535],5125:['readUInt32LE',4,4294967295],5126:['readFloatLE',4,1]}[a.componentType];
 if(!count||!spec)fail('Unsupported accessor type');
 const start=(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||count*spec[1];
 if(stride<count*spec[1]||start+(a.count-1)*stride+count*spec[1]>(view.byteOffset||0)+view.byteLength||start+(a.count-1)*stride+count*spec[1]>bin.length)fail('Accessor outside buffer view');
 const out=[];for(let i=0;i<a.count;i++)for(let j=0;j<count;j++)out.push(bin[spec[0]](start+i*stride+j*spec[1])/(a.normalized?spec[2]:1));return out;
}

const outputs=new Map();
function output(name,data){outputs.set(name,Buffer.isBuffer(data)?data:Buffer.from(typeof data==='string'?data:JSON.stringify(data)+'\n'));}
function meshFromGLB(assetID,bytes,sourcePath){
 const {doc,bin}=parseGLB(bytes),meshes=[];
 const visit=(index,parent,ancestors=new Set())=>{
  if(ancestors.has(index))fail('Cyclic GLB scene graph');const node=doc.nodes[index];if(!node)fail('Missing GLB node');
  const local=new T.Matrix4();if(node.matrix)local.fromArray(node.matrix);else local.compose(new T.Vector3(...(node.translation||[0,0,0])),new T.Quaternion(...(node.rotation||[0,0,0,1])),new T.Vector3(...(node.scale||[1,1,1])));
  const world=new T.Matrix4().multiplyMatrices(parent,local),normal=new T.Matrix3().getNormalMatrix(world);
  if(node.mesh!==undefined)for(const p of doc.meshes[node.mesh].primitives){
   if((p.mode??4)!==4||p.targets||p.extensions)fail('Only static triangle geometry supported');
   const positions=accessor(doc,bin,p.attributes.POSITION),normals=accessor(doc,bin,p.attributes.NORMAL),indices=p.indices===undefined?Array.from({length:positions.length/3},(_,i)=>i):accessor(doc,bin,p.indices);
   const colors=p.attributes.COLOR_0===undefined?[]:accessor(doc,bin,p.attributes.COLOR_0);
   const uvs=p.attributes.TEXCOORD_0===undefined?[]:accessor(doc,bin,p.attributes.TEXCOORD_0);
   for(let i=0;i<positions.length;i+=3){const v=new T.Vector3(...positions.slice(i,i+3)).applyMatrix4(world);positions.splice(i,3,...v.toArray());const n=new T.Vector3(...normals.slice(i,i+3)).applyMatrix3(normal).normalize();normals.splice(i,3,...n.toArray());}
   const material=doc.materials[p.material]||{},pbr=material.pbrMetallicRoughness||{};
   const m={positions:vector(positions),normals:vector(normals),colors:vector(colors),indices,baseColor:pbr.baseColorFactor||[1,1,1,1],doubleSided:material.doubleSided===true};
   if(uvs.length)m.uvs=vector(uvs);
   const tex=pbr.baseColorTexture;if(tex){const image=doc.images[doc.textures[tex.index].source];let textureBytes,mime=image.mimeType;if(image.uri){const resolved=path.resolve(root,path.dirname(sourcePath),image.uri);if(!resolved.startsWith(path.join(root,'site/assets')+path.sep)||!/^[-a-zA-Z0-9_./]+\.png$/.test(image.uri))fail('Unsafe external texture URI');textureBytes=fs.readFileSync(resolved);mime='image/png';}else{const view=doc.bufferViews[image.bufferView];if(!view||!['image/png','image/jpeg'].includes(mime))fail('Unsupported embedded texture');textureBytes=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);}const name=`${assetID}-${tex.index}.${mime==='image/png'?'png':'jpg'}`;output(`Textures/${name}`,textureBytes);m.texture=name;m.alphaMode=material.alphaMode||'OPAQUE';m.alphaCutoff=material.alphaCutoff??0.5;}
   meshes.push(m);
  }
  for(const child of node.children||[])visit(child,world,new Set([...ancestors,index]));
 };
 for(const i of doc.scenes[doc.scene||0].nodes)visit(i,new T.Matrix4());
 return normaliseMesh(meshes);
}
function normaliseMesh(meshes){
 if(!meshes.length)fail('Empty asset');const minimum=[Infinity,Infinity,Infinity],maximum=[-Infinity,-Infinity,-Infinity];
 for(const m of meshes){if(m.positions.length%3||m.normals.length!==m.positions.length||m.indices.length%3)fail('Invalid mesh attributes');for(const i of m.indices)if(!Number.isInteger(i)||i<0||i>=m.positions.length/3)fail('Invalid triangle index');for(let i=0;i<m.positions.length;i++){minimum[i%3]=Math.min(minimum[i%3],m.positions[i]);maximum[i%3]=Math.max(maximum[i%3],m.positions[i]);}}
 const dimensions=maximum.map((n,i)=>rounded(n-minimum[i]));if(dimensions.some(x=>x<=0))fail('Degenerate mesh bounds');const pivot=[(minimum[0]+maximum[0])/2,minimum[1],(minimum[2]+maximum[2])/2];
 for(const m of meshes)m.positions=m.positions.map((n,i)=>rounded(n-pivot[i%3]));
 return {format:'field-signal-native-mesh',version:1,dimensions,meshes};
}
async function meshFromRecipe(id,catalogue){
 const scene=await createSearchProp(id,{catalogue});scene.updateMatrixWorld(true);const meshes=[];
 scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld),p=g.getAttribute('position'),n=g.getAttribute('normal'),c=g.getAttribute('color'),mat=o.material;
  if(Array.isArray(mat))fail('Recipe multi-material needs explicit split');
  const colour=c?Array.from(c.array):[];
  if(c&&c.itemSize===3){const rgba=[];for(let i=0;i<colour.length;i+=3)rgba.push(...colour.slice(i,i+3),1);colour.splice(0,colour.length,...rgba);}
  meshes.push({positions:vector(Array.from(p.array)),normals:vector(Array.from(n.array)),colors:vector(colour),indices:g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i),baseColor:[...mat.color.toArray(),mat.opacity??1],doubleSided:mat.side===T.DoubleSide});g.dispose();
 });return normaliseMesh(meshes);
}

export function validateScene(scene){
 if(scene.format!=='field-signal-native-scene'||scene.version!==1||!safeID(scene.buildingID))fail('Unsupported scene');
 const parentIDs=new Set(scene.objects.map(o=>o.parentID).filter(Boolean));
 const ids=new Set();for(const o of scene.objects){if(!safeID(o.id)||ids.has(o.id))fail('Duplicate/invalid scene ID '+o.id);ids.add(o.id);for(const field of ['position','size'])if(o[field]?.length!==3||o[field].some(n=>!Number.isFinite(n)))fail('Invalid '+field);if(o.size.some(n=>n<=0)||!Number.isFinite(o.yaw))fail('Invalid scene dimensions');if(o.parentID&&!safeID(o.parentID))fail('Invalid parent ID');}
 const interactionIDs=new Set();for(const i of scene.interactions){if(!safeID(i.id)||interactionIDs.has(i.id)||!ids.has(i.objectID))fail('Invalid interaction binding '+i.id);interactionIDs.add(i.id);if(i.itemID&&!scene.items.some(x=>x.id===i.itemID))fail('Unknown item');}
 for(const c of scene.colliders){if(!ids.has(c.id)&&!parentIDs.has(c.parentID))fail('Orphan collider '+c.id);if(c.doorID&&!scene.interactions.some(i=>i.id===c.doorID&&i.kind==='door'))fail('Unknown door collider');}
 return scene;
}

export function verifySourceLock(lock,readFile=read){
 if(lock.format!=='field-signal-native-source-lock'||lock.version!==1||!/^([a-f0-9]{40})$/.test(lock.revision))fail('Invalid source lock');
 for(const [file,hash]of Object.entries(lock.files))if(sha(readFile(file))!==hash)fail('Pinned source changed: '+file+'. Rebase explicitly; never relabel changed content.');
}
async function main(){
 const lock=json('native/apple/Tools/source-lock.json');
 verifySourceLock(lock);
 const source=json('site/world.json'),catalogue=validateSearchPropCatalogue(json('site/search-props.json'));
 const layout=createCampaignInteriors(source).find(x=>x.buildingId==='forester');
 const document=createWorldDocument({source,sourceRevision:lock.revision,layouts:[layout]});
 const b=document.authoring.buildings.find(x=>x.id==='forester');Object.assign(b,{y:0,foundation:'manual'});
 const compiled=compileBuilding(document,'forester',{source,sourceRevision:lock.revision});
 const scene={format:'field-signal-native-scene',version:1,source:{revision:lock.revision,worldSHA256:lock.files['site/world.json']},buildingID:'forester',name:layout.name,spawn:compiled.spawn.position.map(rounded),objects:[],colliders:[],stairs:[],interactions:[],items:[]};
 const objects=scene.objects,world=(o,p)=>toWorld({position:o.position,yaw:o.yaw},p);
 for(const o of compiled.objects){
  const shared={parentID:o.id,name:o.name,yaw:rounded(o.yaw),material:o.material};
  if(['prop','light','stairs'].includes(o.type)){objects.push({id:o.id,kind:o.type,position:vector(o.position),size:vector(o.size),...shared,...(o.asset?{assetID:o.asset}:{})});if(o.type==='stairs')scene.stairs.push({id:o.id,position:vector(o.position),size:vector(o.size),yaw:rounded(o.yaw)});}
  else for(const[pieceIndex,p]of o.pieces.entries()){const centre=world(o,p.position),position=[centre[0],centre[1]-(o.type==='floor'?-p.size[1]/2:p.size[1]/2),centre[2]];objects.push({id:`${o.id}-piece-${pieceIndex}`,kind:o.type,position:vector(position),size:vector(p.size),...shared});}
  if(o.type==='doorway'&&o.doorId){objects.push({id:`${o.id}-leaf`,kind:'door',doorID:o.doorId,position:vector(o.position),size:[o.opening.width,o.opening.height,.1],...shared});}
 }
 // Compiled colliders use bottom-centred world poses, exactly as the browser.
 scene.colliders=compiled.colliders.filter(c=>!c.doorId||compiled.interactions.some(i=>i.type==='door'&&i.id===c.doorId)).map((c,index)=>({id:`collider-${index}`,parentID:c.id,position:vector([c.x,c.y,c.z]),size:vector([c.w,c.h,c.d]),yaw:rounded(c.yaw),...(c.doorId?{doorID:c.doorId}:{})}));
 // Search content is a deliberate tiny native fixture, not a port of weighted loot.
 const itemIDs=['med','water','wire'];const candidates=Object.entries(source.catalogue).filter(([id])=>itemIDs.includes(id)).map(([id,data])=>({id,...data}));
 if(candidates.length!==itemIDs.length)fail('Native fixture item no longer exists');scene.items=candidates.map(x=>({id:x.id,name:x.name}));
 for(const [index,i]of compiled.interactions.entries()){const o=layout.objects.find(o=>o.id===i.objectId),entity=i.type==='door'?source.buildings.find(x=>x.id===i.id)||source.partitions.find(x=>x.id===i.id):source.containers.find(x=>x.id===i.id);const item=i.type==='container'?itemIDs[index%itemIDs.length]:i.type==='loose'?'wire':undefined;
  scene.interactions.push({id:i.id,kind:i.type,objectID:i.type==='door'?`${i.objectId}-leaf`:i.objectId,name:entity?.name||o?.name||i.id,position:vector(i.position),...(item?{itemID:item}:{})});
 }
 // A visible copper-wire coil uses the source item's wire silhouette; collection
 // hides this child alone, retaining its source-authored physical table.
 const loose=scene.interactions.find(i=>i.id==='forester_table');
 objects.push({id:'native-loot-forester_table',kind:'loot',position:[loose.position[0],rounded(loose.position[1]+.02),loose.position[2]],size:[.18,.09,.18],yaw:0,material:'copper'});
 // Native-only bounded approach, no claim of compiling the campaign terrain.
 objects.push({id:'native-outdoor',kind:'floor',position:[-30,0,-59],size:[48,.12,48],yaw:0,material:'earth'});
 objects.push({id:'native-path',kind:'floor',position:[-30,.01,-46],size:[2.4,.02,15],yaw:0,material:'gravel'});
 for(const [index,x,z,height]of [[0,-41,-48,13],[1,-18,-47,14],[2,-43,-69,12],[3,-17,-70,13],[4,-40,-77,14]])objects.push({id:`native-pine-${index}`,kind:'prop',assetID:'pine_01',position:[x,0,z],size:[height*.48,height,height*.48],yaw:rounded(index*1.37),material:'wood'});
 objects.push({id:'native-log',kind:'prop',assetID:'campaign_tree_log_small',position:[-37,0,-48],size:[1.2,.35,.45],yaw:.6,material:'wood'});
 const registry=json('site/assets/campaign/registry.json').assets,v11=json('site/assets/v11/models.json'),v10=json('site/assets/v10/model-manifest.json'),assets=[];
 for(const id of [...new Set(objects.map(o=>o.assetID).filter(Boolean))].sort()){
  let mesh,provenance;const a=registry.find(a=>a.id===id)||v11.find(a=>a.id===id)||v10.find(a=>a.id===id),p=catalogue.props.find(p=>p.id===id);
  if(a){const bytes=read('site/'+a.path);if(sha(bytes)!==(a.sha256||lock.files['site/'+a.path]))fail('Asset digest mismatch '+id);mesh=meshFromGLB(id,bytes,'site/'+a.path);provenance={id,authors:a.authors,source:a.source,licence:a.licence,sourcePath:'site/'+a.path,sourceSHA256:sha(bytes),modifications:'Decoded static GLB triangles; baked node transforms; normalised bottom-centre pivot; exported native mesh JSON; preserved colours and diffuse textures.'};}
  else if(p){mesh=await meshFromRecipe(id,catalogue);provenance={id,...p.provenance,sourcePath:'site/search-props.js',sourceSHA256:lock.files['site/search-props.js'],modifications:'Baked canonical Field Signal procedural closed-pose recipe, including moving-assembly transforms; native mesh JSON. Uses original-composite tier rather than optional licensed-model replacement.'};}
  else fail('Unlicensed/unknown asset '+id);
  output(`Meshes/${id}.json`,mesh);assets.push({...provenance,triangles:mesh.meshes.reduce((n,m)=>n+m.indices.length/3,0),dimensions:mesh.dimensions});
 }
 validateScene(scene);
 output('scene.json',scene);output('world-document.json',document);
 output('provenance.json',{format:'field-signal-native-provenance',version:1,sourceRevision:lock.revision,assets});
 for(const [src,dest]of [['site/assets/campaign/licences/furniture-kit.txt','furniture-kit.txt'],['site/assets/campaign/licences/survival-kit.txt','survival-kit.txt'],['site/assets/v11/EZ-TREE-LICENSE.txt','EZ-TREE-LICENSE.txt']])output('Licences/'+dest,read(src));
 output('Licences/FIELD_SIGNAL_CONTENT.txt','Field Signal scene and original procedural search recipes are reused from this repository at the revision recorded in provenance.json. Preserve the repository licence and the third-party notices in this directory. Native additions: bounded approach plane/path; deterministic test loot fixture.\n');
 if(process.argv.includes('--check')){
  for(const[name,bytes]of outputs){const file=path.join(native,'Resources',name);if(!fs.existsSync(file)||!fs.readFileSync(file).equals(bytes))fail('Generated output differs: '+name);}
  const existing=fs.readdirSync(path.join(native,'Resources/Meshes'));if(existing.some(name=>!outputs.has('Meshes/'+name)))fail('Unexpected stale generated mesh');
  console.log(`Native asset reproducibility passed: ${outputs.size} files, ${assets.length} assets, ${objects.length} objects.`);
 }else{for(const[name,bytes]of outputs){const file=path.join(native,'Resources',name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}console.log(`Exported Forester’s cottage: ${outputs.size} files, ${assets.length} assets, ${objects.length} objects.`);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
