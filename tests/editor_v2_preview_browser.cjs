/* Canonical builds verify truthful capability gating. For the real unmerged
   adapter journey, build tools/editor_v2_compatibility.py and explicitly set
   EDITOR_COMPAT_DIST=/absolute/worktree/dist. Never substitutes for release CI. */
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),compat=process.env.EDITOR_COMPAT_DIST;
const dist=path.resolve(compat||path.join(root,'dist')),out=path.join(root,'test-results/editor-v2');fs.mkdirSync(out,{recursive:true});
const report=compat?JSON.parse(fs.readFileSync(path.join(dist,'../editor-compatibility.json'),'utf8')):null;
if(report)assert.equal(report.kind,'unmerged-runtime-compatibility-only');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.wasm':'application/wasm'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
 if(!pathname.startsWith('/bunker-game/')){res.writeHead(404);return res.end();}
 const name=pathname.slice('/bunker-game/'.length),file=path.resolve(dist,!name?'index.html':name.endsWith('/')?name+'index.html':name);
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end(name);}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/bunker-game/`;
 let browser;const checks=[],errors=[],missing=[],adapterRequests=[];
 const check=(name,condition,detail)=>{checks.push({name,pass:!!condition,detail});console.log(condition?'PASS':'FAIL',name);assert.ok(condition,name);};
 const near=(a,b)=>Math.abs(a-b)<.025;
 const observe=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push([r.status(),r.url()]);});p.on('request',r=>{if(new URL(r.url()).pathname.endsWith('/world-preview.js'))adapterRequests.push(r.url());});};
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});let page=await context.newPage();observe(page);
  await page.goto(base+'editor/');await page.waitForFunction(()=>window.FieldEditor?.ready(),null,{timeout:120000});
  if(!compat){
   check('Canonical main reports moved-world adapter unavailable',await page.evaluate(()=>FieldEditor.getSourceContext().worldPreview===false)&&await page.locator('#connected-preview').isDisabled());
   await page.evaluate(()=>FieldEditor.testConnectedGame());
   await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('unavailable in this runtime'));
   check('Unavailable preview explains dependency without importing absent module',adapterRequests.length===0);
   check('Blocked preview creates no isolated payload or game state',await page.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('field-signal-world-preview:')||k.startsWith('field-signal-editor-game:'))));
   await page.screenshot({path:path.join(out,'preview-unavailable-canonical.png')});
   checks.push({name:'Moved/rotated/raised game journey',status:'unsupported in canonical main; run explicit PR83 compatibility build',runtimeAdapter:false,published:false});
  }else{
   console.log('COMPATIBILITY ONLY runtime',report.runtimeRevision,'editor',report.editorRevision);
   check('Explicit compatibility artifact enables adapter capability',await page.evaluate(()=>FieldEditor.getSourceContext().worldPreview===true)&&await page.locator('#connected-preview').isEnabled(),report.runtimeRevision);
   await page.evaluate(()=>{
    localStorage.setItem('field-signal-dead-air-v9','PROTECTED-CAMPAIGN');
    localStorage.setItem('field-signal-dead-air-options','{"music":0.23}');
    localStorage.setItem('field-signal-v9-journal','[{"text":"PROTECTED-JOURNAL"}]');
    localStorage.setItem('field-signal-field-journal-v1','PROTECTED-BOOK');
   });
   const expected=['PROTECTED-CAMPAIGN','{"music":0.23}','[{"text":"PROTECTED-JOURNAL"}]','PROTECTED-BOOK'];
   const protectedState=p=>p.evaluate(()=>['field-signal-dead-air-v9','field-signal-dead-air-options','field-signal-v9-journal','field-signal-field-journal-v1'].map(k=>localStorage.getItem(k)));
   for(const spec of [
    {id:'hut',container:'hut_c1',position:[1.2,0,-2.4],pose:[35,1.25,-48],degrees:90},
    {id:'forester',container:'forester_c1',position:[-3.5,0,-2.8],pose:[-140,.75,-40],degrees:37},
    {id:'station',container:'station_c0',position:[-4.1,0,-2.6],pose:[-160,1.5,-145],degrees:-28},
   ]){
    await page.goto(base+'editor/?building='+spec.id);await page.waitForFunction(id=>window.FieldEditor?.ready()&&FieldEditor.getDocument().buildingId===id,spec.id,{timeout:120000});
    await page.locator('#hierarchy [data-id="container-'+spec.container+'"]').click();
    for(let i=0;i<3;i++){
     const field=page.locator('[data-field="position"][data-axis="'+i+'"]');await field.fill(String(spec.position[i]));await field.press('Tab');
    }
    check(spec.id+' numeric interior edit uses canonical local position',await page.evaluate(s=>JSON.stringify(FieldEditor.getDocument().objects.find(o=>o.binding?.id===s.container).position)===JSON.stringify(s.position),spec));
    await page.locator('a[href="editor/world.html"]').first().click();await page.waitForFunction(()=>window.FieldWorldEditor?.ready(),null,{timeout:120000});
    check(spec.id+' world view preserves selected whole building',await page.evaluate(id=>FieldWorldEditor.getSelection()?.id===id,spec.id));
    await page.locator('[data-world-field="foundation"]').selectOption('manual');
    for(const [key,value]of [['x',spec.pose[0]],['y',spec.pose[1]],['z',spec.pose[2]],['yaw',spec.degrees]]){
     const field=page.locator('[data-world-field="'+key+'"]');await field.fill(String(value));await field.press('Tab');
    }
    await page.locator('#focus-selected').click();await page.screenshot({path:path.join(out,'preview-'+spec.id+'-world.png')});
    await page.locator('#open-interior').click();await page.waitForFunction(id=>window.FieldEditor?.ready()&&FieldEditor.getDocument().buildingId===id,spec.id,{timeout:120000});
    check(spec.id+' focused view keeps local transform and selection after world move',await page.evaluate(s=>FieldEditor.getSelection()==='container-'+s.container&&JSON.stringify(FieldEditor.getDocument().objects.find(o=>o.binding?.id===s.container).position)===JSON.stringify(s.position),spec));
    const doc=await page.evaluate(()=>FieldEditor.getWorldDocument());
    assert.equal(doc.format,'field-signal-world-document');
    const download=page.waitForEvent('download');await page.locator('#export-world').click();const file=await download;
    const exportPath=path.join(out,'preview-'+spec.id+'-world.json');await file.saveAs(exportPath);assert.deepEqual(JSON.parse(fs.readFileSync(exportPath,'utf8')),doc);
    await page.locator('#json-file').setInputFiles(exportPath);await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('imported into the connected session'));
    await page.reload();await page.waitForFunction(()=>window.FieldEditor?.ready(),null,{timeout:120000});
    assert.deepEqual(await page.evaluate(()=>FieldEditor.getWorldDocument()),doc);check(spec.id+' canonical JSON export/import/reload keeps complete design',true);
    await page.screenshot({path:path.join(out,'preview-'+spec.id+'-interior-editor.png')});
    const popup=context.waitForEvent('page');await page.locator('#connected-preview').click();const game=await popup;observe(game);
    await game.setViewportSize({width:844,height:500});await game.bringToFront();await page.close();
    async function start(){await game.locator('#load-world').click();await game.locator('#silent:enabled').waitFor({timeout:240000});await game.locator('#silent').click();await game.evaluate(()=>{const w=FieldSignal3D.getWorld();w.setQuality('low');w.renderSettings.shadows=false;w.renderer.shadowMap.enabled=false;w.renderer.setPixelRatio(.3);w.resize();});}
    await start();
    const info=await game.evaluate(()=>FieldSignal3D.getInfo().editorPreview);
    check(spec.id+' actual runtime composes moved/rotated/raised parent exactly once',info.versioned&&near(info.transform.position[0],spec.pose[0])&&near(info.transform.position[1],spec.pose[1])&&near(info.transform.position[2],spec.pose[2])&&near(info.transform.yaw,spec.degrees*Math.PI/180),info);
    const geometry=await game.evaluate(async s=>{const {toWorld}=await import('./world-document.js'),world=FieldSignal3D.getWorld(),transform=world.data?.editorBuilding?.transform||FieldSignal3D.getInfo().editorPreview.transform,expected=toWorld(transform,s.position),mesh=world.containerMeshes[s.container].group;return {expected,actual:mesh.position.toArray(),spawn:FieldSignal3D.getPlayer()};},spec);
    check(spec.id+' rendered container agrees with canonical transformed position',near(geometry.expected[0],geometry.actual[0])&&near(geometry.expected[2],geometry.actual[2]),geometry);
    async function face(id){
     const name=await game.evaluate(id=>{const world=FieldSignal3D.getWorld(),p=FieldSignal3D.getPlayer(),it=world.interact.find(i=>i.id===id);if(!it)throw Error('Missing runtime interaction '+id);const dx=it.anchor.x-p.x,dz=it.anchor.z-p.z;FieldSignal3D.getInput().look(-Math.atan2(dx,-dz)-p.yaw,Math.atan2(it.anchor.y-p.y-1.67,Math.hypot(dx,dz))-p.pitch);return it.name;},id);
     await game.waitForFunction(id=>FieldSignal3D.getWorld().select()?.id===id,id,{timeout:30000});await game.waitForFunction(name=>document.querySelector('#target strong').textContent===name,name,{timeout:30000});
    }
    await face(spec.id);await game.keyboard.press('KeyE');await game.waitForFunction(id=>FieldSignal3D.getState().doors[id],spec.id,{timeout:30000});
    await game.evaluate(yaw=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(yaw-p.yaw,-p.pitch);},spec.degrees*Math.PI/180);
    await game.keyboard.down('KeyW');try{await game.waitForFunction(async()=>{const {toLocal}=await import('./world-document.js'),p=FieldSignal3D.getPlayer(),i=FieldSignal3D.getInfo().editorPreview,b=FieldSignal3D.getWorld().layoutPreview.doc;return toLocal(i.transform,[p.x,p.y,p.z])[2]<b.bounds[1]/2-1.1;},null,{timeout:90000});}finally{await game.keyboard.up('KeyW');}
    check(spec.id+' real Use opens door and keyboard crosses raised rotated entrance',near((await game.evaluate(()=>FieldSignal3D.getPlayer())).y,spec.pose[1]));
    await game.screenshot({path:path.join(out,'preview-'+spec.id+'-door.png')});
    // Position through the supported save importer to isolate each physical
    // collision/reach test. Movement and Use after positioning are real input.
    async function restoreLocal(position,yaw=0){
     let state=await game.evaluate(()=>FieldSignal3D.getState());const player=await game.evaluate(async({position,yaw})=>{const {toWorld}=await import('./world-document.js'),t=FieldSignal3D.getInfo().editorPreview.transform,[x,y,z]=toWorld(t,position);return {x,y,z,yaw:t.yaw+yaw,pitch:0};},{position,yaw});state.player=player;
     await game.evaluate(()=>FieldSignal3D.openPanel('saves'));await game.locator('#file-input').setInputFiles({name:'preview-position-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});await game.locator('[data-cmd="restore"]').click();await game.waitForFunction(p=>Math.abs(FieldSignal3D.getPlayer().x-p.x)<.025&&Math.abs(FieldSignal3D.getPlayer().z-p.z)<.025,player);await game.locator('#close-panel').click();
    }
    const authoredLayout=doc.interiors.find(d=>d.buildingId===spec.id),stairs=authoredLayout.objects.find(o=>o.type==='stairs');
    if(stairs){
     await restoreLocal([stairs.position[0],stairs.position[1],stairs.position[2]+stairs.size[2]/2-.05],stairs.yaw);
     await game.keyboard.down('KeyW');try{await game.waitForFunction(y=>FieldSignal3D.getPlayer().y>=y-.025,spec.pose[1]+stairs.position[1]+stairs.size[1],{timeout:90000});}finally{await game.keyboard.up('KeyW');}
     check(spec.id+' keyboard physically ascends transformed stairs to upper floor',near((await game.evaluate(()=>FieldSignal3D.getPlayer())).y,spec.pose[1]+3.2));
     await game.screenshot({path:path.join(out,'preview-'+spec.id+'-stairs.png')});
     await restoreLocal([0,3.2,0],0);const prior=await game.evaluate(()=>FieldSignal3D.getPlayer());await game.keyboard.down('KeyW');try{await game.waitForFunction(p=>Math.hypot(FieldSignal3D.getPlayer().x-p.x,FieldSignal3D.getPlayer().z-p.z)>.7,prior,{timeout:30000});}finally{await game.keyboard.up('KeyW');}
     check(spec.id+' upper-floor keyboard movement retains parent plus floor height',near((await game.evaluate(()=>FieldSignal3D.getPlayer())).y,spec.pose[1]+3.2));
    }
    await restoreLocal([spec.position[0],spec.position[1],spec.position[2]+1.55]);await face(spec.container);await game.keyboard.press('KeyE');await game.waitForFunction(id=>!!FieldSignal3D.getState().containers[id],spec.container,{timeout:30000});
    check(spec.id+' real Use searches relocated bound container',!!(await game.evaluate(id=>FieldSignal3D.getState().containers[id],spec.container)));
    await game.screenshot({path:path.join(out,'preview-'+spec.id+'-search.png')});await game.locator('#close-panel').click();
    if(spec.id==='hut'){
     check('Mission-critical recorder survives moved container authoring',await game.evaluate(()=>FieldSignal3D.getState().containers.hut_c1.items.recorder>=1));
     await game.locator('#open-atlas10').click();await game.locator('[data-atlas="target"]').click();
     const camera=await game.evaluate(()=>({x:FieldSignal3D.getAtlas().camera.cx,z:FieldSignal3D.getAtlas().camera.cz}));check('Actual Atlas objective targets the moved mission cupboard',near(camera.x,geometry.expected[0])&&near(camera.z,geometry.expected[2]),camera);await game.screenshot({path:path.join(out,'preview-hut-atlas.png')});await game.locator('#close-panel').click();
    }
    assert.deepEqual(await protectedState(game),expected);check(spec.id+' campaign/settings/journal/book stay isolated',true);
    await game.locator('#editor-preview-banner a').click();await game.waitForFunction(()=>window.FieldWorldEditor?.ready(),null,{timeout:120000});
    assert.deepEqual(await game.evaluate(()=>FieldWorldEditor.getWorldDocument()),doc);check(spec.id+' return recovers exact canonical authoring document',true);
    page=game;
   }
  }
  check('No browser exceptions or failed asset/module requests',errors.length===0&&missing.length===0,{errors,missing});await context.close();
 }catch(error){checks.push({failure:error.stack});throw error;}
 finally{fs.writeFileSync(path.join(out,compat?'preview-compatibility-browser.json':'preview-canonical-browser.json'),JSON.stringify({kind:compat?'unmerged-runtime-compatibility-only':'canonical-dist',runtimeRevision:report?.runtimeRevision,checks,errors,missing},null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
