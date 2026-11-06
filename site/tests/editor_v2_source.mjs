import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadEditorSource, initialEditorLayout} from '../editor/source-adapter.js';
import {EditorSession, WORLD_DRAFT_KEY, SESSION_KEY} from '../editor/session.js';
import {createWorldDocument, compileBuilding} from '../world-document.js';
import {seedLayout} from '../layout-core.js';
import {initialWorld} from '../editor/world-core.js';

const originalFetch=globalThis.fetch;
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sourceBytes=read('world.json');
let changedSource=false, changedMetadata=false, missingSource=false, count=0;
globalThis.fetch=async input=>{
 const path=String(input).replace(/^.*\/site\//,'');
 if(path==='world.json'&&missingSource)return new Response('',{status:404});
 let raw=read(path);
 if(path==='world.json'&&changedSource)raw+='\n';
 if(path==='editor/source-context.json'&&changedMetadata){const m=JSON.parse(raw);m.sourceRevision='0'.repeat(40);raw=JSON.stringify(m);}
 return new Response(raw,{status:200,headers:{'Content-Type':'application/json'}});
};
const check=(name,fn)=>{fn();count++;console.log('PASS',name);};
try{
 const context=await loadEditorSource();
 check('Accepted runtime loader retains original IDs and supplies actual campaign scenes',()=>{
  assert.equal(context.source.containers.length,143);
  assert.equal(context.source.campaignScenes.length,4);
  assert.equal(initialEditorLayout(context.source,'forester').objects.length,52);
  assert.equal(read('world.json'),sourceBytes);
  assert.equal(context.capabilities.worldPreview,true);
 });
 check('Editor uses the accepted runtime full asset registry',()=>{
  for(const id of ['painted_wooden_table','search_double_wall_cupboard','campaign_bed_double'])assert.ok(context.assets.has(id),id);
  const props=JSON.parse(read('search-props.json')).props;
  for(const p of props)assert.ok(context.assets.has(p.id),p.id);
 });
 check('Initial scene is a detached exact authored layout and canonical binding anchors agree',()=>{
  const layout=initialEditorLayout(context.source,'forester');
  const scene=context.source.campaignScenes.find(s=>s.id==='forester');
  assert.deepEqual(layout,scene.layout);
  const doc=createWorldDocument({...context,layouts:[layout]});
  const compiled=compileBuilding(doc,'forester',context);
  assert.deepEqual(compiled.interactions,scene.interactions);
  layout.objects[0].position[0]+=3;
  assert.deepEqual(initialEditorLayout(context.source,'forester'),scene.layout);
 });
 check('Session chooses actual campaign layout only when no existing explicit draft exists',()=>{
  const values=new Map(), storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  let session=new EditorSession({...context,storage}).load();
  assert.equal(session.ensureLayout('forester').objects.length,52);
  const existing=initialEditorLayout(context.source,'forester');existing.objects[0].size[0]-=.25;
  values.set('field-signal-editor-v1:forester',JSON.stringify(existing));
  session=new EditorSession({...context,storage}).load();
  assert.deepEqual(session.ensureLayout('forester'),existing);
  assert.equal(values.size,1,'loading never writes source/draft storage');
  const legacy=seedLayout(JSON.parse(sourceBytes),'forester');
  legacy.objects[0].size[0]-=.5;
  values.set('field-signal-editor-v1:forester',JSON.stringify(legacy));
  session=new EditorSession({...context,storage}).load();
  assert.deepEqual(session.ensureLayout('forester'),legacy,'prior baseline draft is preserved instead of being replaced by new campaign furniture');
 });
 check('Legacy world draft adopts missing accepted districts in memory and writes defaults only on explicit save',()=>{
  const legacy=initialWorld(JSON.parse(sourceBytes)), raw=JSON.stringify(legacy);
  const acceptedDistricts=JSON.parse(JSON.stringify(context.source.campaignDistricts));
  const values=new Map([[WORLD_DRAFT_KEY,raw]]), storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const session=new EditorSession({...context,storage}).load();
  assert.deepEqual(session.getAuthoring().districts,acceptedDistricts);
  assert.equal(session.getAuthoring().layers.districts,true);
  assert.deepEqual([...values],[[WORLD_DRAFT_KEY,raw]],'load retains every original stored byte');
  session.save();
  assert.deepEqual(JSON.parse(values.get(WORLD_DRAFT_KEY)).districts,acceptedDistricts);
  assert.equal(JSON.parse(values.get(SESSION_KEY)).document.authoring.layers.districts,true);
 });
 check('Existing authored districts and hidden district layer survive accepted source loading',()=>{
  const authored=initialWorld(context.source);authored.layers.districts=false;
  authored.districts.districts[0].objects[0].transform.x+=1.25;
  const raw=JSON.stringify(authored),values=new Map([[WORLD_DRAFT_KEY,raw]]);
  const session=new EditorSession({...context,storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}}).load();
  assert.deepEqual(session.getAuthoring().districts,authored.districts);
  assert.equal(session.getAuthoring().layers.districts,false);
  assert.deepEqual([...values],[[WORLD_DRAFT_KEY,raw]]);
  assert.notEqual(session.getAuthoring().districts.districts[0].objects[0].transform.x,context.source.campaignDistricts.districts[0].objects[0].transform.x);
 });
 changedSource=true;
 await assert.rejects(loadEditorSource(),/Preview source files do not match/);count++;console.log('PASS mismatched raw source bytes are rejected before editor source adoption');
 changedSource=false;changedMetadata=true;
 await assert.rejects(loadEditorSource(),/Editor and runtime source metadata do not match/);count++;console.log('PASS stale editor metadata cannot enable a mismatched source');
 changedMetadata=false;missingSource=true;
 await assert.rejects(loadEditorSource(),/source unavailable.*stored drafts are unchanged/);count++;console.log('PASS missing source gives recoverable error without storage changes');
}finally{globalThis.fetch=originalFetch;}
console.log(`${count} accepted editor source integration checks passed`);
