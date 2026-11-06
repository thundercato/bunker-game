/* Candidate diagnostics. Run after tools/build.py and SEQUENTIALLY with all
   other WebGL/browser suites. No frame-budget gate or device-fps claim. */
const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const out=path.join(root,'test-results/candidate-performance');fs.mkdirSync(out,{recursive:true});
const workerOnly=process.argv.includes('--worker-only');
const summary=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return {samples:a.length,median:a[Math.floor(a.length*.5)]??null,p95:a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)]??null};};
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const host=http.createServer((req,res)=>{
 const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'');
 const file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative||'index.html');
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
const fixtures=[
 {name:'refuge',x:-500,z:20,y:0,yaw:0,pitch:0,m0Scene:'refuge'},
 {name:'authored-cottage-kitchen',x:-29.3,z:-60.3,y:0,yaw:Math.PI/2,pitch:-.12,m0Scene:'two-storey-house'},
 {name:'village-street',x:-8,z:-179,yaw:Math.PI/2,pitch:-.05,m0Scene:'village-vehicles'},
 {name:'woodland-crossing',x:-96,z:-115,yaw:-Math.PI/2,pitch:-.04,m0Scene:'forest'},
 {name:'docks-crane',x:103,z:-148,yaw:-1.28,pitch:.38,m0Scene:null}
];
const report={started:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch,
 cpu:os.cpus()[0]?.model,exposedCpus:os.availableParallelism(),renderer:'Chromium SwiftShader; not a device benchmark',
 viewport:[844,500],pixelRatio:.35,quality:'low',shadows:false,warmupFrames:10,samplesPerScene:20},
 scenes:[],errors:[],missing:[],limitations:[
 'Software-rendered Linux Chromium cannot establish physical iPhone/iPad/Mac Safari fps, sustained thermals, controller latency or GPU memory.',
 'world.frame measures world JavaScript work including renderer submission; it excludes app HUD, input, simulation scheduling and other work outside that method.',
 'renderer.render is JavaScript submission time, including any driver backpressure; no reliable GPU completion timings are collected.',
 'Scene resource estimates include hidden referenced resources and may count shared image/backing storage more than once; renderer allocation counters are not GPU/process byte measurements.',
 'Scenes have stationary fixtures and disabled enemies. These are settled visibility samples, not combat, weather, travel or shader-compilation stress tests.',
 'The M0 report sampled 40 frames; this candidate report samples 20 and uses reviewed candidate poses, which differ outdoors/interiors. Scene figures are context, not matched-camera speedup claims.',
 'Isolated worker handler timings include Python rules and JSON encode/decode, and round trips include main-thread scheduling. Candidate init also transfers the actual compiled DATA override.'
 ]};

