import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launchWorldPreview} from '../editor/preview-launcher.js';
import {createWorldDocument} from '../world-document.js';
import {seedLayout} from '../layout-core.js';
const source=JSON.parse(fs.readFileSync('site/world.json'));
const context={source,sourceRevision:'6b4f9fb9401398a65eee576f40b2d80805ef6c76'};
const document=createWorldDocument({...context,layouts:[seedLayout(source,'forester')]});
const values=new Map(),calls=[];
const options={document,buildingId:'forester',context,storage:{setItem:(k,v)=>values.set(k,v)},open:(...a)=>calls.push(a),baseURI:'https://example.test/bunker-game/',uuid:()=> '11111111-1111-4111-8111-111111111111'};
let imports=0;
await assert.rejects(launchWorldPreview({...options,importAdapter:async()=>{imports++;}}),/unavailable in this runtime/);assert.equal(imports,0);assert.equal(values.size,0);
await assert.rejects(launchWorldPreview({...options,capabilities:{worldPreview:true},buildingId:'hut'}),/Open this building/);
const result=await launchWorldPreview({...options,capabilities:{worldPreview:true},importAdapter:async()=>({compilePreviewWorld:(d,id,c)=>{assert.equal(id,'forester');assert.equal(c.source,source);assert.deepEqual(d,document);return {accepted:id};}})});
assert.deepEqual(result.compiled,{accepted:'forester'});assert.equal(result.url,'https://example.test/bunker-game/?worldPreview=11111111-1111-4111-8111-111111111111');assert.equal(calls.length,1);
const payload=JSON.parse([...values.values()][0]);assert.equal(payload.format,'field-signal-preview/1');assert.equal(payload.buildingId,'forester');assert.deepEqual(payload.document,document);
await assert.rejects(launchWorldPreview({...options,capabilities:{worldPreview:true},importAdapter:async()=>({compilePreviewWorld:()=>{throw Error('Overlaps another building');}})}),/Overlaps/);assert.equal(values.size,1);assert.equal(calls.length,1);
await assert.rejects(launchWorldPreview({...options,capabilities:{worldPreview:true},storage:{setItem(){throw Error('Quota');}},importAdapter:async()=>({compilePreviewWorld:()=>({})})}),/Quota/);assert.equal(calls.length,1);
await assert.rejects(launchWorldPreview({...options,capabilities:{worldPreview:true},importAdapter:async()=>({})}),/no compatible building preview compiler/);
await assert.rejects(launchWorldPreview({...options,capabilities:{worldPreview:true},importAdapter:async()=>{throw Error('module offline');}}),/adapter could not load.*design is preserved.*module offline/);assert.equal(calls.length,1);assert.equal(values.size,1);
console.log('PASS editor preview adapter: capability gate, absent interior, canonical payload/subpath/isolation, rejected compile, storage failure, missing compiler, adapter recovery message (7 scenarios)');

