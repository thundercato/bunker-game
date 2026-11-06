import {entityFor,updateEntity,insertPoint,deletePoint,regionOf} from './world-authoring.js';
export function renderWorldInspector({doc,source,selected,change,select,hidden,toggleHidden}){
 const el=document.querySelector('#selection-info'),host=document.querySelector('#selected-fields');host.replaceChildren();
 const o=entityFor(doc,selected);if(!o){el.textContent='Select through the map or hierarchy.';return;}
 el.textContent=selected.kind==='building'?source.buildings.find(x=>x.id===o.id)?.name:selected.kind==='node'?`${o.id} · point ${selected.index+1}`:selected.kind==='water'?`Water volume ${selected.index+1}`:`${o.kind} · ${o.id}`;
 const field=(key,label,value,{type='number',options,disabled=false}={})=>{
  const l=document.createElement('label');l.textContent=label;const input=document.createElement(options?'select':'input');input.dataset.worldField=key;
  if(options){for(const v of options){const opt=document.createElement('option');opt.value=v;opt.textContent=v;input.append(opt)}input.value=value;}
  else {input.type=type;if(type==='checkbox')input.checked=value;else {input.value=value;input.step=key==='yaw'?'1':'.05';}}
  input.disabled=disabled;input.onchange=()=>change(d=>updateEntity(d,selected,key,options?input.value:type==='checkbox'?input.checked:Number(input.value)));l.append(input);host.append(l);
 };
 const button=(label,fn,id)=>{const b=document.createElement('button');b.textContent=label;if(id)b.id=id;b.onclick=fn;host.append(b);};
 const locked=!!o.locked;
 if(selected.kind==='node'){
  field('x','Point X · m',o.points[selected.index][0]);field('z','Point Z · m',o.points[selected.index][1]);field('width','Surface width · m',o.width);
  button('Insert point after',()=>change(d=>insertPoint(d,selected)),'world-insert-point');
  button('Delete point',()=>change(d=>{deletePoint(d,selected);selected.index=Math.min(selected.index,entityFor(d,selected).points.length-1)}),'world-delete-point');
 }else{
  field('x','X · m',o.x,{disabled:locked});field('z','Z · m',o.z,{disabled:locked});
  if(selected.kind==='building'){
   field('y','Manual / locked height · m',o.y,{disabled:locked||o.foundation==='auto'});
   field('offset','Automatic foundation offset · m',o.offset||0,{disabled:locked||o.foundation!=='auto'});
   field('foundation','Foundation',o.foundation,{options:['auto','manual'],disabled:locked});
  }
  if(selected.kind==='foliage'){
   field('offset','Ground offset · m',o.offset||0,{disabled:locked});field('scale','Scale multiplier',o.scale,{disabled:locked});
   if(locked)field('y','Locked altitude · m',o.y??o.offset??0,{disabled:true});
  }
  if(selected.kind==='water'){
   field('radius','Radius · m',o.radius);field('level','Surface height · m',o.level);
   button('Delete water volume',()=>change(d=>{d.water.splice(selected.index,1);select(null)}),'world-delete-water');
  }else{
   field('yaw','Yaw · degrees',Number((o.yaw*180/Math.PI).toFixed(3)),{disabled:locked});field('locked','Lock transform and altitude',locked,{type:'checkbox'});
  }
 }
 const note=document.createElement('p');note.className='hint';note.textContent='Authoring only · existing world/2 draft. Curves, proxy foliage and water do not change the playable world. Locked objects retain their current altitude during terrain edits.';host.append(note);
 button(hidden.has(selectionKey(selected))?'Show in editor':'Hide in editor',()=>toggleHidden(selected),'world-hide-selection');
}
export const selectionKey=s=>s?`${s.kind}:${s.id??s.index}:${s.kind==='node'?s.index:''}`:'';
export function renderWorldHierarchy({doc,source,selected,select,hidden}){
 const host=document.querySelector('#world-hierarchy'),query=document.querySelector('#world-filter').value.toLowerCase();host.replaceChildren();
 const rows=[...doc.buildings.map(b=>({s:{kind:'building',id:b.id},o:b,name:source.buildings.find(x=>x.id===b.id)?.name,layer:'buildings'})),...doc.foliage.map(f=>({s:{kind:'foliage',id:f.id},o:f,name:f.kind+' '+f.id,layer:'vegetation'})),...doc.water.map((w,index)=>({s:{kind:'water',index},o:w,name:'Water volume '+(index+1),layer:'water'})),...[...doc.roads,doc.rail].flatMap(p=>p.points.map(([x,z],index)=>({s:{kind:'node',id:p.id,index},o:{x,z},name:p.id+' · point '+(index+1),layer:p.kind==='rail'?'rail':'roads'})))];
 const visible=rows.filter(r=>(doc.region==='all'||regionOf(r.o.z)===doc.region)&&(!query||`${r.name} ${r.s.id}`.toLowerCase().includes(query)));
 const count=document.createElement('p');count.className='hint';count.textContent=`${visible.length} matches · regions filter editing visibility`;host.append(count);
 for(const r of visible.slice(0,500)){const b=document.createElement('button');b.dataset.worldId=r.s.id??'water-'+r.s.index;b.dataset.worldKind=r.s.kind;b.textContent=`${r.name}${r.o.locked?' · LOCK':''}${!doc.layers[r.layer]||hidden.has(selectionKey(r.s))?' · HIDDEN':''}`;b.classList.toggle('selected-item',selectionKey(r.s)===selectionKey(selected));b.onclick=()=>select(r.s);host.append(b);}
 if(visible.length>500){const n=document.createElement('p');n.textContent='Showing first 500. Search to narrow the list.';host.append(n);}
}
