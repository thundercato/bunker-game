/* Real canonical-dist connected authoring -> accepted runtime journey.
   EDITOR_COMPAT_DIST remains an explicitly recorded compatibility-only override;
   normal CI exercises its own packaged dist with the reviewed runtime adapter. */
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
 let browser,activePage;const checks=[],errors=[],missing=[],adapterRequests=[];
 const check=(name,condition,detail)=>{checks.push({name,pass:!!condition,detail});console.log(condition?'PASS':'FAIL',name);assert.ok(condition,name);};
 const near=(a,b)=>Math.abs(a-b)<.025;
 const observe=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push([r.status(),r.url()]);});p.on('request',r=>{if(new URL(r.url()).pathname.endsWith('/world-preview.js'))adapterRequests.push(r.url());});};
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{
   // Set the same low/shadow profile used below before its isolated renderer
   // compiles. Ordinary campaign options retain their protected sentinel bytes.
   const id=new URL(location.href).searchParams.get('worldPreview');
   if(/^[a-f0-9-]{36}$/.test(id||''))localStorage.setItem('field-signal-editor-options:world-'+id,JSON.stringify({quality:'low',shadows:false,reducedMotion:true}));
  });
  let page=await context.newPage();activePage=page;observe(page);
  await page.goto(base+'editor/');await page.waitForFunction(()=>window.FieldEditor?.ready(),null,{timeout:120000});
  if(compat)console.log('COMPATIBILITY ONLY runtime',report.runtimeRevision,'editor',report.editorRevision);
  check(compat?'Explicit compatibility artifact enables adapter capability':'Canonical package enables the accepted moved-building adapter',await page.evaluate(()=>FieldEditor.getSourceContext().worldPreview===true)&&await page.locator('#connected-preview').isEnabled(),report?.runtimeRevision);
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
    {id:'forester',container:'forester_c1',position:[-2.15,0,-.65],pose:[-140,.75,-40],degrees:37,upperFixture:[1.25,3.2,-2.9]},
    {id:'station',container:'station_c0',position:[-4.1,0,-2.6],pose:[-160,1.5,-145],degrees:-28},
   ]){
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+'editor/?building='+spec.id);await page.waitForFunction(id=>window.FieldEditor?.ready()&&FieldEditor.getDocument().buildingId===id,spec.id,{timeout:120000});
    let landingProof=null;
    if(spec.id==='station'){
     const originalUpper=await page.evaluate(()=>FieldEditor.getDocument().objects.find(o=>o.id==='upper'));
     await page.locator('#hierarchy [data-id="upper"]').click();
     await page.locator('#resize-anchor').selectOption('-1');
     const depth=page.locator('[data-field="size"][data-axis="2"]');await depth.fill('7.4');await depth.press('Tab');
     await page.waitForFunction(()=>!FieldEditor.info().updating&&FieldEditor.getDocument().objects.find(o=>o.id==='upper').size[2]===7.4);
     const resizedUpper=await page.evaluate(()=>FieldEditor.getDocument().objects.find(o=>o.id==='upper'));
     check('station one-sided upper-floor resize keeps its front edge fixed and removes the rear strip',Math.abs(resizedUpper.position[2]+resizedUpper.size[2]/2-originalUpper.position[2]-originalUpper.size[2]/2)<1e-8&&Math.abs(resizedUpper.position[2]-resizedUpper.size[2]/2+3.05)<1e-8&&resizedUpper.size[2]===7.4,{before:originalUpper,after:resizedUpper});
     await page.locator('#hierarchy [data-id="stairs-main"]').click();
     if(!await page.locator('#interior-tools').evaluate(node=>node.open))await page.locator('#interior-tools > summary').click();
     const section=page.locator('#interior-tools details').filter({has:page.locator('summary',{hasText:'Wall joints / stair landings'})});
     if(!await section.evaluate(node=>node.open))await section.locator('summary').first().click();
     await page.locator('#interior-landing-end').selectOption('top');await page.locator('#interior-landing-depth').fill('0.65');
     const beforeLanding=await page.evaluate(()=>FieldEditor.getDocument());
     await page.locator('[data-interior="landing"]').click();await page.waitForFunction(count=>!FieldEditor.info().updating&&FieldEditor.getDocument().objects.length===count+1,beforeLanding.objects.length);
     landingProof=await page.evaluate(async known=>{const {surfaceAt,blocked}=await import('./layout-core.js'),layout=FieldEditor.getDocument(),landing=layout.objects.find(o=>!known.includes(o.id)),without={...layout,objects:layout.objects.filter(o=>o.id!==landing.id)},[x,y,z]=landing.position;return {landing,without:surfaceAt(without,x,z,y),with:surfaceAt(layout,x,z,y),blocked:blocked(layout,x,z,y,{doorsOpen:true}),unique:new Set(layout.objects.map(o=>o.id)).size===layout.objects.length};},beforeLanding.objects.map(o=>o.id));
     check('station adds a unique concrete landing that alone supports the removed upper-floor strip',landingProof.unique&&landingProof.landing.type==='floor'&&near(landingProof.landing.position[2],-3.985)&&landingProof.without===0&&landingProof.with===3.2&&!landingProof.blocked,landingProof);
     await page.locator('#floor').selectOption('3.2');await page.locator('#cutaway').check();await page.locator('#top').click();await page.locator('#focus').click();
     await page.screenshot({path:path.join(out,'preview-station-new-landing-editor.png')});
     await page.locator('#floor').selectOption('all');await page.locator('#perspective').click();
    }
    await page.locator('#hierarchy [data-id="container-'+spec.container+'"]').click();
    for(let i=0;i<3;i++){
     const field=page.locator('[data-field="position"][data-axis="'+i+'"]');
     if(Number(await field.inputValue())===spec.position[i])continue;
     await field.fill(String(spec.position[i]));await field.press('Tab');
     await page.waitForFunction(({id,axis,value})=>{const raw=localStorage.getItem('field-signal-editor-v1:'+id);return raw&&Math.abs(JSON.parse(raw).objects.find(o=>o.binding?.id===FieldEditor.getSelection().replace('container-','')).position[axis]-value)<1e-8;},{id:spec.id,axis:i,value:spec.position[i]});
    }
    check(spec.id+' numeric interior edit uses canonical local position',await page.evaluate(s=>FieldEditor.getDocument().objects.find(o=>o.binding?.id===s.container).position.every((n,i)=>Math.abs(n-s.position[i])<1e-8),spec),await page.evaluate(s=>FieldEditor.getDocument().objects.find(o=>o.binding?.id===s.container).position,spec));
    await page.locator('a[href="editor/world.html"]').first().click();await page.waitForFunction(()=>window.FieldWorldEditor?.ready(),null,{timeout:120000});
    check(spec.id+' world view preserves selected whole building',await page.evaluate(id=>FieldWorldEditor.getSelection()?.id===id,spec.id));
    await page.locator('[data-world-field="foundation"]').selectOption('manual');
    for(const [key,value]of [['x',spec.pose[0]],['y',spec.pose[1]],['z',spec.pose[2]],['yaw',spec.degrees]]){
     const field=page.locator('[data-world-field="'+key+'"]');await field.fill(String(value));await field.press('Tab');
    }
    await page.locator('#focus-selected').click();await page.screenshot({path:path.join(out,'preview-'+spec.id+'-world.png')});
    await page.locator('#open-interior').click();await page.waitForFunction(id=>window.FieldEditor?.ready()&&FieldEditor.getDocument().buildingId===id,spec.id,{timeout:120000});
    check(spec.id+' focused view keeps local transform and selection after world move',await page.evaluate(s=>FieldEditor.getSelection()==='container-'+s.container&&FieldEditor.getDocument().objects.find(o=>o.binding?.id===s.container).position.every((n,i)=>Math.abs(n-s.position[i])<1e-8),spec));
    const doc=await page.evaluate(()=>FieldEditor.getWorldDocument());
    assert.equal(doc.format,'field-signal-world-document');
    const download=page.waitForEvent('download');await page.locator('#export-world').click();const file=await download;
    const exportPath=path.join(out,'preview-'+spec.id+'-world.json');await file.saveAs(exportPath);assert.deepEqual(JSON.parse(fs.readFileSync(exportPath,'utf8')),doc);
    await page.locator('#json-file').setInputFiles(exportPath);await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('imported into the connected session'));
    await page.reload();await page.waitForFunction(()=>window.FieldEditor?.ready(),null,{timeout:120000});
    assert.deepEqual(await page.evaluate(()=>FieldEditor.getWorldDocument()),doc);check(spec.id+' canonical JSON export/import/reload keeps complete design',true);
    await page.screenshot({path:path.join(out,'preview-'+spec.id+'-interior-editor.png')});
    const popup=context.waitForEvent('page');await page.locator('#connected-preview').click();const game=await popup;activePage=game;observe(game);
    await game.setViewportSize({width:844,height:500});await game.bringToFront();await page.close();
    async function start(){await game.locator('#load-world').click();await game.locator('#silent:enabled').waitFor({timeout:240000});await game.locator('#silent').click();await game.evaluate(()=>{const w=FieldSignal3D.getWorld();w.setQuality('low');w.renderSettings.shadows=false;w.renderer.shadowMap.enabled=false;w.renderer.setPixelRatio(.3);w.resize();});}
    await start();
    // Import once before polling. waitForFunction predicates stay synchronous
    // so a pending Promise can never be mistaken for an arrived player.
    await game.evaluate(async()=>{const {toLocal}=await import('./world-document.js');window.__fieldEditorTestLocal=p=>toLocal(FieldSignal3D.getInfo().editorPreview.transform,[p.x,p.y,p.z]);});
    const info=await game.evaluate(()=>FieldSignal3D.getInfo().editorPreview);
    check(spec.id+' actual runtime composes moved/rotated/raised parent exactly once',info.versioned&&near(info.transform.position[0],spec.pose[0])&&near(info.transform.position[1],spec.pose[1])&&near(info.transform.position[2],spec.pose[2])&&near(info.transform.yaw,spec.degrees*Math.PI/180),info);
    const geometry=await game.evaluate(async s=>{const {toWorld}=await import('./world-document.js'),world=FieldSignal3D.getWorld(),transform=world.data?.editorBuilding?.transform||FieldSignal3D.getInfo().editorPreview.transform,expected=toWorld(transform,s.position),mesh=world.containerMeshes[s.container].group;return {expected,actual:mesh.position.toArray(),spawn:FieldSignal3D.getPlayer()};},spec);
    check(spec.id+' rendered container agrees with canonical transformed position',geometry.expected.every((n,i)=>near(n,geometry.actual[i])),geometry);
    async function face(id){
     const name=await game.evaluate(async id=>{const world=FieldSignal3D.getWorld(),p=FieldSignal3D.getPlayer(),it=world.interact.find(i=>i.id===id);if(!it)throw Error('Missing runtime interaction '+id);
      // The semantic workbench's logical anchor is between its drawer pedestal
      // and legs. Aim at a real moving drawer/door mesh, as a player would,
      // instead of expecting an empty point to receive a geometry raycast.
      let target=it.anchor;if(it.type==='container'){const T=await import('./vendor/three.js');world.scene.updateMatrixWorld(true);let part;it.obj.userData.searchPropModel?.traverse(node=>{if(!part&&node.userData.searchMotion)part=node;});target=new T.Box3().setFromObject(part||it.obj).getCenter(new T.Vector3());}
      const dx=target.x-p.x,dz=target.z-p.z;FieldSignal3D.getInput().look(-Math.atan2(dx,-dz)-p.yaw,Math.atan2(target.y-p.y-1.67,Math.hypot(dx,dz))-p.pitch);return it.name;},id);
     await game.waitForFunction(id=>FieldSignal3D.getWorld().select()?.id===id,id,{timeout:30000});await game.waitForFunction(name=>document.querySelector('#target strong').textContent===name,name,{timeout:30000});
    }
    await face(spec.id);await game.keyboard.press('KeyE');await game.waitForFunction(id=>FieldSignal3D.getState().doors[id],spec.id,{timeout:30000});
    await game.evaluate(yaw=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(yaw-p.yaw,-p.pitch);},spec.degrees*Math.PI/180);
    await game.keyboard.down('KeyW');try{await game.waitForFunction(()=>window.__fieldEditorTestLocal(FieldSignal3D.getPlayer())[2]<FieldSignal3D.getWorld().layoutPreview.doc.bounds[1]/2-1.1,null,{timeout:90000});}finally{await game.keyboard.up('KeyW');}
    const entered=await game.evaluate(()=>({player:FieldSignal3D.getPlayer(),local:window.__fieldEditorTestLocal(FieldSignal3D.getPlayer()),depth:FieldSignal3D.getWorld().layoutPreview.doc.bounds[1]}));
    check(spec.id+' real Use opens door and keyboard crosses raised rotated entrance',near(entered.player.y,spec.pose[1])&&entered.local[2]<entered.depth/2-1.1,entered);
    await game.screenshot({path:path.join(out,'preview-'+spec.id+'-door.png')});
    // Position through the supported save importer to isolate each physical
    // collision/reach test. Movement and Use after positioning are real input.
    // Search staging uses each authored model's front-facing binding, not a
    // fixed map axis that can miss a rotated low or wall-mounted prop.
    async function restoreLocal(position,yaw=0){
     let state=await game.evaluate(()=>FieldSignal3D.getState());const player=await game.evaluate(async({position,yaw})=>{const {toWorld}=await import('./world-document.js'),t=FieldSignal3D.getInfo().editorPreview.transform,[x,y,z]=toWorld(t,position);return {x,y,z,yaw:t.yaw+yaw,pitch:0};},{position,yaw});state.player=player;
     await game.evaluate(()=>FieldSignal3D.openPanel('saves'));await game.locator('#file-input').setInputFiles({name:'preview-position-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});await game.locator('[data-cmd="restore"]').click();await game.waitForFunction(p=>Math.abs(FieldSignal3D.getPlayer().x-p.x)<.025&&Math.abs(FieldSignal3D.getPlayer().z-p.z)<.025,player);await game.locator('#close-panel').click();
    }
    const authoredLayout=doc.interiors.find(d=>d.buildingId===spec.id),stairs=authoredLayout.objects.find(o=>o.type==='stairs');
    if(stairs){
     await restoreLocal([stairs.position[0],stairs.position[1],stairs.position[2]+stairs.size[2]/2-.05],stairs.yaw);
     await game.keyboard.down('KeyW');try{await game.waitForFunction(y=>FieldSignal3D.getPlayer().y>=y-.025,spec.pose[1]+stairs.position[1]+stairs.size[1],{timeout:90000});}finally{await game.keyboard.up('KeyW');}
     check(spec.id+' keyboard physically ascends transformed stairs to upper floor',near((await game.evaluate(()=>FieldSignal3D.getPlayer())).y,spec.pose[1]+3.2));
     if(landingProof){
      // Continue from the actual stair ascent. There is no restore or placement
      // between the ramp and this newly authored physical landing.
      await game.keyboard.down('KeyW');try{await game.waitForFunction(z=>window.__fieldEditorTestLocal(FieldSignal3D.getPlayer())[2]<=z+.025&&window.__fieldEditorTestLocal(FieldSignal3D.getState().player)[2]<=z+.025,landingProof.landing.position[2],{timeout:30000});}finally{await game.keyboard.up('KeyW');}
      await game.waitForFunction(y=>Math.abs(FieldSignal3D.getState().player.y-y)<.025,spec.pose[1]+3.2,{timeout:10000});
      const arrived=await game.evaluate(async id=>{const {toLocal}=await import('./world-document.js'),p=FieldSignal3D.getPlayer(),t=FieldSignal3D.getInfo().editorPreview.transform,layout=FieldSignal3D.getWorld().layoutPreview.doc;const worker=FieldSignal3D.getState().player;return {local:toLocal(t,[p.x,p.y,p.z]),workerLocal:toLocal(t,[worker.x,worker.y,worker.z]),player:p,worker,landing:layout.objects.find(o=>o.id===id)};},landingProof.landing.id);
      check('station continuously walks from the stairs onto its new physical landing with matching worker height',near(arrived.player.y,spec.pose[1]+3.2)&&near(arrived.worker.y,spec.pose[1]+3.2)&&arrived.local[2]<-3.85&&arrived.workerLocal[2]<-3.85&&arrived.landing?.type==='floor',arrived);
      await game.evaluate(yaw=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(yaw+Math.PI-p.yaw,-.5-p.pitch);},spec.degrees*Math.PI/180);
      await game.screenshot({path:path.join(out,'preview-station-new-landing-game.png')});
     }
     await game.evaluate(yaw=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(yaw+Math.PI-p.yaw,-.55-p.pitch);},spec.degrees*Math.PI/180);
     await game.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     await game.screenshot({path:path.join(out,'preview-'+spec.id+'-stairs.png')});
     await restoreLocal(spec.upperFixture||[0,3.2,0],0);const prior=await game.evaluate(()=>FieldSignal3D.getPlayer());await game.keyboard.down('KeyW');try{await game.waitForFunction(p=>Math.hypot(FieldSignal3D.getPlayer().x-p.x,FieldSignal3D.getPlayer().z-p.z)>.7,prior,{timeout:30000});}finally{await game.keyboard.up('KeyW');}
     check(spec.id+' upper-floor keyboard movement retains parent plus floor height',near((await game.evaluate(()=>FieldSignal3D.getPlayer())).y,spec.pose[1]+3.2));
    }
    const authoredContainer=authoredLayout.objects.find(o=>o.binding?.id===spec.container);
    // Stage in front of the authored binding. The Forester edit stays near
    // its approved workbench location, with a clear view of its real drawer.
    // The canonical collision query rejects a staging point inside furniture.
    const searchFixture=await game.evaluate(async({layout,o,standOff,lateral})=>{const {bindingAnchor,blocked}=await import('./layout-core.js'),a=bindingAnchor(o),p=[a[0]+Math.sin(o.yaw)*standOff+Math.cos(o.yaw)*lateral,o.binding.floor??o.position[1],a[2]+Math.cos(o.yaw)*standOff-Math.sin(o.yaw)*lateral];if(blocked(layout,p[0],p[2],p[1],{doorsOpen:true}))throw Error('Search fixture intersects an authored collider for '+o.id);return p;},{layout:authoredLayout,o:authoredContainer,standOff:spec.searchStandOff||1.55,lateral:spec.searchLateral||0});
    await restoreLocal(searchFixture);await face(spec.container);await game.keyboard.press('KeyE');await game.waitForFunction(id=>!!FieldSignal3D.getState().containers[id],spec.container,{timeout:30000});
    check(spec.id+' real Use searches relocated bound container',!!(await game.evaluate(id=>FieldSignal3D.getState().containers[id],spec.container)));
    await game.screenshot({path:path.join(out,'preview-'+spec.id+'-search.png')});await game.locator('#close-panel').click();
    if(spec.id==='hut'){
     check('Mission-critical recorder survives moved container authoring',await game.evaluate(()=>FieldSignal3D.getState().containers.hut_c1.items.recorder>=1));
     await game.locator('#open-atlas10').click();await game.locator('[data-atlas="target"]').click();
     const camera=await game.evaluate(()=>({x:FieldSignal3D.getAtlas().camera.cx,z:FieldSignal3D.getAtlas().camera.cz}));
     // Independently compose the authored binding's front offset and parent pose;
     // an interaction target can differ from its visible mesh origin.
     const a=authoredContainer.binding.anchor||[0,Math.min(.8,authoredContainer.size[1]/2),0],childC=Math.cos(authoredContainer.yaw),childS=Math.sin(authoredContainer.yaw),localX=authoredContainer.position[0]+a[0]*childC+a[2]*childS,localZ=authoredContainer.position[2]-a[0]*childS+a[2]*childC,parentC=Math.cos(spec.degrees*Math.PI/180),parentS=Math.sin(spec.degrees*Math.PI/180),expectedTarget={x:spec.pose[0]+localX*parentC+localZ*parentS,z:spec.pose[2]-localX*parentS+localZ*parentC};
     check('Actual Atlas objective targets the moved mission cupboard',near(camera.x,expectedTarget.x)&&near(camera.z,expectedTarget.z),{expected:expectedTarget,actual:camera});await game.screenshot({path:path.join(out,'preview-hut-atlas.png')});await game.locator('#close-panel').click();
    }
    assert.deepEqual(await protectedState(game),expected);check(spec.id+' campaign/settings/journal/book stay isolated',true);
    await game.locator('#editor-preview-banner a').click();await game.waitForFunction(()=>window.FieldWorldEditor?.ready(),null,{timeout:120000});
    assert.deepEqual(await game.evaluate(()=>FieldWorldEditor.getWorldDocument()),doc);check(spec.id+' return recovers exact canonical authoring document',true);
    page=game;
   }
  check('No browser exceptions or failed asset/module requests',errors.length===0&&missing.length===0,{errors,missing});await context.close();
 }catch(error){checks.push({failure:error.stack});if(activePage&&!activePage.isClosed()){const state=await activePage.evaluate(()=>({url:location.href,editor:window.FieldEditor?.info(),world:window.FieldWorldEditor?.info(),game:window.FieldSignal3D?.getInfo(),player:window.FieldSignal3D?.getPlayer(),selection:window.FieldSignal3D?.getWorld().select()?.id,anchors:window.FieldSignal3D?.getWorld().interact.filter(i=>['container','door'].includes(i.type)).map(i=>({id:i.id,type:i.type,anchor:i.anchor,visible:i.obj.visible}))})).catch(()=>null);fs.writeFileSync(path.join(out,'preview-integrated-failure-state.json'),JSON.stringify(state,null,2));await activePage.screenshot({path:path.join(out,'preview-integrated-failure.png'),timeout:120000}).catch(()=>{});}throw error;}
 finally{fs.writeFileSync(path.join(out,compat?'preview-compatibility-browser.json':'preview-integrated-browser.json'),JSON.stringify({kind:compat?'unmerged-runtime-compatibility-only':'canonical-dist',runtimeRevision:report?.runtimeRevision,source:JSON.parse(fs.readFileSync(path.join(dist,'world-source.json'),'utf8')),editorRelease:JSON.parse(fs.readFileSync(path.join(dist,'editor/release.json'),'utf8')),checks,errors,missing},null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
