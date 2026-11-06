import * as T from '../../vendor/three.js';
import {resizeAnchored,edgePoint,RESIZABLE} from './resize-core.js';
const EDGES=[['x-',[[0,-1]]],['x+',[[0,1]]],['y-',[[1,-1]]],['y+',[[1,1]]],['z-',[[2,-1]]],['z+',[[2,1]]],['xz--',[[0,-1],[2,-1]]],['xz++',[[0,1],[2,1]]],['xz-+',[[0,-1],[2,1]]],['xz+-',[[0,1],[2,-1]]]];
// The document is never changed during a pointer gesture. Only its selected mesh is
// previewed; validation and the canonical collision/geometry rebuild happen once.
export class ResizeHandles {
 constructor({host,canvas,camera,current,node,enabled,snap,validate,commit,orbit,notice}) {
  Object.assign(this,{host,canvas,camera,current,node,enabled,snap,validate,commit,orbit,notice});
  this.overlay=document.createElement('div');this.overlay.id='resize-handles';this.overlay.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden';host.appendChild(this.overlay);
  this.handles=EDGES.map(([id,axes])=>{const el=document.createElement('button');el.type='button';el.dataset.resizeEdge=id;el.title='Drag local '+id+' edge; opposite edge stays fixed';el.textContent=axes.length===2?'◆':id.toUpperCase();el.style.cssText='position:absolute;pointer-events:auto;transform:translate(-50%,-50%);background:#d5ab72;color:#18251f;border:2px solid #fff3c8;padding:3px;min-width:24px;font-size:10px;cursor:crosshair;touch-action:none';el.onpointerdown=e=>this.start(e,axes);this.overlay.appendChild(el);return {el,axes};});
  this.anchor=document.createElement('span');this.anchor.style.cssText='position:absolute;transform:translate(-50%,-50%);color:#a5f6ad;font-size:23px;display:none';this.anchor.textContent='⊗';this.overlay.appendChild(this.anchor);
  this.label=document.createElement('output');this.label.style.cssText='position:absolute;bottom:50px;left:12px;background:#142721eb;color:#e0e8d4;padding:8px;display:none';this.overlay.appendChild(this.label);
  window.addEventListener('blur',()=>this.cancel());window.addEventListener('keydown',e=>{if(e.code==='Escape'&&this.drag){e.preventDefault();e.stopImmediatePropagation();this.cancel();}},true);
 }
 project(p){const v=new T.Vector3(...p).project(this.camera()),r=this.canvas.getBoundingClientRect();return {x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2,visible:v.z>=-1&&v.z<=1};}
 update(){const o=this.drag?.candidate||this.current(),visible=this.enabled()&&o&&!o.locked&&RESIZABLE.has(o.type)&&this.node()?.visible;this.overlay.hidden=!visible;if(!visible)return;for(const h of this.handles){const p=this.project(edgePoint(o,h.axes));h.el.style.left=p.x+'px';h.el.style.top=p.y+'px';h.el.hidden=!p.visible||!!this.drag&&this.drag.target!==h.el;}if(this.drag){const p=this.project(edgePoint(this.drag.original,this.drag.axes.map(([a,s])=>[a,-s])));this.anchor.style.left=p.x+'px';this.anchor.style.top=p.y+'px';}}
 ray(e){const r=this.canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera());return ray.ray;}
 start(e,axes){if(e.button!==0||this.drag)return;e.preventDefault();e.stopPropagation();const original=structuredClone(this.current()),node=this.node();if(!node)return;
  const axisVectors=axes.map(([axis,sign])=>new T.Vector3(axis===0?sign:0,axis===1?sign:0,axis===2?sign:0).applyAxisAngle(new T.Vector3(0,1,0),original.yaw));
  const edge=new T.Vector3(...edgePoint(original,axes)),direction=axisVectors.reduce((a,v)=>a.add(v),new T.Vector3()).normalize(),view=new T.Vector3();this.camera().getWorldDirection(view);
  const normal=axes.length===2?new T.Vector3(0,1,0):view.clone().addScaledVector(direction,-view.dot(direction)).normalize();
  if(normal.length()<.1){this.notice('Use a side or 3D view to drag this edge.');return;}
  const plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,edge),start=this.ray(e).intersectPlane(plane,new T.Vector3());if(!start)return;
  this.drag={original,candidate:original,node,axes,axisVectors,plane,start,id:e.pointerId,target:e.currentTarget};this.orbit.enabled=false;this.anchor.style.display='block';this.label.style.display='block';this.label.textContent='Opposite edge fixed · Escape cancels';
  e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.onpointermove=ev=>this.move(ev);e.currentTarget.onpointerup=ev=>this.end(ev);e.currentTarget.onpointercancel=()=>this.cancel();this.update();
 }
 move(e){const d=this.drag;if(!d||e.pointerId!==d.id)return;e.preventDefault();const p=this.ray(e).intersectPlane(d.plane,new T.Vector3());if(!p)return;const delta=p.sub(d.start);let out=d.original;for(let i=0;i<d.axes.length;i++){const[axis,sign]=d.axes[i];out=resizeAnchored(out,axis,d.original.size[axis]+delta.dot(d.axisVectors[i]),sign,this.snap());}
  try{this.validate(out);d.candidate=out;d.node.position.fromArray(out.position);d.node.scale.set(...out.size.map((s,i)=>s/d.original.size[i]));this.label.textContent=out.size.map(x=>x.toFixed(3)).join(' × ')+' m · opposite edge fixed';}catch(err){this.label.textContent=err.message+' · last valid size retained';}this.update();
 }
 end(e){const d=this.drag;if(!d||e.pointerId!==d.id)return;e.preventDefault();e.stopPropagation();const candidate=d.candidate;this.cleanup();if(JSON.stringify(candidate)!==JSON.stringify(d.original))this.commit(candidate);}
 cleanup(){const d=this.drag;if(!d)return;d.target.onpointermove=d.target.onpointerup=d.target.onpointercancel=null;if(d.target.hasPointerCapture(d.id))d.target.releasePointerCapture(d.id);d.node.position.fromArray(d.original.position);d.node.scale.set(1,1,1);this.drag=null;this.orbit.enabled=true;this.anchor.style.display=this.label.style.display='none';this.update();}
 cancel(){if(!this.drag)return;this.cleanup();this.notice('Resize cancelled; starting dimensions restored.');}
}
