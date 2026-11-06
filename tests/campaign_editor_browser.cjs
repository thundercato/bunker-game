/* Actual candidate editor -> authored-home game preview. No model/page fixture.
   Run after python3 tools/build.py; keep GPU suites sequential on SwiftShader. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const out=path.join(root,'test-results','campaign-editor');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.wasm':'application/wasm','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
 try{
  const relative=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/bunker-game\//,'');
  const file=path.resolve(dist,!relative?'index.html':relative.endsWith('/')?relative+'index.html':relative);
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end(relative);return;
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 }catch(error){res.writeHead(500);res.end(String(error));}
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=process.env.GAME_URL||`http://127.0.0.1:${server.address().port}/bunker-game/`;
 const results=[],errors=[],missing=[];let browser,editor,game,current;
 const check=(name,pass,detail)=>{
  results.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
  console.log(pass?'PASS':'FAIL',name,detail===undefined?'':JSON.stringify(detail));assert.ok(pass,name);
 };
 const normal={
  'field-signal-dead-air-v9':'PROTECTED-NORMAL-CAMPAIGN-BYTES',
  'field-signal-dead-air-options':'{"music":0.23,"quality":"low","shadows":false}',
  'field-signal-v8-journal':'[{"text":"PROTECTED-V8-ENTRY"}]',
  'field-signal-v9-journal':'[{"text":"PROTECTED-V9-ENTRY","time":800,"zone":"base"}]',
  'field-signal-field-journal-v1':'{"format":"field-signal-journal/1","events":[],"notes":[{"id":"normal-note","text":"PROTECTED-NORMAL-BOOK","timestamp":800}]}',
 };
 async function preserved(page){return page.evaluate(expected=>Object.entries(expected).every(([key,value])=>localStorage.getItem(key)===value),normal);}
 async function screenshot(page,name){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:82,timeout:120000});
 }
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  // Keep editor controls at desktop CSS size while reducing its actual render area.
  const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:.5});
  context.on('page',page=>page.on('pageerror',error=>errors.push({url:page.url(),message:error.message})));
  context.on('response',response=>{if(response.status()>=400)missing.push({status:response.status(),url:response.url()});});
  await context.addInitScript(()=>{
   // Preview owns these settings. Set them before its real renderer is created;
   // never overwrite the protected normal-campaign settings.
   const id=new URL(location.href).searchParams.get('editorPreview');
   if(id)localStorage.setItem('field-signal-editor-options:'+id,JSON.stringify({quality:'low',shadows:false,reducedMotion:true,vegetation:false,on:false}));
  });
  editor=await context.newPage();current=editor;await editor.goto(base+'editor/');
  await editor.waitForFunction(()=>window.FieldEditor?.ready(),null,{timeout:180000});
  await editor.evaluate(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);},normal);
  await editor.locator('#building').selectOption('forester');
  await editor.waitForFunction(()=>FieldEditor.info().building==='forester'&&FieldEditor.getScene().doc.buildingId==='forester'&&document.querySelector('#loading').hidden,null,{timeout:120000});
  const editorInfo=await editor.evaluate(()=>FieldEditor.info());
  check('Building selector opens the 52-object authored Forester candidate',editorInfo.objects===52&&editorInfo.errors.length===0,editorInfo);
  const bindingIds=await editor.evaluate(()=>FieldEditor.getDocument().objects.filter(o=>o.binding?.type==='container').map(o=>o.binding.id).sort());
  check('All four original search containers and the physical loose surface remain bound',
   JSON.stringify(bindingIds)===JSON.stringify(['forester_c0','forester_c1','forester_c2','forester_kitchen'])&&
   await editor.evaluate(()=>FieldEditor.getDocument().objects.some(o=>o.binding?.type==='loose'&&o.binding.id==='forester_table')),bindingIds);
  const editorModels=await editor.evaluate(()=>{
   const layout=FieldEditor.getScene(),library=FieldEditor.getLibrary();
   const imported=layout.doc.objects.filter(o=>o.asset?.startsWith('campaign_')).map(o=>({id:o.id,asset:o.asset,
    loaded:library.loaded.has(o.asset),meshes:(()=>{let n=0;layout.objects.get(o.id).traverse(q=>{if(q.isMesh&&!q.material?.wireframe)n++;});return n;})()}));
   const semantic=layout.doc.objects.filter(o=>o.asset?.startsWith('search_')).map(o=>({id:o.id,asset:o.asset,
    rendered:layout.objects.get(o.id).userData.searchPropModel?.userData.searchProp?.id}));
   return {imported,semantic,errors:[...layout.errors,...library.errors]};
  });
  check('Editor renders actual Kenney furnishings and semantic search models without wireframe fallbacks',
   editorModels.imported.length>=15&&editorModels.imported.every(o=>o.loaded&&o.meshes>0)&&
   editorModels.semantic.length>=4&&editorModels.semantic.every(o=>o.rendered===o.asset)&&!editorModels.errors.length,editorModels);
  await editor.locator('#library-tab').click();await editor.getByRole('button',{name:'Storage',exact:true}).click();
  await editor.waitForFunction(()=>{
   const cards=[...document.querySelectorAll('#asset-list [data-asset^="search_"]')];
   return cards.length===69&&cards.every(card=>{const img=card.querySelector('img');return img?.complete&&img.naturalWidth>0;});
  },null,{timeout:120000});
  check('All 69 searchable catalogue variants have decoded real thumbnails',await editor.locator('#asset-list [data-asset^="search_"] img').count()===69);
  await editor.locator('#objects-tab').click();
  await editor.locator('#hierarchy [data-id="container-forester_c0"]').click();
  await editor.locator('[data-field="position"][data-axis="2"]').fill('-3.3');
  await editor.locator('[data-field="position"][data-axis="2"]').press('Tab');
  await editor.waitForFunction(()=>Math.abs(FieldEditor.getScene().objects.get('container-forester_c0').position.z+3.3)<.001&&document.querySelector('#scene-status').textContent.includes('52 objects'));
  check('Numeric cupboard edit preserves its ID, catalogue anchor and original physical floor',await editor.evaluate(()=>{
   const o=FieldEditor.getDocument().objects.find(o=>o.id==='container-forester_c0');
   return o.binding.id==='forester_c0'&&o.binding.floor===0&&o.binding.anchor.length===3&&o.position[1]===1.38&&o.position[2]===-3.3;
  }));
  await editor.locator('#save').click();
  const draft=await editor.evaluate(()=>JSON.parse(localStorage.getItem('field-signal-editor-v1:forester')));
  check('Edited authored home saves only to its independent editor draft',draft.objects.length===52&&draft.objects.find(o=>o.binding?.id==='forester_c0').position[2]===-3.3&&await preserved(editor));
  const download=editor.waitForEvent('download');await editor.locator('#export').click();
  await(await download).saveAs(path.join(out,'forester-export.json'));
  const exported=JSON.parse(fs.readFileSync(path.join(out,'forester-export.json'),'utf8'));
  check('Portable export retains new furniture assets and the edited search binding',exported.format==='field-signal-layout'&&exported.objects.length===52&&
   exported.objects.some(o=>o.asset==='campaign_toilet')&&exported.objects.some(o=>o.asset==='search_tool_workbench')&&
   exported.objects.find(o=>o.binding?.id==='forester_c0').position[2]===-3.3);
  await editor.locator('#cutaway').check();await editor.locator('#floor').selectOption('0');
  await screenshot(editor,'forester-editor-ground');await editor.locator('#floor').selectOption('3.2');
  await screenshot(editor,'forester-editor-upper');
  fs.writeFileSync(path.join(out,'editor-models.json'),JSON.stringify({info:editorInfo,models:editorModels},null,2));

  await editor.locator('#game-test:enabled').waitFor({timeout:120000});
  const popup=context.waitForEvent('page');await editor.locator('#game-test').click();game=await popup;current=game;
  await game.setViewportSize({width:844,height:500});await game.bringToFront();
  // Release the editor's WebGL context before starting the full world renderer.
  await editor.close();await game.waitForLoadState('domcontentloaded');
  const previewId=new URL(game.url()).searchParams.get('editorPreview');
  check('Test in game opens a genuine isolated editor-preview URL',/^[a-f0-9-]{36}$/.test(previewId||''),game.url());
  await game.locator('#load-world').click();await game.locator('#silent:enabled').waitFor({timeout:240000});await game.locator('#silent').click();
  await game.evaluate(()=>{const w=FieldSignal3D.getWorld();w.setQuality('low');w.renderSettings.shadows=false;w.renderer.shadowMap.enabled=false;w.renderer.setPixelRatio(.35);w.resize();});
  const preview=await game.evaluate(()=>FieldSignal3D.getInfo());
  check('Real Python/WebGL preview loads all 52 edited home objects',preview.editorPreview?.building==='forester'&&preview.editorPreview.objects===52&&!preview.editorPreview.errors.length&&
   await game.evaluate(()=>FieldSignal3D.getReady()&&FieldSignal3D.getState().zone==='field'&&Math.abs(FieldSignal3D.getPlayer().x+30)<.02&&Math.abs(FieldSignal3D.getPlayer().z+53.1)<.02),preview.editorPreview);
  const gameModels=await game.evaluate(()=>{
   const w=FieldSignal3D.getWorld(),layout=w.layoutPreview;
   return {objects:layout.objects.size,errors:[...layout.errors,...w.library.errors,...(w.assetErrors||[]),...(w.overgrowthErrors||[])],
    licensed:layout.doc.objects.filter(o=>o.asset?.startsWith('campaign_')).map(o=>({id:o.id,asset:o.asset,loaded:w.library.loaded.has(o.asset)})),
    semantic:layout.doc.objects.filter(o=>o.asset?.startsWith('search_')).map(o=>({id:o.id,rendered:layout.objects.get(o.id).userData.searchPropModel?.userData.searchProp?.id,asset:o.asset})),
    cupboard:w.containerMeshes.forester_c0.group.position.toArray(),
    bindings:['forester_c0','forester_c1','forester_c2','forester_kitchen'].map(id=>({id,interactions:w.interact.filter(i=>i.type==='container'&&i.id===id).length}))};
  });
  check('Preview resolves new licensed model paths, semantic props and each original interaction once',gameModels.objects===52&&!gameModels.errors.length&&
   gameModels.licensed.length>=15&&gameModels.licensed.every(o=>o.loaded)&&gameModels.semantic.every(o=>o.rendered===o.asset)&&
   gameModels.bindings.every(o=>o.interactions===1),gameModels);
  check('Edited cupboard mesh reaches its exported world coordinates once',Math.abs(gameModels.cupboard[0]+34.69)<.01&&Math.abs(gameModels.cupboard[1]-1.38)<.01&&Math.abs(gameModels.cupboard[2]+62.3)<.01,gameModels.cupboard);
  check('Normal campaign, options, legacy entries and structured book survive preview startup byte-for-byte',await preserved(game));

  async function face(id){
   await game.evaluate(id=>{
    const w=FieldSignal3D.getWorld(),p=FieldSignal3D.getPlayer(),it=w.interact.find(i=>i.id===id);
    if(!it)throw Error('Missing authored interaction '+id);const dx=it.anchor.x-p.x,dz=it.anchor.z-p.z;
    FieldSignal3D.getInput().look(-Math.atan2(dx,-dz)-p.yaw,Math.atan2(it.anchor.y-p.y-1.67,Math.hypot(dx,dz))-p.pitch);
   },id);await game.waitForFunction(id=>FieldSignal3D.getWorld().select()?.id===id,id,{timeout:30000});
  }
  async function move(key,predicate){await game.keyboard.down(key);try{await game.waitForFunction(predicate,null,{timeout:90000});}finally{await game.keyboard.up(key);}}
  await face('forester');await game.keyboard.press('KeyE');await game.waitForFunction(()=>FieldSignal3D.getState().doors.forester);
  await game.evaluate(()=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(-p.yaw,-p.pitch);});
  await move('KeyW',()=>FieldSignal3D.getPlayer().z<-55.4);
  check('Actual Use and keyboard movement open and enter the authored house',await game.evaluate(()=>FieldSignal3D.getPlayer().z<-55.4&&Math.abs(FieldSignal3D.getPlayer().y)<.02));
  await screenshot(game,'forester-preview-interior');
  await move('KeyW',()=>FieldSignal3D.getPlayer().z<-57.9);await move('KeyA',()=>FieldSignal3D.getPlayer().x<-33.6);
  await face('forester_c2');await game.keyboard.press('KeyE');
  await game.waitForFunction(()=>!!FieldSignal3D.getState().containers.forester_c2,null,{timeout:30000});
  check('Retained wardrobe performs a real Python search through Use input',await game.evaluate(()=>!!FieldSignal3D.getState().containers.forester_c2));
  await game.locator('#close-panel').click();
  await game.locator('#open-journal').click();await game.waitForFunction(()=>FieldSignal3D.getJournal()?.node&&FieldSignal3D.getJournal().info().mode==='2d');
  const journalKeys=await game.evaluate(()=>({book:FieldSignal3D.getJournal().store.storageKey,legacy:FieldSignal3D.getJournal().store.legacyKey}));
  check('Actual journal uses this preview’s own structured and legacy storage keys',journalKeys.book==='field-signal-editor-book:'+previewId&&journalKeys.legacy==='field-signal-editor-journal:'+previewId,journalKeys);
  await game.locator('[data-section="personal"]').click();await game.locator('.field-journal textarea').fill('Preview note: Forester landing inspected.');
  await game.locator('[data-journal="note"]').click();
  const savedBook=await game.evaluate(key=>JSON.parse(localStorage.getItem(key)),journalKeys.book);
  check('Journal note persists in the preview book without importing normal-campaign notes',savedBook.format==='field-signal-journal/1'&&
   savedBook.notes.some(n=>n.text==='Preview note: Forester landing inspected.')&&!savedBook.notes.some(n=>n.text==='PROTECTED-NORMAL-BOOK'));
  await screenshot(game,'forester-preview-journal');await game.locator('[data-journal="close"]').click();
  check('Preview save and search journal persist under the preview ID',await game.evaluate(id=>{
   const save=JSON.parse(localStorage.getItem('field-signal-editor-game:'+id)||'null');
   const legacy=JSON.parse(localStorage.getItem('field-signal-editor-journal:'+id)||'null');
   return !!save?.containers?.forester_c2&&Array.isArray(legacy)&&legacy.length>0;
  },previewId));
  check('Normal save, options and both journal formats remain byte-identical after actual preview play',await preserved(game));
  fs.writeFileSync(path.join(out,'preview-models.json'),JSON.stringify({info:preview,models:gameModels,journalKeys},null,2));
  check('No editor/preview exceptions or missing runtime assets',!errors.length&&!missing.length,{errors,missing});
 }catch(error){
  results.push({failure:error.stack});
  if(current&&!current.isClosed()){
   const state=await current.evaluate(()=>({url:location.href,boot:document.querySelector('#boot')?.textContent,
    editor:window.FieldEditor?.info(),game:window.FieldSignal3D?.getInfo(),player:window.FieldSignal3D?.getPlayer()})).catch(()=>null);
   fs.writeFileSync(path.join(out,'failure-state.json'),JSON.stringify(state,null,2));
   await current.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:75,timeout:120000}).catch(()=>{});
  }
  throw error;
 }finally{
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({results,errors,missing,
   environment:'Linux Chromium / SwiftShader; actual built candidate, not a physical Apple-device benchmark'},null,2));
  await browser?.close();await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
