/* Optional M0 diagnostic, no pass/fail frame budget and no shipping instrumentation.
   Run after tools/build.py, sequentially with other software-rendered suites. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('test-results/performance');fs.mkdirSync(out,{recursive:true});
const summary=values=>{const a=[...values].sort((a,b)=>a-b);return {samples:a.length,median:a[Math.floor(a.length*.5)]??null,p95:a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)]??null};};
async function workerDiagnostic(browser){
 const p=await browser.newPage();
 // Test-only instrumentation measures the worker handler, including API JSON
 // encoding/decoding. It does not modify sim-worker.js on disk or shipped output.
 await p.route('**/sim-worker.js',async route=>{
  const response=await route.fetch(),body=await response.text();
  await route.fulfill({response,body:body+`
let diagnosticStart=0;
const diagnosticHandler=self.onmessage,diagnosticPost=self.postMessage.bind(self);
self.postMessage=data=>diagnosticPost({...data,diagnosticHandlerMs:performance.now()-diagnosticStart});
self.onmessage=event=>{diagnosticStart=performance.now();return diagnosticHandler(event);};
`});
 });
 await p.goto('http://127.0.0.1:8193/controller.html');
 const result=await p.evaluate(async()=>{
  const {Simulation}=await import('./bridge.js'),sim=new Simulation();
  const call=async action=>{const start=performance.now(),r=await sim.call(action);return {r,elapsed:performance.now()-start};};
  try{
   const init=await call({type:'init'}),samples=[];
   for(let i=0;i<100;i++){
    const {r,elapsed}=await call({type:'tick',player:init.r.state.player,dt:.18,active:false,sprint:false,crouch:false,sight:{}});
    samples.push({roundTripMs:elapsed,handlerMs:r.diagnosticHandlerMs,responseBytes:new TextEncoder().encode(JSON.stringify(r)).length});
   }
   return {init:{roundTripMs:init.elapsed,handlerMs:init.r.diagnosticHandlerMs},samples};
  }finally{sim.worker.terminate();}
 });
 await p.close();return {init:result.init,handlerMs:summary(result.samples.map(x=>x.handlerMs)),roundTripMs:summary(result.samples.map(x=>x.roundTripMs)),responseBytes:summary(result.samples.map(x=>x.responseBytes))};
}
(async()=>{
 const host=spawn('python3',['-m','http.server','8193','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
 let browser;const report={environment:{node:process.version,platform:process.platform,renderer:'Chromium SwiftShader; not a device benchmark',viewport:[844,500],pixelRatio:.35,shadows:false},scenes:[]};
 try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:8193/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  report.environment.browser=browser.version();
  if(process.argv.includes('--worker-only')){report.isolatedWorker=await workerDiagnostic(browser);return;}
  const p=await browser.newPage({viewport:{width:844,height:500}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   window.workerSamples=[];const Original=window.Worker;
   window.Worker=class extends Original{constructor(...args){super(...args);const pending=new Map(),post=this.postMessage.bind(this);this.postMessage=data=>{pending.set(data.id,{type:data.action.type,start:performance.now(),requestBytes:new TextEncoder().encode(JSON.stringify(data)).length});post(data);};this.addEventListener('message',({data})=>{const s=pending.get(data.id);if(s){pending.delete(data.id);workerSamples.push({...s,roundTripMs:performance.now()-s.start,responseBytes:new TextEncoder().encode(JSON.stringify(data)).length});}});}};
  });
  const start=Date.now();await p.goto('http://127.0.0.1:8193/');await p.locator('#load-world').click();
  await p.locator('#silent:enabled').waitFor({timeout:240000});report.startupMs=Date.now()-start;await p.locator('#silent').click();
  await p.evaluate(()=>{
   const w=FieldSignal3D.getWorld();w.setQuality('low');w.renderSettings.shadows=false;w.renderer.shadowMap.enabled=false;w.renderer.setPixelRatio(.35);w.resize();
   window.frameSamples=[];const frame=w.frame.bind(w),render=w.renderer.render.bind(w.renderer);let renderMs=0,last=null;
   w.renderer.render=(...args)=>{const t=performance.now();const r=render(...args);renderMs+=performance.now()-t;return r;};
   w.frame=(...args)=>{const t=performance.now();renderMs=0;const r=frame(...args);frameSamples.push({interval:last===null?null:t-last,work:performance.now()-t,render:renderMs,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles});last=t;return r;};
  });
  async function fixture(x,z,yaw=0,combat=false){
   const s=await p.evaluate(()=>FieldSignal3D.getState());s.player={x,z,y:0,yaw,pitch:0};s.zone=x<-450?'base':'field';for(const e of s.enemies)e.health=0;
   if(combat){const e=s.enemies.find(e=>e.zone==='field');Object.assign(e,{x:x+4,z:z-8,health:100});}
   await p.evaluate(()=>FieldSignal3D.openPanel('saves'));
   await p.locator('#file-input').setInputFiles({name:'profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
   await p.locator('[data-cmd="restore"]').click();await p.waitForFunction(x=>Math.abs(FieldSignal3D.getPlayer().x-x)<.02,x);await p.locator('#close-panel').click();
  }
  async function sample(name){
   await p.evaluate(()=>{frameSamples=[];});
   await p.waitForFunction(()=>frameSamples.length>=10);await p.evaluate(()=>{frameSamples=[];});
   await p.waitForFunction(()=>frameSamples.length>=40,null,{timeout:120000});
   const raw=await p.evaluate(()=>frameSamples.splice(0));
   const stats={name};for(const k of ['interval','work','render','calls','triangles'])stats[k]=summary(raw.map(s=>s[k]).filter(x=>x!==null));
   stats.resources=await p.evaluate(()=>{const w=FieldSignal3D.getWorld(),geometries=new Set(),textures=new Set();w.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean))for(const v of Object.values(m))if(v?.isTexture)textures.add(v);});let geometryBytes=0,textureRGBABytes=0;for(const g of geometries){for(const a of Object.values(g.attributes))geometryBytes+=a.array.byteLength;geometryBytes+=g.index?.array.byteLength||0;}for(const t of textures){const im=t.image;textureRGBABytes+=(im?.width||0)*(im?.height||0)*4*(t.generateMipmaps?4/3:1);}return {geometryBufferBytes:geometryBytes,textureRGBAEstimateBytes:Math.round(textureRGBABytes),allocated:w.renderer.info.memory,gpuTimerAvailable:!!w.renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2')};});
   report.scenes.push(stats);await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:70});console.log(name,JSON.stringify(stats));
  }
  await fixture(-500,20);await sample('refuge');
  await fixture(-30,-57);await sample('two-storey-house');
  await fixture(-55,-135);await sample('forest');
  await fixture(-20,-178.2);await sample('village-vehicles');
  await fixture(-20,-178.2,0,true);
  await p.evaluate(()=>{const w=FieldSignal3D.getWorld();w.flashShot();w.slash9();w.showEnemyShot({from:[-16,1.5,-186],to:[-20,1.5,-178],hit:true});});
  await sample('enemy-and-transient-effects');
  await p.evaluate(()=>FieldSignal3D.openPanel('pack'));await p.locator('.item-thumb').first().click();await p.waitForFunction(()=>FieldSignal3D.getStudio().current&&document.querySelector('#inspect-stage canvas'));
  report.inspection=await p.evaluate(()=>{const s=FieldSignal3D.getStudio(),times=[];for(let i=0;i<20;i++){const t=performance.now();s.adjust('turn',.1);times.push(performance.now()-t);}return {times,calls:s.renderer.info.render.calls,triangles:s.renderer.info.render.triangles};});
  report.inspection.drawMs=summary(report.inspection.times);delete report.inspection.times;
  await p.screenshot({path:path.join(out,'item-inspection.jpg'),type:'jpeg',quality:70});
  report.worker=await p.evaluate(()=>workerSamples);report.loading=await p.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,durationMs:r.duration,transferBytes:r.transferSize,decodedBytes:r.decodedBodySize})).sort((a,b)=>b.durationMs-a.durationMs).slice(0,15));
  await p.goto('http://127.0.0.1:8193/editor/world.html');await p.setViewportSize({width:1440,height:900});await p.waitForFunction(()=>window.FieldWorldEditor?.ready());
  report.brush=await p.evaluate(()=>{const times=[];for(let i=0;i<20;i++){const t=performance.now();FieldWorldEditor.stroke(-30+i,-90,{radius:36,strength:1,mode:'raise'});times.push(performance.now()-t);}return times;});report.brush=summary(report.brush);
  // Actual mouse stroke, as well as the synchronous command timing above.
  await p.locator('[data-tool="raise"]').click();const box=await p.locator('#world-canvas').boundingBox();await p.mouse.move(box.x+box.width*.5,box.y+box.height*.6);await p.mouse.down();await p.mouse.move(box.x+box.width*.65,box.y+box.height*.6,{steps:8});await p.mouse.up();
  await p.screenshot({path:path.join(out,'world-brush.jpg'),type:'jpeg',quality:70});report.errors=errors;if(errors.length)throw Error(errors.join('; '));
  await p.close();report.isolatedWorker=await workerDiagnostic(browser);
 }finally{fs.writeFileSync(path.join(out,process.argv.includes('--worker-only')?'isolated-worker.json':'baseline.json'),JSON.stringify(report,null,2));await browser?.close();host.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
