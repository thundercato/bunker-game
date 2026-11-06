import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCampaignInteriors} from '../campaign-interiors.js';
import {clone,validateLayout,worldPoint,localPoint,collidersFor} from '../layout-core.js';
import {cutawayWalls,supportCandidates,snapToSupport,fitsSupport,alignSelection,rotateAssembly,joinWallEndpoints,addStairLanding,createTemplate,validateTemplate,instantiateTemplate,overlappingAt,nearbyObjects,interiorDiagnostics} from '../editor/tools/interior-core.js';
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name);}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const object=(id,type,position,size,extra={})=>({id,name:id,type,position,size,yaw:0,material:'wood',solid:true,locked:false,...(type==='prop'?{asset:'painted_wooden_table'}:{}),...extra});
function scene(){return validateLayout({format:'field-signal-layout',version:1,buildingId:'hut',name:'Workshop',origin:[9,0,-17],bounds:[12,12],objects:[object('ground','floor',[0,0,0],[12,.16,12]),object('spawn','spawn',[0,0,5],[.35,1.7,.35],{solid:false}),object('table','prop',[0,0,0],[3,1,2],{yaw:Math.PI*.37}),object('box','prop',[0,2,0],[.4,.3,.6],{asset:'wooden_crate_01',yaw:Math.PI*.11})]});}
test('rotated support: canonical local footprint fits, snap rests on actual top',()=>{const d=scene(),table=d.objects[2],box=d.objects[3],[x,z]=worldPoint(table,.6,-.3);box.position=[x,2,z];const oldXZ=[x,z];assert.ok(fitsSupport(d,box,table));assert.equal(supportCandidates(d,'box').find(o=>o.id==='table').height,1);snapToSupport(d,'box','table');close(d.objects[3].position[1],1);assert.deepEqual([d.objects[3].position[0],d.objects[3].position[2]],oldXZ);close(d.objects[3].yaw,box.yaw);close(collidersFor(d).find(c=>c.id==='box').y,1);});
test('support centre and yaw are explicit overrides',()=>{const d=scene();snapToSupport(d,'box','table',{centre:true,alignYaw:true});assert.deepEqual(d.objects[3].position,[0,1,0]);close(d.objects[3].yaw,d.objects[2].yaw);});
test('snap rejects full footprint overhang atomically',()=>{const d=scene();d.objects[3].size=[4,.3,4];const before=clone(d);assert.throws(()=>snapToSupport(d,'box','table',{centre:true}),/full prop footprint/);assert.deepEqual(d,before);});
test('snap rejects collision on support atomically',()=>{const d=scene();d.objects.push(object('blocker','prop',[0,1,0],[.8,1,.8]));const before=clone(d);assert.throws(()=>snapToSupport(d,'box','table'),/intersects blocker/);assert.deepEqual(d,before);});
test('floor support uses automatic stair opening',()=>{const d=scene();d.objects.push(object('upper','floor',[0,3.2,0],[11,.16,11]),object('stairs','stairs',[0,0,0],[2,3.2,5]));const before=clone(d);assert.throws(()=>snapToSupport(d,'box','upper'),/stair openings/);assert.deepEqual(d,before);d.objects[3].position[0]=4;snapToSupport(d,'box','upper');close(d.objects[3].position[1],3.2);});
test('locked, missing and non-prop edits reject without partial edits',()=>{const d=scene();d.objects[3].locked=true;const old=clone(d);assert.throws(()=>snapToSupport(d,'box','ground'),/Unlock/);assert.throws(()=>snapToSupport(d,'missing','ground'),/existing/);assert.throws(()=>snapToSupport(d,'ground','table'),/prop bottom/);assert.deepEqual(d,old);});
test('alignment uses rotated reference axes and projected dimensions',()=>{const d=scene(),ref=d.objects[2];alignSelection(d,['table','box'],'table','x-max');const box=d.objects[3],p=localPoint(ref,box.position[0],box.position[2]),a=box.yaw-ref.yaw,extent=Math.abs(Math.cos(a))*box.size[0]/2+Math.abs(Math.sin(a))*box.size[2]/2;close(p[0]+extent,ref.size[0]/2);assert.deepEqual(d.objects[2],ref);});
test('bottom and top alignment respect floor top convention',()=>{const d=scene();alignSelection(d,['ground','box'],'ground','bottom');close(d.objects[3].position[1],-.16);alignSelection(d,['table','box'],'table','top');close(d.objects[3].position[1]+d.objects[3].size[1],1);});
test('dimension and yaw match apply to targets, rejected mismatch is atomic',()=>{const d=scene();alignSelection(d,['table','box'],'table','dimensions');assert.deepEqual(d.objects[3].size,d.objects[2].size);alignSelection(d,['table','box'],'table','yaw');close(d.objects[3].yaw,d.objects[2].yaw);const old=clone(d);assert.throws(()=>alignSelection(d,['table','ground'],'table','dimensions'),/same type/);assert.deepEqual(d,old);});
test('rigid collection rotates each child once in building-local coordinates',()=>{const d=scene();d.objects[2].position=[2,0,1];d.objects[3].position=[3,2,1];d.objects[3].binding={type:'container',id:'hut_c1'};const before=clone(d),origin=[...d.origin];rotateAssembly(d,['table','box'],90,'table');assert.deepEqual(d.objects[2].position,[2,0,1]);close(d.objects[3].position[0],2);close(d.objects[3].position[2],0);close(d.objects[3].position[1],2);close(d.objects[3].yaw,before.objects[3].yaw+Math.PI/2);assert.deepEqual(d.objects[3].binding,before.objects[3].binding);assert.deepEqual(d.origin,origin);rotateAssembly(d,['table','box'],-90,'table');d.objects.forEach((o,i)=>o.position.forEach((n,j)=>close(n,before.objects[i].position[j])));});
test('whole assembly edit is atomic with a locked child or missing pivot',()=>{const d=scene();d.objects[3].locked=true;const old=clone(d);assert.throws(()=>rotateAssembly(d,['table','box'],45,'table'),/Unlock/);assert.throws(()=>rotateAssembly(d,['table'],45,'spawn'),/selected pivot/);assert.deepEqual(d,old);});
test('template captures local rigid pose and JSON round trips',()=>{const d=scene();const table=d.objects[2],[x,z]=worldPoint(table,.5,.2);d.objects[3].position=[x,1,z];const t=createTemplate(d,['table','box'],'Table set');assert.deepEqual(t.objects[0].position,[0,0,0]);t.objects[1].position.forEach((n,i)=>close(n,[.5,1,.2][i]));close(t.objects[0].yaw,0);assert.deepEqual(validateTemplate(JSON.parse(JSON.stringify(t))),t);});
test('template rejects protected binding, door and spawn identities',()=>{for(const kind of ['binding','doorId','spawn','doorway']){const d=scene();const o=d.objects[3];if(kind==='binding')o.binding={type:'container',id:'hut_c1'};else if(kind==='doorId')o.doorId='hut';else o.type=kind;assert.throws(()=>createTemplate(d,['box'],'bad'),/cannot copy/);}});
test('import strips unknown fields and rejects duplicate/unsafe IDs, URLs and scripts',()=>{const t=createTemplate(scene(),['box'],'Crate');t.objects[0].script='fetch("private")';t.objects[0].materialUV=[2,3];assert.equal(validateTemplate(t).objects[0].script,undefined);assert.equal(validateTemplate(t).objects[0].materialUV,undefined);assert.throws(()=>validateTemplate({...t,objects:[...t.objects,...t.objects]}),/duplicate/);assert.throws(()=>validateTemplate({...t,objects:[{...t.objects[0],id:'../x'}]}),/unsafe/);assert.throws(()=>validateTemplate({...t,objects:[{...t.objects[0],asset:'https://example.com/x.glb'}]}),/Unknown asset/);assert.throws(()=>validateTemplate({...t,objects:[{...t.objects[0],binding:{type:'loose',id:'hut_l1'}}]}),/protected/);assert.throws(()=>validateTemplate(t,{assets:new Set(['other'])}),/Unknown asset/);});
test('template insertion uses fresh IDs and concrete override fields',()=>{const d=scene();d.objects[3].position=[1,1,0];const t=createTemplate(d,['table','box'],'Workshop');let n=0;const added=instantiateTemplate(d,t,{position:[-3,.5,2],yaw:.8,scale:1.2},()=>`new-${++n}`);assert.deepEqual(added,['new-1','new-2']);const pivot=d.objects.find(o=>o.id===added[0]),child=d.objects.find(o=>o.id===added[1]);assert.deepEqual(pivot.position,[-3,.5,2]);const relative=localPoint(pivot,child.position[0],child.position[2]),original=localPoint(scene().objects[2],1,0);close(relative[0],original[0]*1.2);close(relative[1],original[1]*1.2);close(child.position[1],1.7);close(child.yaw,t.objects[1].yaw+.8);assert.deepEqual(child.size,t.objects[1].size.map(n=>n*1.2));assert.deepEqual(validateLayout(JSON.parse(JSON.stringify(d)),{strictBindings:false}),d);assert.equal(child.binding,undefined);assert.equal(child.locked,false);});
test('window opening scales and canonical material override is applied',()=>{const d=scene();d.objects.push(object('window','window',[1,0,0],[3,3.2,.2],{opening:{width:1.5,height:1.2,sill:1}}));const t=createTemplate(d,['window'],'Opening');instantiateTemplate(d,t,{position:[2,0,0],scale:1.5,material:'brick'},()=> 'window-copy');const o=d.objects.at(-1);assert.equal(o.material,'brick');for(const [k,v] of Object.entries({width:2.25,height:1.8,sill:1.5}))close(o.opening[k],v);});
test('duplicate IDs, invalid scale/material and bad dimensions never partially insert',()=>{const d=scene(),t=createTemplate(d,['table','box'],'Copy'),before=clone(d);let i=0;assert.throws(()=>instantiateTemplate(d,t,{},()=>++i===1?'fresh':'ground'),/fresh unique/);assert.deepEqual(d,before);for(const settings of [{scale:0},{scale:10},{material:'invisible'},{position:[0,NaN,0]},{position:[0,12,0]}]){assert.throws(()=>instantiateTemplate(d,t,settings,()=>`fresh-${++i}`));assert.deepEqual(d,before);}});
test('overlap chooser returns real stable authored IDs and proximity is view-only',()=>{const d=scene();snapToSupport(d,'box','table');const old=clone(d);assert.deepEqual(overlappingAt(d,'box').map(o=>o.id),['box','table']);assert.ok(nearbyObjects(d,'table',1).includes('box'));assert.ok(!nearbyObjects(d,'table',1).includes('spawn'));assert.deepEqual(d,old);assert.throws(()=>nearbyObjects(d,'box',0),/radius/);});
test('diagnostics reveal unsupported footprint, stair headroom, and suggested fixes',()=>{const d=scene();d.objects[3].position=[4,1,0];d.objects.push(object('stairs','stairs',[-3,0,0],[2,3.2,5]),object('low-roof','roof',[-3,2.5,0],[3,.2,7]));const issues=interiorDiagnostics(d,{reachability:false});assert.ok(issues.some(i=>i.id==='box'&&/supporting/.test(i.message)&&/Surface snap/.test(i.fix)));assert.ok(issues.some(i=>i.id==='stairs'&&/headroom/.test(i.message)&&/ceiling/.test(i.fix)));assert.ok(issues.every(i=>d.objects.some(o=>o.id===i.id)));});
test('bounded reachability warns on cap without asserting inaccessible targets',()=>{const d=scene();d.objects[3].binding={type:'container',id:'hut_c1'};const issues=interiorDiagnostics(d,{limit:3});assert.ok(issues.some(i=>/3-point limit/.test(i.message)));assert.ok(!issues.some(i=>/No sampled walking approach/.test(i.message)));});
test('sealed actual collision prevents sampled container approach',()=>{const d=scene();d.objects=d.objects.filter(o=>!['table','box'].includes(o.id));d.bounds=[6,6];d.objects[1].position=[-2,0,0];d.objects.push(object('enclosed','prop',[1,0,0],[.4,.4,.4],{binding:{type:'container',id:'hut_c1'}}),object('partition','wall',[0,0,0],[12,3,.2],{yaw:Math.PI/2}),object('back','wall',[-3,0,0],[12,3,.2],{yaw:Math.PI/2}),object('north','wall',[0,0,-3],[12,3,.2]),object('south','wall',[0,0,3],[12,3,.2]));const issues=interiorDiagnostics(d);assert.ok(issues.some(i=>i.id==='enclosed'&&/No sampled walking approach/.test(i.message)),JSON.stringify(issues));});
function anchoredApproachScene(){
 return validateLayout({format:'field-signal-layout',version:1,buildingId:'hut',name:'Bound approach',origin:[9,0,-17],bounds:[8,8],objects:[
  object('ground','floor',[0,0,0],[8,.16,8]),object('spawn','spawn',[-3,0,0],[.35,1.7,.35],{solid:false}),
  object('deep-container','prop',[1.5,0,0],[6,1,4],{yaw:-Math.PI/2,binding:{type:'container',id:'hut_c1',floor:0}}),
  object('west','wall',[-4,0,0],[8,3,.2],{yaw:Math.PI/2}),object('east','wall',[4,0,0],[8,3,.2],{yaw:Math.PI/2}),
  object('north','wall',[0,0,-4],[8,3,.2]),object('south','wall',[0,0,4],[8,3,.2]),
 ]},{strictBindings:false});
}
const noApproach=(issues,id)=>issues.some(i=>i.id===id&&/No sampled walking approach/.test(i.message));
test('sampled approach uses the rotated canonical front anchor rather than a solid container centre',()=>{
 const d=anchoredApproachScene(),container=d.objects.find(o=>o.id==='deep-container');
 assert.ok(noApproach(interiorDiagnostics(d),container.id),'The centre is too deep inside its collider to approach');
 container.binding.anchor=[0,.5,2];const raw=JSON.stringify(d);
 assert.ok(!noApproach(interiorDiagnostics(d),container.id),'The shared +Z front anchor rotates onto the reachable west face');
 assert.equal(JSON.stringify(d),raw,'Diagnosis must not rewrite IDs, bindings or local coordinates');
 assert.deepEqual(interiorDiagnostics(JSON.parse(raw)),interiorDiagnostics(d));
});
test('an anchor on the obstructed reverse face retains an actionable bounded warning',()=>{
 const d=anchoredApproachScene(),container=d.objects.find(o=>o.id==='deep-container');container.binding.anchor=[0,.5,-2];
 const before=clone(d),issues=interiorDiagnostics(d),warning=issues.find(i=>i.id===container.id&&/No sampled walking approach/.test(i.message));
 assert.ok(warning,'The wall leaves no walking approach behind the container');
 assert.match(warning.fix,/interaction anchor and support floor/);assert.match(warning.fix,/diagnostic; verify in game/);
 assert.ok(!issues.some(i=>/point limit/.test(i.message)),'This fixture completes the bounded search');assert.deepEqual(d,before);
});
test('explicit ground support floor is honoured for a wall-mounted binding beneath a mezzanine',()=>{
 const d=validateLayout({format:'field-signal-layout',version:1,buildingId:'hut',name:'Wall cupboard support',origin:[9,0,-17],bounds:[8,8],objects:[
  object('ground','floor',[0,0,0],[8,.16,8]),object('mezzanine','floor',[0,1.8,0],[8,.16,8]),
  object('spawn','spawn',[-3,0,0],[.35,1.7,.35],{solid:false}),
  object('wall-cupboard','prop',[0,1.38,0],[.72,.85,.38],{binding:{type:'container',id:'hut_c1',floor:0,anchor:[0,.4675,.27]}}),
 ]},{strictBindings:false}),before=clone(d),issues=interiorDiagnostics(d);
 assert.ok(!noApproach(issues,'wall-cupboard'),'Explicit floor 0 must not be replaced by a higher surface inferred from the mounted body');
 const support=issues.find(i=>i.id==='wall-cupboard'&&/supporting top face/.test(i.message));assert.match(support.fix,/intentionally wall-mounted/);assert.match(support.fix,/actual game preview/);
 const inferred=clone(d);delete inferred.objects.find(o=>o.id==='wall-cupboard').binding.floor;
 assert.ok(noApproach(interiorDiagnostics(inferred),'wall-cupboard'),'Without a declared floor, the shared surface fallback identifies the mezzanine');assert.deepEqual(d,before);
});
test('rotated wall endpoints meet once and preserve the opening binding',()=>{const d=scene();d.objects.push(object('wall-a','wall',[1,0,1],[3,3,.2],{yaw:.37}),object('door','doorway',[-1,0,0],[3,3,.2],{doorId:'hut',opening:{width:1.5,height:2.3,sill:0}}));const ref=clone(d.objects.at(-2));joinWallEndpoints(d,'door','wall-a',{orientation:'perpendicular',movingEnd:'negative',referenceEnd:'positive'});const door=d.objects.at(-1),a=worldPoint(ref,1.5,0),b=worldPoint(door,-1.5,0);a.forEach((n,i)=>close(n,b[i]));close(door.yaw,ref.yaw+Math.PI/2);assert.equal(door.doorId,'hut');assert.deepEqual(door.opening,{width:1.5,height:2.3,sill:0});assert.deepEqual(d.objects.at(-2),ref);const old=clone(d);assert.throws(()=>joinWallEndpoints(d,'table','door'),/two different walls/);assert.deepEqual(d,old);});
test('real floor landings respect stair rise, shared holes, fresh IDs and bottom yaw',()=>{const d=scene();d.objects.push(object('stairs','stairs',[0,0,0],[2,3.2,5]));const id=addStairLanding(d,'stairs',{depth:1.2},()=> 'top-landing'),o=d.objects.find(o=>o.id===id);o.position.forEach((n,i)=>close(n,[0,3.2,-3.26][i]));assert.deepEqual(o.size,[2,.16,1.2]);close(collidersFor(d).find(c=>c.id===id).y+o.size[1],3.2);d.objects.find(o=>o.id==='stairs').yaw=.8;const old=clone(d);assert.throws(()=>addStairLanding(d,'stairs',{},()=> 'clipped'),/rotated stair opening clips/);assert.deepEqual(d,old);addStairLanding(d,'stairs',{end:'bottom'},()=> 'bottom-landing');const bottom=d.objects.at(-1);close(bottom.yaw,.8);const[x,z]=worldPoint(d.objects.find(o=>o.id==='stairs'),0,3.1);close(bottom.position[0],x);close(bottom.position[2],z);close(bottom.position[1],0);});

