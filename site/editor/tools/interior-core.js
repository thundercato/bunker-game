// Editor operations over the existing layout document. Runtime collision/floor
// queries remain in layout-core; templates expand into ordinary stable children.
import {clone,localPoint,worldPoint,geometryPieces,collidersFor,validateLayout,MATERIALS,
  validateSpatial,moveInLayout,surfaceAt} from '../../layout-core.js';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const safeId=s=>typeof s==='string'&&/^[\w-]{1,80}$/.test(s);
const protectedObject=o=>!!o.binding||!!o.doorId||['spawn','doorway'].includes(o.type);
const corners=o=>[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,z])=>worldPoint(o,x*o.size[0]/2,z*o.size[2]/2));
const top=o=>o.position[1]+(o.type==='floor'?0:o.size[1]);
const bottom=o=>o.position[1]-(o.type==='floor'?o.size[1]:0);
function selected(doc,ids,{mutable=true}={}) {
  const wanted=new Set(ids),objects=[...wanted].map(id=>doc.objects.find(o=>o.id===id));
  if(!objects.length||objects.some(o=>!o))throw Error('Choose existing objects first.');
  if(mutable&&objects.some(o=>o.locked))throw Error('Unlock all affected objects before editing.');
  return objects;
}
function copyBack(doc,next) { const checked=validateLayout(next,{strictBindings:false});doc.objects=checked.objects;return doc; }
export function supportCandidates(doc,id) {
  return doc.objects.filter(o=>o.id!==id&&(o.type==='floor'||o.type==='prop'&&o.solid))
    .map(o=>({id:o.id,name:o.name,height:top(o),kind:o.type==='floor'?'floor':'prop top face'}));
}
export function fitsSupport(doc,object,support) {
  const points=corners(object).map(([x,z])=>localPoint(support,x,z));
  // A single generated floor piece must hold the complete footprint. This is
  // deliberately conservative around the shared staircase opening.
  const pieces=support.type==='floor'?geometryPieces(doc,support):[{position:[0,0,0],size:support.size}];
  return pieces.some(piece=>points.every(([x,z])=>Math.abs(x-piece.position[0])<=piece.size[0]/2+.00001&&Math.abs(z-piece.position[2])<=piece.size[2]/2+.00001));
}
function overlaps(a,b) {
  const av=[[Math.cos(a.yaw),-Math.sin(a.yaw)],[Math.sin(a.yaw),Math.cos(a.yaw)]],bv=[[Math.cos(b.yaw),-Math.sin(b.yaw)],[Math.sin(b.yaw),Math.cos(b.yaw)]];
  const delta=[b.x-a.x,b.z-a.z];
  return [...av,...bv].every(axis=>{
    const dot=(v,w)=>v[0]*w[0]+v[1]*w[1];
    const ar=Math.abs(dot(av[0],axis))*a.w/2+Math.abs(dot(av[1],axis))*a.d/2;
    const br=Math.abs(dot(bv[0],axis))*b.w/2+Math.abs(dot(bv[1],axis))*b.d/2;
    return Math.abs(dot(delta,axis))<ar+br-.002;
  });
}
export function snapToSupport(doc,id,supportId,{alignYaw=false,centre=false}={}) {
  const object=selected(doc,[id])[0],support=doc.objects.find(o=>o.id===supportId);
  if(object.type!=='prop')throw Error('Surface snapping currently supports prop bottom faces.');
  if(!support||support.id===id||!supportCandidates(doc,id).some(o=>o.id===supportId))throw Error('Choose a floor or solid prop support.');
  const next=clone(doc),o=next.objects.find(o=>o.id===id);
  if(alignYaw)o.yaw=support.yaw;
  if(centre){o.position[0]=support.position[0];o.position[2]=support.position[2];}
  o.position[1]=top(support);
  if(!fitsSupport(next,o,support))throw Error('The full prop footprint does not fit this surface. Centre/align it or use a larger support; stair openings are excluded.');
  const box={x:o.position[0],z:o.position[2],y:o.position[1],w:o.size[0],h:o.size[1],d:o.size[2],yaw:o.yaw};
  const obstacle=collidersFor(next,{doorsOpen:true}).find(c=>c.id!==id&&c.id!==supportId&&box.y<c.y+c.h-.002&&box.y+box.h>c.y+.002&&overlaps(box,c));
  if(obstacle)throw Error('Placement intersects '+(next.objects.find(o=>o.id===obstacle.id)?.name||obstacle.id)+'. Move the support or prop first.');
  return copyBack(doc,next);
}
export function alignSelection(doc,ids,referenceId,mode) {
  const objects=selected(doc,ids),ref=doc.objects.find(o=>o.id===referenceId);
  if(!ref)throw Error('Choose a reference object.');
  const next=clone(doc), targets=next.objects.filter(o=>objects.some(p=>p.id===o.id)&&o.id!==ref.id);
  if(!targets.length)throw Error('Select another object besides the reference.');
  for(const o of targets) {
    if(mode==='yaw'){o.yaw=ref.yaw;continue;}
    if(mode==='dimensions') {if(o.type!==ref.type)throw Error('Match dimensions requires objects of the same type.');o.size=[...ref.size];continue;}
    if(mode==='bottom'){o.position[1]+=bottom(ref)-bottom(o);continue;}
    if(mode==='top'){o.position[1]+=top(ref)-top(o);continue;}
    const match=/^([xz])-(min|centre|max)$/.exec(mode);if(!match)throw Error('Choose an alignment mode.');
    const axis=match[1]==='x'?0:1,sign={min:-1,centre:0,max:1}[match[2]],relative=localPoint(ref,o.position[0],o.position[2]);
    const a=o.yaw-ref.yaw,extent=Math.abs(Math.cos(a))*o.size[axis===0?0:2]/2+Math.abs(Math.sin(a))*o.size[axis===0?2:0]/2;
    relative[axis]=sign*(ref.size[axis===0?0:2]/2-extent);
    const[x,z]=worldPoint(ref,...relative);o.position[0]=x;o.position[2]=z;
  }
  return copyBack(doc,next);
}
export function rotateAssembly(doc,ids,degrees,pivotId=ids[0]) {
  const objects=selected(doc,ids),pivot=objects.find(o=>o.id===pivotId);
  if(!pivot||!finite(degrees)||Math.abs(degrees)>360)throw Error('Choose a selected pivot and rotation within ±360°.');
  const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),next=clone(doc);
  for(const o of next.objects.filter(o=>objects.some(p=>p.id===o.id))){const x=o.position[0]-pivot.position[0],z=o.position[2]-pivot.position[2];o.position[0]=pivot.position[0]+c*x+s*z;o.position[2]=pivot.position[2]-s*x+c*z;o.yaw+=angle;}
  return copyBack(doc,next);
}
export function joinWallEndpoints(doc,movingId,referenceId,{movingEnd='negative',referenceEnd='positive',orientation='keep'}={}) {
  const moving=selected(doc,[movingId])[0],reference=doc.objects.find(o=>o.id===referenceId),wall=o=>o&&['wall','doorway','window'].includes(o.type);
  if(!wall(moving)||!wall(reference)||movingId===referenceId)throw Error('Choose two different walls/openings; the selected wall moves.');
  if(!['negative','positive'].includes(movingEnd)||!['negative','positive'].includes(referenceEnd)||!['keep','parallel','perpendicular'].includes(orientation))throw Error('Choose valid wall endpoints and orientation.');
  const next=clone(doc),o=next.objects.find(o=>o.id===movingId);
  if(orientation!=='keep')o.yaw=reference.yaw+(orientation==='perpendicular'?Math.PI/2:0);
  const target=worldPoint(reference,(referenceEnd==='positive'?1:-1)*reference.size[0]/2,0),offset=worldPoint({position:[0,0,0],yaw:o.yaw},(movingEnd==='positive'?1:-1)*o.size[0]/2,0);
  o.position=[target[0]-offset[0],reference.position[1],target[1]-offset[1]];
  return copyBack(doc,next);
}
export function addStairLanding(doc,stairsId,{end='top',depth=1.2,material='wood'}={},idFactory=()=> 'object-'+crypto.randomUUID()) {
  const stairs=selected(doc,[stairsId],{mutable:false})[0];
  if(stairs.type!=='stairs')throw Error('Select a staircase first.');
  if(!['top','bottom'].includes(end)||!finite(depth)||depth<.65||depth>10||!MATERIALS.includes(material))throw Error('Choose a landing end, depth 0.65–10 m and canonical material.');
  const id=idFactory();if(!safeId(id)||doc.objects.some(o=>o.id===id))throw Error('A landing needs a fresh unique object ID.');
  // Shared floorPieces cuts a 0.16 m margin around stairs at upper levels.
  // Starting the top landing beyond that margin preserves its complete face.
  const z=(end==='top'?-1:1)*(stairs.size[2]/2+depth/2+(end==='top'?.16:0)),[x,wz]=worldPoint(stairs,0,z);
  const o={id,name:(stairs.name+' · '+end+' landing').slice(0,120),type:'floor',position:[x,stairs.position[1]+(end==='top'?stairs.size[1]:0),wz],size:[stairs.size[0],.16,depth],yaw:stairs.yaw,material,solid:true,locked:false};
  const next=clone(doc);next.objects.push(o);
  const area=geometryPieces(next,o).reduce((sum,p)=>sum+p.size[0]*p.size[2],0);
  if(area<o.size[0]*o.size[2]-.0001)throw Error('The shared rotated stair opening clips this landing. Adjust the stair yaw or await the reviewed opening adapter; no partial landing was added.');
  copyBack(doc,next);return id;
}

