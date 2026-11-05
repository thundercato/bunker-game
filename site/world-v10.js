import * as T from './vendor/three.js';
import{World as DeadAirWorld,DATA}from'./world-v9.js';
import{zoneAt,terrainHeight}from'./terrain.js';
import{ItemModels}from'./item-models.js';
export{DATA};
export class World extends DeadAirWorld{
 constructor(canvas,quality='balanced'){super(canvas,quality);this.modelCounts10={tables:0,containers:0,beds:0,buildingDetails:0,decorations:0,looseItems:0};this.loosePending10=new Set();this.extraModelErrors=[];this.v10Ready=this.v9Ready.then(()=>this.loadFieldcraft());}
 table(x,z,w=2.4,d=1.1,y=0){const before=new Set(this.scene.children),top=super.table(x,z,w,d,y),parts=this.scene.children.filter(m=>!before.has(m));for(const m of parts)m.userData.keep=true;(this.tableRecords10??=[]).push({x,z,w,d,y,top,parts});return top;}
 box(w,h,d,x,y,z,mat=this.mat?.concrete,parent=this.scene,solid=false){const m=super.box(w,h,d,x,y,z,mat,parent,solid);if(w===1.45&&h===.36&&d===2.3){m.userData.keep=true;(this.bedRecords10??=[]).push({x,z,y:0,frame:m,parent});}return m;}
 async model(id,spec={}){const t=await this.library.template(id,spec.parts||null,'bottom'),root=t.clone(true);root.traverse(o=>{o.userData={};o.castShadow=true;o.receiveShadow=true;});if(spec.rotate)root.rotation.set(...spec.rotate);root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),centre=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),holder=new T.Group();root.position.sub(new T.Vector3(centre.x,box.min.y,centre.z));holder.add(root);holder.scale.set(...(spec.dim?spec.dim.map((n,i)=>n/Math.max(.001,size.getComponent(i))):[1,1,1].map(()=>spec.size?spec.size/Math.max(size.x,size.y,size.z):1)));holder.userData.asset=id;return holder;}
 attach(model,x,y,z,{zone=zoneAt(x,z),yaw=0,interactive=null,occlude=true,cull=75}={}){model.position.set(x,y,z);model.rotation.y=yaw;model.userData={...model.userData,zone,keep:true,v10Asset:model.userData.asset,centre:[x,z],cull:zone==='base'?22:cull};model.visible=this.currentZone===zone;this.scene.add(model);this.importedProps.push(model);model.updateMatrixWorld(true);model.traverse(o=>{if(o.isMesh){o.userData.zone=zone;if(interactive)o.userData.interact=interactive;if(occlude&&!o.material?.transparent)this.occluders.push(o)}});return model;}
 hideVisual(o){o.traverse(m=>{if(m.isMesh){m.material=new T.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false});m.castShadow=false;m.receiveShadow=false;}});}
 async loadFieldcraft(){
  const response=await fetch('./assets/v10/model-manifest.json');if(!response.ok)throw Error('Fieldcraft model manifest unavailable');const manifest=await response.json();this.library.files={...this.library.files,...Object.fromEntries(manifest.filter(r=>r.path).map(r=>[r.id,r.path]))};this.models10=new ItemModels(this.library,DATA.catalogue);
  // Reuse prototype geometries and let the browser decode only selected GLB assets.
  await this.models10.preload();await this.replaceFurniture10();await this.dressBuildings10();await this.dressExterior10();this.updateLooseItems10();this.scene.updateMatrixWorld(true);this.setZone(this.currentZone);this.ready10=true;return this.info();
 }
 async replaceFurniture10(){
  for(const r of this.tableRecords10||[]){try{const root=await this.model('painted_wooden_table',{dim:[r.w,.985,r.d]});const it=r.top.userData.interact||null;this.attach(root,r.x,r.y,r.z,{interactive:it});if(it){it.obj=root;root.userData.interact=it;}for(const p of r.parts){p.parent?.remove(p);this.occluders=this.occluders.filter(o=>o!==p);}this.modelCounts10.tables++;}catch(e){this.extraModelErrors.push('table: '+e.message)}}
  for(const c of DATA.containers){const rec=this.containerMeshes[c.id];if(!rec)continue;try{const profile=c.profile,wall=['cupboard','medical'].includes(profile),height=profile==='locker'?1.90:wall?1.05:.78,width=profile==='crate'?1.15:.90;
    const id=profile==='drawers'?'vintage_wooden_drawer_01':profile==='locker'?'painted_wooden_cabinet_02':profile==='crate'?'wooden_crate_01':profile==='chest'?'old_military_crate':profile==='medical'?'medical_box':'painted_wooden_cabinet';
    const root=await this.model(id,{dim:[width,height,.56]});const old=[...rec.group.children];for(const child of old)rec.group.remove(child);root.position.set(0,wall?.85:0,0);rec.group.add(root);const it=rec.group.userData.interact;root.traverse(o=>{o.userData.zone=it.zone;o.userData.interact=it;});root.userData.asset=id;rec.model10=root;this.modelCounts10.containers++;
   }catch(e){this.extraModelErrors.push(c.id+': '+e.message)}}
  for(const r of this.bedRecords10||[]){try{const root=await this.model('old_bed_frame',{dim:[1.48,1.1,2.32]});this.attach(root,r.x,0,r.z,{occlude:false,cull:45});this.hideVisual(r.frame);this.modelCounts10.beds++;}catch(e){this.extraModelErrors.push('bed: '+e.message)}}
 }
 async dressBuildings10(){
  for(const b of DATA.buildings){if(b.kind==='pier'||b.id==='base')continue;const wooden=b.kind==='cottage'||['hut','forester','supply','east1','east2','camp'].includes(b.id);try{
   if(wooden){const height=b.floors===2?6.2:3.02;
    for(const side of [-1,1]){const root=await this.model('modular_wooden_pier',{parts:['modular_wooden_pier_planks$'],rotate:[Math.PI/2,0,0],dim:[b.d-.12,height,.075]});this.attach(root,b.x+side*(b.w/2+.16),.02,b.z,{yaw:side*Math.PI/2,occlude:false,cull:85});this.modelCounts10.buildingDetails++;}
    const back=await this.model('modular_wooden_pier',{parts:['modular_wooden_pier_planks$'],rotate:[Math.PI/2,0,0],dim:[b.w-.1,height,.075]});this.attach(back,b.x,.02,b.z-b.d/2-.16,{yaw:Math.PI,occlude:false,cull:85});this.modelCounts10.buildingDetails++;
   }
   // Imported window frames sit away from the existing wall plane, clear of entrances.
   if(b.w>=7){for(const side of [-1,1]){const root=await this.model('modular_factory_facade',{parts:['window_centered_medium_03$'],dim:[1.15,1.03,.16]});this.attach(root,b.x+side*b.w*.31,1.34,b.z+b.d/2+.21,{occlude:false,cull:80});this.modelCounts10.buildingDetails++;}}
   if(!wooden&&b.w>9){const root=await this.model('modular_factory_facade',{parts:['cornice02_standard_standard_01$'],dim:[b.w+.15,.16,.18]});this.attach(root,b.x,b.floors===2?6.31:2.98,b.z+b.d/2+.18,{occlude:false,cull:110});this.modelCounts10.buildingDetails++;}
  }catch(e){this.extraModelErrors.push(b.id+' exterior: '+e.message)}}
 }
 async dressExterior10(){
  const placements=[['wooden_picnic_table',-140,-251,2.6,0],['wooden_picnic_table',-135,-259,2.5,1.3],['wooden_picnic_table',29,-109,2.5,.2],['plastic_crate_01',-80,-146,.58,.2],['plastic_crate_01',-79,-146,.58,-.1],['plastic_crate_01',230,-491,.58,0],['metal_trash_can',-34,-177,.85,0],['metal_trash_can',16,-176,.85,0],['metal_trash_can',-87,-136,.85,0],['metal_trash_can',241,-490,.9,0],['wooden_ladder',-110,-80,2.8,.3],['worn_metal_rack',235,-520,2.2,0],['worn_metal_rack',239,-520,2.2,0],['painted_wooden_nightstand',-515,43.7,.8,0]];
  for(const[id,x,z,size,yaw]of placements){try{const root=await this.model(id,{size});const y=zoneAt(x,z)==='field'?terrainHeight(x,z):0;this.attach(root,x,y,z,{yaw,occlude:false});this.modelCounts10.decorations++;}catch(e){this.extraModelErrors.push(id+': '+e.message)}}
  try{const oil=await this.model('oil_tin',{size:.21});this.attach(oil,-486.85,.988,27.4,{occlude:false});this.modelCounts10.decorations++;}catch(e){this.extraModelErrors.push(e.message)}
  // Shuttered industrial windows are details, not fake open paths through a wall.
  for(const b of DATA.buildings.filter(b=>!b.editorScene&&['industrial','clinic'].includes(b.kind)).slice(0,5)){try{const root=await this.model('rollershutter_window_01',{dim:[1.05,1.3,.12]});this.attach(root,b.x-b.w*.32,1.2,b.z-b.d/2-.18,{yaw:Math.PI,occlude:false});this.modelCounts10.buildingDetails++;}catch(e){this.extraModelErrors.push(e.message)}}
 }
 updatePhysicalLoot9(){super.updatePhysicalLoot9();this.updateLooseItems10();}
 updateLooseItems10(){if(!this.models10||!this.modelCounts10)return;for(const[id,g]of Object.entries(this.pickups)){if(g.userData.item10||this.loosePending10.has(id))continue;const key=this.state?.loose[id]?.kind;if(!DATA.catalogue[key])continue;this.loosePending10.add(id);this.models10.clone(key,this.models10.descriptor(key).worldSize||.2).then(root=>{if(!g.parent){this.loosePending10.delete(id);return;}const it=g.userData.interact;for(const c of [...g.children])g.remove(c);root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root);root.position.y=.02-b.min.y;g.add(root);const hit=new T.Mesh(new T.BoxGeometry(Math.max(.22,(this.models10.descriptor(key).worldSize||.2)),.18,.23),new T.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false}));hit.position.y=.11;g.add(hit);g.traverse(o=>{o.userData.interact=it});g.userData.item10=key;g.userData.asset9=true;this.modelCounts10.looseItems++;this.loosePending10.delete(id);}).catch(e=>{this.extraModelErrors.push('loose '+key+': '+e.message);this.loosePending10.delete(id)})}}
 updateState(s,loot){super.updateState(s,loot);this.updateLooseItems10();}
 info(){return {...super.info(),build:'Fieldcraft 10.0',fieldcraft:this.modelCounts10,itemVisuals:this.models10?.info(),fieldcraftErrors:this.extraModelErrors||[]};}
}
