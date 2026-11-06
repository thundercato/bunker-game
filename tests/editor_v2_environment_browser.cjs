// Canonical packaged-dist acceptance: seeded brush, real pointer gestures,
// history, locks and portable/reloaded concrete foliage instances.
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const out=path.resolve('test-results/editor-v2'),dist=path.resolve('dist');
fs.mkdirSync(out,{recursive:true});
for(const name of ['editor/world.html','editor/world.js','editor/panels/environment-brush.js','editor/tools/environment-brush-core.js'])assert.ok(fs.existsSync(path.join(dist,name)),`Canonical dist is missing ${name}; run python3 tools/build.py`);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://test'),name=decodeURIComponent(url.pathname).replace(/^\/bunker-game\//,''),file=path.resolve(dist,name.endsWith('/')?name+'index.html':name);
 if(!url.pathname.startsWith('/bunker-game/')||!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const checks=[],errors=[],missing=[];
 const pass=name=>{checks.push(name);console.log('PASS',name);};
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url()+' '+r.status());});
  await page.goto(`http://127.0.0.1:${server.address().port}/bunker-game/editor/world.html`);
  await page.waitForFunction(()=>window.FieldWorldEditor?.ready()&&FieldWorldEditor.environmentBrush,null,{timeout:120000});
  await page.evaluate(()=>{
   localStorage.setItem('field-signal-dead-air-v9','ENVIRONMENT-CAMPAIGN-SENTINEL');
   localStorage.setItem('field-signal-dead-air-options','{"music":0.23}');
   localStorage.setItem('field-signal-v8-journal','[]');
   const {camera,orbit}=FieldWorldEditor.getControls();orbit.target.set(-40,0,-100);camera.position.set(-40,90,-30);orbit.update();
  });
  await page.locator('#foliage').selectOption('rock');
  // Existing range inputs are exercised with the keyboard, not overwritten by a test hook.
  await page.locator('#radius').focus();await page.keyboard.press('Home');for(let i=0;i<6;i++)await page.keyboard.press('ArrowRight');
  await page.locator('#density').focus();await page.keyboard.press('Home');for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');
  for(const [field,value] of Object.entries({seed:12345,spacing:2,minScale:.8,maxScale:1.1,minYaw:10,maxYaw:20}))await page.locator(`[data-environment="${field}"]`).fill(String(value));
  for(const field of ['avoidBuildings','avoidPaths','avoidWater','avoidSlopes'])await page.locator(`[data-environment="${field}"]`).uncheck();
  await page.locator('[data-tool="pine"]').click();
  await page.waitForTimeout(300);
  const xy=await page.evaluate(async()=>{
   const T=await import('./vendor/three.js'),{camera}=FieldWorldEditor.getControls(),p=new T.Vector3(-40,0,-100).project(camera),r=document.querySelector('#world-canvas').getBoundingClientRect();
   return{x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};
  });
  const before=await page.evaluate(()=>FieldWorldEditor.getDocument());
  await page.mouse.move(xy.x,xy.y);
  await page.waitForFunction(()=>FieldWorldEditor.environmentBrush.lastResult()?.accepted.length===6);
  const preview=await page.evaluate(()=>FieldWorldEditor.environmentBrush.lastResult());
  assert.equal(preview.seed,12345);assert.equal(preview.settings.radius,12);assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),before);
  await page.screenshot({path:path.join(out,'environment-brush-preview.png')});
  pass('Real terrain hover previews deterministic candidates without changing authored data');
  await page.mouse.click(xy.x,xy.y);
  const first=await page.evaluate(()=>FieldWorldEditor.getDocument());
  assert.equal(first.foliage.length-before.foliage.length,6);
  assert.deepEqual(first.foliage.slice(before.foliage.length).map(({id,...f})=>f),preview.accepted);
  for(const f of first.foliage.slice(before.foliage.length)){assert.equal(f.kind,'rock');assert.ok(f.scale>=.8&&f.scale<=1.1);assert.ok(f.yaw>=10*Math.PI/180-1e-6&&f.yaw<=20*Math.PI/180+1e-6);}
  await page.keyboard.press('Control+z');assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),before);
  await page.keyboard.press('Control+Shift+z');assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),first);
  pass('Actual mouse dab commits displayed rock instances and is one undo/redo operation');
  await page.mouse.move(xy.x,xy.y);await page.mouse.down();await page.mouse.move(xy.x+60,xy.y+15,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();
  assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),first);
  pass('Escape restores a real multi-dab brush gesture atomically');
  await page.mouse.move(xy.x,xy.y);await page.mouse.down();await page.mouse.move(xy.x+80,xy.y+20,{steps:8});await page.mouse.up();
  const dragged=await page.evaluate(()=>FieldWorldEditor.getDocument());assert.ok(dragged.foliage.length>first.foliage.length);
  for(let i=0;i<dragged.foliage.length;i++)for(let j=i+1;j<dragged.foliage.length;j++)assert.ok(Math.hypot(dragged.foliage[i].x-dragged.foliage[j].x,dragged.foliage[i].z-dragged.foliage[j].z)>=2-1e-8);
  await page.keyboard.press('Control+z');assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),first);
  await page.keyboard.press('Control+Shift+z');assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),dragged);
  pass('Real drag spaces new instances against earlier dabs and keeps one history transaction');
  await page.evaluate(()=>FieldWorldEditor.select({kind:'foliage',id:FieldWorldEditor.getDocument().foliage[0].id}));
  await page.locator('[data-world-field="locked"]').check();
  const locked=await page.evaluate(()=>FieldWorldEditor.getDocument());
  await page.locator('#radius').focus();await page.keyboard.press('End');await page.locator('[data-tool="erase"]').click();await page.mouse.click(xy.x,xy.y);
  const erased=await page.evaluate(()=>FieldWorldEditor.getDocument());assert.ok(erased.foliage.length<locked.foliage.length);assert.deepEqual(erased.foliage.find(f=>f.id===locked.foliage[0].id),locked.foliage[0]);assert.ok((await page.locator('#environment-brush-report').textContent()).includes('retained 1 locked'));
  await page.keyboard.press('Control+z');assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),locked);
  pass('Mouse erasing preserves the individually locked object and undo restores its neighbours');
  const downloadPromise=page.waitForEvent('download');await page.locator('#world-export').click();const download=await downloadPromise;
  const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.format,'field-signal-world-document');assert.deepEqual(exported.authoring,locked);
  await page.locator('#world-file').setInputFiles({name:'Field-Signal-Connected-World.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('saved'));assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),locked);
  await page.reload();await page.waitForFunction(()=>window.FieldWorldEditor?.ready());assert.deepEqual(await page.evaluate(()=>FieldWorldEditor.getDocument()),locked);
  assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('field-signal-dead-air-v9'),localStorage.getItem('field-signal-dead-air-options'),localStorage.getItem('field-signal-v8-journal')]),['ENVIRONMENT-CAMPAIGN-SENTINEL','{"music":0.23}','[]']);
  await page.screenshot({path:path.join(out,'environment-brush-reloaded.png')});
  pass('Export and reload preserve concrete stable IDs and transforms without a seed reroll or campaign writes');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);pass('Packaged production subpath has no browser exceptions or missing resources');
 }finally{
  fs.writeFileSync(path.join(out,'environment-browser.json'),JSON.stringify({checks,errors,missing},null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
