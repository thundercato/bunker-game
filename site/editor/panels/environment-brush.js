import * as T from '../../vendor/three.js';
import {heightAt} from '../world-core.js';
import {brushSettings,previewScatter,paintScatter,eraseScatter} from '../tools/environment-brush-core.js';

function previewOverlay(scene,getDocument) {
  if(!scene)return {show(){},hide(){},destroy(){}};
  const group=new T.Group();group.name='Editor scatter preview — not authored';scene.add(group);
  const green=new T.PointsMaterial({color:'#9eeab8',size:5,depthTest:false,sizeAttenuation:false});
  const red=new T.PointsMaterial({color:'#ee8d80',size:3.5,depthTest:false,sizeAttenuation:false});
  const amber=new T.LineBasicMaterial({color:'#e3bd78',depthTest:false,transparent:true,opacity:.7});
  const water=new T.LineBasicMaterial({color:'#82d3e6',depthTest:false,transparent:true,opacity:.8});
  const point=(x,z)=>new T.Vector3(x,heightAt(getDocument(),x,z)+.3,z);
  function clear(){for(const child of group.children)child.geometry.dispose();group.clear();}
  function line(points,material=amber,loop=false){const geometry=new T.BufferGeometry().setFromPoints(points.map(([x,z])=>point(x,z)));const mesh=loop?new T.LineLoop(geometry,material):new T.Line(geometry,material);mesh.renderOrder=60;group.add(mesh);}
  function show(result){clear();group.visible=!!result;if(!result)return;
    for(const [items,material]of [[result.accepted,green],[result.samples,red]]){
      const geometry=new T.BufferGeometry().setFromPoints(items.map(item=>point(item.x,item.z)));
      const mesh=new T.Points(geometry,material);mesh.renderOrder=61;group.add(mesh);
    }
    for(const building of result.masks.buildings)line(building.points,amber,true);
    for(const path of result.masks.paths){
      for(const sign of [-1,1])line(path.points.map((p,i)=>{
        const a=path.points[Math.max(0,i-1)],b=path.points[Math.min(path.points.length-1,i+1)];
        const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
        return[p[0]+sign*dz/length*path.radius,p[1]-sign*dx/length*path.radius];
      }));
    }
    for(const volume of result.masks.water)line(Array.from({length:48},(_,i)=>[volume.x+Math.cos(i/48*Math.PI*2)*volume.radius,volume.z+Math.sin(i/48*Math.PI*2)*volume.radius]),water,true);
  }
  return {show,hide(){group.visible=false;},destroy(){clear();scene.remove(group);green.dispose();red.dispose();amber.dispose();water.dispose();}};
}
export function mountEnvironmentBrush({getDocument,getSource,host,scene,notice=()=>{},readPrimary}={}) {
  if(!getDocument||!getSource)throw Error('Environment brush needs the current editor document/source.');
  host??=document.querySelector('#tools')?.parentElement;
  const panel=document.createElement('details');panel.id='environment-brush';panel.open=true;
  panel.innerHTML=`<summary>Seeded brush · placement masks</summary>
  <p class="hint">Controls affect the next dab only. Existing forest instances keep their positions, scale, yaw and IDs.</p>
  <div class="environment-pair"><label>Seed<input data-environment="seed" type="number" min="0" max="4294967295" step="1" value="1"></label><label>Minimum spacing · m<input data-environment="spacing" type="number" min="0" max="30" step="0.25" value="3"></label></div>
  <div class="environment-pair"><label>Minimum scale<input data-environment="minScale" type="number" min="0.05" max="5" step="0.05" value="0.7"></label><label>Maximum scale<input data-environment="maxScale" type="number" min="0.05" max="5" step="0.05" value="1.4"></label></div>
  <div class="environment-pair"><label>Yaw from · °<input data-environment="minYaw" type="number" min="-360" max="360" value="0"></label><label>Yaw to · °<input data-environment="maxYaw" type="number" min="-360" max="360" value="360"></label></div>
  <label><input data-environment="avoidBuildings" type="checkbox" checked> Avoid buildings / door approaches</label>
  <label>Building clearance · m<input data-environment="buildingClearance" type="number" min="0" max="15" step="0.25" value="2"></label>
  <label><input data-environment="avoidPaths" type="checkbox" checked> Avoid road and railway curves</label>
  <label>Path clearance · m<input data-environment="pathClearance" type="number" min="0" max="15" step="0.25" value="1"></label>
  <label><input data-environment="avoidWater" type="checkbox" checked> Avoid submerged ground / local water</label>
  <label><input data-environment="avoidSlopes" type="checkbox" checked> Avoid steep terrain</label>
  <label>Maximum slope · %<input data-environment="slopePercent" type="number" min="0" max="300" step="5" value="65"></label>
  <output id="environment-brush-report" role="status">Move the foliage brush over terrain for a placement preview.</output>
  <p class="hint">Green points: next placements. Red points: rejected candidates. Amber: building/path exclusion estimates. Blue: local water outlines. Spacing is between centres, in metres. Erase retains individually locked instances.</p>
  <p class="hint">Authoring proxies only. These masks do not add runtime terrain, water or road physics.</p>`;
  const style=document.createElement('style');style.textContent='#environment-brush{border:1px solid #3f5757;padding:8px;margin:12px 0;font-size:11px}#environment-brush summary{cursor:pointer;color:#a9d4ba}#environment-brush .environment-pair{display:grid;grid-template-columns:1fr 1fr;gap:7px}#environment-brush input[type=checkbox]{width:auto;margin-right:5px}#environment-brush output{display:block;line-height:1.5;padding:7px;background:#0d1c21;border-left:2px solid #8cbca4;color:#cfdfd1}';
  style.textContent+='#environment-brush-preview-summary{position:absolute;top:12px;right:12px;max-width:290px;background:#101c22ed;border:1px solid #76a58d;border-radius:5px;padding:9px;pointer-events:none;white-space:pre-line;font:11px/1.5 ui-monospace;color:#d7ebde}';
  document.head.append(style);host.append(panel);
  const previewReport=document.createElement('output');previewReport.id='environment-brush-preview-summary';previewReport.hidden=true;previewReport.setAttribute('aria-live','polite');document.querySelector('#world-viewport')?.append(previewReport);
  const overlay=previewOverlay(scene,getDocument),report=panel.querySelector('output');
  const controls=Object.fromEntries([...panel.querySelectorAll('[data-environment]')].map(input=>[input.dataset.environment,input]));
  let lastCenter=null,lastResult=null;
  function settings(){
    const primary=readPrimary?.()||{kind:document.querySelector('#foliage')?.value||'pine',radius:Number(document.querySelector('#radius')?.value||28),count:Number(document.querySelector('#density')?.value||9)};
    const options={...primary};
    for(const [key,input]of Object.entries(controls))if(key!=='slopePercent')options[key]=input.type==='checkbox'?input.checked:Number(input.value);
    options.maxSlope=Number(controls.slopePercent.value)/100;
    return brushSettings(options);
  }
  function showPreview(result){
    lastResult=result;overlay.show(result);if(!result)return;
    const rejected=Object.entries(result.rejections).filter(([,count])=>count).map(([reason,count])=>`${count} ${reason}`).join(', ');
    previewReport.hidden=false;previewReport.textContent=`${result.accepted.length} / ${result.requested} ${result.settings.kind} next · seed ${result.seed}${rejected?'\nRejected: '+rejected:''}`;
    report.textContent=`${result.accepted.length} / ${result.requested} next placements · seed ${result.seed}${rejected?' · rejected: '+rejected:''}. No existing instances regenerated.`;
  }
  function preview(x,z){lastCenter={x,z};try{const result=previewScatter(getDocument(),getSource(),x,z,settings());showPreview(result);return result;}catch(error){overlay.hide();previewReport.hidden=false;previewReport.textContent=error.message;report.textContent=error.message;return null;}}
  function paint(doc,x,z){const result=paintScatter(doc,getSource(),x,z,settings());showPreview(result);return result;}
  function erase(doc,x,z){const result=eraseScatter(doc,x,z,settings().radius);overlay.hide();previewReport.hidden=false;previewReport.textContent=`Erased ${result.removed.length} · retained ${result.locked.length} locked`;report.textContent=`Erased ${result.removed.length} instances · retained ${result.locked.length} locked instances.`;return result;}
  for(const input of Object.values(controls))input.onchange=()=>{try{settings();if(lastCenter)preview(lastCenter.x,lastCenter.z);}catch(error){report.textContent=error.message;notice(error.message);}};
  return {element:panel,settings,preview,paint,erase,showPreview,hidePreview:()=>{overlay.hide();previewReport.hidden=true;},lastResult:()=>lastResult,destroy(){overlay.destroy();panel.remove();previewReport.remove();style.remove();}};
}
