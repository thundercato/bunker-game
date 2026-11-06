import {MATERIALS} from '../../layout-core.js';
import {supportCandidates,snapToSupport,alignSelection,rotateAssembly,joinWallEndpoints,addStairLanding,createTemplate,
  validateTemplate,instantiateTemplate,overlappingAt,nearbyObjects,interiorIssues} from '../tools/interior-core.js';

const LIBRARY_KEY='field-signal-editor-object-templates-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const placementInputs=[['X',0],['Y',1],['Z',2]].map(([axis,i])=>`<label>${axis}<input id="template-position-${i}" type="number" step="0.05" value="0"></label>`).join('');
export function mountInteriorTools({getDocument,change,select,getSelection,getSelectedIds=()=>[],hidden,applyView,toast,focus=()=>{},getAssets=()=>null}) {
  const host=document.createElement('details');host.id='interior-tools';
  host.innerHTML=`<summary>Interior workshop</summary>
    <p class="empty">Metres in this building's local frame. Changes use the existing layout, collisions and undo history.</p>
    <p id="interior-reference" class="empty"></p>
    <details open><summary>Surface snap</summary>
      <p class="empty">Place a prop's bottom on an authored floor or solid prop top face. The whole footprint must fit; stair openings and other collisions are checked.</p>
      <label>Support face<select id="interior-support"></select></label>
      <label class="check"><input id="interior-centre" type="checkbox"> Centre on support</label>
      <label class="check"><input id="interior-align-yaw" type="checkbox"> Match support yaw</label>
      <button data-interior="snap">Snap selected prop</button>
    </details>
    <details><summary>Wall joints / stair landings</summary>
      <p class="empty">Join the current wall/opening to a fixed wall endpoint. Dimensions, openings and door bindings stay attached. Endpoints are the centres of each local X edge.</p>
      <label>Fixed reference wall<select id="interior-wall-reference"></select></label>
      <div class="interior-pair"><label>Moving edge<select id="interior-wall-moving"><option value="negative">Local X −</option><option value="positive">Local X +</option></select></label><label>Fixed edge<select id="interior-wall-fixed"><option value="positive">Local X +</option><option value="negative">Local X −</option></select></label></div>
      <label>Yaw at joint<select id="interior-wall-orientation"><option value="keep">Keep current</option><option value="parallel">Parallel to reference</option><option value="perpendicular">90° to reference</option></select></label>
      <button data-interior="join-wall">Join wall endpoints</button>
      <p class="empty">A landing is a real floor at the selected stair end, using the shared stair opening margin. Existing floors are preserved. Clipped rotated landings are rejected; top-edge walking needs the reviewed runtime adapter and game verification.</p>
      <div class="interior-pair"><label>Stair end<select id="interior-landing-end"><option value="top">Top</option><option value="bottom">Bottom</option></select></label><label>Depth · m<input id="interior-landing-depth" type="number" min="0.65" max="10" step="0.05" value="1.2"></label></div>
      <button data-interior="landing">Add stair landing</button>
    </details>
    <details><summary>Align collection / assembly</summary>
      <p class="empty">Use checked Selection sets children, or the current object. The current object is the fixed reference/pivot; locked children prevent the whole edit.</p>
      <label>Alignment<select id="interior-alignment">
        <option value="x-min">Local X − edges</option><option value="x-centre">Local X centres</option><option value="x-max">Local X + edges</option>
        <option value="z-min">Local Z − edges</option><option value="z-centre">Local Z centres</option><option value="z-max">Local Z + edges</option>
        <option value="bottom">Bottom faces</option><option value="top">Top faces</option><option value="yaw">Yaw</option><option value="dimensions">Dimensions · same type</option>
      </select></label><button data-interior="align">Align to current reference</button>
      <label>Rigid rotation · degrees<input id="interior-rotation" type="number" min="-360" max="360" step="1" value="90"></label>
      <button data-interior="rotate">Rotate collection about current pivot</button>
    </details>
    <details><summary>Reusable object templates</summary>
      <p class="empty">Copy unbound decoration/structure as fresh concrete children. The current selected child is the pivot when included in the collection. Spawn markers, doors and gameplay bindings are protected. Instances are independent; overrides below are applied at insertion and remain editable.</p>
      <label>Template name<input id="template-name" maxlength="80" placeholder="Workshop table and lamps"></label>
      <button data-interior="capture">Capture collection / current object</button>
      <label>Saved template<select id="interior-template"></select></label>
      <div class="inspector-buttons"><button data-interior="template-export">Export template</button><button data-interior="template-import">Import template</button></div>
      <input id="interior-template-file" type="file" accept=".json" hidden>
      <label>Insertion pivot · local metres</label><div class="xyz">${placementInputs}</div>
      <button data-interior="use-position">Use current object's position and yaw</button>
      <div class="interior-pair"><label>Yaw · degrees<input id="template-yaw" type="number" step="1" value="0"></label><label>Size multiplier<input id="template-scale" type="number" step="0.05" min="0.25" max="4" value="1"></label></div>
      <label>Structure material override<select id="template-material"><option value="">Keep original</option>${MATERIALS.map(m=>`<option>${m}</option>`).join('')}</select></label>
      <button data-interior="insert">Insert as one undoable assembly</button>
      <p class="empty">Shared template links, texture tiling/orientation and new building instances need reviewed runtime contracts. Prop materials come from the licensed models.</p>
    </details>
    <details><summary>Overlap selection / room focus</summary>
      <label>Objects at the current footprint centre<select id="interior-overlap"></select></label>
      <div class="inspector-buttons"><button data-interior="overlap">Select chosen object</button><button data-interior="cycle">Cycle stack</button></div>
      <label>Nearby room focus · radius m<input id="interior-radius" type="number" min="0.1" max="30" step="0.5" value="4"></label>
      <p class="empty">Proximity and floor height define this temporary focus; no room boundaries are inferred or saved.</p>
      <div class="inspector-buttons"><button data-interior="isolate">Isolate nearby objects</button><button data-interior="reveal">Reveal all objects</button></div>
    </details>
    <details><summary>Support, headroom and access checks</summary>
      <p class="empty">Uses the shared collision/floor queries with doors open. Walking samples are bounded diagnostics; test actual doors and approaches in game.</p>
      <label class="check"><input id="interior-reachability" type="checkbox" checked> Include walking approach samples</label>
      <button data-interior="diagnose">Run interior checks</button>
      <div id="interior-issues" aria-live="polite"></div>
    </details>`;
  document.querySelector('#inspector').after(host);
  const style=document.createElement('style');style.textContent='#interior-tools{padding:12px;border-top:1px solid var(--edge);font-size:11px}#interior-tools summary{cursor:pointer;color:var(--mint);padding:5px 0}#interior-tools details{border-top:1px solid var(--edge);margin-top:8px}#interior-tools label{display:block;margin:7px 0}#interior-tools input:not([type=checkbox]),#interior-tools select{width:100%;font-size:11px}#interior-tools button{font-size:10px;max-width:100%;margin:3px 0}#interior-tools .check{display:flex;gap:5px;align-items:center}#interior-tools .empty{font-size:10px;margin:5px 0}#interior-tools .interior-pair{display:grid;grid-template-columns:1fr 1fr;gap:6px}#interior-issues button{display:block;text-align:left;width:100%;border-left:2px solid var(--amber)}#interior-issues small{display:block;color:var(--muted);line-height:1.4;margin:0 0 10px}';document.head.append(style);
  const q=s=>host.querySelector(s);let templates=[],rejectedLibrary=null,diagnosticVersion=0;
  try{const raw=localStorage.getItem(LIBRARY_KEY);if(raw){const data=JSON.parse(raw);if(data.format!=='field-signal-editor-object-template-library'||data.version!==1||!Array.isArray(data.templates)||data.templates.length>100)throw Error('Unsupported template library.');templates=data.templates.map(t=>validateTemplate(t,{assets:getAssets()}));}}
  catch{rejectedLibrary=localStorage.getItem(LIBRARY_KEY);toast('Saved template library needs review. It is retained until you save a recovered library. Layout drafts are unchanged.');}
  function persist(){const data=JSON.stringify({format:'field-signal-editor-object-template-library',version:1,templates});try{if(rejectedLibrary!==null){const recovery=LIBRARY_KEY+':recovery:'+Date.now();localStorage.setItem(recovery,rejectedLibrary);if(localStorage.getItem(recovery)!==rejectedLibrary)throw Error('Recovery copy failed.');}localStorage.setItem(LIBRARY_KEY,data);rejectedLibrary=null;}catch{throw Error('Template library save failed. Export the template; the old library and layout draft are retained.');}}
  function ids(){const doc=getDocument(),known=new Set(doc.objects.map(o=>o.id)),many=[...getSelectedIds()].filter(id=>known.has(id));return many.length?many:getSelection()?[getSelection()]:[];}
  function current(){return getDocument()?.objects.find(o=>o.id===getSelection());}
  function template(){const t=templates[Number(q('#interior-template').value)];if(!t||q('#interior-template').value==='')throw Error('Capture or import a template first.');return t;}
  function refill(selector,options){const box=q(selector),old=box.value;box.innerHTML=options;if([...box.options].some(o=>o.value===old))box.value=old;}
  function update(){const doc=getDocument();if(!doc)return;const o=current();q('#interior-reference').textContent=o?'Reference / pivot: '+o.name+' · '+o.id:'Select a reference object in the view or hierarchy.';
    refill('#interior-support','<option value="">Choose support</option>'+(o?supportCandidates(doc,o.id).map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${s.height.toFixed(2)} m · ${s.kind}</option>`).join(''):''));
    refill('#interior-overlap','<option value="">Choose object</option>'+(o?overlappingAt(doc,o.id).map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${s.type}${hidden.has(s.id)?' · hidden':''}</option>`).join(''):''));
    refill('#interior-wall-reference','<option value="">Choose fixed wall</option>'+doc.objects.filter(p=>p.id!==o?.id&&['wall','doorway','window'].includes(p.type)).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''));
    refill('#interior-template','<option value="">Choose template</option>'+templates.map((t,i)=>`<option value="${i}">${esc(t.name)} · ${t.objects.length} children</option>`).join(''));
  }
  function revealSelect(id){hidden.delete(id);applyView();select(id);focus();update();}
  function exportTemplate(){const t=template(),url=URL.createObjectURL(new Blob([JSON.stringify(t,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Field-Signal-'+t.name.replace(/[^\w-]/g,'-')+'-template.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  for(const button of host.querySelectorAll('[data-interior]'))button.onclick=async()=>{try{const action=button.dataset.interior,doc=getDocument(),o=current();
    if(action==='template-import'){q('#interior-template-file').click();return;}
    if(action==='template-export'){exportTemplate();return;}
    if(action==='reveal'){hidden.clear();applyView();update();return;}
    if(action==='diagnose'){
      const version=++diagnosticVersion,stamp=JSON.stringify(doc),list=q('#interior-issues');list.textContent='Checking support and shared walking surfaces…';await new Promise(r=>setTimeout(r,30));const issues=interiorIssues(doc,{reachability:q('#interior-reachability').checked});
      if(version!==diagnosticVersion)return;if(stamp!==JSON.stringify(getDocument())){list.textContent='The layout changed during checks. Run them again.';return;}list.replaceChildren();
      if(!issues.length)list.textContent='No sampled problems found. Confirm the route in isolated game preview.';
      for(const issue of issues){const b=document.createElement('button'),fix=document.createElement('small');b.textContent=issue.message;b.dataset.issueId=issue.id;b.onclick=()=>revealSelect(issue.id);fix.textContent=issue.fix;list.append(b,fix);}return;
    }
    if(!o)throw Error('Select a reference object first.');
    if(action==='snap')await change(d=>snapToSupport(d,o.id,q('#interior-support').value,{alignYaw:q('#interior-align-yaw').checked,centre:q('#interior-centre').checked}));
    else if(action==='join-wall')await change(d=>joinWallEndpoints(d,o.id,q('#interior-wall-reference').value,{movingEnd:q('#interior-wall-moving').value,referenceEnd:q('#interior-wall-fixed').value,orientation:q('#interior-wall-orientation').value}));
    else if(action==='landing'){let id;await change(d=>{id=addStairLanding(d,o.id,{end:q('#interior-landing-end').value,depth:Number(q('#interior-landing-depth').value)});});if(id&&getDocument().objects.some(p=>p.id===id))revealSelect(id);}
    else if(action==='align')await change(d=>alignSelection(d,ids(),o.id,q('#interior-alignment').value));
    else if(action==='rotate')await change(d=>rotateAssembly(d,ids(),Number(q('#interior-rotation').value),o.id));
    else if(action==='capture'){const chosen=ids(),t=createTemplate(doc,chosen,q('#template-name').value,chosen.includes(o.id)?o.id:chosen[0]);if(templates.length>=100&&!templates.some(p=>p.name===t.name))throw Error('Template library is full (100). Export a template before replacing a named entry.');const previous=templates;templates=[...templates.filter(p=>p.name!==t.name),t];try{persist();}catch(e){templates=previous;throw e;}update();q('#interior-template').value=String(templates.length-1);toast('Template saved with unbound children.');}
    else if(action==='use-position'){o.position.forEach((n,i)=>q('#template-position-'+i).value=String(n));q('#template-yaw').value=String(o.yaw*180/Math.PI);}
    else if(action==='insert'){const t=template();let added=[];await change(d=>{added=instantiateTemplate(d,t,{position:[0,1,2].map(i=>Number(q('#template-position-'+i).value)),yaw:Number(q('#template-yaw').value)*Math.PI/180,scale:Number(q('#template-scale').value),material:q('#template-material').value||null});});if(added.length&&getDocument().objects.some(p=>p.id===added[0]))revealSelect(added[0]);}
    else if(action==='overlap'){const id=q('#interior-overlap').value;if(!id)throw Error('Choose an overlapping object.');revealSelect(id);}
    else if(action==='cycle'){const stack=overlappingAt(doc,o.id);if(stack.length<2)throw Error('No overlapping object at this footprint centre.');const i=stack.findIndex(p=>p.id===o.id);revealSelect(stack[(i+1)%stack.length].id);}
    else if(action==='isolate'){const shown=new Set(nearbyObjects(doc,o.id,Number(q('#interior-radius').value)));hidden.clear();for(const p of doc.objects)if(!shown.has(p.id))hidden.add(p.id);applyView();}
    update();
  }catch(e){toast(e.message);}};
  q('#interior-template-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>500000)throw Error('Object template exceeds 500 kB.');const t=validateTemplate(JSON.parse(await file.text()),{assets:getAssets()}),previous=templates;if(templates.length>=100&&!templates.some(p=>p.name===t.name))throw Error('Template library is full (100). Export a template before replacing a named entry.');templates=[...templates.filter(p=>p.name!==t.name),t];try{persist();}catch(error){templates=previous;throw error;}update();q('#interior-template').value=String(templates.length-1);toast('Validated template imported; no layout objects changed.');}catch(error){toast(error.message);}finally{q('#interior-template-file').value='';}};
  const observer=new MutationObserver(update);observer.observe(document.querySelector('#hierarchy'),{childList:true});observer.observe(document.querySelector('#inspector'),{childList:true});update();
  return {update,diagnostics:options=>interiorIssues(getDocument(),options),getTemplates:()=>templates.map(t=>validateTemplate(t)),destroy:()=>{observer.disconnect();host.remove();style.remove();}};
}
