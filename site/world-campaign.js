import * as T from './vendor/three.js';
import {World as LayoutWorld,DATA} from './world-layout.js';
import {buildDistrictScene} from './district-scene.js';
import {createSearchProp,loadSearchPropCatalogue,setSearchPropOpen,searchPropCollider} from './search-props.js';
import {resolveMovement} from './campaign-core.js';
import {localPoint} from './layout-core.js';
import {previewSurface,insidePreview,moveInPreview} from './world-preview.js';
import {terrainHeight,surfaceHeight,zoneAt,validLand} from './terrain.js';
export {DATA};
export class World extends LayoutWorld {
 constructor(canvas,quality){
  super(canvas,quality);
  if(DATA.campaign)this.v11Ready=this.v11Ready.then(()=>this.loadCampaign());
 }
 container(c){
  const start=this.colliders.length;super.container(c);
  for(const col of this.colliders.slice(start))col.containerId=c.id;
 }
 async loadCampaign(){
  this.legacyModelFamilies=this.library.loaded.size;this.campaignErrors=[];this.campaignModels=new Map();this.campaignSceneViews=new Map();
  const [registry,catalogue]=await Promise.all([fetch('assets/campaign/registry.json').then(r=>r.json()),loadSearchPropCatalogue()]);
  this.library.files={...this.library.files,...Object.fromEntries(registry.assets.map(a=>[a.id,a.path]))};
  this.searchCatalogue=catalogue;
  for(const scene of DATA.campaignScenes){await this.mountBuildingScene(scene);this.campaignSceneViews.set(scene.id,this.layoutPreview);}
  for(const c of DATA.containers){
   const rec=this.containerMeshes[c.id];if(!rec||!c.searchProp||c.editorScene)continue;
   try{
    const model=await createSearchProp(c.searchProp,{library:this.library,catalogue});
    const meshes=new Set();rec.group.traverse(o=>{if(o.isMesh)meshes.add(o);});
    this.occluders=this.occluders.filter(o=>!meshes.has(o));rec.group.clear();rec.group.add(model);
    const floor=c.followTerrain?terrainHeight(c.x,c.z):(c.floor||0),mount=c.searchMount||0;
    rec.group.position.y=floor;model.position.y=mount;
    const it=rec.group.userData.interact;
    model.traverse(o=>{o.userData.interact=it;o.userData.zone=c.zone;});
    const anchor=c.searchAnchor||[0,.7,.3],yaw=c.yaw||0;
    it.anchor.set(c.x+anchor[0]*Math.cos(yaw)+anchor[2]*Math.sin(yaw),floor+mount+anchor[1],c.z-anchor[0]*Math.sin(yaw)+anchor[2]*Math.cos(yaw));
    it.obj=rec.group;rec.searchModel=model;
    model.traverse(o=>{if(o.isMesh)this.occluders.push(o);});
    this.colliders=this.colliders.filter(q=>q.containerId!==c.id);
    const descriptor=catalogue.props.find(p=>p.id===c.searchProp);
    const col=searchPropCollider(descriptor,{x:c.x,y:floor+mount,z:c.z,yaw});
    this.colliders.push({...col,w:c.searchDimensions[0],d:c.searchDimensions[2],yaw,minY:floor+mount,maxY:floor+mount+c.searchDimensions[1],zone:c.zone,containerId:c.id});
    this.campaignModels.set(c.id,model);
   }catch(error){this.campaignErrors.push(c.id+': '+error.message);}
  }
  this.districtScene=await buildDistrictScene(this,DATA.campaignDistricts);
  this.campaignErrors.push(...this.districtScene.errors);
  this.colliders.push(...DATA.campaignGeometry.colliders);
  for(const scene of DATA.campaignScenes)for(const c of scene.colliders)this.colliders.push({...c,minY:c.y,maxY:c.y+c.h,zone:'field'});
  const landings=new Set();for(const route of DATA.campaignGeometry.climbs){
   const key=route.objectId+':'+route.from.y;if(landings.has(key))continue;landings.add(key);
   const marker=new T.Mesh(new T.BoxGeometry(.8,1.3,.2),new T.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false}));
   marker.position.set(route.from.x,route.from.y+.8,route.from.z);marker.userData={zone:route.zone,keep:true};this.scene.add(marker);
   this.addInteract(marker,'climb',route.id,route.name+' · ladder landing',[route.from.x,route.from.y+.8,route.from.z]);
  }
  this.scene.updateMatrixWorld(true);if(this.state)this.updateState(this.state,this.state.loose);
  this.districtScene.updateVisibility(this.state?.player||{x:-510,z:39},this.currentZone,this.quality);
  return this.info();
 }
 movePlayer(p,dx,dz){
  if(!DATA.campaign)return super.movePlayer(p,dx,dz);
  for(const scene of DATA.campaignScenes)if(insidePreview(scene,p.x,p.z,.6)||insidePreview(scene,p.x+dx,p.z+dz,.6)){
   const q=moveInPreview(scene,p,dx,dz,{doorsOpen:false,openDoors:{...Object.fromEntries(scene.layout.objects.filter(o=>o.type==='doorway'&&!o.doorId).map(o=>[o.id,true])),...this.state?.doors}});
   return validLand(q.x,q.z)?q:p;
  }
  const guarded=DATA.campaignGeometry.surfaces.some(s=>{const q=localPoint({position:[s.x,s.y,s.z],yaw:s.yaw},p.x,p.z);return s.y>2&&Math.abs(p.y-s.y)<.2&&Math.abs(q[0])<=s.w/2&&Math.abs(q[1])<=s.d/2;});
  return resolveMovement(p,dx,dz,{preventFall:guarded,colliders:this.colliders,valid:validLand,height:surfaceHeight,zone:zoneAt(p.x,p.z),doors:this.state?.doors,jump:this.jumpOffset||0});
 }
 visibility8(p,zone){super.visibility8(p,zone);this.districtScene?.updateVisibility(p,zone,this.quality);}
 frame(p,dt,options){
  super.frame(p,dt,options);
  for(const rec of Object.values(this.containerMeshes||{})){
   const model=rec.searchModel||rec.group.userData.searchPropModel;
   if(model)setSearchPropOpen(model,Math.min(1,Math.abs(rec.angle||0)/.95));
  }
 }
 info(){return {...super.info(),campaign:DATA.campaign?{id:DATA.campaign.id,baselineModelFamilies:this.legacyModelFamilies,scenes:DATA.campaignScenes.length,searchCatalogue:DATA.campaign.bindingStats.catalogue,placedSearchVariants:DATA.campaign.bindingStats.placed,props:this.campaignModels?.size||0,districts:this.districtScene?.counts||null,climbs:DATA.campaignGeometry.climbs.length,errors:this.campaignErrors||[]}:null};}
}
