/* Field Signal editable scenes v1. Pure data, validation and shared collision math.
   Coordinates are metres, Y-up. Position means bottom centre, except floor top. */
export const FORMAT='field-signal-layout',VERSION=1;
export const TYPES=['wall','doorway','window','floor','roof','stairs','prop','light','spawn'];
export const MATERIALS=['plaster','brick','wood','concrete','metal','roof'];
export const clone=x=>JSON.parse(JSON.stringify(x));
const finite=x=>typeof x==='number'&&Number.isFinite(x),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function localPoint(o,x,z){const a=o.yaw||0,c=Math.cos(a),s=Math.sin(a),dx=x-o.position[0],dz=z-o.position[2];return [dx*c-dz*s,dx*s+dz*c];}
export function worldPoint(o,x,z){const c=Math.cos(o.yaw||0),s=Math.sin(o.yaw||0);return [o.position[0]+x*c+z*s,o.position[2]-x*s+z*c];}
export function bounds2(o,pad=0){const[w,,d]=o.size,a=o.yaw||0,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return {x:o.position[0],z:o.position[2],w:w*c+d*s+pad*2,d:d*c+w*s+pad*2};}
export function validateLayout(input,{world=null,assets=null,strictBindings=true}={}){
 const fail=m=>{throw Error(m)};
 if(!input||typeof input!=='object'||Array.isArray(input))fail('A layout JSON object is required.');
 if(input.format!==FORMAT||input.version!==VERSION)fail('This is not a Field Signal layout v1. Campaign backups are a different file type.');
 const str=(v,n,max=120)=>{if(typeof v!=='string'||v.length<1||v.length>max||/[\x00-\x1f]/.test(v))fail('Invalid '+n);return v};
 const id=str(input.buildingId,'building ID',60);if(!/^[\w-]+$/.test(id))fail('Invalid building ID.');
 const spec=world?.buildings.find(b=>b.id===id);if(world&&!spec)fail('This building is not in the current game.');
 if(!Array.isArray(input.origin)||input.origin.length!==3||input.origin.some(n=>!finite(n)||Math.abs(n)>2000))fail('Invalid origin.');
 if(spec&&(Math.abs(input.origin[0]-spec.x)>.001||Math.abs(input.origin[2]-spec.z)>.001||input.origin[1]!==0))fail('The building origin cannot move in editor v1.');
 if(!Array.isArray(input.bounds)||input.bounds.length!==2||input.bounds.some(n=>!finite(n)||n<3||n>60))fail('Invalid building footprint.');
 if(spec&&(input.bounds[0]!==spec.w||input.bounds[1]!==spec.d))fail('Footprint resizing is not supported in this release.');
 if(!Array.isArray(input.objects)||input.objects.length<1||input.objects.length>800)fail('A layout needs 1–800 objects.');
 const ids=new Set(),bindingIds=new Set();
 const objects=input.objects.map(o=>{
  if(!o||typeof o!=='object')fail('Invalid object.');const oid=str(o.id,'object ID',80);if(!/^[\w-]+$/.test(oid)||ids.has(oid))fail('Object IDs must be unique safe names.');ids.add(oid);
  if(!TYPES.includes(o.type))fail('Unsupported object type: '+String(o.type));
  if(!Array.isArray(o.position)||o.position.length!==3||o.position.some(n=>!finite(n)||Math.abs(n)>100)||o.position[1]<-.5||o.position[1]>12)fail('Invalid position: '+oid);
  if(!Array.isArray(o.size)||o.size.length!==3||o.size.some(n=>!finite(n)||n<.02||n>65))fail('Invalid dimensions: '+oid);
  if(!finite(o.yaw)||Math.abs(o.yaw)>Math.PI*16)fail('Invalid rotation: '+oid);
  const q={id:oid,name:str(o.name,'object name'),type:o.type,position:[...o.position],size:[...o.size],yaw:o.yaw,material:MATERIALS.includes(o.material)?o.material:'plaster',solid:o.solid!==false,locked:!!o.locked};
  if(o.type==='prop'){q.asset=str(o.asset,'asset ID',90);if(!/^[\w-]+$/.test(q.asset)||assets&&!assets.has(q.asset))fail('Unknown asset: '+q.asset);}
  if(['doorway','window'].includes(o.type)){q.opening={width:Number(o.opening?.width??1.9),height:Number(o.opening?.height??2.45),sill:o.type==='window'?Number(o.opening?.sill??1.05):0};if(!Object.values(q.opening).every(finite)||q.opening.width<.65||q.opening.width>q.size[0]-.1||q.opening.height<.3||q.opening.height+q.opening.sill>q.size[1]-.05)fail('Opening does not fit its wall: '+oid);q.doorId=typeof o.doorId==='string'?o.doorId:null;}
  if(o.type==='light'){q.intensity=clamp(Number(o.intensity)||20,0,100);q.colour=/^#[0-9a-f]{6}$/i.test(o.colour||'')?o.colour:'#efd9ae';q.solid=false;}
  if(o.binding){const b=o.binding;if(!['container','loose'].includes(b.type)||typeof b.id!=='string'||!/^[\w-]+$/.test(b.id))fail('Invalid interaction binding.');if(bindingIds.has(b.type+':'+b.id))fail('Duplicate interaction: '+b.id);bindingIds.add(b.type+':'+b.id);
   if(world){const source=(b.type==='container'?world.containers:world.looseSlots).find(x=>x.id===b.id&&x.building===id);if(!source)fail('Interaction belongs to another building: '+b.id);}
   q.binding={type:b.type,id:b.id};
  }
  if(o.type==='doorway'&&q.doorId){if(world&&!([id,...world.partitions.filter(p=>p.building===id).map(p=>p.id)].includes(q.doorId)))fail('Unrecognised door interaction.');if(bindingIds.has('door:'+q.doorId))fail('Duplicate door.');bindingIds.add('door:'+q.doorId);}
  return q;
 });
 if(objects.filter(o=>o.type==='spawn').length!==1)fail('Keep exactly one walk-test start marker.');
 if(!objects.some(o=>o.type==='floor'&&Math.abs(o.position[1])<.05))fail('Keep a ground floor.');
 if(world&&strictBindings){for(const c of world.containers.filter(c=>c.building===id))if(!bindingIds.has('container:'+c.id))fail('Keep the searchable container '+c.id+'. It may be moved, not deleted.');for(const s of world.looseSlots.filter(c=>c.building===id))if(!bindingIds.has('loose:'+s.id))fail('Keep the loot surface '+s.id);if(!bindingIds.has('door:'+id))fail('Keep the entrance doorway and its interaction.');}
 return {format:FORMAT,version:VERSION,buildingId:id,name:str(input.name,'layout name'),origin:[...input.origin],bounds:[...input.bounds],objects};
}
export function seedLayout(world,buildingId){
 const b=world.buildings.find(b=>b.id===buildingId);if(!b)throw Error('Building not found');const w=b.w,d=b.d,upper=b.floors===2,h=upper?6.4:3.2,objects=[];
 const add=(id,name,type,position,size,extra={})=>{const o={id,name,type,position,size,yaw:0,material:'plaster',solid:true,locked:false,...extra};objects.push(o);return o};
 add('ground','Ground floor','floor',[0,0,0],[w,.16,d],{material:'concrete'});
 add('wall-north','Rear wall','wall',[0,0,-d/2],[w,h,.22]);
 add('wall-west','West wall','wall',[-w/2,0,0],[d,h,.22],{yaw:Math.PI/2});add('wall-east','East wall','wall',[w/2,0,0],[d,h,.22],{yaw:Math.PI/2});
 add('entrance','Entrance wall + door','doorway',[0,0,d/2],[w,h,.22],{doorId:b.id,opening:{width:2.2,height:2.75,sill:0}});
 if(upper){add('upper','Upper floor • automatic stair opening','floor',[0,3.2,0],[w-.3,.16,d-.3],{material:'wood'});add('stairs-main','Stairs to upper floor','stairs',[w/2-1.5,0,0],[2.05,3.2,d-2],{material:'wood'});}
 add('roof','Roof / ceiling','roof',[0,h,0],[w+.3,.18,d+.3],{material:'roof'});
 for(const p of world.partitions.filter(p=>p.building===b.id)){for(const [i,[x,z,ww,dd]]of p.segments.entries())add('partition-'+p.id+'-'+i,'Partition wall','wall',[x-b.x,0,z-b.z],[ww,2.8,dd]);add('partition-door-'+p.id,'Internal door','doorway',[p.x-b.x,0,p.z-b.z],[2.2,3.05,.16],{doorId:p.id,opening:{width:1.95,height:2.65,sill:0}});}
 for(const c of world.containers.filter(c=>c.building===b.id)){const wall=['cupboard','medical'].includes(c.profile),hh=c.profile==='locker'?1.9:wall?1.05:.78,id=c.profile==='drawers'?'vintage_wooden_drawer_01':c.profile==='locker'?'painted_wooden_cabinet_02':c.profile==='medical'?'medical_box':c.profile==='chest'?'old_military_crate':c.profile==='crate'?'wooden_crate_01':'painted_wooden_cabinet';add('container-'+c.id,c.name,'prop',[c.x-b.x,(c.floor||0)+(wall?.85:0),c.z-b.z],[c.profile==='crate'?1.15:.9,hh,.56],{asset:id,yaw:c.yaw||0,binding:{type:'container',id:c.id},material:'wood'});}
 for(const s of world.looseSlots.filter(s=>s.building===b.id))add('surface-'+s.id,'Table • physical loot surface','prop',[s.x-b.x,Math.max(0,s.y-.985),s.z-b.z],[2.1,.985,1.25],{asset:'painted_wooden_table',binding:{type:'loose',id:s.id},material:'wood'});
 for(let floor=0;floor<(upper?2:1);floor++)add('light-'+floor,'Ceiling light '+(floor+1),'light',[0,2.65+floor*3.2,0],[.18,.15,.18],{intensity:35,colour:'#efd9ae',solid:false});
 add('spawn','Walk-test start','spawn',[0,0,d/2+1.4],[.35,1.7,.35],{solid:false,yaw:0});
 return validateLayout({format:FORMAT,version:VERSION,buildingId:b.id,name:b.name,origin:[b.x,0,b.z],bounds:[w,d],objects},{world});
}
export function floorPieces(doc,o){
 let pieces=[{x:-o.size[0]/2,z:-o.size[2]/2,w:o.size[0],d:o.size[2]}];
 if(o.position[1]>.5)for(const st of doc.objects.filter(q=>q.type==='stairs'&&q.position[1]<o.position[1]&&q.position[1]+q.size[1]>=o.position[1]-.1)){
  const hole=bounds2(st,.16),rel=localPoint(o,hole.x,hole.z),c=Math.abs(Math.cos(o.yaw)),s=Math.abs(Math.sin(o.yaw)),hw=hole.w*c+hole.d*s,hd=hole.d*c+hole.w*s,cut={x:rel[0]-hw/2,z:rel[1]-hd/2,w:hw,d:hd};const next=[];
  for(const r of pieces){const x0=Math.max(r.x,cut.x),x1=Math.min(r.x+r.w,cut.x+cut.w),z0=Math.max(r.z,cut.z),z1=Math.min(r.z+r.d,cut.z+cut.d);if(x1<=x0||z1<=z0){next.push(r);continue;}next.push({x:r.x,z:r.z,w:x0-r.x,d:r.d},{x:x1,z:r.z,w:r.x+r.w-x1,d:r.d},{x:x0,z:r.z,w:x1-x0,d:z0-r.z},{x:x0,z:z1,w:x1-x0,d:r.z+r.d-z1});}pieces=next.filter(p=>p.w>.01&&p.d>.01);
 }return pieces;
}
export function geometryPieces(doc,o){
 const [w,h,d]=o.size;
 if(o.type==='floor')return floorPieces(doc,o).map(p=>({position:[p.x+p.w/2,-h/2,p.z+p.d/2],size:[p.w,h,p.d]}));
 if(['wall','roof','prop'].includes(o.type))return [{position:[0,h/2,0],size:[w,h,d]}];
 if(['doorway','window'].includes(o.type)){const q=o.opening,side=(w-q.width)/2,parts=[{position:[-(q.width+side)/2,h/2,0],size:[side,h,d]},{position:[(q.width+side)/2,h/2,0],size:[side,h,d]},{position:[0,(q.sill+q.height+h)/2,0],size:[q.width,h-q.height-q.sill,d]}];if(q.sill>0)parts.push({position:[0,q.sill/2,0],size:[q.width,q.sill,d]});return parts;}
 return [];
}
export function collidersFor(doc,{doorsOpen=false}={}){const out=[];for(const o of doc.objects){if(!o.solid||['stairs','light','spawn'].includes(o.type))continue;for(const p of geometryPieces(doc,o)){const[x,z]=worldPoint(o,p.position[0],p.position[2]);out.push({id:o.id,x,z,y:o.position[1]+p.position[1]-p.size[1]/2,w:p.size[0],h:p.size[1],d:p.size[2],yaw:o.yaw,kind:o.type});}if(o.type==='doorway'&&!doorsOpen)out.push({id:o.id,x:o.position[0],z:o.position[2],y:o.position[1],w:o.opening.width,h:o.opening.height,d:.10,yaw:o.yaw,doorId:o.doorId||o.id});if(o.type==='window')out.push({id:o.id,x:o.position[0],z:o.position[2],y:o.position[1]+o.opening.sill,w:o.opening.width,h:o.opening.height,d:.06,yaw:o.yaw});}return out;}
export function blocked(doc,x,z,y,{doorsOpen=true,radius=.25,openDoors=null}={}){return collidersFor(doc,{doorsOpen}).some(c=>{if(c.doorId&&openDoors?.[c.doorId])return false;if(y>=c.y+c.h-.035||y+1.65<=c.y+.02)return false;const p=localPoint({position:[c.x,c.y,c.z],yaw:c.yaw},x,z);return Math.abs(p[0])<c.w/2+radius&&Math.abs(p[1])<c.d/2+radius;});}
export function surfaceAt(doc,x,z,lastY=0){
 for(const o of doc.objects.filter(o=>o.type==='stairs')){const[lx,lz]=localPoint(o,x,z);if(Math.abs(lx)<=o.size[0]/2-.06&&lz>=-o.size[2]/2-.1&&lz<=o.size[2]/2+.25){const y=o.position[1]+clamp((o.size[2]/2-lz)/o.size[2],0,1)*o.size[1];if(Math.abs(lastY-y)<.65||lastY>=o.position[1]&&lz>o.size[2]/2-.25)return y;}}
 let y=0;for(const o of doc.objects.filter(o=>o.type==='floor')){const[lx,lz]=localPoint(o,x,z);if(o.position[1]<=lastY+.45&&floorPieces(doc,o).some(p=>lx>=p.x&&lx<=p.x+p.w&&lz>=p.z&&lz<=p.z+p.d))y=Math.max(y,o.position[1]);}return y;
}
export function moveInLayout(doc,p,dx,dz,options={}){let q={...p},steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));for(let i=0;i<steps;i++){const yy=surfaceAt(doc,q.x+dx/steps,q.z,q.y);if(!blocked(doc,q.x+dx/steps,q.z,yy,options))q.x+=dx/steps;const yz=surfaceAt(doc,q.x,q.z+dz/steps,q.y);if(!blocked(doc,q.x,q.z+dz/steps,yz,options))q.z+=dz/steps;q.y=surfaceAt(doc,q.x,q.z,q.y);}return q;}
export function validateSpatial(doc){const issues=[],props=doc.objects.filter(o=>o.type==='prop');for(const o of props){const floor=surfaceAt(doc,o.position[0],o.position[2],o.position[1]),support=props.find(p=>p.id!==o.id&&Math.abs(p.position[1]+p.size[1]-o.position[1])<.12&&Math.abs(localPoint(p,o.position[0],o.position[2])[0])<p.size[0]/2&&Math.abs(localPoint(p,o.position[0],o.position[2])[1])<p.size[2]/2);if(o.position[1]>floor+.18&&!support&&!/cabinet|cupboard|shelf|medical_box/.test(o.asset))issues.push({id:o.id,level:'warning',message:o.name+' may be floating. Use Floor or place it on a support.'});const box=bounds2(o);if(Math.abs(box.x)+box.w/2>doc.bounds[0]/2+.1||Math.abs(box.z)+box.d/2>doc.bounds[1]/2+.1)issues.push({id:o.id,level:'warning',message:o.name+' extends beyond the building footprint.'});}
 for(const o of doc.objects.filter(o=>o.type==='stairs')){if(o.size[1]/o.size[2]>.72)issues.push({id:o.id,level:'warning',message:'Staircase is very steep. Increase its length.'});if(!doc.objects.some(p=>p.type==='floor'&&Math.abs(p.position[1]-o.position[1]-o.size[1])<.1))issues.push({id:o.id,level:'error',message:'Stairs have no floor at their top height.'});const bottom=worldPoint(o,0,o.size[2]/2+.25),top=worldPoint(o,0,-o.size[2]/2-.25);for(const[name,p,y]of[['bottom',bottom,o.position[1]],['top',top,o.position[1]+o.size[1]]])if(blocked(doc,...p,y,{doorsOpen:true}))issues.push({id:o.id,level:'warning',message:'The '+name+' of the stairs is blocked.'});}
 const spawn=doc.objects.find(o=>o.type==='spawn');if(spawn&&blocked(doc,spawn.position[0],spawn.position[2],spawn.position[1],{doorsOpen:true}))issues.push({id:spawn.id,level:'error',message:'Walk-test start is inside a solid object.'});
 const edges=[['west',-doc.bounds[0]/2,0,doc.bounds[1]],['east',doc.bounds[0]/2,0,doc.bounds[1]],['rear',-doc.bounds[1]/2,1,doc.bounds[0]],['front',doc.bounds[1]/2,1,doc.bounds[0]]];
 for(const[name,fixed,axis,length]of edges){let gap=0;for(let v=-length/2+.2;v<length/2-.1;v+=.25){const x=axis?v:fixed,z=axis?fixed:v;if(!blocked(doc,x,z,.1,{doorsOpen:false,radius:.015}))gap++;}if(gap>1)issues.push({id:doc.objects.find(o=>o.type==='wall')?.id||spawn.id,level:'warning',message:'Possible gap in the '+name+' outside wall. Check its joints and door frame.'});}
 return issues;
}
export function compiledWorld(doc,source){const world=clone(source),b=world.buildings.find(b=>b.id===doc.buildingId);b.editorScene=true;world.editorLayout=clone(doc);world.editorColliders=collidersFor(doc,{doorsOpen:false});for(const o of doc.objects.filter(o=>o.binding)){const arr=o.binding.type==='container'?world.containers:world.looseSlots,q=arr.find(q=>q.id===o.binding.id);if(q){q.x=doc.origin[0]+o.position[0];q.z=doc.origin[2]+o.position[2];q.y=o.binding.type==='loose'?o.position[1]+o.size[1]+.015:o.position[1]+Math.min(.8,o.size[1]/2);q.floor=o.position[1];q.yaw=o.yaw;q.editorScene=true;}}
 for(const m of world.missions){const c=world.containers.find(c=>c.id===m.container);if(c?.editorScene){m.x=c.x;m.z=c.z;}}
 for(const p of world.partitions.filter(p=>p.building===b.id))p.editorScene=true;
 return world;
}
