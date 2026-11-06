import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {packHistory, unpackHistory, HISTORY_FORMAT, MAX_FRAME_CHARS} from '../editor/history-codec.js';
import {EditorSession,SESSION_KEY,WORLD_DRAFT_KEY,LAYOUT_DRAFT_PREFIX,TRUSTED_SOURCE} from '../editor/session.js';
import {applyCampaignSource} from '../campaign-core.js';
import {createCampaignInteriors} from '../campaign-interiors.js';
const clone=value=>JSON.parse(JSON.stringify(value));
let cases=0;function test(name,run){run();cases++;console.log('PASS',name);}
class Store {
  constructor(limit=Infinity){this.values=new Map();this.limit=limit;}
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){value=String(value);let bytes=2*(key.length+value.length);for(const[k,v]of this.values)if(k!==key)bytes+=2*(k.length+v.length);if(bytes>this.limit)throw Error('quota');this.values.set(key,value);}
}
const raw=JSON.parse(fs.readFileSync('site/world.json'));
const source=applyCampaignSource(raw,{districts:JSON.parse(fs.readFileSync('site/districts.json')),props:JSON.parse(fs.readFileSync('site/search-props.json')),routes:JSON.parse(fs.readFileSync('site/campaign-routes.json')),spawns:JSON.parse(fs.readFileSync('site/campaign-spawns.json')),interiors:createCampaignInteriors(raw),sourceRevision:TRUSTED_SOURCE});
const make=(storage=new Store())=>new EditorSession({source,sourceRevision:TRUSTED_SOURCE,storage}).load();
const delta=(past=[],future=[])=>({format:HISTORY_FORMAT,past,future});
test('empty stacks and empty JSON values round-trip without mutation',()=>{
 for(const document of [{},[],null,'',0]){const before=clone(document),packed=packHistory(document);assert.deepEqual(unpackHistory(document,packed),{past:[],future:[]});assert.deepEqual(document,before);}
 assert.throws(()=>packHistory(undefined),/JSON documents/);
});
test('arbitrary Unicode edits preserve stack order, escapes and surrogate pairs',()=>{
 const current={name:'Łódź 🪟',nested:['\n','\\','"','\ud800'],a:3};
 const past=[{}, {name:'Łódź 🪟',nested:['\n','\\','"','\ud801'],a:1}, {name:'Łódź 🪟',a:2}],future=[{x:'🧱\n'},{...current,more:true}];
 const snapshots=clone({current,past,future}),packed=packHistory(current,past,future);
 assert.deepEqual(unpackHistory(current,packed),{past,future});assert.deepEqual({current,past,future},snapshots);
});
test('seeded property vectors retain insertion, deletion, nested arrays and unrelated replacements',()=>{
 let state=7321;const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 for(let trial=0;trial<120;trial++){
  const frames=[];let doc={title:'room 🧱',objects:[],water:0};
  for(let i=0;i<31;i++){frames.push(clone(doc));const op=Math.floor(rand()*5);if(op===0)doc.objects.push({id:'item-'+trial+'-'+i,p:[rand(),rand(),rand()],name:'Łódź '+String.fromCodePoint(0x1f332+i)});if(op===1)doc.objects.splice(Math.floor(rand()*doc.objects.length),1);if(op===2)doc.water=rand()*10-5;if(op===3)doc.title+='\n"'+i;if(op===4)doc={...doc,metadata:{i,nested:{note:'é\t\\'}}};}
  const split=Math.floor(rand()*frames.length),current=frames[split],past=frames.slice(0,split),future=frames.slice(split+1).reverse();
  assert.deepEqual(unpackHistory(current,packHistory(current,past,future)),{past,future});
 }
});
test('identical frames use a zero-insert splice and thirty states per stack remain readable',()=>{
 const document={a:1},past=Array.from({length:30},()=>clone(document)),future=clone(past),packed=packHistory(document,past,future);
 assert.deepEqual(packed.past[0],[JSON.stringify(document).length,0,'']);assert.deepEqual(unpackHistory(document,packed),{past,future});
});
test('malformed headers, stacks and unsafe splice indices are rejected',()=>{
 for(const history of [null,[],{}, {format:'other',past:[],future:[]}, {format:HISTORY_FORMAT,past:[]},delta({},[]),delta(Array(61).fill([0,0,'{}'])),delta(Array(31).fill([0,0,'{}']),Array(30).fill([0,0,'{}']))])assert.throws(()=>unpackHistory({},history));
 for(const value of [[-1,0,'{}'],[.2,0,'{}'],[Infinity,0,'{}'],[Number.MAX_SAFE_INTEGER+1,0,'{}'],[0,-1,'{}'],[0,.1,'{}'],[0,3,''],[1,2,''],[0,0,1],[0,0],{prefix:0}])assert.throws(()=>unpackHistory({},delta([value])),/history splice/);
});
test('frame limits and non-JSON decoded data reject bounded expansion',()=>{
 assert.throws(()=>packHistory({text:'x'.repeat(MAX_FRAME_CHARS)}),/safety limit/);
 assert.throws(()=>unpackHistory({},delta([[0,0,'x'.repeat(MAX_FRAME_CHARS+1)]])),/safety limit/);
 assert.throws(()=>unpackHistory({},delta([[0,0,'not JSON']])));
 const nearLimit=JSON.stringify({text:'x'.repeat(MAX_FRAME_CHARS-20)});
 const repeated=Array.from({length:30},()=>[nearLimit.length,0,'']);
 assert.throws(()=>unpackHistory(JSON.parse(nearLimit),delta(repeated,repeated)),/decoded safety limit/);
});
test('session stores optional compressed history while legacy mirrors stay exact',()=>{
 const store=new Store(),session=make(store);session.ensureLayout('hut');
 for(let i=0;i<5;i++){const world=session.getAuthoring();world.waterLevel+=.125;session.setAuthoring(world);}
 session.undo();session.undo();const expected={document:session.getDocument(),past:clone(session.past),future:clone(session.future)};session.save();
 const saved=JSON.parse(store.getItem(SESSION_KEY));assert.equal(saved.version,1);assert.equal(saved.history.format,HISTORY_FORMAT);assert.equal('past'in saved,false);assert.equal('future'in saved,false);assert.deepEqual(saved.document,expected.document);
 assert.equal(store.getItem(WORLD_DRAFT_KEY),JSON.stringify(expected.document.authoring));assert.equal(store.getItem(LAYOUT_DRAFT_PREFIX+'hut'),JSON.stringify(expected.document.interiors[0]));
 const restored=make(store);assert.deepEqual({document:restored.getDocument(),past:restored.past,future:restored.future},expected);assert.equal(restored.redo(),true);restored.save();const again=make(store);assert.equal(again.redo(),true);assert.equal(again.undo(),true);assert.equal(again.history().redo,1);
});
test('legacy full snapshots load unchanged and rewrite without losing undo or redo',()=>{
 const store=new Store(),session=make(store);session.ensureLayout('hut');for(let i=0;i<4;i++){const world=session.getAuthoring();world.waterLevel+=.2;session.setAuthoring(world);}session.undo();
 store.setItem(SESSION_KEY,JSON.stringify({version:1,document:session.getDocument(),past:session.past,future:session.future,views:{world:{camera:[1,2,3]}}}));
 const old=make(store);assert.deepEqual(old.past,session.past);assert.deepEqual(old.future,session.future);assert.deepEqual(old.getView('world'),{camera:[1,2,3]});old.save();const next=make(store);assert.deepEqual(next.past,session.past);assert.deepEqual(next.future,session.future);assert.ok(JSON.parse(store.getItem(SESSION_KEY)).history);
});
test('legacy thirty-plus-thirty histories move losslessly through sixty redo and undo states',()=>{
 const store=new Store(),initial=make(store);initial.ensureLayout('hut');const base=initial.getDocument();
 const frames=Array.from({length:61},(_,i)=>{const doc=clone(base);doc.authoring.waterLevel=-1.25+i/100;return doc;});
 store.setItem(SESSION_KEY,JSON.stringify({version:1,document:frames[30],past:frames.slice(0,30),future:frames.slice(31).reverse()}));
 let session=make(store);assert.deepEqual(session.history(),{undo:30,redo:30});assert.equal(session.undo(),true);session.save();session=make(store);assert.deepEqual(session.history(),{undo:29,redo:31});assert.deepEqual(session.getDocument(),frames[29]);
 for(let i=0;i<29;i++)assert.equal(session.undo(),true);session.save();session=make(store);assert.deepEqual(session.history(),{undo:0,redo:60});assert.deepEqual(session.getDocument(),frames[0]);
 for(let i=0;i<60;i++)assert.equal(session.redo(),true);session.save();session=make(store);assert.deepEqual(session.history(),{undo:60,redo:0});assert.deepEqual(session.getDocument(),frames[60]);
 for(let i=0;i<60;i++)assert.equal(session.undo(),true);assert.deepEqual(session.getDocument(),frames[0]);
 // A full legacy stack also survives without a silent thirty-frame slice.
 store.setItem(SESSION_KEY,JSON.stringify({version:1,document:frames[60],past:frames.slice(0,60),future:[]}));session=make(store);assert.deepEqual(session.history(),{undo:60,redo:0});
 const excessive=JSON.stringify({version:1,document:frames[60],past:[...frames],future:[]});store.setItem(SESSION_KEY,excessive);session=make(store);assert.ok(session.rejected.has(SESSION_KEY));assert.equal(store.getItem(SESSION_KEY),excessive);
});
test('invalid history or canonical history frames reject the entire checkpoint before adoption',()=>{
 const store=new Store(),session=make(store);session.ensureLayout('hut');const altered=session.getDocument();altered.authoring.waterLevel=4;
 const badFrame=clone(altered);badFrame.source.revision='0'.repeat(40);
 for(const history of [delta([[0,0,'broken']]),packHistory(altered,[badFrame]),delta([[99_999_999,0,'']])]){
  const rawCheckpoint=JSON.stringify({version:1,document:altered,history,views:{world:{unexpected:true}}});store.setItem(SESSION_KEY,rawCheckpoint);const resumed=make(store);assert.ok(resumed.rejected.has(SESSION_KEY));assert.notEqual(resumed.getAuthoring().waterLevel,4);assert.equal(resumed.getView('world'),null);assert.deepEqual(resumed.history(),{undo:0,redo:0});assert.equal(store.getItem(SESSION_KEY),rawCheckpoint);
 }
});
test('quota failure retains stored keys, current design, all history and exact legacy drafts',()=>{
 const store=new Store(),session=make(store);session.ensureLayout('hut');session.save();const original=new Map(store.values);for(let i=0;i<3;i++){const world=session.getAuthoring();world.waterLevel+=.01;session.setAuthoring(world);}const current=session.getDocument(),past=clone(session.past);store.limit=1;assert.throws(()=>session.save(),/quota/);assert.deepEqual(store.values,original);assert.deepEqual(session.getDocument(),current);assert.deepEqual(session.past,past);store.limit=Infinity;session.save();assert.deepEqual(make(store).getDocument(),current);
});
test('five thousand UUID foliage plus thirty growing-stroke histories save within simulated5MiB',()=>{
 const store=new Store(5*1024*1024),session=make(store);for(const id of ['hut','forester','station'])session.ensureLayout(id);
 const forest=Array.from({length:5000},(_,i)=>({id:'plant-'+randomUUID(),kind:['pine','fir','rock','fern','stump'][i%5],x:+(-285+(i%150)*3.8).toFixed(3),z:+(-5-Math.floor(i/150)*9.7).toFixed(3),offset:0,scale:+(.7+(i%20)*.037).toFixed(4),yaw:+((i*.61803398875)%(Math.PI*2)).toFixed(6),locked:i%61===0}));
 let world=session.getAuthoring();world.foliage=forest.slice(0,4700);session.setAuthoring(world,{record:false});for(let i=0;i<30;i++){world=session.getAuthoring();world.foliage.push(...forest.slice(4700+i*10,4710+i*10));session.setAuthoring(world);}session.save();
 const expected=session.getDocument(),reopened=make(store);assert.deepEqual(reopened.getDocument(),expected);assert.equal(reopened.history().undo,30);for(let i=0;i<30;i++)assert.equal(reopened.undo(),true);assert.equal(reopened.getAuthoring().foliage.length,4700);for(let i=0;i<30;i++)assert.equal(reopened.redo(),true);assert.deepEqual(reopened.getDocument(),expected);assert.equal(store.getItem(WORLD_DRAFT_KEY),JSON.stringify(expected.authoring));
 const total=[...store.values].reduce((sum,[k,v])=>sum+2*(k.length+v.length),0);console.log('MEASURE simulated UTF-16 localStorage bytes:',total,'with5000UUID foliage and30history states; not measured browser quota');assert.ok(total<5*1024*1024);
});
console.log(`${cases} editor history codec tests passed`);