async function workerDiagnostic(browser,base,candidate){
 const page=await browser.newPage({viewport:{width:844,height:500}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Test-only response instrumentation. Nothing is written into shipping workers.
 await page.route('**/sim-worker.js',async route=>{
  const response=await route.fetch(),body=await response.text();
  await route.fulfill({response,body:body+`
let diagnosticStart=0;
const diagnosticHandler=self.onmessage,diagnosticPost=self.postMessage.bind(self);
self.postMessage=data=>diagnosticPost({...data,diagnosticHandlerMs:performance.now()-diagnosticStart});
self.onmessage=event=>{diagnosticStart=performance.now();return diagnosticHandler(event);};
`});
 });
 try{
  await page.goto(base+'controller.html');
  const result=await page.evaluate(async candidate=>{
   const {Simulation}=await import('./bridge.js');
   const started=performance.now(),override=candidate?(await import('./world-campaign.js')).DATA:null;
   const overridePreparationMs=performance.now()-started;
   if(candidate&&!override.campaign)throw Error('Worker must use actual candidate DATA');
   const overrideBytes=override?new TextEncoder().encode(JSON.stringify(override)).length:0;
   const sim=new Simulation(override);
   const call=async action=>{const at=performance.now(),r=await sim.call(action);return {r,elapsed:performance.now()-at};};
   try{
    const init=await call({type:'init'}),samples=[];
    for(let i=0;i<100;i++){
     const {r,elapsed}=await call({type:'tick',player:init.r.state.player,dt:.18,active:false,sprint:false,crouch:false,sight:{}});
     samples.push({roundTripMs:elapsed,handlerMs:r.diagnosticHandlerMs,responseBytes:new TextEncoder().encode(JSON.stringify(r)).length});
    }
    return {mode:candidate?'candidate-DATA-override':'original-world-json',candidateId:override?.campaign?.id||null,
     overridePreparationMs,overrideBytes,containers:override?.containers?.length||null,
     init:{roundTripMs:init.elapsed,handlerMs:init.r.diagnosticHandlerMs},samples};
   }finally{sim.worker.terminate();}
  },candidate);
  assert.equal(result.samples.length,100);assert.deepEqual(errors,[]);
  for(const key of ['handlerMs','roundTripMs','responseBytes'])result[key]=summary(result.samples.map(s=>s[key]));
  return result;
 }finally{await page.close();}
}

async function setPose(page,fixture){
 const state=await page.evaluate(()=>FieldSignal3D.getState());
 const y=fixture.y??await page.evaluate(async({x,z})=>(await import('./terrain.js')).surfaceHeight(x,z),fixture);
 state.player={x:fixture.x,z:fixture.z,y,yaw:fixture.yaw,pitch:fixture.pitch};
 state.zone=fixture.x<-450?'base':'field';
 for(const enemy of state.enemies)enemy.health=0;
 await page.evaluate(()=>FieldSignal3D.openPanel('saves'));
 await page.locator('#file-input').setInputFiles({name:'candidate-performance-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await page.locator('[data-cmd="restore"]').click();
 await page.waitForFunction(({x,z})=>Math.abs(FieldSignal3D.getPlayer().x-x)<.02&&Math.abs(FieldSignal3D.getPlayer().z-z)<.02,fixture,{timeout:120000});
 await page.locator('#close-panel').click();
}

async function sampleScene(page,fixture){
 await setPose(page,fixture);
 await page.evaluate(()=>{candidateCapture.phase='warmup';candidateCapture.samples=[];candidateCapture.limit=10;});
 await page.waitForFunction(()=>candidateCapture.samples.length===10,null,{timeout:180000});
 await page.evaluate(()=>{candidateCapture.phase='measure';candidateCapture.samples=[];candidateCapture.limit=20;});
 await page.waitForFunction(()=>candidateCapture.samples.length===20,null,{timeout:180000});
 const raw=await page.evaluate(()=>{candidateCapture.phase='idle';return candidateCapture.samples;});
 assert.equal(raw.length,20);
 const result={name:fixture.name,fixture,raw};
 for(const key of ['interval','work','render','calls','triangles'])result[key]=summary(raw.map(s=>s[key]));
 result.resources=await page.evaluate(()=>{
  const w=FieldSignal3D.getWorld(),geometries=new Set(),textures=new Set(),buffers=new Set();
  const images=new Map(),imageUrls=new Map(),campaignAtlasUrls=new Map();
  w.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean))for(const value of Object.values(m))if(value?.isTexture)textures.add(value);});
  let geometryBytes=0,textureRGBABytes=0;
  for(const g of geometries){for(const attr of Object.values(g.attributes)){const array=attr.array||attr.data?.array;if(array){geometryBytes+=array.byteLength;buffers.add(array.buffer);}}if(g.index){geometryBytes+=g.index.array.byteLength;buffers.add(g.index.array.buffer);}}
  for(const t of textures){
   const im=t.image,bytes=(im?.width||0)*(im?.height||0)*4*(t.generateMipmaps?4/3:1);textureRGBABytes+=bytes;
   if(im)images.set(im,Math.max(images.get(im)||0,bytes));
   const url=im?.currentSrc||im?.src||window.candidateImageUrls?.get(im)||null;
   if(url)imageUrls.set(url,Math.max(imageUrls.get(url)||0,bytes));
   if(url?.includes('/assets/campaign/textures/')){
    const key=new URL(url,location.href).pathname,current=campaignAtlasUrls.get(key)||{textureObjects:0,imageObjects:new Set(),rgbaBytes:0};
    current.textureObjects++;current.imageObjects.add(im);current.rgbaBytes+=bytes;campaignAtlasUrls.set(key,current);
   }
  }
  const gl=w.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  return {sceneReferencedGeometries:geometries.size,sceneReferencedTextureObjects:textures.size,
   sceneReferencedImageObjects:images.size,uniqueImageObjectRGBAEstimateBytes:[...images.values()].reduce((a,b)=>a+b,0),
   knownUniqueImageUrls:imageUrls.size,knownUniqueUrlRGBAEstimateBytes:[...imageUrls.values()].reduce((a,b)=>a+b,0),
   unidentifiedUrlTextureObjects:[...textures].filter(t=>!t.image?.currentSrc&&!t.image?.src&&!window.candidateImageUrls?.get(t.image)).length,
   campaignAtlases:Object.fromEntries([...campaignAtlasUrls].map(([url,v])=>[url,{textureObjects:v.textureObjects,imageObjects:v.imageObjects.size,rgbaEstimateBytes:v.rgbaBytes}])),
   geometryBufferBytes:geometryBytes,
   uniqueBackingBufferBytes:[...buffers].reduce((n,b)=>n+b.byteLength,0),textureRGBAEstimateBytes:Math.round(textureRGBABytes),
   allocated:{...w.renderer.info.memory},gpuTimerAvailable:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),
   renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
   drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],pixelRatio:w.renderer.getPixelRatio(),quality:w.quality,shadows:w.renderer.shadowMap.enabled};
 });
 result.pose=await page.evaluate(()=>({player:FieldSignal3D.getPlayer(),camera:FieldSignal3D.getWorld().camera.position.toArray(),info:FieldSignal3D.getInfo()}));
 assert.ok(Math.abs(result.resources.pixelRatio-.35)<.001);
 assert.equal(result.resources.quality,'low');assert.equal(result.resources.shadows,false);
 await page.screenshot({path:path.join(out,fixture.name+'.jpg'),type:'jpeg',quality:80,timeout:120000});
 report.scenes.push(result);console.log('SCENE',fixture.name,JSON.stringify({work:result.work,render:result.render,calls:result.calls,triangles:result.triangles,interval:result.interval}));
}

