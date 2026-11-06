import {JournalStore, JOURNAL_SECTIONS, missionEntries, pagePoint, stamp} from './journal-core.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const valueOf = value => typeof value === 'function' ? value() : value;
const paperSize = {width: 4, height: 4.55};
const button = (op, text, extra = '') => `<button type="button" data-journal="${op}" ${extra}>${esc(text)}</button>`;
const reference = [
 {title:'Weapon preparation', text:'Loose ammunition is not loaded automatically. Fill a compatible magazine, insert it, rack the action and switch the safety off. A chambered round and a loaded magazine are separate. Use the maintenance bench to clean a carried weapon.'},
 {title:'Detectors and probes', text:'The detector warns of nearby interference. Throw a probe to reveal the dangerous field. A revealed field remains visible until you return to the refuge. The journal preserves the observation; that does not make the field safe.'},
 {title:'Returning with equipment', text:'Search cupboards and drawers, then take one item, a stack or everything that fits. Your pack has a weight limit. Ordinary death leaves a recoverable field pack. Stored equipment remains at the refuge. Keep an exported save backup.'},
 {title:'Finding your assignment', text:'Assignments are offered by the relay radio and refuge contacts. Accept work at its source. The Atlas marks the destination; after the required items are recovered it marks the correct contact for delivery. Completed assignments move to the archive.'},
 {title:'Travelling safely', text:'The live map can be used while moving. Cross the river at the road or railway bridge. A torch takes your hand, so switch to a weapon before firing. Menus pause the expedition; standing still outside does not.'}
];

