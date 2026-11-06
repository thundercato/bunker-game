/* Runs against the deployed site, in an isolated test browser, not user storage. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'test-results');fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.GAME_URL||'https://thundercato.github.io/bunker-game/';
(async()=>{let browser;const results=[],errors=[],missing=[];function check(name,ok,detail){results.push({name,pass:!!ok,detail});console.log(ok?'PASS':'FAIL',name,detail?JSON.stringify(detail):'');assert.ok(ok,name)}
try{
 const fixture=JSON.parse(execFileSync('python3',['-c','import engine,json;s=engine.new_game();s["credits"]=1267;s["bag"]["wire"]=3;print(json.dumps(s))'],{cwd:path.join(ROOT,'site'),encoding:'utf8'}));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:844,height:500}}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push([r.status(),r.url()])});
 let release=null;const expectedRelease=JSON.parse(fs.readFileSync(path.join(ROOT,'site/release.json')));
 for(let i=0;i<30;i++){try{const r=await page.request.get(BASE+'release.json?verify='+Date.now(),{timeout:20000});if(r.ok()){const j=await r.json();if(j.build===expectedRelease.build){release=j;break;}}}catch{}await page.waitForTimeout(5000)}
 check('Actual public release matches the reviewed build',!!release,release);
 await page.addInitScript(fixture=>{if(!localStorage.getItem('fieldcraft-release-test-seeded')){localStorage.setItem('field-signal-dead-air-v9',JSON.stringify(fixture));localStorage.setItem('fieldcraft-release-test-seeded','yes')}},fixture);
 await page.goto(BASE,{waitUntil:'domcontentloaded'});await page.locator('#load-world').click();await page.locator('#silent:enabled').waitFor({timeout:240000});await page.locator('#silent').click();
 await page.evaluate(()=>{const w=FieldSignal3D.getWorld();w.setQuality('low');w.renderSettings.shadows=false;w.renderer.shadowMap.enabled=false;w.renderer.setPixelRatio(.4);w.resize()});
 const info=await page.evaluate(()=>FieldSignal3D.getInfo());
 check('Public Python and all 58 imported model families load',info.build==='Overgrowth 11.0'&&(info.campaign?.baselineModelFamilies??info.licensedModelFamilies)===58&&info.fieldcraftErrors.length===0&&info.assetErrors.length===0);
 const state=await page.evaluate(()=>FieldSignal3D.getState());check('Existing compatible v9 storage continues automatically',state.credits===1267&&state.bag.wire===3&&state.version===9);
 await page.evaluate(()=>FieldSignal3D.openPanel('pack'));await page.waitForFunction(()=>[...document.querySelectorAll('.item-thumb img')].every(i=>i.complete&&i.naturalWidth>0));
 check('Published backpack shows model images',await page.locator('.item-thumb img').count()>0);
 await page.locator('.item-thumb').first().click();await page.waitForFunction(()=>document.querySelector('#inspect-stage canvas'));await page.locator('[data-cmd="studio-zoom"][data-factor="1.25"]').click();
 check('Published 3D inspection renders and zooms',await page.evaluate(()=>FieldSignal3D.getStudio().zoom===1.25));
 await page.locator('#close-panel').click();await page.locator('#close-panel').click();await page.locator('#open-atlas10').click();await page.locator('[data-atlas="target"]').click();await page.locator('[data-atlas="in"]').click();
 check('Published atlas centres the objective and zooms',await page.evaluate(()=>FieldSignal3D.getAtlas().selected==='signal'&&FieldSignal3D.getAtlas().camera.zoom===9));
 await page.locator('[data-atlas="briefing"]').click();check('Atlas opens the correct current dossier',await page.locator('.file-copy h3').innerText()==='First signal');
 await page.evaluate(()=>FieldSignal3D.openPanel('saves'));await page.waitForFunction(()=>document.querySelector('#offline-status')?.textContent.includes('ready offline'),null,{timeout:240000});check('Published v11 runtime is fully cached',true);
 const before=await page.evaluate(()=>({credits:FieldSignal3D.getState().credits,bag:FieldSignal3D.getState().bag}));await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#load-world').click();await page.locator('#silent:enabled').waitFor({timeout:240000});await page.locator('#silent').click();
 const after=await page.evaluate(()=>({credits:FieldSignal3D.getState().credits,bag:FieldSignal3D.getState().bag}));check('Public build restarts offline with unchanged inventory',JSON.stringify(before)===JSON.stringify(after)&&await page.evaluate(()=>(FieldSignal3D.getInfo().campaign?.baselineModelFamilies??FieldSignal3D.getInfo().licensedModelFamilies)===58));
 await page.evaluate(()=>FieldSignal3D.inspectItem('medkit'));await page.waitForFunction(()=>document.querySelector('#inspect-stage canvas'));check('Model inspection works offline',true);
 await page.evaluate(()=>FieldSignal3D.openAtlas(true));await page.waitForFunction(()=>FieldSignal3D.getAtlas()?.zone==='field');check('Objective map works offline',true);
 await page.goto(BASE+'controller.html',{waitUntil:'domcontentloaded'});await page.locator('#wake').click();check('Controller Clinic remains available offline',await page.evaluate(()=>!!window.FieldPad&&!window.FieldSignal3D));
 check('No public runtime exceptions or missing assets',errors.length===0&&missing.length===0,{errors,missing});
}catch(e){results.push({failure:e.stack});throw e}finally{fs.writeFileSync(path.join(OUT,'public-release.json'),JSON.stringify(results,null,2));if(browser)await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
