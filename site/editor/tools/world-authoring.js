// Editor constraints on the existing world/2 format, never a runtime schema.
import {clone, validate, objectHeight} from '../world-core.js';
export const snapValue=(value,step)=>step?Math.round(value/step)*step:value;
export function regionOf(z){return z>-180?'north':z>-420?'central':'south';}
export function inRegion(region,z){return region==='all'||regionOf(z)===region;}
export function entityFor(doc,selection){
 if(!selection)return null;
 if(selection.kind==='building')return doc.buildings.find(x=>x.id===selection.id);
 if(selection.kind==='foliage')return doc.foliage.find(x=>x.id===selection.id);
 if(selection.kind==='water')return doc.water[selection.index];
 return [...doc.roads,doc.rail].find(x=>x.id===selection.id);
}
export function checkDocument(doc,source){
 const next=validate(doc,source),finite=n=>typeof n==='number'&&Number.isFinite(n);
 if(!['all','north','central','south'].includes(next.region))throw Error('Unknown editor region');
 if(!next.layers||['terrain','vegetation','buildings','roads','rail','water'].some(k=>typeof next.layers[k]!=='boolean'))throw Error('Invalid layer visibility');
 for(const b of doc.buildings)if(b.offset!==undefined&&!finite(b.offset))throw Error('Invalid foundation offset');
 for(const f of doc.foliage)if(![f.offset===undefined?0:f.offset,f.yaw,...(f.y===undefined?[]:[f.y])].every(finite)||typeof f.locked!=='boolean')throw Error('Invalid foliage transform or lock');
 if(new Set(next.foliage.map(f=>f.id)).size!==next.foliage.length)throw Error('Duplicate foliage instance ID');
 for(const p of [...next.roads,next.rail])if(!finite(p.width)||p.width<.2||p.width>30)throw Error('Path width must be 0.2–30 m');
 return next;
}
export function updateEntity(doc,selection,key,value){
 const o=entityFor(doc,selection);if(!o)throw Error('Selection no longer exists');
 if(o.locked&&key!=='locked')throw Error('Unlock this object before editing its transform');
 if(selection.kind==='node'&&['x','z'].includes(key))o.points[selection.index][key==='x'?0:1]=value;
 else if(key==='yaw')o.yaw=value*Math.PI/180;
 else if(key==='locked'){
  // Freezing an automatically grounded instance must retain its visible altitude.
  if(value&&!o.locked)o.y=objectHeight(doc,o);
  o.locked=value;
 }else o[key]=value;
 if(selection.kind==='building'&&['x','z'].includes(key)){
  const {minX,maxX,minZ,maxZ}=doc.bounds;
  if(o.x<minX||o.x>maxX||o.z<minZ||o.z>maxZ)throw Error('Building position is outside the world bounds');
 }
 return doc;
}
export function moveEntity(doc,selection,x,z,step=0){
 const o=entityFor(doc,selection);if(!o||o.locked)return false;
 x=snapValue(x,step);z=snapValue(z,step);
 if(selection.kind==='node')o.points[selection.index]=[x,z];
 else {o.x=Math.max(doc.bounds.minX,Math.min(doc.bounds.maxX,x));o.z=Math.max(doc.bounds.minZ,Math.min(doc.bounds.maxZ,z));}
 return true;
}
export function insertPoint(doc,selection){
 const p=entityFor(doc,selection),i=selection.index;
 if(!p?.points||p.points.length>=150)throw Error('Path limit is 150 points');
 const a=p.points[i],b=p.points[i+1]??[a[0]+(a[0]-p.points[i-1][0]),a[1]+(a[1]-p.points[i-1][1])];
 p.points.splice(i+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);
}
export function deletePoint(doc,selection){const p=entityFor(doc,selection);if(p.points.length<=2)throw Error('A path needs at least two control points');p.points.splice(selection.index,1);}
export function changed(a,b){return JSON.stringify(a)!==JSON.stringify(b);}
export function detachedEdit(doc,source,fn){const next=clone(doc);fn(next);return checkDocument(next,source);}
