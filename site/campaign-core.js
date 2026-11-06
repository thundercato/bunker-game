/* Engine-neutral candidate data. No storage, renderer objects or executable JSON. */
import {clone, worldPoint, localPoint} from './layout-core.js';
import {createWorldDocument} from './world-document.js';
import {compilePreviewWorld, insidePreview, previewSurface} from './world-preview.js';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function compileDistricts(definition) {
 if(definition?.format!=='field-signal-districts/1'||!Array.isArray(definition.districts))throw Error('Unsupported district definition');
 const ids=new Set(),colliders=[],surfaces=[],climbs=[];
 for(const district of definition.districts)for(const object of district.objects){
  if(!object.id||ids.has(object.id))throw Error('Duplicate district object');ids.add(object.id);
  const t=object.transform;
  if(!t||![t.x,t.y,t.z,t.yaw].every(finite))throw Error('Invalid district transform');
  const transform={position:[t.x,t.y,t.z],yaw:t.yaw};
  const point=p=>{const [x,z]=worldPoint(transform,p.x,p.z);return {x,y:t.y+p.y,z,yaw:t.yaw+(p.yaw||0)};};
  for(const c of object.colliders||[]){
   if(![c.x,c.y,c.z,c.w,c.h,c.d].every(finite)||Math.min(c.w,c.h,c.d)<=0)throw Error('Invalid district collider');
   const q=point(c);colliders.push({...q,id:object.id+':'+c.id,objectId:object.id,w:c.w,d:c.d,minY:q.y-c.h/2,maxY:q.y+c.h/2,zone:object.zone||district.zone||'field'});
  }
  for(const s of object.surfaces||[]){
   if(![s.x,s.y,s.z,s.w,s.d].every(finite)||Math.min(s.w,s.d)<=0)throw Error('Invalid district surface');
   surfaces.push({...point(s),id:object.id+':'+s.id,objectId:object.id,w:s.w,d:s.d,zone:object.zone||district.zone||'field'});
  }
  for(const route of object.climb?.routes||[]){
   if(!route.id||![...Object.values(route.from),...Object.values(route.to)].every(finite))throw Error('Invalid climb route');
   const from=point(route.from),to=point(route.to),base={name:object.climb.name||'Gantry ladder',objectId:object.id,reach:route.reach||1.6,duration:route.duration||2.4,zone:object.zone||district.zone||'field'};
   const via=(route.via||[]).map(p=>point({...p,yaw:route.from.yaw}));
   climbs.push({...base,id:route.id+':up',from,to,via});
   if(route.bidirectional)climbs.push({...base,id:route.id+':down',from:to,to:from,via:[...via].reverse()});
  }
 }
 return {format:'field-signal-campaign-geometry/1',colliders,surfaces,climbs,objectCount:ids.size};
}

export function assignSearchProps(source,catalogue) {
 const props=catalogue.props;
 if(!Array.isArray(props)||new Set(props.map(p=>p.id)).size!==props.length)throw Error('Invalid search prop catalogue');
 const offsets=new Map(),used=new Set();
 for(const c of source.containers){
  if(c.building==='car')continue; // Existing licensed wreck and saved vehicle ID stay intact.
  const compatible=props.filter(p=>p.profile===c.profile);
  if(!compatible.length)continue;
  const index=offsets.get(c.profile)||0;offsets.set(c.profile,index+1);
  const p=props.find(p=>p.id===c.searchProp)||compatible[index%compatible.length];
  c.searchProp=p.id;c.searchDimensions=[...p.dimensions];c.searchAnchor=[...p.interaction.anchor];c.searchMount=p.mount==='wall'?.85:0;used.add(p.id);
  const building=source.buildings.find(b=>b.id===c.building);if(building){const a=c.yaw||0,w=p.dimensions[0]*Math.abs(Math.cos(a))+p.dimensions[2]*Math.abs(Math.sin(a)),d=p.dimensions[2]*Math.abs(Math.cos(a))+p.dimensions[0]*Math.abs(Math.sin(a));c.x=Math.max(building.x-building.w/2+w/2+.16,Math.min(building.x+building.w/2-w/2-.16,c.x));c.z=Math.max(building.z-building.d/2+d/2+.16,Math.min(building.z+building.d/2-d/2-.16,c.z));if(building.floors===2&&c.x+w/2>building.x+building.w/2-2.8&&c.z+d/2>building.z-building.d/2+.8&&c.z-d/2<building.z+building.d/2-.8)c.x=building.x+building.w/2-2.8-w/2-.2;}
 }
 return {catalogue:props.length,placed:used.size};
}

