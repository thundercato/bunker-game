/* Real Chromium localStorage and UI journeys against canonical dist. Hidden
   foliage deliberately tests storage/history, not dense rendering or device FPS. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dist=path.resolve('dist'),out=path.resolve('test-results/editor-v2');
fs.mkdirSync(out,{recursive:true});
const SESSION='field-signal-editor-world-session-v1';
const sentinels={
 'field-signal-dead-air-v9':'{"historyIsolation":"normal campaign 🧭","schema":9}',
 'field-signal-dead-air-options':'{"historyIsolation":"normal settings","music":0.37}',
 'field-signal-v9-journal':'{"historyIsolation":"legacy journal","note":"Łódź\\nrecorder"}',
 'field-signal-field-journal-v1':'{"historyIsolation":"field book","page":7}',
 'field-signal-editor-game:history-isolation':'{"historyIsolation":"other preview campaign"}',
 'field-signal-editor-options:history-isolation':'{"historyIsolation":"other preview settings"}',
 'field-signal-editor-journal:history-isolation':'{"historyIsolation":"other preview journal"}',
 'field-signal-editor-book:history-isolation':'{"historyIsolation":"other preview book"}',
};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://local').pathname;
 if(!pathname.startsWith('/bunker-game/')){res.writeHead(404);return res.end();}
 const name=decodeURIComponent(pathname.slice('/bunker-game/'.length)),file=path.resolve(dist,name.endsWith('/')?name+'index.html':name);
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});

// Hash in the browser. Returning thirty megabyte-scale frames to the runner
// would measure the automation transport instead of the real storage workflow.
async function snapshot(){
 const session=(window.FieldEditor||window.FieldWorldEditor).getSession();
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const document=session.getDocument(),raw=localStorage.getItem('field-signal-editor-world-session-v1'),stored=raw?JSON.parse(raw):null;
 return {
  document:await hash(document),past:await Promise.all(session.past.map(hash)),future:await Promise.all(session.future.map(hash)),
  foliage:await hash(document.authoring.foliage),foliageIds:await hash(document.authoring.foliage.map(o=>o.id)),
  foliageCount:document.authoring.foliage.length,pastCounts:session.past.map(d=>d.authoring.foliage.length),
  interiors:document.interiors.map(d=>({id:d.buildingId,objects:d.objects.length})),
  vegetation:document.authoring.layers.vegetation,history:session.history(),issues:[...session.issues],
  checkpointChars:raw?.length||0,documentChars:JSON.stringify(document).length,
  checkpointFormat:stored?.history?.format,storedPast:stored?.history?.past?.length,storedFuture:stored?.history?.future?.length,
  checkpointExact:stored?JSON.stringify(stored.document)===JSON.stringify(document):false,
  legacyExact:localStorage.getItem('field-signal-world-v2-draft')===JSON.stringify(document.authoring),
  layoutMirrorsExact:document.interiors.every(d=>localStorage.getItem('field-signal-editor-v1:'+d.buildingId)===JSON.stringify(d)),
  fullSnapshotsAbsent:stored?!Object.hasOwn(stored,'past')&&!Object.hasOwn(stored,'future'):false,
  utf16StorageEstimate:Object.keys(localStorage).reduce((sum,key)=>sum+2*(key.length+localStorage.getItem(key).length),0),
 };
}
const sameHistory=(actual,expected)=>{
 assert.equal(actual.document,expected.document);assert.deepEqual(actual.past,expected.past);assert.deepEqual(actual.future,expected.future);
 assert.equal(actual.foliage,expected.foliage);assert.equal(actual.foliageIds,expected.foliageIds);assert.deepEqual(actual.interiors,expected.interiors);
};
const sameSentinels=async page=>assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(sentinels)),sentinels);
const focusedReady=page=>page.waitForFunction(()=>window.FieldEditor?.ready()&&!FieldEditor.info().updating,null,{timeout:120000});
const worldReady=page=>page.waitForFunction(()=>window.FieldWorldEditor?.ready(),null,{timeout:120000});
const setSentinels=page=>page.evaluate(values=>{for(const[key,value]of Object.entries(values))localStorage.setItem(key,value);},sentinels);

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 const checks=[],errors=[],missing=[],failed=[],measurements={};
 const pass=(name,detail)=>{checks.push({name,...(detail?{detail}:{})});console.log('PASS',name,detail||'');};
 const watch=page=>{page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)missing.push(response.status()+' '+response.url());});page.on('requestfailed',request=>failed.push(request.url()+': '+request.failure()?.errorText));};
 try{
  assert.ok(fs.existsSync(path.join(dist,'editor/history-codec.js')),'Build canonical dist with its history module before running this suite');
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const base=`http://127.0.0.1:${server.address().port}/bunker-game/`;
  const denseContext=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),dense=await denseContext.newPage();watch(dense);
  await dense.goto(base+'editor/?building=hut');await focusedReady(dense);await setSentinels(dense);
  const selected=await dense.evaluate(()=>FieldEditor.getDocument().objects.find(o=>o.binding?.type==='container').id);
  await dense.locator('#hierarchy [data-id="'+selected+'"]').click();
  await dense.evaluate(()=>{
   const session=FieldEditor.getSession();for(const id of ['hut','forester','station'])session.ensureLayout(id);
   const world=session.getAuthoring(),{minX,maxX,minZ,maxZ}=world.bounds;
   const forest=Array.from({length:5000},(_,i)=>({
    id:'plant-'+crypto.randomUUID(),kind:['pine','fir','rock','fern','stump'][i%5],
    x:+(minX+5+(i%100)*(maxX-minX-10)/99).toFixed(3),z:+(maxZ-5-Math.floor(i/100)*(maxZ-minZ-10)/49).toFixed(3),
    offset:0,scale:+(.7+(i%20)*.037).toFixed(4),yaw:+((i*.61803398875)%(Math.PI*2)).toFixed(6),locked:i%61===0,
   }));
   world.layers.vegetation=false;world.foliage=forest.slice(0,4700);session.setAuthoring(world,{record:false});
   for(let i=0;i<30;i++){const next=session.getAuthoring();next.foliage.push(...forest.slice(4700+i*10,4710+i*10));session.setAuthoring(next);}
   session.save();
  });
  const before=await dense.evaluate(snapshot);measurements.dense=before;
  assert.equal(before.foliageCount,5000);assert.equal(before.past.length,30);assert.equal(before.future.length,0);
  assert.deepEqual(before.pastCounts,Array.from({length:30},(_,i)=>4700+i*10));assert.equal(before.interiors.length,3);
  assert.equal(before.checkpointFormat,'field-signal-editor-history/1');assert.equal(before.storedPast,30);assert.ok(before.fullSnapshotsAbsent);
  assert.ok(before.checkpointExact&&before.legacyExact&&before.layoutMirrorsExact);assert.equal(before.vegetation,false);
  pass('Real localStorage saves5000UUID instances, three interiors and all30 history states without quota failure',{
   checkpointChars:before.checkpointChars,utf16StorageEstimate:before.utf16StorageEstimate,hiddenVegetation:true,
  });
  assert.ok(before.checkpointChars<before.documentChars*4,'Persisted history must not contain thirty copies of every unchanged world');
  pass('Checkpoint uses the lossless history encoding while canonical document and legacy mirrors remain exact');
  await dense.reload();await focusedReady(dense);const reloaded=await dense.evaluate(snapshot);sameHistory(reloaded,before);
  assert.equal(await dense.evaluate(()=>FieldEditor.getSelection()),selected);await sameSentinels(dense);
  pass('Actual reload preserves SHA256 of the current document, every30 undo frame and all foliage IDs');
  for(let i=0;i<3;i++){
   if(i===2)await dense.keyboard.press('Control+z');else await dense.locator('#undo').click();
   await dense.waitForFunction(expected=>!FieldEditor.info().updating&&FieldEditor.getSession().history().undo===expected,29-i,{timeout:120000});
  }
  let moved=await dense.evaluate(snapshot);assert.equal(moved.document,before.past[27]);assert.equal(moved.foliageCount,4970);assert.equal(moved.future.length,3);
  for(let i=0;i<3;i++){
   if(i===2)await dense.keyboard.press('Control+Shift+z');else await dense.locator('#redo').click();
   await dense.waitForFunction(expected=>!FieldEditor.info().updating&&FieldEditor.getSession().history().undo===expected,28+i,{timeout:120000});
  }
  sameHistory(await dense.evaluate(snapshot),before);pass('Real undo/redo buttons and keyboard restore growing strokes as complete transactions');
  await dense.locator('a[href="editor/world.html"]').click();await worldReady(dense);sameHistory(await dense.evaluate(snapshot),before);
  assert.equal(await dense.evaluate(()=>FieldWorldEditor.getSelection().id),'hut');assert.equal(await dense.evaluate(()=>FieldWorldEditor.info().renderStats.foliageCreated),0);
  assert.equal(await dense.locator('#layers label').filter({hasText:'Vegetation'}).locator('input').isChecked(),false);
  await dense.reload();await worldReady(dense);sameHistory(await dense.evaluate(snapshot),before);
  await dense.locator('#open-interior').click();await focusedReady(dense);sameHistory(await dense.evaluate(snapshot),before);
  assert.equal(await dense.evaluate(()=>FieldEditor.getSelection()),selected);await sameSentinels(dense);
  await dense.screenshot({path:path.join(out,'history-dense-checkpoint.png')});
  pass('World/focused navigation and map reload retain full history, selection and hidden forest without reroll');
  pass('Normal campaign, settings, both journals and unrelated preview state remain byte-identical during dense history edits');

  // Separate fresh storage keeps the legacy import test realistic without
  // deleting the saved dense design. One hut +200 instances +30 complete old
  // frames fit the old quota; three interiors alone would exceed that quota.
  const legacyContext=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),legacy=await legacyContext.newPage();watch(legacy);
  await legacy.goto(base+'editor/?building=hut');await focusedReady(legacy);await setSentinels(legacy);
  const legacyFixture=await legacy.evaluate(async()=>{
   const {EditorSession}=await import('./editor/session.js'),session=new EditorSession({...FieldEditor.getSession().context,storage:null});session.ensureLayout('hut');
   let world=session.getAuthoring();world.layers.vegetation=false;
   world.foliage=Array.from({length:200},(_,i)=>({id:'plant-'+crypto.randomUUID(),kind:'pine',x:-220+i*.5,z:-100,offset:0,scale:1,yaw:i*.01,locked:false}));
   session.setAuthoring(world,{record:false});for(let i=0;i<30;i++){world=session.getAuthoring();world.waterLevel=+(-1.25+(i+1)*.01).toFixed(3);session.setAuthoring(world);}
   session.undo();session.undo();
   const value={version:1,document:session.getDocument(),past:session.past,future:session.future,views:{},mirrors:{},pendingMirrors:{}},raw=JSON.stringify(value);
   localStorage.setItem('field-signal-world-v2-draft',JSON.stringify(value.document.authoring));
   localStorage.setItem('field-signal-editor-v1:hut',JSON.stringify(value.document.interiors[0]));
   localStorage.setItem('field-signal-editor-world-session-v1',raw);
   const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(v=>v.toString(16).padStart(2,'0')).join('');
   const rawDigest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
   return {rawChars:raw.length,rawHash:Array.from(new Uint8Array(rawDigest)).map(v=>v.toString(16).padStart(2,'0')).join(''),document:await hash(value.document),past:await Promise.all(value.past.map(hash)),future:await Promise.all(value.future.map(hash)),foliage:await hash(value.document.authoring.foliage),foliageIds:await hash(value.document.authoring.foliage.map(o=>o.id)),interiors:value.document.interiors.map(d=>({id:d.buildingId,objects:d.objects.length}))};
  });
  await legacy.reload();await focusedReady(legacy);const loadedLegacy=await legacy.evaluate(snapshot);sameHistory(loadedLegacy,legacyFixture);
  assert.equal(loadedLegacy.foliageCount,200);assert.deepEqual(loadedLegacy.history,{undo:28,redo:2});assert.equal(loadedLegacy.checkpointFormat,undefined);
  assert.equal(await legacy.evaluate(()=>JSON.parse(localStorage.getItem('field-signal-editor-world-session-v1')).history),undefined);
  assert.equal(await legacy.evaluate(async()=>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(localStorage.getItem('field-signal-editor-world-session-v1')));return Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');}),legacyFixture.rawHash,'Loading an old checkpoint must not rewrite its original bytes');
  measurements.legacy=legacyFixture;pass('An actual older full-snapshot checkpoint loads200 instances and all28undo+2redo frames unchanged');
  await legacy.locator('#save').click();const converted=await legacy.evaluate(snapshot);sameHistory(converted,legacyFixture);
  assert.equal(converted.checkpointFormat,'field-signal-editor-history/1');assert.ok(converted.fullSnapshotsAbsent&&converted.checkpointExact&&converted.legacyExact);
  await legacy.reload();await focusedReady(legacy);sameHistory(await legacy.evaluate(snapshot),legacyFixture);await sameSentinels(legacy);
  pass('Explicit Save converts old snapshots losslessly and actual reload retains both history stacks');
  const external=await legacy.evaluate(async()=>{
   const session=FieldEditor.getSession(),document=session.getDocument();document.interiors[0].objects[0].name='Concurrent external checkpoint floor';
   const raw=JSON.stringify({version:1,document,past:session.past.slice(-2),future:[],views:{}});
   localStorage.setItem('field-signal-editor-world-session-v1',raw);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return {hash:Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join(''),chars:raw.length};
  });
  await legacy.locator('#save').click();sameHistory(await legacy.evaluate(snapshot),legacyFixture);
  const retainedExternal=await legacy.evaluate(async()=>{
   const result=[];for(const key of Object.keys(localStorage).filter(k=>k.startsWith('field-signal-editor-world-session-v1:recovery:'))){const raw=localStorage.getItem(key),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));result.push({key,hash:Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('')});}return result;
  });
  assert.ok(retainedExternal.some(row=>row.hash===external.hash));measurements.concurrent={...external,retained:retainedExternal};
  pass('Concurrent external legacy checkpoint is backed up byte-for-byte before Save retains active compressed history');

  const corrupt=await legacy.evaluate(()=>{
   const key='field-signal-editor-world-session-v1',state=JSON.parse(localStorage.getItem(key));
   state.history.past[0]=[JSON.stringify(state.document).length+1,0,''];
   const raw=JSON.stringify(state);localStorage.setItem(key,raw);return {raw};
  });
  await legacy.reload();await focusedReady(legacy);
  assert.equal(await legacy.evaluate(key=>localStorage.getItem(key),SESSION),corrupt.raw);
  assert.ok(await legacy.evaluate(key=>FieldEditor.getSession().rejected.has(key),SESSION));
  const recovered=await legacy.evaluate(snapshot);assert.equal(recovered.document,legacyFixture.document);assert.deepEqual(recovered.history,{undo:0,redo:0});
  await legacy.locator('#editor-recovery').click();const corruptRow=legacy.locator('[data-recovery-key="'+SESSION+'"]');await corruptRow.waitFor();
  assert.equal(await corruptRow.locator('[data-recovery="restore"]').isDisabled(),true);
  const downloadPending=legacy.waitForEvent('download');await corruptRow.locator('[data-recovery="download"]').click();const download=await downloadPending;
  assert.equal(fs.readFileSync(await download.path(),'utf8'),corrupt.raw);await download.saveAs(path.join(out,'history-corrupt-checkpoint.json'));
  await legacy.screenshot({path:path.join(out,'history-corrupt-recovery.png')});
  pass('Invalid encoded splice preserves raw checkpoint, offers exact download and refuses an unsafe restore');
  await legacy.getByRole('button',{name:'Close recovery',exact:true}).click();await legacy.locator('#save').click();
  const corruptRetained=await legacy.evaluate(raw=>Object.keys(localStorage).some(key=>key.startsWith('field-signal-editor-world-session-v1:recovery:')&&localStorage.getItem(key)===raw),corrupt.raw);assert.ok(corruptRetained);
  const safe=await legacy.evaluate(snapshot);assert.equal(safe.document,recovered.document);assert.equal(safe.checkpointFormat,'field-signal-editor-history/1');assert.ok(safe.checkpointExact&&safe.legacyExact);
  await legacy.reload();await focusedReady(legacy);assert.equal((await legacy.evaluate(snapshot)).document,recovered.document);await sameSentinels(legacy);
  pass('Explicit recovery Save retains corrupt bytes in backup, persists the valid mirror design and survives reload');
  await sameSentinels(dense);pass('Both fresh profiles preserve every normal and unrelated preview sentinel without clearing storage');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.deepEqual(failed,[]);
  pass('Canonical production-subpath history journeys have no browser exceptions or failed asset/module requests');
 }catch(error){checks.push({failure:error.stack});throw error;}
 finally{
  fs.writeFileSync(path.join(out,'history-browser.json'),JSON.stringify({platform:'Linux Chromium / SwiftShader',scope:'Actual localStorage and hidden-vegetation history; not dense-rendering or physical-device performance',checks,measurements,errors,missing,failed},null,2));
  await browser?.close();await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