const {updateMovedBindingFloors}=await import('../editor/tools/interior-core.js');
test('UI height transforms keep accepted binding floor policy in local coordinates',()=>{
 const previous={objects:[object('ground','floor',[0,0,0],[8,.2,8]),object('upper','floor',[0,3.2,0],[8,.2,8]),object('case','prop',[1,1,0],[1,1,1],{binding:{type:'container',id:'case',floor:0,anchor:[0,.5,.5]}})]};
 const next=clone(previous);next.objects[2].position[1]=4.1;
 updateMovedBindingFloors(previous,next);assert.equal(next.objects[2].binding.floor,3.2);assert.deepEqual(next.objects[2].binding.anchor,[0,.5,.5]);
 const down=clone(next);down.objects[2].position[1]=.8;updateMovedBindingFloors(next,down);assert.equal(down.objects[2].binding.floor,0);
 const explicit=clone(next);explicit.objects[2].binding.floor=2.7;updateMovedBindingFloors(next,explicit);assert.equal(explicit.objects[2].binding.floor,2.7);
 assert.equal(previous.objects[2].binding.floor,0);
});

test('cutaway opens the actual 52-object cottage on ground and upper floors without authoring changes',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url))),d=createCampaignInteriors(source).find(d=>d.buildingId==='forester');
 assert.equal(d.objects.length,52);
 const raw=JSON.stringify(d),colliders=collidersFor(d),bindings=d.objects.filter(o=>o.binding||o.doorId).map(clone);
 assert.deepEqual(cutawayWalls(d),['wall-east','entrance','upper-wall-east','upper-wall-front']);
 assert.equal(JSON.stringify(d),raw);assert.deepEqual(collidersFor(d),colliders);assert.deepEqual(d.objects.filter(o=>o.binding||o.doorId),bindings);
 assert.ok(!cutawayWalls(d).includes('partition-door-forester_inner'));
});
test('cutaway uses local boundary centres for rotated walls on every storey and leaves other object types alone',()=>{
 const d=scene();d.objects.push(
  object('east-upper','wall',[6,6.4,0],[7,3.2,.2],{yaw:.63}),
  object('front-upper','window',[0,3.2,6],[7,3.2,.2],{yaw:-.42,opening:{width:2,height:1.2,sill:1}}),
  object('front-door','doorway',[0,0,6],[3,3.2,.2],{doorId:'hut',opening:{width:1.3,height:2.5,sill:0}}),
  object('rear-upper','wall',[0,6.4,-6],[12,3.2,.2]),
  object('west-upper','wall',[-6,6.4,0],[12,3.2,.2],{yaw:Math.PI/2}),
  object('partition-upper','wall',[1,3.2,2],[6,3.2,.2]),
  object('east-bound-prop','prop',[6,3.2,0],[1,1,1],{binding:{type:'container',id:'hut_c1'}}),
  object('front-floor','floor',[0,3.2,6],[3,.16,3])
 );
 assert.deepEqual(cutawayWalls(d),['east-upper','front-upper','front-door']);
 assert.deepEqual(cutawayWalls({...d,origin:[110,7,-210]}),cutawayWalls(d),'Provenance origin must not be composed into local view tests');
});
test('cutaway retains the existing 15 cm boundary tolerance and never removes a centred interior wall',()=>{
 const d=scene();d.objects.push(object('at-east-tolerance','wall',[5.85,0,0],[2,3,.2]),object('inside-east-tolerance','wall',[5.849,0,0],[2,3,.2]),object('at-front-tolerance','wall',[0,9.6,5.85],[2,3,.2]));
 assert.deepEqual(cutawayWalls(d),['at-east-tolerance','at-front-tolerance']);
});

console.log(`PASS editor interior workshop: ${count} cases`);
