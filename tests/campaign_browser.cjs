/* Actual candidate game: journal, furnished traversal, cargo/crane, combat and persistence. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),out=path.join(root,'test-results/campaign');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let relative=new URL(req.url,'http://x').pathname.replace(/^\/bunker-game\//,'');const file=path.resolve(dist,!relative?'index.html':relative.endsWith('/')?relative+'index.html':relative);if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;const results=[],errors=[],missing=[];
 const check=(name,pass,detail)=>{results.push({name,pass:!!pass,detail});console.log(pass?'PASS':'FAIL',name,detail?JSON.stringify(detail):'');assert.ok(pass,name);};
 try{
  const fixture=JSON.parse(execFileSync('python3',['-c','import engine,json;s=engine.new_game();s["credits"]=1267;s["bag"]["wire"]=3;print(json.dumps(s))'],{cwd:path.join(root,'site'),encoding:'utf8'}));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1024,height:600}});page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push([r.status(),r.url()]);});
  await page.addInitScript(fixture=>{
   if(!localStorage.getItem('candidate-seeded')){localStorage.setItem('field-signal-dead-air-v9',JSON.stringify(fixture));localStorage.setItem('field-signal-v9-journal','[{"text":"Preserved older expedition","time":800,"zone":"base"}]');localStorage.setItem('field-signal-dead-air-options',JSON.stringify({quality:'low',shadows:false}));localStorage.setItem('candidate-seeded','yes');}
   window.testPads=[];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>testPads});
  },fixture);
  const base=process.env.GAME_URL||`http://127.0.0.1:${server.address().port}/bunker-game/`;
  await page.goto(base);await page.locator('#load-world').click();await page.locator('#begin:enabled').waitFor({timeout:240000});await page.locator('#begin').click();
  await page.waitForFunction(()=>FieldSignal3D.getSound().ctx?.state==='running');
  await page.evaluate(()=>{const w=FieldSignal3D.getWorld();w.renderer.setPixelRatio(.35);w.resize();});
  const info=await page.evaluate(()=>FieldSignal3D.getInfo());
  check('Candidate boots real Python, original features and all new scene assets',info.campaign?.scenes===4&&info.campaign.searchCatalogue===69&&info.campaign.placedSearchVariants>=50&&!info.campaign.errors.length&&!info.assetErrors.length&&!info.overgrowthErrors.length,info.campaign);
  check('Existing schema-9 credits and inventory continue unchanged',await page.evaluate(()=>FieldSignal3D.getState().version===9&&FieldSignal3D.getState().credits===1267&&FieldSignal3D.getState().bag.wire===3));
  check('New dock searches retain all original container IDs',info.containers===143);
  check('Calmer Relay Lanterns soundtrack is retained and decodes',await page.evaluate(async()=>Math.abs((await FieldSignal3D.getSound().load('base')).duration-128)<1));
  await page.screenshot({path:path.join(out,'refuge.jpg'),type:'jpeg',quality:85});
  async function image(name){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));fs.writeFileSync(path.join(out,name+'-pose.json'),JSON.stringify(await page.evaluate(()=>({player:FieldSignal3D.getPlayer(),camera:FieldSignal3D.getWorld().camera.position,info:FieldSignal3D.getInfo()})),null,2));await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:85,timeout:120000});}
  async function setPose(x,z,yaw=0,pitch=0,y=null,edit=null){
   const s=await page.evaluate(()=>FieldSignal3D.getState());const floor=y??await page.evaluate(async({x,z})=>(await import('./terrain.js')).surfaceHeight(x,z),{x,z});s.player={x,z,y:floor,yaw,pitch};s.zone=x<-450?'base':'field';for(const e of s.enemies)e.health=0;if(edit)edit(s);
   await page.evaluate(()=>FieldSignal3D.openPanel('saves'));await page.locator('#file-input').setInputFiles({name:'candidate-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.locator('[data-cmd="restore"]').click();await page.waitForFunction(x=>Math.abs(FieldSignal3D.getPlayer().x-x)<.02,x);await page.locator('#close-panel').click();
  }
  async function face(id){
   // Climb commands commit the worker's endpoint before their visible animation
   // finishes. Looking while input is paused is deliberately ignored by the game.
   await page.waitForFunction(()=>!FieldSignal3D.getInput().paused,null,{timeout:30000});
   await page.evaluate(async id=>{const w=FieldSignal3D.getWorld(),p=FieldSignal3D.getPlayer(),it=w.interact.find(q=>q.id===id);if(!it)throw Error('Missing interaction '+id);const T=await import('./vendor/three.js');w.scene.updateMatrixWorld(true);const target=it.type==='container'?new T.Box3().setFromObject(it.obj).getCenter(new T.Vector3()):it.anchor,dx=target.x-p.x,dz=target.z-p.z;FieldSignal3D.getInput().look(-Math.atan2(dx,-dz)-p.yaw,Math.atan2(target.y-p.y-1.67,Math.hypot(dx,dz))-p.pitch);},id);
   try{await page.waitForFunction(id=>FieldSignal3D.getWorld().select()?.id===id,id,{timeout:30000});}catch(error){const probe=await page.evaluate(id=>{const w=FieldSignal3D.getWorld(),it=w.interact.find(q=>q.id===id);w.rayAt();const describe=h=>({distance:h.distance,point:h.point,object:h.object.name,data:{...h.object.userData,interact:h.object.userData.interact?.id}});return{player:FieldSignal3D.getPlayer(),worker:FieldSignal3D.getState().player,inputPaused:FieldSignal3D.getInput().paused,interaction:{id:it.id,anchor:it.anchor,visible:w.visible(it.obj)},selected:w.select()?.id,hits:w.ray.intersectObject(it.obj,true).map(describe).slice(0,6),occluders:w.ray.intersectObjects(w.activeOccluders(),false).slice(0,6).map(describe)};},id);console.log('RAY_PROBE',JSON.stringify(probe));fs.writeFileSync(path.join(out,id.replace(/[^\w.-]+/g,'-')+'-ray.json'),JSON.stringify(probe,null,2));throw error;}
  }
  async function move(key,predicate,timeout=60000){await page.keyboard.down(key);try{await page.waitForFunction(predicate,null,{timeout});}finally{await page.keyboard.up(key);}}
  async function climbFinished(route){
   await page.waitForFunction(to=>{const player=FieldSignal3D.getPlayer(),worker=FieldSignal3D.getState().player;return !FieldSignal3D.getInput().paused&&['x','y','z'].every(axis=>Math.abs(player[axis]-to[axis])<.02&&Math.abs(worker[axis]-to[axis])<.02);},route.to,{timeout:30000});
   console.log('Completed real Use route',route.id,JSON.stringify(await page.evaluate(()=>({player:FieldSignal3D.getPlayer(),worker:FieldSignal3D.getState().player,inputPaused:FieldSignal3D.getInput().paused}))));
  }
  if(!process.argv.includes('--crane-only')){
  // Physical journal inside actual game, not the isolated component fixture.
  await page.locator('#open-journal').click();await page.waitForFunction(()=>FieldSignal3D.getJournal()?.info().mode==='2d');
  check('Low-quality game gets an accessible real-mission journal',await page.locator('.fj-left h3').textContent()==='First signal');
  const paused=await page.evaluate(()=>FieldSignal3D.getState().clock);await page.waitForTimeout(250);check('Journal pauses the real simulation',await page.evaluate(t=>Math.abs(FieldSignal3D.getState().clock-t)<.01,paused));
  await page.locator('[data-journal="close"]').click();await page.evaluate(()=>FieldSignal3D.openPanel('comfort'));await page.locator('[data-setting="quality"]').selectOption('balanced');await page.locator('#close-panel').click();await page.evaluate(()=>{const w=FieldSignal3D.getWorld();w.renderer.setPixelRatio(.35);w.resize();});await page.locator('#open-journal').click();await page.waitForFunction(()=>FieldSignal3D.getJournal().info().mode==='3d');await image('journal-3d-game');
  await page.locator('[data-section="reference"]').click();await page.locator('.fj-stage').focus();await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>FieldSignal3D.getJournal().turning&&FieldSignal3D.getJournal().pageGeometry.attributes.position.array.some((v,i)=>i%3===2&&v>.6));
  await page.evaluate(()=>cancelAnimationFrame(FieldSignal3D.getJournal().frame));await image('journal-page-turn-game');await page.evaluate(()=>FieldSignal3D.getJournal().finishTurn());
  check('Actual 3D paper deforms and completes a page turn',await page.evaluate(()=>FieldSignal3D.getJournal().info().turns>0&&FieldSignal3D.getJournal().info().page===1));
  await page.evaluate(()=>{testPads[2]={id:'Candidate standard controller',index:2,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))};});
  await page.waitForFunction(()=>FieldSignal3D.getInput().pad?.index===2);await page.evaluate(()=>testPads[2].buttons[5]={value:1,pressed:true});await page.waitForFunction(()=>FieldSignal3D.getJournal().info().page===2&&!FieldSignal3D.getJournal().info().turning);await page.evaluate(()=>testPads[2].buttons[5]={value:0,pressed:false});
  check('Real controller shoulder input turns the in-game journal',true);
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>FieldSignal3D.getJournal().select('active'));await image('journal-phone');
  check('Journal and mission buttons fit phone landscape',await page.evaluate(()=>{const a=document.querySelector('[data-journal="mission"][data-action="atlas"]').getBoundingClientRect();return a.bottom<=innerHeight&&a.top>=0&&document.documentElement.scrollHeight<=innerHeight;}));
  await page.locator('[data-journal="close"]').click();await page.evaluate(()=>testPads=[]);await page.waitForFunction(()=>FieldSignal3D.getInput().paused);await page.evaluate(()=>FieldSignal3D.closePanel());await page.evaluate(()=>FieldSignal3D.openPanel('comfort'));await page.locator('[data-setting="quality"]').selectOption('low');await page.locator('#close-panel').click();await page.evaluate(()=>{const w=FieldSignal3D.getWorld();w.renderer.setPixelRatio(.35);w.resize();});await page.setViewportSize({width:1024,height:600});
  // Actual displayed/spoken contact, then inspect the stored communications record.
  await setPose(-510,11.4);await face('trader');await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.querySelector('#panel-title').textContent.includes('quartermaster'));
  check('Journal records a conversation only after actual contact',await page.evaluate(()=>FieldSignal3D.getJournal().store.data.events.some(e=>e.category==='communications'&&e.source==='trade'&&e.payload.text==='Hello comrade. Take care in the zone.')));
  await page.locator('#close-panel').click();
  // Pick up and handle the actual starting weapon, then fire at a real enemy hitbox.
  await setPose(-486,29);await face('pistol');await page.keyboard.press('KeyE');await page.waitForFunction(()=>FieldSignal3D.getState().weapon.owned);
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>!!FieldSignal3D.getState().weapon.inserted);await page.keyboard.press('KeyC');await page.waitForFunction(()=>FieldSignal3D.getState().weapon.chamber===1);await page.keyboard.press('KeyV');await page.waitForFunction(()=>!FieldSignal3D.getState().weapon.safe);
  check('Real workbench pickup, magazine insertion, rack and safety controls work',true);
  await setPose(-5,-20,0,0,0,s=>{const e=s.enemies.find(e=>e.kind==='drifter'&&e.zone==='field');Object.assign(e,{x:-5,z:-24,y:0,health:100,home:[-5,-24],target:[-5,-24],mode:'patrol'});});
  await page.waitForTimeout(1000);const combatEnemy=await page.evaluate(()=>{const e=FieldSignal3D.getState().enemies.find(e=>e.health>0);return{id:e.id,health:e.health};});
  await page.evaluate(id=>{const e=FieldSignal3D.getState().enemies.find(e=>e.id===id),p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(-Math.atan2(e.x-p.x,-(e.z-p.z))-p.yaw,Math.atan2((e.y||0)+1.1-p.y-1.67,Math.hypot(e.x-p.x,e.z-p.z))-p.pitch);FieldSignal3D.getInput().aim=true;},combatEnemy.id);
  const shots=await page.evaluate(()=>FieldSignal3D.getState().stats.shots);await page.keyboard.press('KeyX');await page.waitForFunction(n=>FieldSignal3D.getState().stats.shots===n+1,shots);
  check('Actual keyboard fire consumes a round and damages the visible enemy',await page.evaluate(e=>FieldSignal3D.getState().enemies.find(q=>q.id===e.id).health<e.health,combatEnemy));await image('weapon-combat');
  // Refurbished cottage: enter, use the full stair run, cross its landing and return.
  await setPose(-30,-53.1);await face('forester');await page.keyboard.press('KeyE');await page.waitForFunction(()=>FieldSignal3D.getState().doors.forester);
  await page.evaluate(()=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(-p.yaw,-p.pitch);});
  await move('KeyW',()=>FieldSignal3D.getPlayer().z<-55.7);await move('KeyD',()=>FieldSignal3D.getPlayer().x>-26.6);
  await move('KeyW',()=>FieldSignal3D.getPlayer().z<-62.3,120000);
  check('Actual keyboard stairs reach the refurbished upper landing',await page.evaluate(()=>FieldSignal3D.getPlayer().y>3.15));
  await move('KeyA',()=>FieldSignal3D.getPlayer().x<-28.8);await page.evaluate(()=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(Math.PI/2-p.yaw,-.05-p.pitch);});await image('forester-upstairs');
  await page.evaluate(()=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(-p.yaw,-p.pitch);});await move('KeyD',()=>FieldSignal3D.getPlayer().x>-26.6);await move('KeyS',()=>FieldSignal3D.getPlayer().z>-55.5,120000);await move('KeyA',()=>FieldSignal3D.getPlayer().x<-29.9);await move('KeyS',()=>FieldSignal3D.getPlayer().z>-53.1);check('Actual keyboard return stairs and front entrance remain clear',await page.evaluate(()=>Math.abs(FieldSignal3D.getPlayer().y)<.03));
  await setPose(-29.3,-60.3,Math.PI/2,-.12,0);await image('forester-kitchen');
  await setPose(-8,-179,Math.PI/2,-.05);await image('village-street');
  await setPose(-96,-115,-Math.PI/2,-.04);await image('rail-crossing');
  await setPose(-55,-70,Math.PI/2,.07);await image('western-woodland');
  }
  // Useful cargo searches and an actual deliberate crane ascent/descent.
  await setPose(74.65,-149.7);await face('dock_cargo_1');await page.keyboard.press('KeyE');await page.waitForFunction(()=>!!FieldSignal3D.getState().containers.dock_cargo_1,null,{timeout:30000});
  check('Quayside inspection crate performs persistent actual loot search',true);await image('dock-cargo-search');await page.locator('#close-panel').click();
  await setPose(103,-148,-1.28,.38);await image('docks-crane');
  await setPose(109.4,-151,-Math.PI/2,0,0);const routes=await page.evaluate(async()=>{const{DATA}=await import('./world-campaign.js');return DATA.campaignGeometry.climbs;});
  for(const level of [4,8,12]){console.log('Climbing toward',level);
   const route=routes.find(r=>r.to.y===level&&r.to.y>r.from.y);
   // Landing station IDs are intentionally deduplicated; Use offers both directions.
   const station=await page.evaluate(()=>{const p=FieldSignal3D.getPlayer();return FieldSignal3D.getWorld().interact.filter(i=>i.type==='climb').sort((a,b)=>Math.hypot(a.anchor.x-p.x,a.anchor.y-p.y-.8,a.anchor.z-p.z)-Math.hypot(b.anchor.x-p.x,b.anchor.y-p.y-.8,b.anchor.z-p.z))[0].id;});
   await face(station);await page.keyboard.press('KeyE');
   if(level>4)await page.locator(`[data-ladder-route="${route.id}"]`).click();
   if(level===8){await page.waitForTimeout(350);await page.evaluate(()=>dispatchEvent(new Event('pagehide')));check('Closing during ladder animation saves the canonical safe landing',await page.evaluate(()=>JSON.parse(localStorage.getItem('field-signal-dead-air-v9')).player.y===8));}
   await climbFinished(route);
  }
  check('Crane climbs three real guarded landings through actual Use controls',await page.evaluate(()=>Math.abs(FieldSignal3D.getPlayer().y-12)<.02));
  await page.evaluate(()=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(-Math.PI/2-p.yaw,-p.pitch);});await move('KeyD',()=>FieldSignal3D.getPlayer().z>-149.65);await move('KeyW',()=>FieldSignal3D.getPlayer().x>111.15);await face('dock_crane_tools');await page.keyboard.press('KeyE');await page.waitForFunction(()=>!!FieldSignal3D.getState().containers.dock_crane_tools,null,{timeout:30000});
  check('Upper gantry tool case is physically searchable on its own floor',true);await page.locator('#close-panel').click();await image('crane-platform');
  const before=await page.evaluate(()=>FieldSignal3D.getPlayer());const guarded=await page.evaluate(p=>{const w=FieldSignal3D.getWorld();return w.movePlayer(p,-3,0);},before);
  check('Rail opening cannot accidentally drop the player off the platform',guarded.y>11.2);
  await page.evaluate(()=>{const p=FieldSignal3D.getPlayer();FieldSignal3D.getInput().look(-Math.PI/2-p.yaw,-p.pitch);});await move('KeyS',()=>FieldSignal3D.getPlayer().x<110.5);await move('KeyA',()=>FieldSignal3D.getPlayer().z<-150.95);
  for(const level of [8,4,0]){const route=routes.find(r=>r.to.y===level&&r.to.y<r.from.y);const station=await page.evaluate(()=>{const p=FieldSignal3D.getPlayer();return FieldSignal3D.getWorld().interact.filter(i=>i.type==='climb').sort((a,b)=>Math.hypot(a.anchor.x-p.x,a.anchor.y-p.y-.8,a.anchor.z-p.z)-Math.hypot(b.anchor.x-p.x,b.anchor.y-p.y-.8,b.anchor.z-p.z))[0].id;});await face(station);await page.keyboard.press('KeyE');if(level<8)await page.locator(`[data-ladder-route="${route.id}"]`).click();await climbFinished(route);}check('Crane returns through all three real down-ladder routes',await page.evaluate(()=>Math.abs(FieldSignal3D.getPlayer().y)<.02));
  // Actual domain expedition was generated by test_campaign.py, not fabricated rewards.
  const completedPath=path.join(root,'test-results/candidate-completed-mission.json');
  if(!fs.existsSync(completedPath))execFileSync('python3',['-m','unittest','discover','-s','site/tests','-p','test_campaign.py'],{cwd:root,stdio:'pipe'});
  await page.evaluate(()=>FieldSignal3D.openPanel('saves'));await page.locator('#file-input').setInputFiles(completedPath);await page.locator('[data-cmd="restore"]').click();await page.waitForFunction(()=>FieldSignal3D.getState().missions.signal==='done');await page.locator('#close-panel').click();
  await page.locator('#open-journal').click();await page.evaluate(()=>FieldSignal3D.getJournal().select('archive'));await page.waitForFunction(()=>document.querySelector('.fj-left h3')?.textContent==='First signal');
  check('Real completed expedition appears in journal archive with actual reward',await page.locator('.fj-right').innerText().then(t=>t.includes('350')&&t.includes('Completed')));await image('journal-completed-mission');await page.locator('[data-journal="close"]').click();
  // Loaded candidate retains old log bytes as entries, plus its own bounded book store.
  check('Original v9 journal entries are preserved',await page.evaluate(()=>JSON.parse(localStorage.getItem('field-signal-v9-journal')).some(e=>e.text==='Preserved older expedition')));
  await page.evaluate(()=>FieldSignal3D.openPanel('saves'));await page.waitForFunction(()=>document.querySelector('#offline-status')?.textContent.includes('ready offline'),null,{timeout:180000});
  await context.setOffline(true);await page.reload();await page.locator('#load-world').click();await page.locator('#silent:enabled').waitFor({timeout:240000});await page.locator('#silent').click();
  await page.evaluate(()=>{const w=FieldSignal3D.getWorld();w.renderer.setPixelRatio(.35);w.resize();});
  check('Candidate models, rules, mission archive and book restart offline',await page.evaluate(()=>FieldSignal3D.getState().missions.signal==='done'&&FieldSignal3D.getInfo().campaign.searchCatalogue===69&&FieldSignal3D.getJournal().store.data.events.some(e=>e.payload.missionId==='signal')));
  await page.locator('#open-journal').click();await page.evaluate(()=>FieldSignal3D.getJournal().select('archive'));await image('journal-offline');
  await context.setOffline(false);const credits=await context.newPage();await credits.goto(base+'candidate-credits.html');await credits.waitForFunction(()=>document.querySelectorAll('article').length===160);
  check('In-game asset registry exposes exact licences for 91 models and 69 variants',await credits.locator('article').count()===160);
  check('No game/browser errors or missing runtime assets',!errors.length&&!missing.length,{errors,missing});
 }catch(error){results.push({failure:error.stack});if(page){console.log('FAILURE_STATE',await page.evaluate(()=>({boot:document.querySelector('#boot')?.textContent,player:window.FieldSignal3D?.getPlayer(),title:document.querySelector('#panel-title')?.textContent})).catch(()=>null));await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:80,timeout:120000}).catch(()=>{});}throw error;}
 finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(results,null,2));await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
