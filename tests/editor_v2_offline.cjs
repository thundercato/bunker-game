/* Canonical dist only. Real prior-worker upgrade, storage retention and all
   packaged workspaces restarted offline under the production Pages subpath. */
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),out=path.join(root,'test-results/editor-v2');
const prior=fs.readFileSync(path.join(__dirname,'fixtures/editor-v2-prior-sw.js'));
const CACHE='field-signal-overgrowth-v11-editor2.1.0',OLD='field-signal-overgrowth-v11-world2.0.0';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary'};
fs.mkdirSync(out,{recursive:true});
let legacy=true;
const host=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://fixture').pathname);
 if(!pathname.startsWith('/bunker-game/')){res.writeHead(404);return res.end();}
 if(pathname==='/bunker-game/editor-upgrade-fixture.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Prior editor upgrade fixture</title>');}
 if(pathname==='/bunker-game/sw.js'&&legacy){res.setHeader('Content-Type','text/javascript');res.setHeader('Cache-Control','no-store');return res.end(prior);}
 const name=pathname.slice('/bunker-game/'.length),file=path.resolve(dist,name.endsWith('/')?name+'index.html':name);
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
});
const workspaces=[
 {name:'interior',url:'editor/?building=hut',ready:()=>window.FieldEditor?.ready()},
 {name:'world',url:'editor/world.html',ready:()=>window.FieldWorldEditor?.ready()},
 {name:'loot',url:'editor/loot.html',ready:()=>window.FieldLoot?.ready===true},
 {name:'missions',url:'editor/missions.html',ready:()=>window.FieldMissions?.ready()},
 {name:'validation',url:'editor/validation.html',ready:()=>window.FieldValidation?.ready()}
];
(async()=>{
 await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));let browser;const checks=[],errors=[],missing=[],pass=message=>{checks.push(message);console.log('PASS',message);};
 try{
  browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),base=`http://127.0.0.1:${host.address().port}/bunker-game/`;
  page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)missing.push(`${response.status()} ${response.url()}`);});
  await page.goto(base+'editor-upgrade-fixture.html');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.evaluate(async old=>{const cache=await caches.open(old);for(const name of ['editor/editor.js','editor/bootstrap.js'])await cache.put(new URL(name,document.baseURI),new Response('throw Error("STALE_EDITOR_MODULE_EXECUTED")',{headers:{'Content-Type':'text/javascript'}}));},OLD);
  const source=JSON.parse(fs.readFileSync(path.join(dist,'world.json'))),{seedLayout}=await import(path.join(root,'site/layout-core.js')),{initialWorld}=await import(path.join(root,'site/editor/world-core.js'));
  const layout=seedLayout(source,'hut');layout.objects.find(o=>o.id==='container-hut_c1').position[0]+=.125;
  const world=initialWorld(source);world.buildings[0].x+=.25;
  const retained={'field-signal-dead-air-v9':'campaign-retention-sentinel','field-signal-dead-air-options':'{"music":0.23}','field-signal-v8-journal':'[]','field-signal-editor-v1:hut':JSON.stringify(layout),'field-signal-world-v2-draft':JSON.stringify(world)};
  await page.evaluate(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);},retained);
  legacy=false;
  await page.goto(base+workspaces[0].url);await page.waitForFunction(workspaces[0].ready,null,{timeout:120000});
  const actualCache=await page.evaluate(()=>new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=e=>resolve(e.data.cache);navigator.serviceWorker.controller.postMessage({type:'editor-version'},[channel.port2]);}));
  assert.equal(actualCache,CACHE);assert.ok(!errors.some(e=>e.includes('STALE_EDITOR_MODULE_EXECUTED')));pass('Prior production service worker upgrades before importing stale editor modules');
  for(const workspace of workspaces.slice(1)){await page.goto(base+workspace.url);await page.waitForFunction(workspace.ready,null,{timeout:120000});}pass('All five editor workspaces start from canonical dist under /bunker-game/');
  await page.evaluate(()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Full offline cache did not finish')),180000);const receive=event=>{if(!['cache-ready','cache-error'].includes(event.data?.type))return;clearTimeout(timer);navigator.serviceWorker.removeEventListener('message',receive);event.data.type==='cache-ready'?resolve():reject(Error(event.data.error));};navigator.serviceWorker.addEventListener('message',receive);navigator.serviceWorker.controller.postMessage({type:'cache-all'});}));
  const manifest=JSON.parse(fs.readFileSync(path.join(dist,'precache.json')));
  const absent=await page.evaluate(async({cache,paths})=>{const stored=await caches.open(cache),missing=[];for(const name of paths)if(!await stored.match(new URL(name,document.baseURI)))missing.push(name);return missing;},{cache:CACHE,paths:manifest});assert.deepEqual(absent,[]);
  assert.equal(await page.evaluate(old=>caches.has(old),OLD),false);pass(`Complete explicit offline manifest cached (${manifest.length} resources), prior public cache retired safely`);
  // Remove navigational aliases: /editor/ must resolve its packaged index.html,
  // even when only cache-all has installed that workspace.
  await page.evaluate(async cache=>{const stored=await caches.open(cache);await stored.delete(new URL('editor/',document.baseURI));},CACHE);
  await context.setOffline(true);
  for(const workspace of workspaces){await page.goto(base+workspace.url);await page.waitForFunction(workspace.ready,null,{timeout:120000});await page.screenshot({path:path.join(out,`offline-${workspace.name}.png`)});}pass('Every workspace restarts offline, including never-cached directory navigation');
  assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(retained)),retained);pass('Campaign, settings, journal and backward-compatible editor drafts remain byte-for-byte intact');
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);pass('No browser exceptions or missing packaged network resources');
 }finally{fs.writeFileSync(path.join(out,'offline-browser.json'),JSON.stringify({checks,errors,missing},null,2));await browser?.close();await new Promise(resolve=>host.close(resolve));}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
