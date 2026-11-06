import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCampaignInteriors, CAMPAIGN_INTERIOR_BUILDINGS} from '../campaign-interiors.js';
import {seedLayout, validateLayout, validateSpatial, bounds2, collidersFor,
 blocked, surfaceAt, floorPieces, moveInLayout, worldPoint, localPoint, compiledWorld} from '../layout-core.js';

const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url)));
const source=read('../world.json'), before=JSON.stringify(source);
const catalogue=read('../search-props.json'), imported=read('../assets/campaign/registry.json');
const search=new Map(catalogue.props.map(p=>[p.id,p]));
const licensed=new Map(imported.assets.map(p=>[p.id,p]));
const originalProfiles=new Map(source.containers.map(c=>[c.id,c.profile]));
const docs=createCampaignInteriors(source);
let count=0;
function check(name,fn){fn();count++;console.log('PASS',name);}
const near=(a,b,t=.045)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const lookup=(d,id)=>{const o=d.objects.find(o=>o.id===id);assert.ok(o,id);return o;};

/** Follow the real shared movement helper in small steps, including the full exit
 * from a stair slope onto its landing. Endpoint-only floor probes miss that gap. */
function walk(doc,points,start=null,options={}) {
 let p=start||{x:0,z:5.9,y:0};
 for(const [x,z,y=p.y] of points){
  const steps=Math.max(1,Math.ceil(Math.hypot(x-p.x,z-p.z)/.04));
  const dx=(x-p.x)/steps,dz=(z-p.z)/steps;
  for(let i=0;i<steps;i++)p=moveInLayout(doc,p,dx,dz,options);
  near(p.x,x);near(p.z,z);near(p.y,y);
  assert.equal(blocked(doc,p.x,p.z,p.y,{doorsOpen:true}),false,`${doc.buildingId}: ${x},${z} blocked`);
 }
 return p;
}

check('Factory is deterministic, validates v1 documents and leaves source unchanged',()=>{
 assert.equal(JSON.stringify(source),before);
 assert.deepEqual(docs,createCampaignInteriors(source));
 assert.deepEqual(docs.map(d=>d.buildingId),['forester','v1','v2','v3']);
 assert.deepEqual(CAMPAIGN_INTERIOR_BUILDINGS,docs.map(d=>d.buildingId));
 for(const d of docs)assert.deepEqual(validateLayout(d,{world:source}),d);
 const fresh=createCampaignInteriors(source);fresh[0].objects[0].position[0]=100;
 assert.equal(createCampaignInteriors(source)[0].objects[0].position[0],0);
});

