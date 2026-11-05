import * as T from './vendor/three.js';
import {World as FieldcraftWorld,DATA} from './world-v10.js';
import {terrainHeight,zoneAt,segmentDistance} from './terrain.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
export {DATA};
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export class World extends FieldcraftWorld {
 constructor(canvas,quality='balanced'){
  super(canvas,quality);this.overgrowthErrors=[];this.environmentCounts={vehicles:0,buildings:0,facadeModules:0,roofs:0,rocks:0,stumps:0,deadwood:0,ferns:0};this.forestLOD={near:0,far:0,sourceTrees:0,updates:0};this.naturePools=[];this.natureRecords=[];this.exteriorGroups=[];this.lastForestUpdate=-999;this.environmentReady=false;
  this.v11Ready=this.v10Ready.then(()=>this.loadOvergrowth());
 }
 // These older add-on skins are replaced, not hidden underneath another layer.
 async dressBuildings10(){}
 addVillageDetails(){}
 buildHut(){
  this.buildingParts11??=[];this.captureBuilding11=true;const before=new Set(this.scene.children);super.buildHut();this.captureBuilding11=false;
  for(const m of this.scene.children){if(before.has(m)||!m.isMesh||m.geometry?.attributes?.position?.count!==3)continue;const b=DATA.buildings.find(b=>Math.abs(m.position.x-b.x)<.2&&Math.abs(Math.abs(m.position.z-b.z)-b.d/2)<.2);if(b){m.userData.keep=true;this.buildingParts11.push({m,b,role:'gable'});}}
 }
 box(w,h,d,x,y,z,mat=this.mat?.concrete,parent=this.scene,solid=false){
  const m=super.box(w,h,d,x,y,z,mat,parent,solid);
  if(this.captureBuilding11&&parent===this.scene){const b=DATA.buildings.find(b=>Math.abs(x-b.x)<=b.w/2+.5&&Math.abs(z-b.z)<=b.d/2+.5);if(b){let role=null;if(h<.3&&y>3&&w>b.w*.4&&d>b.d*.8)role='roof';else if(h>.4&&((w<=.27&&Math.abs(Math.abs(x-b.x)-b.w/2)<.3)||(d<=.27&&Math.abs(Math.abs(z-b.z)-b.d/2)<.3)))role='wall';if(role){m.userData.keep=true;(this.buildingParts11??=[]).push({m,b,role});}}}
  return m;
 }
 buildForest(){
  const before=new Set(this.scene.children);super.buildForest();this.treeLocations11=[];const matrix=new T.Matrix4(),pos=new T.Vector3(),rot=new T.Quaternion(),scale=new T.Vector3();
  for(const g of this.forestChunks){const mesh=g.children.find(o=>o.isInstancedMesh);for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.decompose(pos,rot,scale);this.treeLocations11.push({x:pos.x,z:pos.z,y:pos.y-scale.y*5,s:scale.y*.88,q:rot.clone(),variant:this.treeLocations11.length%2});}}
  this.legacyNature11=this.scene.children.filter(o=>!before.has(o)&&o.isInstancedMesh&&o.geometry?.type==='DodecahedronGeometry');
 }
 buildVehicles(){super.buildVehicles();this.vehicleRecords11=DATA.vehicles.map(c=>({c,it:this.interact.find(i=>i.id===c.id)}));}
 async loadOvergrowth(){
  try{
   const manifest=await(await fetch('./assets/v11/models.json')).json();this.library.files={...this.library.files,...Object.fromEntries(manifest.map(x=>[x.id,x.path]))};this.environmentManifest=manifest;
   await this.loadSurfaces11();await this.replaceVehicles11();await this.rebuildBuildings11();await this.makeForest11();await this.scatterNature11();this.environmentReady=true;this.scene.updateMatrixWorld(true);this.setZone(this.currentZone);this.lastForestUpdate=-999;
  }catch(e){this.overgrowthErrors.push(e.message);console.error('Overgrowth scene:',e);throw e;}return this.info();
 }
 async loadSurfaces11(){
  this.naturalMaterials={};const manifest=await(await fetch('./assets/v11/surfaces.json')).json();for(const row of manifest){const maps={};for(const [slot,path]of Object.entries(row.files)){const tx=await this.loader.loadAsync(path);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());if(slot==='colour')tx.colorSpace=T.SRGBColorSpace;maps[slot]=tx;}
   const m=new T.MeshStandardMaterial({map:maps.colour,normalMap:maps.normal,roughnessMap:maps.rough,roughness:.95,metalness:row.role==='rust'?.25:0,color:row.role==='wood'?'#b9b6a7':row.role==='brick'?'#d4cfbf':'#d3d4c7'});m.normalScale.set(.45,.45);this.naturalMaterials[row.role]=m;
  }
 }
 texturedUV11(mesh,scale=2){const g=mesh.geometry,a=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;if(!u||!n)return;for(let i=0;i<a.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),x=a.getX(i)+mesh.position.x,y=a.getY(i)+mesh.position.y,z=a.getZ(i)+mesh.position.z;u.setXY(i,(ny>.7?x:nx>.7?z:x)/scale,(ny>.7?z:y)/scale);}u.needsUpdate=true;}
 async replaceVehicles11(){
  this.vehicleModels11=[];
  for(let i=0;i<this.vehicleRecords11.length;i++){const {c,it}=this.vehicleRecords11[i];if(!it)throw Error('Missing vehicle interaction '+c.id);const g=it.obj,old=new Set();g.traverse(o=>old.add(o));this.occluders=this.occluders.filter(o=>!old.has(o));for(const o of [...g.children])g.remove(o);
   const covered=i===4||i===7,id=covered?'covered_car':'crashed_suv';const root=await this.model(id,{rotate:covered?undefined:[0,Math.PI/2,0],dim:[1.80,covered?1.40:1.55,3.88]});root.userData.vehicleAsset=id;
   root.traverse(o=>{if(o.isMesh){o.userData={interact:it,zone:'field'};o.castShadow=true;o.receiveShadow=true;if(!covered){o.material=o.material.clone();o.material.color.multiplyScalar(.82+i*.025);o.material.roughness=.95;}this.occluders.push(o);}});g.add(root);const targetBox=new T.Mesh(new T.BoxGeometry(1.78,1.35,3.76),new T.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false}));targetBox.position.y=.80;targetBox.userData={interact:it,zone:'field',interactionOnly:true};g.add(targetBox);g.userData.centre=[c.x,c.z];g.userData.cull=100;g.userData.keep=true;g.userData.vehicle11=c.id;g.updateMatrixWorld(true);it.name=covered?'Search covered car':'Search wrecked SUV';it.anchor.set(c.x,terrainHeight(c.x,c.z)+.95,c.z);this.vehicleModels11.push(root);this.environmentCounts.vehicles++;
  }
 }
 exteriorGroup11(b){const g=new T.Group();g.userData={zone:'field',keep:true,centre:[b.x,b.z],cull:155,building11:b.id};this.scene.add(g);this.exteriorGroups.push(g);return g;}
 batchExterior11(g){g.updateMatrixWorld(true);const groups=new Map(),remove=[];g.traverse(child=>{if(!child.isMesh||child.material.transparent)return;let parts=groups.get(child.material)||[];let geom=child.geometry.clone().applyMatrix4(child.matrixWorld);if(geom.index)geom=geom.toNonIndexed();for(const k of Object.keys(geom.attributes))if(!['position','normal','uv'].includes(k))geom.deleteAttribute(k);if(!geom.attributes.uv)geom.setAttribute('uv',new T.BufferAttribute(new Float32Array(geom.attributes.position.count*2),2));parts.push(geom);groups.set(child.material,parts);remove.push(child);});for(const m of remove)m.parent.remove(m);for(const[mat,parts]of groups){const geom=mergeGeometries(parts,false);if(!geom)throw Error('Exterior geometry formats disagree');geom.computeBoundingSphere();const m=new T.Mesh(geom,mat);m.castShadow=true;m.receiveShadow=true;g.add(m);}}
 
 async rebuildBuildings11(){
  for(const r of this.buildingParts11){if(r.role==='roof'||r.role==='gable'){r.m.parent?.remove(r.m);this.occluders=this.occluders.filter(o=>o!==r.m);}else{const wood=['hut','pier'].includes(r.b.kind);r.m.material=this.naturalMaterials[wood?'wood':r.b.kind==='industrial'?'brick':'plaster'];this.texturedUV11(r.m,wood?2.3:2.8);r.m.receiveShadow=true;}}
  const cornerMat=new T.MeshStandardMaterial({color:'#535f59',roughness:.92}),glass=new T.MeshStandardMaterial({color:'#405454',roughness:.43,metalness:.18});
  for(const b of DATA.buildings){const g=this.exteriorGroup11(b),h=b.floors===2?6.4:3.08,wood=['hut','pier'].includes(b.kind),industrial=b.kind==='industrial';const mat=this.naturalMaterials[wood?'wood':industrial?'brick':'plaster'];
   const oldWalls=this.buildingParts11.filter(r=>r.b.id===b.id&&r.role==='wall').map(r=>r.m);this.occluders=this.occluders.filter(o=>!oldWalls.includes(o));for(const m of oldWalls){m.parent?.remove(m);g.add(m);}
   const roofMat=this.naturalMaterials[industrial||wood?'rust':'roof'];const rise=industrial?Math.min(2.8,b.w*.12):Math.min(2.8,b.w*.22),overhang=.48,w=b.w/2+overhang,d=b.d/2+overhang;
   if(b.id==='hangar'){
    const points=[];for(let zSide of [-1,1])for(let i=0;i<=18;i++){const a=i/18*Math.PI;points.push([b.x+Math.cos(a)*w,h+Math.sin(a)*4.1,b.z+zSide*d]);}const p=[],uv=[];for(let i=0;i<18;i++)for(const k of [i,i+19,i+20,i,i+20,i+1]){p.push(...points[k]);uv.push((k%19)/18*b.w/2,k>=19?b.d/2:0);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const mesh=new T.Mesh(geo,roofMat);g.add(mesh);
   }else{
    for(const side of [-1,1]){const p=[b.x,h+rise,b.z-d,b.x+side*w,h,b.z-d,b.x+side*w,h,b.z+d,b.x,h+rise,b.z-d,b.x+side*w,h,b.z+d,b.x,h+rise,b.z+d];const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(p,3));geom.setAttribute('uv',new T.Float32BufferAttribute([0,0,w/1.8,0,w/1.8,b.d/1.8,0,0,w/1.8,b.d/1.8,0,b.d/1.8],2));geom.computeVertexNormals();const mesh=new T.Mesh(geom,roofMat);mesh.material.side=T.DoubleSide;g.add(mesh);}
    for(const end of [-1,1]){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([b.x-b.w/2,h,b.z+end*b.d/2,b.x+b.w/2,h,b.z+end*b.d/2,b.x,h+rise,b.z+end*b.d/2],3));geo.setAttribute('uv',new T.Float32BufferAttribute([0,0,b.w/2,0,b.w/4,rise/2],2));geo.computeVertexNormals();const m=new T.Mesh(geo,mat);m.material.side=T.DoubleSide;g.add(m);}
   }
   this.environmentCounts.roofs++;
   // Solid corner timber, fascia and gutters are modelled, not a floating decal.
   for(const side of [-1,1]){this.box(.14,h,.14,b.x+side*(b.w/2+.10),h/2,b.z+b.d/2+.12,cornerMat,g);this.box(.14,h,.14,b.x+side*(b.w/2+.10),h/2,b.z-b.d/2-.12,cornerMat,g);this.box(.18,.13,b.d+1,b.x+side*w,h-.04,b.z,cornerMat,g);}
   if(b.id!=='hangar')for(const end of [-1,1])for(const side of [-1,1])this.beam([b.x,h+rise,b.z+end*d],[b.x+side*w,h,b.z+end*d],.065,cornerMat,g);
   if(!industrial){const chimney=this.box(.58,1.5,.65,b.x-b.w*.24,h+rise*.6+.4,b.z-b.d*.18,this.naturalMaterials.brick,g);this.texturedUV11(chimney,1.2);this.box(.72,.12,.8,b.x-b.w*.24,h+rise*.6+1.17,b.z-b.d*.18,cornerMat,g);}
   // Imported residential windows and full surface strips leave the live door aperture free.
   for(let floor=0;floor<(b.floors||1);floor++)for(const side of [-1,1]){
    const id='urban_facade',parts=[industrial?'window_centered_large_03$':'window_centered_small_03$'];const root=await this.model(id,{parts,dim:[industrial?1.55:1.12,1.25,.19]});root.position.set(b.x+side*b.w*.31,floor*3.2+1.34,b.z+b.d/2+.19);root.traverse(o=>{if(o.isMesh)o.material.side=T.DoubleSide});g.add(root);this.environmentCounts.facadeModules++;
   }
   if(!wood){for(const side of [-1,1]){const length=(b.w-2.4)/2;const root=await this.model('urban_facade',{parts:['wall_standard_standard_01$'],dim:[length,h,.025]});root.position.set(b.x+side*(1.2+length/2),.01,b.z+b.d/2+.15);root.traverse(o=>{if(o.isMesh){o.material=mat;const a=o.geometry.attributes.position,u=o.geometry.attributes.uv;for(let k=0;k<a.count;k++)u.setXY(k,(a.getX(k)*root.scale.x+root.position.x)/2.8,(a.getY(k)*root.scale.y)/2.8);u.needsUpdate=true;}});g.add(root);this.environmentCounts.facadeModules++;}}
   // Small porch creates depth at the entrance without narrowing the collision opening.
   if(!industrial&&b.kind!=='pier'){const awning=this.box(3.25,.10,1.15,b.x,2.98,b.z+b.d/2+.55,roofMat,g);awning.rotation.x=.08;this.texturedUV11(awning,1.7);for(const side of [-1,1])this.beam([b.x+side*1.4,2.3,b.z+b.d/2+.2],[b.x+side*1.4,2.92,b.z+b.d/2+.95],.045,cornerMat,g);}
   this.batchExterior11(g);g.traverse(m=>{if(m.isMesh&&!m.material.transparent){m.userData.zone='field';this.occluders.push(m);}});this.environmentCounts.buildings++;
  }
 }
 makePool11(template,max,metadata={}){
  const group=new T.Group();group.userData={zone:'field',keep:true,nature11:true,...metadata};template.updateMatrixWorld(true);const meshes=[];template.traverse(o=>{if(!o.isMesh)return;let geo=o.geometry.clone().applyMatrix4(o.matrixWorld);let mat=o.material.clone();mat.side=T.DoubleSide;if(mat.alphaTest>0||mat.transparent){mat.transparent=false;mat.depthWrite=true;mat.alphaTest=.32;mat.alphaToCoverage=true;}mat.roughness=1;const mesh=new T.InstancedMesh(geo,mat,max);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;group.add(mesh);meshes.push(mesh);});group.visible=false;this.scene.add(group);return{group,meshes,capacity:max};
 }
 async makeForest11(){
  this.forestPools11=[];this.farPools11=[];this.forestLOD.sourceTrees=this.treeLocations11.length;
  for(const g of this.foliageChunks)if(g.userData.grass)g.traverse(m=>{if(m.isInstancedMesh){m.geometry=m.geometry.clone();m.geometry.scale(1,.38,1);}});for(const g of this.forestChunks)this.scene.remove(g);for(const g of this.legacyNature11)this.scene.remove(g);this.forestChunks=[];
  for(let i=0;i<2;i++){
   const tree=await this.library.template('pine_0'+(i+1),null,'bottom');const near=this.makePool11(tree,160,{forestDetail11:true});this.forestPools11.push(near);
   const farGroup=new T.Group();for(let v=0;v<2;v++){const tx=await this.loader.loadAsync('./assets/v11/pine-0'+(i+1)+'-'+v+'.webp');tx.colorSpace=T.SRGBColorSpace;const geo=new T.PlaneGeometry(10.8,15);geo.translate(0,7.2,0);if(v)geo.rotateY(Math.PI/2);const mat=new T.MeshBasicMaterial({map:tx,color:'#6c776b',alphaTest:.38,side:T.DoubleSide,fog:true,depthWrite:true});mat.alphaToCoverage=true;farGroup.add(new T.Mesh(geo,mat));}this.farPools11.push(this.makePool11(farGroup,3400,{forestDistant11:true}));
  }
 }
 safeScatter11(x,z){return zoneAt(x,z)==='field'&&!(x>60&&x<139)&&z<58&&!DATA.buildings.some(b=>Math.abs(x-b.x)<b.w/2+2.2&&Math.abs(z-b.z)<b.d/2+2.2)&&!DATA.roads.some(r=>r.some((b,i)=>i&&segmentDistance(x,z,r[i-1],b)<3.8))&&!DATA.anomalies.some(a=>Math.hypot(x-a.x,z-a.z)<a.radius+1);}
 async scatterNature11(){
  const specs=[['moss_rocks',['rock_moss_set_01_rock01$'],1.3,'rocks'],['moss_rocks',['rock_moss_set_01_rock03$'],1.1,'rocks'],['tree_stump',null,.75,'stumps'],['deadwood',null,2.7,'deadwood'],['fern',null,.75,'ferns']];
  for(let j=0;j<specs.length;j++){const[id,parts,size,kind]=specs[j];const t=await this.model(id,{parts,size});const pool=this.makePool11(t,kind==='ferns'?200:65,{undergrowth11:true});const records=[];
   const step=kind==='ferns'?4:kind==='rocks'?38:kind==='stumps'?92:160;
   for(let i=j*13;i<this.treeLocations11.length;i+=step){const p=this.treeLocations11[i],x=p.x+1.3*Math.sin(i*2.1),z=p.z+1.3*Math.cos(i*1.7);if(!this.safeScatter11(x,z))continue;records.push({x,z,y:terrainHeight(x,z)-.015,s:.65+(i%9)/12,angle:i*2.399});}this.environmentCounts[kind]+=records.length;this.naturePools.push({pool,records,kind});
  }
 }
 fillPool11(pool,items,transform){const o=new T.Object3D();let n=0;for(const r of items){if(n>=pool.capacity)break;transform(o,r);o.updateMatrix();for(const m of pool.meshes)m.setMatrixAt(n,o.matrix);n++;}for(const m of pool.meshes){m.count=n;m.instanceMatrix.needsUpdate=true;}pool.group.visible=n>0&&this.currentZone==='field';return n;}
 updateForest11(p){
  if(!this.environmentReady)return;const zone=zoneAt(p.x,p.z),changed=zone!==this.lastNatureZone||this.quality!==this.lastNatureQuality;
  if(!changed&&this.time-this.lastForestUpdate<.35)return;this.lastForestUpdate=this.time;this.lastNatureZone=zone;this.lastNatureQuality=this.quality;
  const all=[...this.forestPools11,...this.farPools11,...this.naturePools.map(x=>x.pool)];if(zone!=='field'){for(const q of all)q.group.visible=false;this.forestLOD.near=this.forestLOD.far=0;return;}
  const nearMax=this.quality==='low'?28:this.quality==='high'?120:64,range=this.quality==='low'?34:this.quality==='high'?62:46,farRange=this.quality==='low'?115:this.quality==='high'?235:175;
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse)),sphere=new T.Sphere();const inView=r=>{sphere.center.set(r.x,r.y+7*r.s,r.z);sphere.radius=8*r.s;return frustum.intersectsSphere(sphere);};
  const list=this.treeLocations11.map((r,i)=>({...r,i,d:Math.hypot(r.x-p.x,r.z-p.z)})).filter(r=>r.d<farRange&&inView(r)).sort((a,b)=>a.d-b.d);const near=list.filter(r=>r.d<range).slice(0,nearMax),nearIDs=new Set(near.map(r=>r.i)),far=list.filter(r=>!nearIDs.has(r.i)).slice(0,this.quality==='low'?600:this.quality==='high'?1800:1000);const transform=(o,r)=>{o.position.set(r.x,r.y,r.z);o.quaternion.copy(r.q);o.scale.setScalar(r.s);};let n=0,f=0;
  for(let i=0;i<2;i++){n+=this.fillPool11(this.forestPools11[i],near.filter(r=>r.variant===i),transform);f+=this.fillPool11(this.farPools11[i],far.filter(r=>r.variant===i),transform);}this.forestLOD={near:n,far:f,sourceTrees:this.treeLocations11.length,updates:this.forestLOD.updates+1};
  for(const {pool,records,kind}of this.naturePools){const visible=this.renderSettings?.vegetation===false&&kind==='ferns'?[]:records.filter(r=>Math.hypot(r.x-p.x,r.z-p.z)<(this.quality==='low'?28:kind==='ferns'?48:76)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));this.fillPool11(pool,visible,(o,r)=>{o.position.set(r.x,r.y,r.z);o.rotation.set(0,r.angle,0);o.scale.setScalar(r.s);});}
 }
 visibility8(p,zone){super.visibility8(p,zone);if(this.environmentReady){for(const p of [...this.forestPools11,...this.farPools11,...this.naturePools.map(n=>n.pool)])p.group.visible=zone==='field'&&p.meshes.some(m=>m.count>0);}}
 beforeRender8(p,dt){super.beforeRender8(p,dt);this.updateForest11(p);if(zoneAt(p.x,p.z)==='field'){const hour=(this.state?.clock||900)/60%24,day=hour>=6&&hour<18;if(day){this.ambient.intensity*=1.42;this.sun.intensity*=1.02;}this.renderer.toneMappingExposure=(this.renderSettings?.exposure||1.08)*1.08;}}
 info(){return{...super.info(),build:'Overgrowth 11.0',overgrowth:this.environmentCounts,overgrowthReady:this.environmentReady,forestLOD:this.forestLOD,overgrowthErrors:this.overgrowthErrors||[]};}
}