// Execute the actual network-fresh gate in a VM with deterministic worker
// transitions. No import is attempted until its real cache-verification helper
// succeeds; browser suites cover the ensuing module import and full editor.
const {default:vm}=await import('node:vm');
const gateSource=fs.readFileSync('site/editor/suite-bootstrap.js','utf8').replace(/\bexport\s+(?=(?:async\s+)?function|const)/g,'');
function gateFixture({initialCache='prior',alreadyCurrent=false,installing=false,waiting=false,activateAt=1,activateCache,updateError=null,installOnUpdate=false,noServiceWorker=false,postMessageError=null,postMessageThrows=0}={}){
 const timers=new Map();let timerId=0,cache=initialCache,polls=0,updates=0,registrations=0,queries=0,postFailures=postMessageThrows,closedPorts=0;
 const serviceWorker={controller:null,register:async(url,options)=>{registrations++;assert.equal(url.href,'https://example.test/bunker-game/sw.js');assert.equal(options.scope,'/bunker-game/');assert.equal(options.updateViaCache,'none');return registration;}};
 const registration={installing:installing?{state:'installing'}:null,waiting:waiting?{state:'installed'}:null,update:async()=>{updates++;if(installOnUpdate)registration.installing={state:'installing'};if(updateError)throw updateError;}};
 const worker={postMessage(message,ports){assert.equal(message.type,'editor-version');queries++;if(postFailures-->0)throw postMessageError;ports[0].deliver({cache,editorVersion:'1.0.0'});}};serviceWorker.controller=worker;
 class MessageChannelMock{constructor(){this.port1={onmessage:null,close(){closedPorts++;}};this.port2={deliver:data=>this.port1.onmessage?.({data})};}}
 const sandbox={navigator:noServiceWorker?{}:{serviceWorker},isSecureContext:true,document:{baseURI:'https://example.test/bunker-game/',querySelector:()=>null},URL,MessageChannel:MessageChannelMock,
  setTimeout(callback,delay){const id=++timerId;timers.set(id,callback);queueMicrotask(()=>{if(!timers.has(id))return;timers.delete(id);if(delay===250){polls++;if(polls===activateAt){cache=activateCache??sandbox.gate.EXPECTED_EDITOR_CACHE;registration.installing=null;registration.waiting=null;}}callback();});return id;},
  clearTimeout:id=>timers.delete(id),console};
 vm.runInNewContext(gateSource+'\nglobalThis.gate={ensureEditorRuntime,editorRuntimeCurrent,EXPECTED_EDITOR_CACHE};',sandbox,{filename:'suite-bootstrap.js'});
 if(alreadyCurrent)cache=sandbox.gate.EXPECTED_EDITOR_CACHE;
 return {gate:sandbox.gate,counts:()=>({polls,updates,registrations,queries,closedPorts,pendingTimers:timers.size})};
}
let gateCases=0;async function gateTest(name,run){await run();gateCases++;console.log('PASS',name);}
await gateTest('Current cache and browsers without service workers need no registration',async()=>{
 const current=gateFixture({alreadyCurrent:true});await current.gate.ensureEditorRuntime();assert.equal(current.counts().registrations,0);
 const unsupported=gateFixture({noServiceWorker:true});await unsupported.gate.ensureEditorRuntime();assert.equal(unsupported.counts().registrations,0);
});
await gateTest('An installing worker completes and claims the expected cache without a second update',async()=>{
 const fixture=gateFixture({installing:true,activateAt:2});await fixture.gate.ensureEditorRuntime();assert.equal(fixture.counts().updates,0);assert.equal(fixture.counts().polls,2);assert.equal(await fixture.gate.editorRuntimeCurrent(),true);
});
await gateTest('A waiting worker must activate and expose the expected cache',async()=>{
 const fixture=gateFixture({waiting:true,activateAt:1});await fixture.gate.ensureEditorRuntime();assert.equal(fixture.counts().updates,0);assert.equal(fixture.counts().polls,1);assert.equal(await fixture.gate.editorRuntimeCurrent(),true);
});
await gateTest('A normal update still verifies controller activation before application imports',async()=>{
 const fixture=gateFixture({activateAt:2});await fixture.gate.ensureEditorRuntime();assert.equal(fixture.counts().updates,1);assert.equal(fixture.counts().polls,2);
});
await gateTest('InvalidStateError during a concurrent installation is followed by cache verification',async()=>{
 const error=Object.assign(new Error('Newest worker is installing'),{name:'InvalidStateError'}),fixture=gateFixture({updateError:error,installOnUpdate:true,activateAt:2});
 await fixture.gate.ensureEditorRuntime();assert.equal(fixture.counts().updates,1);assert.equal(fixture.counts().polls,2);assert.equal(await fixture.gate.editorRuntimeCurrent(),true);
});
await gateTest('A genuine update failure remains blocked even if another worker could later activate',async()=>{
 const fixture=gateFixture({updateError:new Error('Network update failed'),activateAt:1});await assert.rejects(fixture.gate.ensureEditorRuntime(),/Network update failed/);assert.equal(fixture.counts().polls,0);assert.equal(fixture.counts().updates,1);
});
await gateTest('Neither installing state nor InvalidStateError accepts a wrong or unclaimed cache',async()=>{
 for(const options of [{installing:true,activateCache:'wrong-cache'},{waiting:true,activateAt:0},{updateError:Object.assign(new Error('Concurrent update'),{name:'InvalidStateError'}),activateAt:0}]){
  const fixture=gateFixture(options);await assert.rejects(fixture.gate.ensureEditorRuntime(),/offline runtime could not update.*drafts and campaign are preserved/);assert.equal(fixture.counts().polls,24);assert.equal(await fixture.gate.editorRuntimeCurrent(),false);
 }
});
await gateTest('A redundant captured controller is rechecked after handoff rather than granting readiness',async()=>{
 const error=Object.assign(new Error('Controller became redundant'),{name:'InvalidStateError'}),fixture=gateFixture({installing:true,activateAt:1,postMessageError:error,postMessageThrows:1});
 await fixture.gate.ensureEditorRuntime();assert.equal(fixture.counts().registrations,1);assert.equal(fixture.counts().updates,0);assert.equal(fixture.counts().polls,1);assert.equal(await fixture.gate.editorRuntimeCurrent(),true);assert.equal(fixture.counts().closedPorts,fixture.counts().queries);assert.equal(fixture.counts().pendingTimers,0);
});
await gateTest('Unexpected controller-message errors propagate and keep application imports blocked',async()=>{
 const fixture=gateFixture({postMessageError:new Error('Message transfer failed'),postMessageThrows:1});await assert.rejects(fixture.gate.ensureEditorRuntime(),/Message transfer failed/);assert.equal(fixture.counts().registrations,0);assert.equal(fixture.counts().polls,0);assert.equal(fixture.counts().closedPorts,1);assert.equal(fixture.counts().pendingTimers,0);
});
console.log(`${gateCases} editor runtime activation regression scenarios passed`);