for(const d of docs){
 check(`${d.buildingId}: stable source, doors, every container and physical loot surface`,()=>{
  const seed=seedLayout(source,d.buildingId),b=source.buildings.find(b=>b.id===d.buildingId);
  assert.deepEqual(d.origin,[b.x,0,b.z]);assert.deepEqual(d.bounds,[b.w,b.d]);
  const bindings=doc=>doc.objects.filter(o=>o.binding).map(o=>[o.id,o.binding.type,o.binding.id]).sort();
  assert.deepEqual(bindings(d),bindings(seed));
  const doors=doc=>doc.objects.filter(o=>o.doorId).map(o=>o.doorId).sort();
  assert.deepEqual(doors(d),doors(seed));
  for(const o of seed.objects.filter(o=>o.type==='floor'))assert.deepEqual(lookup(d,o.id),o);
  assert.equal(d.objects.filter(o=>o.type==='stairs').length,b.floors===2?1:0);
  for(const o of d.objects.filter(o=>o.binding?.type==='container')){
   const original=seed.objects.find(s=>s.binding?.id===o.binding.id);
   assert.equal(o.position[1]>=3,original.position[1]>=3,'Original floor is retained');
   const originalContainer=source.containers.find(c=>c.id===o.binding.id);
   assert.equal(o.binding.floor,originalContainer.floor||0,'Physical interaction floor remains independent of visual mount');
  }
  const compiled=compiledWorld(d,source);
  for(const original of source.containers.filter(c=>c.building===d.buildingId)){
   const c=compiled.containers.find(c=>c.id===original.id);
   assert.equal(c.floor,original.floor||0);
   assert.equal(c.profile,original.profile);
   assert.deepEqual(c.guaranteed,original.guaranteed);
   assert.equal(c.id,original.id);
  }
  for(const m of compiled.missions.filter(m=>source.containers.some(c=>c.id===m.container&&c.building===d.buildingId))){
   const c=compiled.containers.find(c=>c.id===m.container);assert.equal(m.x,c.x);assert.equal(m.z,c.z);
  }
 });
 check(`${d.buildingId}: registered visual dimensions, retained loot profiles and supported furniture`,()=>{
  for(const o of d.objects.filter(o=>o.type==='prop')){
   const spec=search.get(o.asset)||licensed.get(o.asset);
   if(spec)assert.deepEqual(o.size,spec.dimensions,o.id+' size must match rendered geometry');
   else assert.equal(o.asset,'painted_wooden_table');
   if(o.binding?.type==='container'){
    assert.ok(search.has(o.asset));
    const c=source.containers.find(c=>c.id===o.binding.id);
    assert.equal(c.profile,originalProfiles.get(c.id));
   }
  }
  assert.deepEqual(validateSpatial(d),[]);
 });
 check(`${d.buildingId}: no intersecting furniture volumes or unreachable floor overhang`,()=>{
  const props=d.objects.filter(o=>o.type==='prop');
  for(let i=0;i<props.length;i++){
   const a=props[i],aa=bounds2(a);
   assert.ok(Math.abs(aa.x)+aa.w/2<=d.bounds[0]/2-.1,a.id+' inside east/west shell');
   assert.ok(Math.abs(aa.z)+aa.d/2<=d.bounds[1]/2-.1,a.id+' inside front/rear shell');
   for(let j=i+1;j<props.length;j++){
    const b=props[j],bb=bounds2(b);
    const overlapY=Math.min(a.position[1]+a.size[1],b.position[1]+b.size[1])-Math.max(a.position[1],b.position[1]);
    const overlapX=Math.min(aa.x+aa.w/2,bb.x+bb.w/2)-Math.max(aa.x-aa.w/2,bb.x-bb.w/2);
    const overlapZ=Math.min(aa.z+aa.d/2,bb.z+bb.d/2)-Math.max(aa.z-aa.d/2,bb.z-bb.d/2);
    assert.ok(overlapY<=.015||overlapX<=.015||overlapZ<=.015,`${a.id} intersects ${b.id}`);
   }
   if(a.position[1]>=3.2)for(const [x,z] of [[-aa.w/2,-aa.d/2],[-aa.w/2,aa.d/2],[aa.w/2,-aa.d/2],[aa.w/2,aa.d/2]])
    near(surfaceAt(d,aa.x+x,aa.z+z,3.2),3.2);
  }
 });
 check(`${d.buildingId}: closed exterior has no ground or upper gaps; windows replace walls`,()=>{
  for(const y of d.objects.some(o=>o.id==='upper')?[.1,3.3]:[.1])
   for(let n=-4.25;n<=4.25;n+=.25){
    assert.ok(blocked(d,n,-4.5,y,{doorsOpen:false,radius:.015}));
    assert.ok(blocked(d,n,4.5,y,{doorsOpen:false,radius:.015}));
    assert.ok(blocked(d,-5,n,y,{doorsOpen:false,radius:.015}));
    assert.ok(blocked(d,5,n,y,{doorsOpen:false,radius:.015}));
   }
  const opaque=collidersFor(d).filter(c=>['wall','roof'].includes(c.kind));
  for(const o of d.objects.filter(o=>o.type==='window')){
   const y=o.position[1]+o.opening.sill+o.opening.height/2;
   assert.equal(opaque.some(c=>{
    const [x,z]=localPoint({position:[c.x,c.y,c.z],yaw:c.yaw},o.position[0],o.position[2]);
    return Math.abs(x)<c.w/2&&Math.abs(z)<c.d/2&&y>c.y&&y<c.y+c.h;
   }),false,o.id+' must not conceal a duplicate wall');
  }
 });
 check(`${d.buildingId}: entrance and retained internal door actually control passage`,()=>{
  let p=moveInLayout(d,{x:0,z:5.9,y:0},0,-2.5,{doorsOpen:false});assert.ok(p.z>4.7);
  p=walk(d,[[0,3.6],[0,1]]);
  const closed=moveInLayout(d,p,0,-2,{doorsOpen:false});assert.ok(closed.z>.5);
  walk(d,[[0,-1]],p);
 });
 check(`${d.buildingId}: original search targets and dining loot have walking approaches`,()=>{
  const approaches=new Map();
  approaches.set('c0',walk(d,[[0,3.6],[0,1],[0,-1.1],[-3.7,-1.1],[-3.7,-3.4]]));
  approaches.set('c2',walk(d,[[0,3.6],[0,1],[-3.65,1.05]]));
  approaches.set('kitchen',walk(d,[[0,3.6],[0,1],[0,-1.1],[d.buildingId==='v3'?-.8:1.3,-1.1],[d.buildingId==='v3'?-.8:1.3,-3.1]]));
  const upper=d.objects.some(o=>o.id==='upper');
  approaches.set('c1',upper?walk(d,[[0,3.6],[0,1],[0,-1.1],[-2.4,-1.1]])
   :walk(d,[[0,3.6],[0,1],[0,-1.8],[2,-1.8],[2,-3.4],[3.8,-3.4]]));
  for(const [suffix,p]of approaches){
   const o=lookup(d,'container-'+d.buildingId+'_'+suffix),spec=search.get(o.asset);
   const [x,z]=worldPoint(o,spec.interaction.anchor[0],spec.interaction.anchor[2]);
   assert.ok(Math.hypot(x-p.x,z-p.z)<spec.interaction.reach-.4,o.id+' search reach');
   const [lx,lz]=localPoint(o,p.x,p.z);
   assert.ok(lz>o.size[2]/2,o.id+' must be approachable from its front');
  }
  const table=lookup(d,'surface-'+d.buildingId+'_table');
  const p=walk(d,[[0,3.6],[-1.05,3.6],[-1.05,2.45]]);
  assert.ok(Math.hypot(table.position[0]-p.x,table.position[2]-p.z)<1.5);
 });
 if(d.objects.some(o=>o.id==='upper')){
  check(`${d.buildingId}: walk both stair landings, upper rooms and full return route`,()=>{
   const st=lookup(d,'stairs-main'),floor=lookup(d,'upper');
   assert.ok(st.size[1]/st.size[2]<.6);
   assert.ok(floorPieces(d,floor).every(p=>p.w>0&&p.d>0));
   let p=walk(d,[[0,3.6],[1.3,3.6],[3.5,3.6],[3.5,2.9],[3.5,-3.35,3.2],[1.1,-3.35,3.2],[1.1,-1.7,3.2]]);
   // Enter bedroom without brushing its bedside furniture; then walk to bed foot.
   p=walk(d,[[-.45,-1.7,3.2],[-.45,.55,3.2],[-2.8,.55,3.2]],p);
   p=walk(d,[[-.45,.55,3.2],[-.45,-1.7,3.2],[1.1,-1.7,3.2],[1.1,.9,3.2],[1,1.45,3.2],[1,3.1,3.2]],p);
   p=walk(d,[[1,1.45,3.2],[1.1,.9,3.2],[1.1,-3.35,3.2],[3.5,-3.35,3.2],[3.5,3.6,0],[0,3.6,0],[0,5.9,0]],p);
   near(p.y,0);
  });
  if(d.buildingId==='v2')check('Postmaster upstairs chest remains reachable with its saved ID',()=>{
   const p=walk(d,[[0,3.6],[3.5,3.6],[3.5,-3.35,3.2],[1.1,-3.35,3.2],[1.1,-1.7,3.2],[-.45,-1.7,3.2],[-.45,-3,3.2],[-3.6,-3,3.2]]);
   const chest=lookup(d,'container-v2_chest');assert.equal(chest.binding.id,'v2_chest');
   assert.ok(Math.hypot(chest.position[0]-p.x,chest.position[2]-p.z)<1);
  });
 }else check('Grey gable bedroom and bathroom work on the original ground floor',()=>{
  walk(d,[[0,3.6],[0,-1.8],[2,-1.8],[2,-.25],[3.05,-.25]]);
  walk(d,[[0,3.6],[1.1,3.6],[1.1,2.3],[2.6,2.3],[3.8,2.3]]);
 });
}

check('Approach and headroom checks detect regressions instead of accepting unreachable furniture',()=>{
 const d=createCampaignInteriors(source)[0];
 const moved=lookup(d,'container-forester_c1');moved.position=[0,0,1];moved.size=[2.1,1.9,.6];
 assert.throws(()=>walk(d,[[0,3.6],[0,-1.1]]));
 const low=createCampaignInteriors(source)[0];
 low.objects.push({id:'low-beam',type:'wall',name:'Low lintel',position:[3.5,3,-1],size:[1.6,.4,.4],yaw:0,solid:true,material:'wood'});
 assert.throws(()=>walk(low,[[0,3.6],[3.5,3.6],[3.5,-3.35,3.2]]));
});
console.log(`${count} campaign interior tests passed`);