export function applyCampaignSource(source,{districts,props,interiors=[],sourceRevision,routes=null,spawns=null}) {
 if(source.editorLayout)return source;
 let world=clone(source);
 if(routes){if(routes.format!=='field-signal-campaign-routes/1'||routes.roads.length!==source.roads.length||!Array.isArray(routes.surfaces?.asphalt)||!Array.isArray(routes.surfaces?.dirt))throw Error('Invalid candidate routes or road surfaces');world.roads=clone(routes.roads);world.roadsUnified=clone(routes.surfaces);world.rail.route=clone(routes.rail);}
 const geometry=compileDistricts(districts);
 if(spawns){if(spawns.format!=='field-signal-campaign-spawns/1')throw Error('Invalid spawn adjustments');for(const a of spawns.adjustments){const e=world.enemies.find(e=>e.id===a.id);if(!e||![...a.from,...a.to].every(finite)||Math.hypot(e.x-a.from[0],e.z-a.from[1])>.01)throw Error('Spawn source mismatch');e.x=a.to[0];e.z=a.to[1];}world.campaignSpawnAdjustments=clone(spawns.adjustments);}
 for(const district of districts.districts)for(const object of district.objects)for(const binding of object.containerBindings||[]){
  if(world.containers.some(c=>c.id===binding.id))throw Error('Duplicate district container');
  const t=object.transform,[x,z]=worldPoint({position:[t.x,t.y,t.z],yaw:t.yaw},binding.position[0],binding.position[2]);
  world.containers.push({id:binding.id,name:binding.name,profile:binding.profile,searchProp:binding.searchProp,x,z,y:t.y+binding.position[1]+.4,floor:t.y+binding.position[1],yaw:t.yaw+binding.yaw,zone:district.zone,building:'district:'+object.id,foundationObject:object.id});
 }
 const bindingStats=assignSearchProps(world,props);
 const scenes=[];
 for(const original of interiors){
  const layout=clone(original);for(const o of layout.objects){if(o.binding?.type==='container'){const p=props.props.find(p=>p.id===o.asset);if(p)o.binding.anchor=[...p.interaction.anchor];}}
  const document=createWorldDocument({source:world,sourceRevision,layouts:[layout]});
  const next=compilePreviewWorld(document,layout.buildingId,{source:world,sourceRevision});
  scenes.push(next.editorBuilding);world=next;
  delete world.editorLayout;delete world.editorBuilding;delete world.editorColliders;delete world.editorFloors;
 }
 // Match actual field search objects, retaining deliberate underground entrance markers.
 for(const m of world.missions){const c=world.containers.find(c=>c.id===m.container);if(c?.zone==='field'){m.x=c.x;m.z=c.z;}}
 for(const c of world.containers)if(c.zone==='field'&&!c.foundationObject&&!world.buildings.some(b=>b.id===c.building))c.followTerrain=true;
 const visible=new Set();for(const c of world.containers){const authored=scenes.flatMap(s=>s.layout.objects).find(o=>o.binding?.id===c.id);const asset=authored?.asset||c.searchProp;if(asset?.startsWith('search_'))visible.add(asset);}bindingStats.placed=visible.size;
 world.campaign={version:1,id:'field-signal-game-first-candidate-1',bindingStats};
 world.campaignGeometry=geometry;world.campaignScenes=scenes;world.campaignDistricts=districts;
 return world;
}

export function campaignSurface(data,x,z,lastY,baseHeight) {
 for(const scene of data.campaignScenes||[])if(insidePreview(scene,x,z,.6))return previewSurface(scene,x,z,lastY);
 let height=baseHeight;
 const p=data.pier;
 if(data.campaign&&x>p.minX&&x<p.maxX&&z>p.minZ&&z<p.maxZ)height=0;
 for(const s of data.campaignGeometry?.surfaces||[]){
  const [lx,lz]=localPoint({position:[s.x,s.y,s.z],yaw:s.yaw},x,z);
  if(Math.abs(lx)<=s.w/2&&Math.abs(lz)<=s.d/2&&s.y<=lastY+.6)height=Math.max(height,s.y);
 }
 return height;
}

export function resolveMovement(player,dx,dz,{colliders,valid,height,zone,doors={},radius=.29,jump=0,preventFall=false}) {
 const p={...player},feet=(player.y||0)+jump;
 const nearby=colliders.filter(c=>!c.off&&(!c.zone||c.zone===zone)&&!doors[c.doorId]&&feet<(c.maxY??99)-(c.kind==='floor'?.15:.035)&&feet+1.45>(c.minY??-99));
 const blocked=(x,z)=>!valid(x,z)||nearby.some(c=>{
  if(c.r)return Math.hypot(x-c.x,z-c.z)<c.r+radius;
  if(Math.abs(x-c.x)>Math.max(c.w,c.d)+radius||Math.abs(z-c.z)>Math.max(c.w,c.d)+radius)return false;
  const [lx,lz]=localPoint({position:[c.x,0,c.z],yaw:c.yaw||0},x,z);
  return Math.abs(lx)<c.w/2+radius&&Math.abs(lz)<c.d/2+radius;
 });
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
 for(let i=0;i<steps;i++){if(!blocked(p.x+dx/steps,p.z))p.x+=dx/steps;if(!blocked(p.x,p.z+dz/steps))p.z+=dz/steps;}
 p.y=height(p.x,p.z,player.y||0);
 // Deliberate ladder transitions, rather than accidental falls through an open gate.
 if(preventFall&&player.y>2&&p.y<player.y-.8)return player;
 return p;
}