export const TEMPLATE_FORMAT='field-signal-editor-object-template';
export function createTemplate(doc,ids,name,pivotId=ids[0]) {
  const objects=selected(doc,ids,{mutable:false});
  if(objects.some(protectedObject))throw Error('Templates cannot copy spawn markers, doors or gameplay bindings. Select decoration/structure without interactions.');
  if(typeof name!=='string'||!name.trim()||name.length>80)throw Error('Give the template a name (1–80 characters).');
  const pivot=objects.find(o=>o.id===pivotId);if(!pivot)throw Error('The template pivot must be a selected child.');
  const template={format:TEMPLATE_FORMAT,version:1,name:name.trim(),objects:objects.map(o=>{const p=clone(o),[x,z]=localPoint(pivot,...[o.position[0],o.position[2]]);p.position=[x,o.position[1]-pivot.position[1],z];p.yaw-=pivot.yaw;p.locked=false;return p;})};
  return validateTemplate(template);
}
export function validateTemplate(input,{assets=null}={}) {
  if(!input||input.format!==TEMPLATE_FORMAT||input.version!==1||typeof input.name!=='string'||!input.name.trim()||input.name.length>80||/[\x00-\x1f]/.test(input.name)||!Array.isArray(input.objects)||!input.objects.length||input.objects.length>200)throw Error('Not a supported object template (1–200 unbound children).');
  const objects=[],ids=new Set();
  for(const original of input.objects){
    if(!original||typeof original!=='object'||Array.isArray(original))throw Error('Template contains an invalid child.');
    const o=clone(original);
    if(!safeId(o.id)||ids.has(o.id)||protectedObject(o)||!Array.isArray(o.position)||o.position.length!==3||!o.position.every(n=>finite(n)&&Math.abs(n)<=100))throw Error('Template contains unsafe, duplicate or protected children.');ids.add(o.id);
    // Canonical validation owns type/material/asset/size/opening semantics. A test
    // pose avoids imposing scene-floor conventions on template-relative height.
    const probe={format:'field-signal-layout',version:1,buildingId:'template',name:'Template validation',origin:[0,0,0],bounds:[60,60],objects:[
      {id:'validation-ground',name:'Floor',type:'floor',position:[0,0,0],size:[60,.1,60],yaw:0,material:'concrete',solid:true,locked:false},
      {id:'validation-spawn',name:'Start',type:'spawn',position:[0,0,0],size:[.3,1.7,.3],yaw:0,material:'concrete',solid:false,locked:false},
      {...o,id:'validation-object',position:[o.position[0],0,o.position[2]]}]};
    const checked=validateLayout(probe,{assets,strictBindings:false}).objects[2];
    objects.push({...checked,id:o.id,position:[...o.position],locked:false});
  }
  return {format:TEMPLATE_FORMAT,version:1,name:input.name.trim(),objects};
}
export function instantiateTemplate(doc,input,{position=[0,0,0],yaw=0,scale=1,material=null}={},idFactory=()=> 'object-'+crypto.randomUUID()) {
  const template=validateTemplate(input);
  if(!Array.isArray(position)||position.length!==3||!position.every(finite)||!finite(yaw)||!finite(scale)||scale<.25||scale>4)throw Error('Enter finite placement coordinates and scale 0.25–4.');
  if(material!==null&&!MATERIALS.includes(material))throw Error('Choose a canonical material override.');
  const next=clone(doc),ids=new Set(doc.objects.map(o=>o.id)),added=[];
  if(next.objects.length+template.objects.length>800)throw Error('Template exceeds the 800-object building limit.');
  for(const source of template.objects){const o=clone(source),id=idFactory();if(!safeId(id)||ids.has(id))throw Error('Template needs fresh unique object IDs.');ids.add(id);o.id=id;o.name=(template.name+' · '+o.name).slice(0,120);const[x,z]=worldPoint({position,yaw},o.position[0]*scale,o.position[2]*scale);o.position=[x,position[1]+o.position[1]*scale,z];o.yaw+=yaw;o.size=o.size.map(n=>n*scale);if(o.opening)for(const key of Object.keys(o.opening))o.opening[key]*=scale;if(material&&o.type!=='prop')o.material=material;added.push(o);}
  next.objects.push(...added);copyBack(doc,next);return added.map(o=>o.id);
}
export function overlappingAt(doc,id) {
  const o=doc.objects.find(o=>o.id===id);if(!o)return[];
  return doc.objects.filter(p=>{const[x,z]=localPoint(p,o.position[0],o.position[2]);return Math.abs(x)<=p.size[0]/2+.01&&Math.abs(z)<=p.size[2]/2+.01&&top(p)>=bottom(o)-.05&&bottom(p)<=top(o)+.05;}).sort((a,b)=>top(b)-top(a));
}
export function nearbyObjects(doc,id,radius=4) {
  const o=doc.objects.find(o=>o.id===id);if(!o||!finite(radius)||radius<=0||radius>30)throw Error('Choose an object and radius 0–30 m.');
  return doc.objects.filter(p=>{const[x,z]=localPoint(p,o.position[0],o.position[2]),distance=Math.hypot(Math.max(0,Math.abs(x)-p.size[0]/2),Math.max(0,Math.abs(z)-p.size[2]/2));return distance<=radius&&(Math.abs(bottom(p)-bottom(o))<2.9||bottom(p)<=bottom(o)&&top(p)>=bottom(o));}).map(p=>p.id);
}
export function interiorDiagnostics(doc,{reachability=true,limit=1200}={}) {
  if(!Number.isInteger(limit)||limit<1||limit>5000)throw Error('Walking sample limit must be 1–5000.');
  const issues=[];
  for(const o of doc.objects.filter(o=>o.type==='prop')){
    const supported=supportCandidates(doc,o.id).some(s=>{const support=doc.objects.find(p=>p.id===s.id);return Math.abs(bottom(o)-s.height)<.04&&fitsSupport(doc,o,support);});
    if(!supported)issues.push({id:o.id,level:'warning',message:o.name+' has no complete supporting top face.',fix:'Use Surface snap with a floor, table or shelf that holds the full footprint.'});
  }
  for(const stairs of doc.objects.filter(o=>o.type==='stairs')){
    for(const t of [.2,.5,.8]){const[x,z]=worldPoint(stairs,0,stairs.size[2]*(.5-t)),y=stairs.position[1]+stairs.size[1]*t;const ceiling=collidersFor(doc,{doorsOpen:true}).find(c=>c.id!==stairs.id&&c.y>y+.05&&c.y<y+1.75&&Math.abs(localPoint({position:[c.x,c.y,c.z],yaw:c.yaw},x,z)[0])<c.w/2&&Math.abs(localPoint({position:[c.x,c.y,c.z],yaw:c.yaw},x,z)[1])<c.d/2);if(ceiling){issues.push({id:stairs.id,level:'warning',message:'Low stair headroom near '+Math.round(t*100)+'% of '+stairs.name+'.',fix:'Raise/remove the ceiling or adjust stair rise/run; the walk needs about 1.75 m clearance.'});break;}}
    const[x,z]=worldPoint(stairs,0,-stairs.size[2]/2+.2),startY=stairs.position[1]+stairs.size[1]*(1-.2/stairs.size[2]),[dx,dz]=worldPoint({position:[0,0,0],yaw:stairs.yaw},0,-.75),arrival=moveInLayout(doc,{x,y:startY,z},dx,dz,{doorsOpen:true});
    if(arrival.y<stairs.position[1]+stairs.size[1]-.2||Math.hypot(arrival.x-x,arrival.z-z)<.65)issues.push({id:stairs.id,level:'warning',message:'The sampled top transition of '+stairs.name+' does not reach a clear upper floor.',fix:'Add/check the landing and its opening, clear the floor lip and verify the route in preview. Preview uses the shared opening and stair-edge support rules; verify the full route.'});
  }
  if(!reachability)return issues;
  const start=doc.objects.find(o=>o.type==='spawn');if(!start)return issues;
  const step=.5,queue=[{x:start.position[0],y:start.position[1],z:start.position[2]}],seen=new Set(),enqueued=new Set(),visited=[];
  const pointKey=p=>[Math.round(p.x/step),Math.round(p.y*4),Math.round(p.z/step)].join(',');enqueued.add(pointKey(queue[0]));
  for(let i=0;i<queue.length&&visited.length<limit;i++){
    const p=queue[i],key=pointKey(p);if(seen.has(key))continue;seen.add(key);visited.push(p);
    for(const[dx,dz]of[[step,0],[-step,0],[0,step],[0,-step]]){if(Math.abs(p.x+dx)>doc.bounds[0]/2+2||Math.abs(p.z+dz)>doc.bounds[1]/2+2)continue;const q=moveInLayout(doc,p,dx,dz,{doorsOpen:true}),key=pointKey(q);if(Math.hypot(q.x-p.x,q.z-p.z)>step*.85&&!enqueued.has(key)){enqueued.add(key);queue.push(q);}}
  }
  if(visited.length>=limit)issues.push({id:start.id,level:'warning',message:'Reachability sampling reached its '+limit+'-point limit.',fix:'Use a focused room or walk test; no unreachability conclusion was made.'});
  else for(const o of doc.objects.filter(o=>o.binding)){const level=surfaceAt(doc,o.position[0],o.position[2],o.position[1]);if(!visited.some(p=>Math.abs(p.y-level)<.55&&Math.hypot(p.x-o.position[0],p.z-o.position[2])<1.45))issues.push({id:o.id,level:'warning',message:'No sampled walking approach reaches '+o.name+'.',fix:'Clear doorways/landings or move the container closer to a walkable surface. Sampling is a diagnostic; verify in game.'});}
  return issues;
}
export function interiorIssues(doc,options) {
  return [...validateSpatial(doc).map(q=>({...q,fix:'Select/focus the object, then adjust its dimensions or placement.'})),...interiorDiagnostics(doc,options)];
}

// Preserve the accepted editor policy for a bound object's authored support floor
// when a UI transform changes its height. Imports retain their explicit binding.
export function updateMovedBindingFloors(previous,next) {
  for(const object of next.objects){
    if(object.binding?.floor===undefined)continue;
    const old=previous.objects.find(item=>item.id===object.id);
    if(old&&old.position[1]!==object.position[1])object.binding.floor=Math.max(0,...next.objects
      .filter(item=>item.type==='floor'&&item.position[1]<=object.position[1]+.1)
      .map(item=>item.position[1]));
  }
  return next;
}
