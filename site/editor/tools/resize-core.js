// Editor operations on the existing layout v1 objects. No alternate document format.
import {clone, worldPoint} from '../../layout-core.js';
export const RESIZABLE = new Set(['wall','doorway','window','floor','roof','stairs','prop']);
export const MIN_SIZE = .02;
export function resizeAnchored(object, axis, size, movingSign=1, snap=0) {
 if (!RESIZABLE.has(object.type) || object.locked) throw Error('Unlock a structural object or prop to resize it.');
 if (![0,1,2].includes(axis) || ![-1,0,1].includes(movingSign) || !Number.isFinite(size)) throw Error('Invalid resize dimensions.');
 const out=clone(object);
 size=snap>0?Math.round(size/snap)*snap:size;
 size=Math.max(MIN_SIZE,Math.min(65,size));
 const delta=size-object.size[axis];
 out.size[axis]=size;
 if(movingSign!==0){
  if(axis===1)out.position[1]+=(movingSign-(object.type==='floor'?-1:1))*delta/2;
  else {
   const local=[0,0];local[axis===0?0:1]=movingSign*delta/2;
   const [x,z]=worldPoint(object,...local);out.position[0]=x;out.position[2]=z;
  }
 }
 return out;
}
export function localOffset(object, values) {
 if(!values.every(Number.isFinite))throw Error('Local offset needs finite metres.');
 const out=clone(object),[x,z]=worldPoint(object,values[0],values[2]);out.position=[x,object.position[1]+values[1],z];return out;
}
export function edgePoint(object, axes) {
 const p=[0,object.type==='floor'?-object.size[1]/2:object.size[1]/2,0];
 for(const [axis,sign]of axes)p[axis]+=object.size[axis]/2*sign;
 const[x,z]=worldPoint(object,p[0],p[2]);return [x,object.position[1]+p[1],z];
}