export class FieldJournal {
 constructor({data, getState, getPlayer = () => ({}), storageKey, legacyKey, onMission, onClose,
  reducedMotion = false, lowPower = false, onTurnSound} = {}) {
  this.data = data || {}; this.getState = getState || (() => ({})); this.getPlayer = getPlayer;
  this.onMission = onMission; this.onClose = onClose; this.reducedMotion = reducedMotion; this.lowPower = lowPower; this.onTurnSound = onTurnSound;
  let storage; try { storage = globalThis.localStorage; } catch {}
  this.store = new JournalStore({storage, storageKey, legacyKey}); this.section = 'active'; this.page = 0;
  this.mode = '2d'; this.renderCount = 0; this.turnCount = 0; this.generation = 0; this.photos = {};
 }
 record(state = this.getState()) {
  const changed = this.store.record(state, this.data);
  if (changed && this.node && !this.turning) this.renderPages(); return changed;
 }
 mount(parent) {
  this.unmount(); this.parent = parent; this.previousFocus = document.activeElement; this.record();
  const node = document.createElement('section'); node.className = 'field-journal'; node.setAttribute('aria-label', 'Field journal');
  node.innerHTML = `<header class="fj-toolbar"><div><span class="fj-eyebrow">RELAY 07 · PERSONAL FIELD RECORD</span><h2>Field journal</h2></div><div class="fj-tools">${button('mode', '2D reading', 'aria-pressed="false"')}${button('close', 'Close journal', 'aria-label="Close journal immediately"')}</div></header>
   <nav class="fj-tabs" aria-label="Journal sections">${JOURNAL_SECTIONS.map(([id, title]) => button('section', title, `data-section="${id}" aria-pressed="${id === this.section}"`)).join('')}</nav>
   <div class="fj-stage" tabindex="0" aria-label="Journal pages. Left and right arrows turn pages; up and down change sections; Escape closes."><canvas class="fj-scene" aria-hidden="true"></canvas><div class="fj-binding" aria-hidden="true"></div><div class="fj-spread"><article class="fj-paper fj-left" aria-label="Left page"></article><article class="fj-paper fj-right" aria-label="Right page"></article></div><div class="fj-turn-edge fj-edge-left" aria-hidden="true">‹</div><div class="fj-turn-edge fj-edge-right" aria-hidden="true">›</div></div>
   <footer class="fj-footer">${button('previous', '‹ Previous page')}<output class="fj-position" aria-live="polite"></output>${button('next', 'Next page ›')}</footer><div class="fj-status" role="status"></div><p class="fj-hint">Swipe paper / ← → pages · ↑ ↓ sections · Controller shoulders / D-pad · X selects controls · Esc / B closes</p>`;
  parent.appendChild(node); this.node = node; this.stage = node.querySelector('.fj-stage'); this.canvas = node.querySelector('canvas');
  this.abort = new AbortController(); const opts = {signal: this.abort.signal};
  node.addEventListener('click', e => this.click(e), opts);
  node.addEventListener('keydown', e => this.key(e), opts);
  this.stage.addEventListener('pointerdown', e => this.pointerDown(e), opts);
  this.stage.addEventListener('pointermove', e => this.pointerMove(e), opts);
  this.stage.addEventListener('pointerup', e => this.pointerUp(e), opts);
  this.stage.addEventListener('pointercancel', () => this.cancelDrag(), opts);
  this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.useFallback('3D context unavailable · 2D reading'); }, opts);
  this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(this.stage);
  this.motionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  this.motionQuery?.addEventListener('change', () => { if (this.motionQuery.matches) this.useFallback('Reduced motion · 2D reading'); else {this.setMode(this.mode);this.renderPages();} }, opts);
  this.manual2D = false; this.modeReason = ''; this.setMode('2d'); this.renderPages();
  const token = this.generation;
  if (!this.needsFallback()) this.initScene(token);
  fetch('./assets/v9/briefings.json').then(r => r.ok ? r.json() : {}).then(photos => { this.photos = photos; if (this.node && token === this.generation) this.renderPages(); }).catch(() => {});
  this.stage.focus({preventScroll:true}); return this;
 }
 needsFallback() { return !!(valueOf(this.reducedMotion) || valueOf(this.lowPower) || this.motionQuery?.matches); }
 setMode(mode) {
  this.mode = mode; this.node?.classList.toggle('fj-3d', mode === '3d');
  const b = this.node?.querySelector('[data-journal="mode"]');
  const forced = mode === '2d' && this.needsFallback(), battery = !!valueOf(this.lowPower);
  if (this.modeReason === this.forcedReason) this.modeReason = '';
  this.forcedReason = forced ? (battery ? 'Battery saver · 2D reading. Select Balanced or Sharper in Display & comfort for 3D.' : 'Reduced motion · 2D reading. Change Display & comfort or your device motion settings for 3D.') : '';
  if (forced) this.modeReason = this.forcedReason;
  if (b) { b.disabled = forced; b.textContent = forced ? (battery ? '2D · Battery saver' : '2D · Reduced motion') : mode === '3d' ? '2D reading' : '3D notebook'; b.setAttribute('aria-pressed', String(mode === '2d')); b.title = forced ? this.forcedReason : mode === '3d' ? 'Switch to flat paper for reading.' : 'Open the physical 3D notebook.'; }
 }
 useFallback(reason) {
  this.cancelTurn(); this.modeReason = reason; this.setMode('2d'); this.disposeScene(); this.renderPages();
 }
 async initScene(token) {
  try {
   const T = await import('./vendor/three.js');
   if (!this.node || token !== this.generation || this.manual2D || this.needsFallback()) return;
   this.T = T;
   this.renderer = new T.WebGLRenderer({canvas:this.canvas, alpha:true, antialias:false, powerPreference:'low-power'});
   this.renderer.setPixelRatio(Math.min(1.5, globalThis.devicePixelRatio || 1)); this.renderer.setClearColor(0x000000, 0); this.renderer.outputColorSpace = T.SRGBColorSpace;
   this.scene = new T.Scene(); this.camera = new T.OrthographicCamera(-4.7,4.7,2.85,-2.85,.1,30); this.camera.position.set(0,0,12); this.camera.lookAt(0,0,0);
   this.scene.add(new T.AmbientLight(0xffffff, 2.1)); const key = new T.DirectionalLight(0xfff0cc, 2.5); key.position.set(-3,5,9); this.scene.add(key);
   const cloth = this.surfaceTexture('cloth'), paper = this.surfaceTexture('paper'), edges = this.surfaceTexture('edges');
   const coverMat = new T.MeshStandardMaterial({map:cloth, color:0x566350, roughness:.96});
   const paperMat = new T.MeshStandardMaterial({map:paper, roughness:1, color:0xf3e6c6});
   const edgeMat = new T.MeshStandardMaterial({map:edges, roughness:1});
   const addBox = (w,h,d,x,y,z,material) => { const mesh = new T.Mesh(new T.BoxGeometry(w,h,d),material); mesh.position.set(x,y,z); this.scene.add(mesh); return mesh; };
   addBox(8.72,5.12,.16,0,-.03,-.26,coverMat); addBox(.52,5.13,.22,0,-.03,-.18,coverMat);
   for (const sign of [-1,1]) {
    addBox(4.04,4.64,.23,sign*2.05,0,-.06,edgeMat); addBox(4,4.55,.025,sign*2.05,0,.075,paperMat);
    addBox(.045,4.8,.04,sign*4.25,0,-.15,coverMat);
   }
   const metal = new T.MeshStandardMaterial({color:0xaaa992, roughness:.34, metalness:.8});
   for (const y of [-1.55,0,1.55]) {
    const ring = new T.Mesh(new T.TorusGeometry(.17,.035,6,22),metal); ring.position.set(0,y,.22); ring.rotation.y=.85; this.scene.add(ring);
   }
   const tapeMat = new T.MeshStandardMaterial({color:0xa89a6a, roughness:1});
   for (const x of [-3.4,3.4]) { const tape=addBox(.62,.21,.015,x,2.38,.13,tapeMat); tape.rotation.z=x>0?.14:-.12; }
   this.pageGeometry = new T.PlaneGeometry(paperSize.width,paperSize.height,28,3); this.pageGeometry.translate(2,0,0);
   this.basePage = this.pageGeometry.attributes.position.array.slice();
   this.frontMat = new T.MeshBasicMaterial({map:paper, side:T.FrontSide}); this.backMat = new T.MeshBasicMaterial({map:paper, side:T.BackSide});
   this.backGeometry = this.pageGeometry.clone(); const uv=this.backGeometry.attributes.uv; for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
   this.sheet = new T.Group(); this.sheet.add(new T.Mesh(this.pageGeometry,this.frontMat),new T.Mesh(this.backGeometry,this.backMat)); this.sheet.visible=false; this.scene.add(this.sheet);
   this.modeReason = ''; this.setMode('3d'); this.resize(); this.renderPages();
  } catch (error) { this.sceneError=String(error?.message||error);if (token === this.generation) this.useFallback('3D unavailable · 2D reading'); }
 }
 surfaceTexture(kind) {
  const T = this.T, c = document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d');
  g.fillStyle=kind==='cloth'?'#505c45':kind==='edges'?'#d4c5a4':'#ecdfc0'; g.fillRect(0,0,256,256);
  let seed=7319; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<4500;i++){const a=random()*.12;g.fillStyle=`rgba(${kind==='cloth'?'0,0,0':'79,58,32'},${a})`;g.fillRect(random()*256,random()*256,random()*3+1,1);}
  if(kind==='edges')for(let y=0;y<256;y+=5){g.strokeStyle=y%10?'#e3d7ba':'#b2a083';g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();}
  if(kind==='cloth'){g.strokeStyle='#9d9c7630';for(let x=0;x<256;x+=4){g.beginPath();g.moveTo(x,0);g.lineTo(x,256);g.stroke();}g.strokeStyle='#d1bd7c70';g.strokeRect(8,8,240,240);}
  const texture=new T.CanvasTexture(c); texture.colorSpace=T.SRGBColorSpace; return texture;
 }
 resize() {
  if (!this.stage || !this.renderer) return; const r=this.stage.getBoundingClientRect();
  if(r.width>0&&r.height>0){this.renderer.setSize(Math.round(r.width),Math.round(r.height),false);this.renderScene();}
 }
 renderScene() { if(this.renderer&&this.scene&&this.camera){this.renderer.render(this.scene,this.camera);this.renderCount++;} }
 spreads() {
  const state=this.getState() || {}, events=[...this.store.data.events].reverse();
  if(this.section==='active'||this.section==='archive') {
   const rows=missionEntries(this.data,state,this.section==='archive');
   if(this.section==='active') rows.sort((a,b)=>Number(b.mission.id===state.pinned)-Number(a.mission.id===state.pinned));
   return rows.length ? rows.map(row=>this.missionSpread(row)) : [this.emptySpread(this.section==='active'?'No active assignments':'No archived assignments',this.section==='active'?'Explore freely, or visit the relay radio and refuge contacts for available work.':'Completed, failed and abandoned assignments appear here when they exist in your campaign.')];
  }
  let rows=[];
  if(this.section==='reference') rows=[...reference.map(r=>({heading:r.title,body:r.text,kind:'Field reference'})),...events.filter(e=>e.category==='equipment'&&e.payload.itemId).map(e=>this.eventPage(e))];
  if(this.section==='communications') rows=events.filter(e=>e.category==='communications').map(e=>this.eventPage(e));
  if(this.section==='observations') rows=events.filter(e=>e.category==='observation').map(e=>this.eventPage(e));
  if(this.section==='personal') rows=[{heading:'Your own field notes',body:'Notes are kept only in this browser, separately from the campaign save. They are personal observations, not confirmed facts.',html:`<form class="fj-note-form"><label>Write a note<textarea name="note" maxlength="1200" rows="3" placeholder="What did you notice?"></textarea></label>${button('note','Add field note')}</form>`},...this.store.data.notes.slice().reverse().map(n=>({heading:'Personal observation',body:n.text,kind:'Player note',time:n.timestamp})),...events.filter(e=>e.category==='personal'||e.category==='mission'||e.category==='equipment'&&!e.payload.itemId).map(e=>this.eventPage(e))];
  if(!rows.length) return [this.emptySpread(this.section==='communications'?'No communications recorded':'No observations recorded',this.section==='communications'?'Read a mission briefing or listen for real game notifications. Only encountered briefings and recorded events appear here.':'Explore, enter buildings and reveal hazardous fields with probes. The journal records discoveries as you make them.')];
  const result=[];for(let i=0;i<rows.length;i+=2)result.push({left:rows[i],right:rows[i+1]||{heading:'End of section',body:'Turn back, choose another tab or close the journal to continue your expedition.'}});return result;
 }
 emptySpread(title,body) {return{left:{heading:title,body,kind:'Personal field record'},right:{heading:'Keep a field record',body:'Assignments, encountered equipment, discoveries and actual game events are stored locally. Read old v9 entries with the optional import below. The original entries are kept.',html:this.legacyControl()}};}
 eventPage(e) {return{heading:e.payload.title||({mission:'Assignment record',communications:'Communications record',observation:'Field observation',equipment:'Equipment record',personal:'Expedition log'})[e.category],body:e.payload.text||'',kind:e.payload.kind||e.payload.sourceName||this.data.missionSources?.[e.source]?.name||e.source,time:e.timestamp,html:e.payload.zone?`<small class="fj-location">${esc(this.data.zones?.[e.payload.zone]?.name||e.payload.zone)}</small>`:''};}
 legacyControl() {const n=this.store.legacyEntries().length;return n?`<p class="fj-small">${n} older v9 entries are available. Importing adds a copy and keeps the original storage.</p>${button('legacy','Import older v9 entries')}`:'';}
 missionSpread({mission:m,status,log,source,recovered,destination,completion,reward}) {
  const archived=['done','completed','failed','abandoned'].includes(status), item=this.data.catalogue?.[m.item]?.name||m.item||'Mission objective';
  const photo=this.photos[m.id]; const photoHTML=photo&&/^assets\/[\w/.-]+\.(?:jpg|webp|png)$/.test(photo)?`<figure class="fj-recon"><img src="${esc(photo)}" alt="Reconnaissance view of ${esc(m.target||m.title)}"><figcaption>${esc(m.target||'Destination')}</figcaption></figure>`:'';
  const count=this.getState().bag?.[m.item]||0;
  return{left:{heading:m.title,kind:`${archived?'Filed operation':'Active assignment'} · ${source}`,body:m.description||m.desc||'',html:photoHTML},right:{
   heading:archived?(status==='done'?'Completed':status[0].toUpperCase()+status.slice(1)):(recovered?'Ready to return':'In progress'),
   kind:m.id===this.getState().pinned?'PINNED ASSIGNMENT':'FIELD ORDER',
   body:archived?`Filed ${stamp(completion)}. ${completion==null?'This older campaign did not record an exact completion time.':''}`:`${Math.min(count,m.count||1)} / ${m.count||1} × ${item}. ${recovered?'Deliver the required items to ':'Search '+(m.target||'the marked destination')+'. Then return to '}${source}.`,
   html:`<dl class="fj-meta"><div><dt>${archived?'Recorded reward':'Reward on completion'}</dt><dd>${reward==null?'Not recorded':esc(reward)+' credits'}</dd></div><div><dt>Destination</dt><dd>${esc(archived?m.target:destination)}</dd></div><div><dt>Accepted</dt><dd>${esc(stamp(log.acceptedAt))}</dd></div>${log.completedPlay!=null&&log.acceptedPlay!=null?`<div><dt>Time played</dt><dd>${Math.max(0,Math.round((log.completedPlay-log.acceptedPlay)/60))} minutes</dd></div>`:''}</dl>`,
   footer:!archived?`<div class="fj-actions">${button('mission','View target on Atlas',`data-action="atlas" data-id="${esc(m.id)}"`)}${button('mission',m.id===this.getState().pinned?'Pinned to Atlas':'Pin assignment',`data-action="pin" data-id="${esc(m.id)}"`)}${button('mission','Open assignment dossier',`data-action="open" data-id="${esc(m.id)}"`)}</div>`:''}};
 }
 paperHTML(page, number) {return `<div class="fj-paper-inner"><span class="fj-page-kicker">${esc(page.kind||JOURNAL_SECTIONS.find(s=>s[0]===this.section)?.[1]||'Field record')}</span><h3>${esc(page.heading)}</h3>${page.time!=null?`<time>${esc(stamp(page.time))}</time>`:''}<p class="fj-copy">${esc(page.body)}</p>${page.html||''}</div>${page.footer?`<div class="fj-paper-footer">${page.footer}</div>`:''}<span class="fj-page-number">${String(number).padStart(2,'0')}</span>`;}
 renderPages() {
  if(!this.node)return;this.setMode(this.mode); const spreads=this.spreads();this.page=Math.max(0,Math.min(this.page,spreads.length-1));this.currentSpread=spreads[this.page];
  const oldId=document.activeElement?.dataset?.journal,oldAction=document.activeElement?.dataset?.action;
  this.node.querySelector('.fj-left').innerHTML=this.paperHTML(this.currentSpread.left,this.page*2+1);this.node.querySelector('.fj-right').innerHTML=this.paperHTML(this.currentSpread.right,this.page*2+2);
  this.node.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===this.section)));
  this.node.querySelector('.fj-position').textContent=`${JOURNAL_SECTIONS.find(s=>s[0]===this.section)?.[1]} · ${this.page+1} / ${spreads.length}`;
  this.node.querySelector('[data-journal="previous"]').disabled=this.page===0;this.node.querySelector('[data-journal="next"]').disabled=this.page>=spreads.length-1;
  const i=this.store.info();const status=this.node.querySelector('.fj-status');
  status.textContent=i.error||`${this.modeReason|| (this.mode==='3d'?'Physical notebook · local record':'2D reading · local record')}${i.discarded?` · ${i.discarded} older event entries retired (mission archive retained)`:''}`;
  if(oldId==='mission')this.node.querySelector(`[data-journal="mission"][data-action="${oldAction}"]`)?.focus({preventScroll:true});
  if(this.section==='personal'&&this.store.legacyEntries().length){const n=document.createElement('div');n.className='fj-import';n.innerHTML=this.legacyControl();status.appendChild(n);}
 }
 select(section) {if(!JOURNAL_SECTIONS.some(s=>s[0]===section))return false;this.cancelTurn();this.section=section;this.page=0;this.renderPages();return true;}
 turn(direction) {
  const sign=direction<0?-1:1,spreads=this.spreads(),target=this.page+sign;
  if(!this.node||this.turning||target<0||target>=spreads.length)return false;
  this.turnCount++;this.onTurnSound?.();
  if(this.mode!=='3d'||this.needsFallback()||!this.sheet){this.page=target;this.renderPages();return true;}
  this.turning={target,sign,start:performance.now(),duration:520};this.sheet.visible=true;
  this.turnTexture(this.currentSpread,spreads[target],sign);this.node.classList.add('fj-turning');this.stage.setAttribute('aria-busy','true');
  const animate=now=>{if(!this.turning)return;const t=Math.min(1,(now-this.turning.start)/this.turning.duration),smooth=t*t*(3-2*t);this.deform(smooth,sign);this.renderScene();if(t<1)this.frame=requestAnimationFrame(animate);else this.finishTurn();};
  this.frame=requestAnimationFrame(animate);return true;
 }
 turnTexture(oldSpread,newSpread,sign) {
  for(const material of [this.frontMat,this.backMat])if(material.userData.turnTexture){material.map.dispose();material.userData.turnTexture=false;}
  this.frontMat.map=this.textTexture(sign>0?oldSpread.right:oldSpread.left);this.frontMat.userData.turnTexture=true;
  this.backMat.map=this.textTexture(sign>0?newSpread.left:newSpread.right);this.backMat.userData.turnTexture=true;
  this.frontMat.side=sign>0?this.T.FrontSide:this.T.BackSide;this.backMat.side=sign>0?this.T.BackSide:this.T.FrontSide;
  const frontUV=this.pageGeometry.attributes.uv,backUV=this.backGeometry.attributes.uv;
  for(let i=0;i<frontUV.count;i++){const u=this.basePage[i*3]/paperSize.width;frontUV.setX(i,sign>0?u:1-u);backUV.setX(i,sign>0?1-u:u);}frontUV.needsUpdate=backUV.needsUpdate=true;
  this.frontMat.needsUpdate=this.backMat.needsUpdate=true;
 }
 textTexture(page) {
  const c=document.createElement('canvas');c.width=640;c.height=736;const g=c.getContext('2d');g.fillStyle='#e9dcc0';g.fillRect(0,0,c.width,c.height);
  g.fillStyle='#776c53';g.font='16px monospace';g.fillText((page.kind||'FIELD RECORD').slice(0,48),48,49);g.fillStyle='#24352d';g.font='bold 28px Georgia';
  let y=91;const wrap=(text,font,lineHeight)=>{g.font=font;let line='';for(const word of String(text).split(/\s+/)){const test=line?line+' '+word:word;if(g.measureText(test).width>540&&line){g.fillText(line,48,y);y+=lineHeight;line=word;}else line=test;if(y>680)break;}if(y<=680){g.fillText(line,48,y);y+=lineHeight;}};
  wrap(page.heading,'bold 28px Georgia',35);y+=18;wrap(page.body,'22px Georgia',31);g.strokeStyle='#9f8c5d55';g.strokeRect(24,24,592,688);
  const tex=new this.T.CanvasTexture(c);tex.colorSpace=this.T.SRGBColorSpace;return tex;
 }
 deform(progress,sign) {
  const position=this.pageGeometry.attributes.position,back=this.backGeometry.attributes.position;
  for(let i=0;i<position.count;i++){const p=pagePoint(this.basePage[i*3],this.basePage[i*3+1],progress,sign);position.setXYZ(i,p.x,p.y,p.z);back.setXYZ(i,p.x,p.y,p.z-.003);}
  position.needsUpdate=back.needsUpdate=true;this.pageGeometry.computeVertexNormals();this.backGeometry.computeVertexNormals();
 }
 finishTurn() {if(!this.turning)return;const target=this.turning.target;this.cancelTurn();this.page=target;this.renderPages();this.renderScene();}
 cancelTurn() {cancelAnimationFrame(this.frame);this.turning=null;if(this.sheet)this.sheet.visible=false;this.node?.classList.remove('fj-turning');this.stage?.removeAttribute('aria-busy');}
 pointerDown(e) {
  if(e.button!==0||e.target.closest('button,input,textarea,a,select'))return;
  this.drag={x:e.clientX,y:e.clientY,id:e.pointerId};this.stage.setPointerCapture?.(e.pointerId);
 }
 pointerMove(e) {if(!this.drag||e.pointerId!==this.drag.id)return;const dx=e.clientX-this.drag.x;if(Math.abs(dx)>18&&Math.abs(dx)>Math.abs(e.clientY-this.drag.y)) {this.drag.horizontal=true;e.preventDefault();this.node?.style.setProperty('--fj-drag',`${Math.max(-10,Math.min(10,dx*.05))}px`);}}
 pointerUp(e) {if(!this.drag||e.pointerId!==this.drag.id)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;this.cancelDrag();if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)this.turn(dx<0?1:-1);else {const r=this.stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width;if(x<.075)this.turn(-1);if(x>.925)this.turn(1);}}
 cancelDrag() {this.drag=null;this.node?.style.removeProperty('--fj-drag');}
 click(e) {
  const b=e.target.closest('[data-journal]');if(!b)return;const op=b.dataset.journal;
  if(op==='close'){this.cancelTurn();this.onClose?.();return;}
  if(op==='section')this.select(b.dataset.section);
  if(op==='previous')this.turn(-1);if(op==='next')this.turn(1);
  if(op==='mission')this.onMission?.(b.dataset.action,b.dataset.id);
  if(op==='mode') {if(this.mode==='3d'){this.manual2D=true;this.useFallback('2D reading selected');}else if(!this.needsFallback()){this.manual2D=false;this.initScene(this.generation);}else{this.modeReason='2D reading follows reduced motion / low power settings';this.renderPages();}}
  if(op==='legacy'){const n=this.store.adoptLegacy();this.renderPages();this.node.querySelector('.fj-status').textContent=`Imported ${n} v9 entries. The original journal is preserved.`;}
  if(op==='note'){e.preventDefault();const text=this.node.querySelector('textarea')?.value;if(this.store.addNote(text,this.getState().clock))this.renderPages();}
 }
 key(e) {
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.cancelTurn();this.onClose?.();return;}
  if(e.target.matches('textarea,input,select'))return;
  if(['ArrowLeft','PageUp','ArrowRight','PageDown','ArrowUp','ArrowDown','Home','End'].includes(e.key)) {
   e.preventDefault();e.stopPropagation();if(['ArrowLeft','PageUp'].includes(e.key))this.turn(-1);if(['ArrowRight','PageDown'].includes(e.key))this.turn(1);
   if(e.key==='ArrowUp'||e.key==='ArrowDown')this.nextSection(e.key==='ArrowUp'?-1:1);
   if(e.key==='Home'){this.cancelTurn();this.page=0;this.renderPages();}if(e.key==='End'){this.cancelTurn();this.page=this.spreads().length-1;this.renderPages();}
  }
 }
 nextSection(direction) {const i=JOURNAL_SECTIONS.findIndex(s=>s[0]===this.section);this.select(JOURNAL_SECTIONS[(i+direction+JOURNAL_SECTIONS.length)%JOURNAL_SECTIONS.length][0]);}
 handleAction(name) {
  if(!this.node)return false;
  if(name==='pause'||name==='crouch'){this.cancelTurn();this.onClose?.();return true;}
  if(name==='safe'||name==='probe'||name==='previous'||name==='page-left'){this.turn(-1);return true;}
  if(name==='torch'||name==='rack'||name==='next'||name==='page-right'){this.turn(1);return true;}
  if(name==='detector'||name==='heal'){this.nextSection(name==='detector'?-1:1);return true;}
  if(name==='interact'){const focused=document.activeElement;if(this.node.contains(focused)&&focused.tagName==='BUTTON')focused.click();else this.node.querySelector('[data-journal="next"]:not(:disabled)')?.focus({preventScroll:true});return true;}
  if(name==='magazine'){const controls=[...this.node.querySelectorAll('button:not(:disabled),textarea')].filter(b=>b.getClientRects().length),i=controls.indexOf(document.activeElement);controls[(i+1)%controls.length]?.focus({preventScroll:true});return true;}
  return true;
 }
 info() {return {...this.store.info(),mode:this.mode,model:this.scene?'layered covers, paper stacks, metal binder and flexible sheet':'accessible paper spread',fallback:this.mode!=='3d',sceneError:this.sceneError||null,section:this.section,page:this.page,turning:!!this.turning,turns:this.turnCount,renders:this.renderCount,drawCalls:this.renderer?.info.render.calls||0,triangles:this.renderer?.info.render.triangles||0};}
 disposeScene() {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  this.scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(m);if(m.map)textures.add(m.map);}});
  for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.renderer?.dispose();
  this.renderer=null;this.scene=null;this.sheet=null;this.pageGeometry=null;this.backGeometry=null;
 }
 unmount() {
  this.generation++;this.cancelTurn();this.cancelDrag();this.abort?.abort();this.observer?.disconnect();this.disposeScene();
  const hadFocus=this.node?.contains(document.activeElement);this.node?.remove();this.node=null;this.stage=null;this.canvas=null;
  if(hadFocus&&this.previousFocus?.isConnected)this.previousFocus.focus?.({preventScroll:true});
 }
}