async function gameDiagnostic(browser,base){
 const page=await browser.newPage({viewport:{width:844,height:500}});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.missing.push({status:r.status(),url:r.url()});});
 await page.addInitScript(()=>{
  localStorage.setItem('field-signal-dead-air-options',JSON.stringify({quality:'low',shadows:false}));
  // ImageBitmap has no src property. Test-only identity tags retain actual fetch
  // URLs without changing images, textures, loader cache behaviour or shipping JS.
  window.candidateImageUrls=new WeakMap();const blobUrls=new WeakMap(),nativeFetch=window.fetch.bind(window);
  window.fetch=async(...args)=>{const response=await nativeFetch(...args),blob=response.blob.bind(response);
   response.blob=async()=>{const data=await blob();blobUrls.set(data,response.url);return data;};return response;};
  if(window.createImageBitmap){const create=window.createImageBitmap.bind(window);window.createImageBitmap=async(...args)=>{
   const image=await create(...args),url=blobUrls.get(args[0])||args[0]?.currentSrc||args[0]?.src;if(url)candidateImageUrls.set(image,url);return image;
  };}
 });
 try{
  const started=Date.now();await page.goto(base);await page.locator('#load-world').click();
  await page.locator('#silent:enabled').waitFor({timeout:240000});report.startupToSilentEnabledMs=Date.now()-started;
  await page.locator('#silent').click();
  report.candidate=await page.evaluate(()=>FieldSignal3D.getInfo());
  assert.ok(report.candidate.campaign?.id,'Actual candidate must be active');
  assert.deepEqual(report.candidate.campaign.errors,[]);
  await page.evaluate(()=>{
   const w=FieldSignal3D.getWorld();w.setQuality('low');w.renderSettings.shadows=false;w.renderer.shadowMap.enabled=false;w.renderer.setPixelRatio(.35);w.resize();
   window.candidateCapture={phase:'idle',samples:[],limit:20};
   const frame=w.frame.bind(w),render=w.renderer.render.bind(w.renderer);let renderMs=0,last=null;
   w.renderer.render=(...args)=>{const t=performance.now(),result=render(...args);renderMs+=performance.now()-t;return result;};
   w.frame=(...args)=>{const start=performance.now();renderMs=0;const result=frame(...args);
    if(candidateCapture.phase!=='idle'&&candidateCapture.samples.length<candidateCapture.limit)candidateCapture.samples.push({interval:last===null?null:start-last,work:performance.now()-start,render:renderMs,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles});last=start;return result;};
  });
  for(const fixture of fixtures)await sampleScene(page,fixture);
  report.loading=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,durationMs:r.duration,transferBytes:r.transferSize,decodedBytes:r.decodedBodySize})).sort((a,b)=>b.durationMs-a.durationMs).slice(0,20));
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);
 }catch(error){await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:80,timeout:120000}).catch(()=>{});throw error;}
 finally{await page.close();}
}

(async()=>{
 let browser;
 try{
  report.git={commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
   branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),
   workingTree:execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim()};
  assert.ok(fs.existsSync(path.join(dist,'world-campaign.js')),'Build the candidate dist/ first');
  report.runtimeFiles=Object.fromEntries(['app.js','engine.py','world.json','world-campaign.js','campaign-core.js','campaign-loader.js','campaign_rules.py','campaign-interiors.js','districts.json','campaign-routes.json','campaign-spawns.json','search-props.json'].filter(name=>fs.existsSync(path.join(dist,name))).map(name=>{
   const bytes=fs.readFileSync(path.join(dist,name));return [name,{bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}];
  }));
  await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${host.address().port}/`;
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  report.environment.browser=browser.version();
  if(!workerOnly)await gameDiagnostic(browser,base);
  report.workers={original:await workerDiagnostic(browser,base,false),candidate:await workerDiagnostic(browser,base,true)};
  const historical=path.join(root,'docs/verification/2026-11-06-m0/isolated-worker.json');
  if(fs.existsSync(historical))report.workers.historicalM0=JSON.parse(fs.readFileSync(historical,'utf8')).isolatedWorker;
  const m0=path.join(root,'docs/verification/2026-11-06-m0/baseline.json');
  if(fs.existsSync(m0))report.historicalM0Scenes=JSON.parse(fs.readFileSync(m0,'utf8')).scenes;
  report.completed=new Date().toISOString();report.status='complete';
  console.log('WORKERS',JSON.stringify(Object.fromEntries(Object.entries(report.workers).map(([name,w])=>[name,{init:w.init,handlerMs:w.handlerMs,roundTripMs:w.roundTripMs,responseBytes:w.responseBytes,overrideBytes:w.overrideBytes}]))));
 }catch(error){report.status='failed';report.failure=error.stack;throw error;}
 finally{
  fs.writeFileSync(path.join(out,workerOnly?'workers.json':'candidate.json'),JSON.stringify(report,null,2));
  await browser?.close();if(host.listening)await new Promise(resolve=>host.close(resolve));
 }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
