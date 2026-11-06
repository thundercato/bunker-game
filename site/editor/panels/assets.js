import * as T from '../../vendor/three.js';
import {OrbitControls} from '../../vendor/OrbitControls.js';
import {PROP_LIBRARY} from '../../layout-renderer.js';
import {createSearchProp} from '../../search-props.js';
import {assetCatalogue,filterAssets,safeSource,modelCosts} from './assets-core.js';
const bytes = n => n == null ? 'Unknown' : n < 1048576 ? `${(n/1024).toFixed(0)} KiB` : `${(n/1048576).toFixed(1)} MiB`;
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountAssetBrowser({library,place,host=document.querySelector('.file-actions')} = {}) {
  const style = document.createElement('link'); style.rel='stylesheet'; style.href='editor/panels/assets.css'; document.head.append(style);
  const button = document.createElement('button'); button.id='model-library'; button.textContent='Model library'; host.append(button);
  const dialog = document.createElement('dialog'); dialog.id='asset-browser';
  dialog.innerHTML=`<div class="ab-heading"><div><h2>Registered model library</h2><p>Shared game models · placement adds decoration with collision, without loot or mission bindings.</p></div><button data-ab="close" aria-label="Close model library">Close</button></div><div class="ab-filters"><input data-ab="query" type="search" placeholder="Search model, author, source, tag…" aria-label="Search registered models"><select data-ab="category" aria-label="Model category"><option value="">All categories</option></select><select data-ab="licence" aria-label="Model licence"><option value="">All licences</option></select><select data-ab="budget" aria-label="Triangle budget"><option value="0">Any geometry cost</option><option value="1000">≤ 1,000 runtime triangles</option><option value="10000">≤ 10,000 runtime triangles</option></select><label><input data-ab="placeable" type="checkbox">Placeable</label></div><p data-ab="status" role="status">Reading shared manifests…</p><div class="ab-body"><div data-ab="list" class="ab-list"></div><section class="ab-inspection"><div class="ab-stage"><canvas data-ab="canvas" aria-label="Actual model inspection: drag to rotate, wheel or pinch to zoom"></canvas><p data-ab="model-status">Select a model to inspect its actual geometry.</p></div><p class="ab-help">Drag to orbit · wheel / pinch to zoom · Shift-drag to pan · <button data-ab="frame">Frame model</button></p><div data-ab="details"></div><button data-ab="place" class="primary" disabled>Place at editor focus / floor</button></section></div>`;
  document.body.append(dialog);
  const $ = key => dialog.querySelector(`[data-ab="${key}"]`);
  let rows=[], selected=null, model=null, renderer=null, scene=null, camera=null, orbit=null, token=0, errors=[], readyPromise=null;
  const thumbnails = new Map();
  const controls = ['query','category','licence','budget','placeable'];
  function renderList(){
    const found=filterAssets(rows,{query:$('query').value,category:$('category').value,licence:$('licence').value,maxTriangles:+$('budget').value,placeable:$('placeable').checked});
    $('status').textContent=`${found.length} of ${rows.length} registered models · ${errors.length ? errors.length+' loading errors; details below' : 'No additional assets downloaded'}`;
    $('list').replaceChildren();
    for(const row of found){
      const card=document.createElement('button');card.className='ab-card';card.dataset.model=row.id;card.classList.toggle('active',selected?.id===row.id);
      const thumbnail=thumbnails.get(row.id)||row.thumbnail;
      card.innerHTML=`${thumbnail?`<img src="${esc(thumbnail)}" alt="${esc(row.name)} model thumbnail" loading="lazy">`:'<span class="ab-no-thumbnail">Select for 3D view</span>'}<b>${esc(row.name)}</b><small>${esc(row.category)} · ${esc(row.licence||'Licence not recorded')}</small><small>${row.runtimeTriangles==null?'Runtime triangles unmeasured':row.runtimeTriangles.toLocaleString()+' runtime triangles'} · ${bytes(row.runtimeBytes)}</small>`;
      card.onclick=()=>inspect(row);$('list').append(card);
    }
    if(!found.length)$('list').textContent='No matching models. Try fewer search terms or clear a filter.';
  }
  function initRenderer(){
    if(renderer)return;
    renderer=new T.WebGLRenderer({canvas:$('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
    scene=new T.Scene();scene.background=new T.Color('#23363c');scene.add(new T.HemisphereLight('#d8e5e0','#465144',2.5));const sun=new T.DirectionalLight('#ffe4c2',3);sun.position.set(4,8,5);scene.add(sun);
    camera=new T.PerspectiveCamera(42,1,.001,10000);orbit=new OrbitControls(camera,$('canvas'));orbit.enableDamping=false;orbit.addEventListener('change',render);
    new ResizeObserver(render).observe($('canvas').parentElement);
  }
  function render(){if(!renderer||!dialog.open)return;const box=$('canvas').parentElement.getBoundingClientRect();renderer.setSize(Math.max(1,box.width),Math.max(1,box.height),false);camera.aspect=box.width/Math.max(1,box.height);camera.updateProjectionMatrix();renderer.render(scene,camera);}
  function frame(){if(!model)return;const box=new T.Box3().setFromObject(model),centre=box.getCenter(new T.Vector3()),size=Math.max(...box.getSize(new T.Vector3()).toArray(),.001);orbit.target.copy(centre);camera.near=Math.max(.0001,size/1000);camera.far=Math.max(100,size*20);camera.position.copy(centre).add(new T.Vector3(size*1.25,size*.8,size*1.4));orbit.minDistance=size*.05;orbit.maxDistance=size*10;camera.updateProjectionMatrix();orbit.update();render();}
  function details(row,costs=null,dimensions=null){
    const source=safeSource(row.source),authors=Object.entries(row.authors||{}).map(([name,role])=>`${name} (${role})`).join(', ')||'Not recorded';
    $('details').innerHTML=`<h3>${esc(row.name)}</h3><code>${esc(row.id)}</code><dl><dt>Licence / author</dt><dd>${esc(row.licence||'Not recorded')} · ${esc(authors)}</dd><dt>Source</dt><dd>${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">${esc(source)}</a>`:esc(row.source||'No source recorded')}</dd><dt>Modifications</dt><dd>${esc(row.modifications||'Not recorded')}</dd><dt>Download / source scan</dt><dd>${bytes(row.runtimeBytes)} local runtime file · ${row.sourceTriangles?.toLocaleString()||'Unknown'} source triangles</dd><dt>Placement</dt><dd>${row.placement?row.placement.size.join(' × ')+' m, bottom-centred pivot. Floor height and position follow editor focus.':row.semantic?'Existing-container appearance: use the selected bound container’s model selector. Its stable gameplay ID, floor and loot remain attached; this browser does not create searchable containers.':row.collision?.reason?'Inspection only: '+esc(row.collision.reason):'Inspection only: no reviewed placement dimensions in the shared building library.'}</dd>${row.orientationNote||row.front?`<dt>Orientation</dt><dd>${esc(row.orientationNote||'Front '+row.front+'; '+row.mount+' mounting.')}</dd>`:''}${dimensions?`<dt>Model bounds</dt><dd>${dimensions.map(n=>n.toFixed(3)).join(' × ')} source units before placement scaling</dd>`:''}${costs?`<dt>Observed template cost</dt><dd>${costs.triangles.toLocaleString()} triangles · ${costs.meshes} meshes · ${costs.materials} materials · ${costs.drawCalls} estimated draws per instance/pass</dd><dt>Memory estimate</dt><dd>${bytes(costs.geometryBytes)} geometry buffers · ${costs.textures} textures · ${bytes(costs.textureBytes)} RGBA8 texture estimate including mipmaps${costs.unknownTextures?' + '+costs.unknownTextures+' unknown textures':''}. Excludes driver, shadows and render targets; not a device performance measurement.</dd>`:''}</dl>`;
  }
  async function inspect(row){
    const request=++token;selected=row;$('place').disabled=true;$('model-status').textContent='Loading actual model…';details(row);renderList();
    try{
      initRenderer();const template=row.semantic?await createSearchProp(row.id,{library}):await library.template(row.id);if(request!==token)return;
      if(model)scene.remove(model);model=template.clone(true);scene.add(model);frame();
      const costs=modelCosts(template),semantic=template.userData.searchProp;details(row,costs,template.userData.dimensions||semantic?.dimensions);$('model-status').textContent=semantic?.fallbackReason?'Original fallback geometry · licensed source unavailable: '+semantic.fallbackReason:'Actual shared model · '+(row.semantic?'existing-container appearance':'no proxy');$('place').disabled=!row.placement;
      // Rendered on demand from the actual model; no screenshot or concept-art substitute.
      thumbnails.set(row.id,$('canvas').toDataURL('image/webp',.7));renderList();
    }catch(error){if(request!==token)return;if(model){scene?.remove(model);model=null;render();}const message=`${row.id}: ${error.message}`;errors.push(message);$('model-status').textContent='Model unavailable: '+message;$('place').disabled=true;renderList();}
  }
  async function load(){
    const paths=['assets/v7/asset-manifest.json','assets/v10/model-manifest.json','assets/v11/models.json','assets/campaign/registry.json','search-props.json'];
    const results=await Promise.allSettled(paths.map(async path=>{const response=await fetch(path);if(!response.ok)throw Error(`${path}: HTTP ${response.status}`);return response.json()}));
    const manifests=[];results.forEach((result,i)=>{if(result.status==='fulfilled')manifests.push(result.value);else errors.push(paths[i]+': '+result.reason.message)});
    rows=assetCatalogue(manifests,PROP_LIBRARY).filter(row=>row.semantic||library.files?.[row.id]||library.raw[row.id]||library.loaded.has(row.id));
    for(const key of ['category','licence'])for(const value of [...new Set(rows.map(row=>row[key]).filter(Boolean))].sort()){const option=document.createElement('option');option.value=value;option.textContent=value;$(key).append(option)}
    renderList();if(errors.length)$('model-status').textContent=errors.join('\n');
  }
  async function open(){if(!dialog.open)dialog.showModal();readyPromise??=load();await readyPromise;render();$('query').focus()}
  function close(){dialog.close();++token;}
  button.onclick=open;$('close').onclick=close;$('frame').onclick=frame;
  for(const key of controls)$(key).addEventListener(key==='query'?'input':'change',renderList);
  $('place').onclick=()=>{if(!selected?.placement)return;place({...selected.placement,size:[...selected.placement.size]});close()};
  dialog.addEventListener('cancel',()=>{++token});
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  return {open,close,info:()=>({models:rows.length,selected:selected?.id,errors:[...errors]}),destroy:()=>{++token;orbit?.dispose();renderer?.dispose();dialog.remove();button.remove();style.remove()}};
}
