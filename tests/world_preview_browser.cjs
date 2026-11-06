/* Real moved/rotated/raised building, worker upgrade, isolated journal and offline reload. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),out=path.join(root,'test-results');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://local'),relative=url.pathname.replace(/^\/bunker-game\//,'');
 const file=path.resolve(dist,!relative?'index.html':relative.endsWith('/')?relative+'index.html':relative);
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.GAME_URL||`http://127.0.0.1:${server.address().port}/bunker-game/`;
 let browser;const checks=[],errors=[],missing=[];
 function check(name,ok,detail){checks.push({name,pass:!!ok,detail});console.log(ok?'PASS':'FAIL',name);assert.ok(ok,name);}
 const near=(a,b)=>Math.abs(a-b)<.02;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:900}}),p=await context.newPage();
  const observe=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push([r.status(),r.url()]);});};observe(p);
  await p.goto(base+'controller.html');
  if(!process.env.GAME_URL){
   // Exact worker from 6b4f9fb, kept as a fixture for shallow CI checkouts.
   let serveOld=true;const old=fs.readFileSync(path.join(root,'site/tests/fixtures/world2-service-worker.js'),'utf8');
   await p.route('**/sw.js',route=>serveOld?route.fulfill({contentType:'text/javascript',body:old}):route.continue());
   await p.evaluate(async()=>{await navigator.serviceWorker.register('sw.js',{scope:'./'});await navigator.serviceWorker.ready;});
   await p.waitForFunction(()=>navigator.serviceWorker.controller);
   await p.evaluate(async()=>{const c=await caches.open('field-signal-overgrowth-v11-world2.0.0');await c.put(new URL('app.js',location.href),new Response('throw Error("Stale application imported");',{headers:{'Content-Type':'text/javascript'}}));});
   serveOld=false;
  }
  await p.evaluate(()=>{
   localStorage.setItem('field-signal-dead-air-v9','PROTECTED-CAMPAIGN');
   localStorage.setItem('field-signal-dead-air-options','{"music":0.23}');
   localStorage.setItem('field-signal-v9-journal','[{"text":"PROTECTED-JOURNAL"}]');
  });
  await p.goto(base+'editor/world.html');await p.waitForFunction(()=>window.FieldWorldEditor?.ready(),null,{timeout:120000});
  const cache=await p.evaluate(()=>new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=e=>resolve(e.data.cache);navigator.serviceWorker.controller.postMessage({type:'editor-version'},[c.port2]);}));
  check('Old worker upgraded before importing editor or game',cache==='field-signal-11.1-editor2.1.2');
  const expectedMission=await p.evaluate(async()=>{
   const {seedLayout}=await import('./layout-core.js');const d=seedLayout(FieldWorldEditor.getSource(),'hut');
   d.objects.find(o=>o.binding?.id==='hut_c1').position=[1.2,0,-2.4];
   d.objects.push({id:'test-chair',name:'Preview chair',type:'prop',position:[-2.5,0,0],size:[.55,.95,.55],yaw:.3,material:'wood',solid:true,locked:false,asset:'painted_wooden_chair_01'});
   localStorage.setItem('field-signal-editor-v1:hut',JSON.stringify(d));
   // Independent known-90-degree transform of the authored front anchor.
   const o=d.objects.find(o=>o.binding?.id==='hut_c1'),a=o.binding.anchor||[0,0,0],c=Math.cos(o.yaw),s=Math.sin(o.yaw);
   return{x:35+o.position[2]-a[0]*s+a[2]*c,z:-48-o.position[0]-a[0]*c-a[2]*s};
  });
  // Loading the legacy editor draft is an actual session boundary. Reload so
  // the connected canonical session adopts it before any placement edits.
  await p.reload();await p.waitForFunction(()=>window.FieldWorldEditor?.ready(),null,{timeout:120000});
  await p.evaluate(()=>FieldWorldEditor.select({kind:'building',id:'hut'}));
  await p.locator('[data-world-field="foundation"]').selectOption('manual');
  for(const [field,value]of [['x','35'],['z','-48'],['yaw','90'],['y','1.25']]){
   const input=p.locator('[data-world-field="'+field+'"]');await input.fill(value);await input.press('Tab');
  }
  const draft=await p.evaluate(()=>JSON.stringify(FieldWorldEditor.getDocument()));
  await p.screenshot({path:path.join(out,'world-preview-editor.jpg'),type:'jpeg',quality:75});
  const popup=context.waitForEvent('page');await p.locator('#world-game-test').click();const g=await popup;observe(g);
  await g.setViewportSize({width:844,height:500});await g.bringToFront();await p.close();
  async function start(page,auto=false){
   if(!auto)await page.locator('#load-world').click();
   await page.locator('#silent:enabled').waitFor({timeout:240000});await page.locator('#silent').click();
   await page.evaluate(()=>{const w=FieldSignal3D.getWorld();w.setQuality('low');w.renderSettings.shadows=false;w.renderer.shadowMap.enabled=false;w.renderer.setPixelRatio(.35);w.resize();});
  }
  await start(g);
  const info=await g.evaluate(()=>FieldSignal3D.getInfo().editorPreview);
  check('Versioned preview runs moved, rotated and raised hut',info.versioned&&near(info.transform.position[0],35)&&near(info.transform.position[1],1.25)&&near(info.transform.yaw,Math.PI/2),info);
  check('Spawn follows building once',await g.evaluate(()=>Math.abs(FieldSignal3D.getPlayer().x-39.9)<.02&&Math.abs(FieldSignal3D.getPlayer().y-1.25)<.02));
  check('Saved interior cupboard and decorative chair follow whole-building pose',await g.evaluate(()=>{
   const w=FieldSignal3D.getWorld(),cup=w.containerMeshes.hut_c1.group,chair=w.layoutPreview.objects.get('test-chair');
   return Math.abs(cup.position.x-32.6)<.02&&Math.abs(cup.position.z+49.2)<.02&&Math.abs(chair.position.z+45.5)<.02&&Math.abs(chair.rotation.y-(Math.PI/2+.3))<.02;
  }));
  async function face(id){
   const name=await g.evaluate(async id=>{const T=await import('./vendor/three.js'),w=FieldSignal3D.getWorld(),p=FieldSignal3D.getPlayer(),it=w.interact.find(i=>i.id===id);w.scene.updateMatrixWorld(true);const target=it.type==='container'?new T.Box3().setFromObject(it.obj).getCenter(new T.Vector3()):it.anchor,dx=target.x-p.x,dz=target.z-p.z;
    FieldSignal3D.getInput().look(-Math.atan2(dx,-dz)-p.yaw,Math.atan2(target.y-p.y-1.67,Math.hypot(dx,dz))-p.pitch);return it.name;},id);
   await g.waitForFunction(id=>FieldSignal3D.getWorld().select()?.id===id,id,{timeout:30000});
   await g.waitForFunction(name=>document.querySelector('#target strong').textContent===name,name,{timeout:30000});
  }
  await face('hut');await g.keyboard.press('KeyE');await g.waitForFunction(()=>FieldSignal3D.getState().doors.hut);
  check('Door opens through real Use input',true);
  // Flatten the camera pitch only, then physically walk through the rotated door.
  await g.evaluate(()=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(Math.PI/2-p.yaw,-p.pitch);});
  // Pass the table's near edge before turning towards the cupboard.
  await g.keyboard.down('KeyW');try{await g.waitForFunction(()=>FieldSignal3D.getPlayer().x<34.2,null,{timeout:90000});}finally{await g.keyboard.up('KeyW');}
  await g.keyboard.down('KeyD');try{await g.waitForFunction(()=>FieldSignal3D.getPlayer().z<-49,null,{timeout:30000});}finally{await g.keyboard.up('KeyD');}
  check('Keyboard traverses rotated door on the raised floor',await g.evaluate(()=>Math.abs(FieldSignal3D.getPlayer().y-1.25)<.02));
  await g.screenshot({path:path.join(out,'world-preview-interior.jpg'),type:'jpeg',quality:80});
  await face('hut_c1');await g.keyboard.press('KeyE');await g.waitForFunction(()=>!!FieldSignal3D.getState().containers.hut_c1,null,{timeout:30000});
  check('Physical search reaches moved mission cupboard',await g.evaluate(()=>FieldSignal3D.getState().containers.hut_c1.items.recorder>=1));
  await g.screenshot({path:path.join(out,'world-preview-search.jpg'),type:'jpeg',quality:80});
  await g.locator('#close-panel').click();await g.locator('#open-atlas10').click();await g.locator('[data-atlas="target"]').click();
  check('Actual Atlas targets the moved cupboard front binding',await g.evaluate(expected=>Math.abs(FieldSignal3D.getAtlas().camera.cx-expected.x)<.02&&Math.abs(FieldSignal3D.getAtlas().camera.cz-expected.z)<.02,expectedMission),{expected:expectedMission,actual:await g.evaluate(()=>FieldSignal3D.getAtlas().info())});
  await g.screenshot({path:path.join(out,'world-preview-atlas.jpg'),type:'jpeg',quality:80});
  const protectedState=()=>g.evaluate(()=>({save:localStorage.getItem('field-signal-dead-air-v9'),options:localStorage.getItem('field-signal-dead-air-options'),journal:localStorage.getItem('field-signal-v9-journal')}));
  const expected={save:'PROTECTED-CAMPAIGN',options:'{"music":0.23}',journal:'[{"text":"PROTECTED-JOURNAL"}]'};
  check('Actual v9 campaign, settings and journal remain untouched',JSON.stringify(await protectedState())===JSON.stringify(expected));
  check('Preview events use their own journal key',await g.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('field-signal-editor-journal:world-')&&localStorage.getItem(k).includes('text'))));
  await g.evaluate(()=>FieldSignal3D.openPanel('saves'));await g.waitForFunction(()=>document.querySelector('#offline-status')?.textContent.includes('ready offline'),null,{timeout:180000});
  await context.setOffline(true);await g.reload();await start(g);
  check('Moved preview reloads offline without rerolling searched container',await g.evaluate(()=>FieldSignal3D.getState().containers.hut_c1.items.recorder>=1&&FieldSignal3D.getInfo().editorPreview.versioned));
  check('Production data survives offline preview restart',JSON.stringify(await protectedState())===JSON.stringify(expected));
  await g.locator('#editor-preview-banner a').click();await g.waitForFunction(()=>window.FieldWorldEditor?.ready(),null,{timeout:120000});
  check('Return to editor retains exact world draft',await g.evaluate(d=>JSON.stringify(FieldWorldEditor.getDocument())===d,draft));
  await context.setOffline(false);await context.close();
  // A separate browser context has no editor draft/payload. The shareable play link
  // must construct the reviewed sample and stay isolated without a local UUID.
  const sample=await browser.newPage({viewport:{width:844,height:500}});observe(sample);
  await sample.addInitScript(()=>{navigator.serviceWorker.register=async()=>{throw new DOMException('Offline storage unavailable','SecurityError');};});
  await sample.goto(base+'?buildingPreview=hut&play=1');await start(sample,true);
  check('Shareable link works without drafts even when offline storage is unavailable',await sample.evaluate(()=>FieldSignal3D.getInfo().editorPreview.versioned&&Math.abs(FieldSignal3D.getPlayer().x-39.9)<.02&&!localStorage.getItem('field-signal-dead-air-v9')));
  await sample.screenshot({path:path.join(out,'world-preview-play-link.jpg'),type:'jpeg',quality:80});
  check('No missing assets or browser errors',!errors.length&&!missing.length,{errors,missing});
 }catch(error){checks.push({failure:error.stack});throw error;}
 finally{fs.writeFileSync(path.join(out,'world-preview-browser.json'),JSON.stringify(checks,null,2));await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
