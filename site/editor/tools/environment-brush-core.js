// Editor-only scatter constraints. Results are ordinary existing world/2 foliage
// instances; there is no new terrain format or gameplay vegetation generator.
import {heightAt, objectHeight} from '../world-core.js';
import {localPoint, worldPoint} from '../../layout-core.js';
import {CatmullRomCurve3, Vector3} from '../../vendor/three.js';

export const BRUSH_DEFAULTS = Object.freeze({
  kind: 'pine', radius: 28, count: 9, seed: 1, spacing: 3,
  minScale: .7, maxScale: 1.4, minYaw: 0, maxYaw: 360,
  avoidBuildings: true, buildingClearance: 2,
  avoidPaths: true, pathClearance: 1,
  avoidWater: true, waterClearance: .05,
  avoidSlopes: true, maxSlope: .65,
});
const round = (n, places=3) => Number(n.toFixed(places));
const finite = n => typeof n === 'number' && Number.isFinite(n);
export function brushSettings(input={}) {
  const settings={...BRUSH_DEFAULTS, ...input};
  if (!['pine','fir','rock','fern','stump'].includes(settings.kind)) throw Error('Choose an existing foliage or rock type.');
  const ranges={radius:[.1,100],spacing:[0,30],minScale:[.05,5],maxScale:[.05,5],minYaw:[-360,360],maxYaw:[-360,360],buildingClearance:[0,15],pathClearance:[0,15],waterClearance:[0,10],maxSlope:[0,3]};
  for(const [key,[min,max]] of Object.entries(ranges)) if(!finite(settings[key])||settings[key]<min||settings[key]>max) throw Error(`Invalid brush ${key}: expected ${min}–${max}.`);
  if(settings.minScale>settings.maxScale||settings.minYaw>settings.maxYaw) throw Error('Minimum scale/yaw must not exceed the maximum.');
  if(!Number.isInteger(settings.seed)||settings.seed<0||settings.seed>4294967295) throw Error('Seed must be an integer from 0 to 4294967295.');
  if(!Number.isInteger(settings.count)||settings.count<1||settings.count>100) throw Error('A dab places 1–100 instances.');
  for(const key of ['avoidBuildings','avoidPaths','avoidWater','avoidSlopes']) if(typeof settings[key]!=='boolean') throw Error(`Invalid ${key} mask.`);
  return settings;
}
function random(seed) {
  let value=seed>>>0;
  return ()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/4294967296);
}
function dabSeed(seed,x,z) {
  return (seed ^ Math.imul(Math.round(x*1000),2246822519) ^ Math.imul(Math.round(z*1000),3266489917))>>>0;
}
export function segmentDistance(x,z,a,b) {
  const dx=b[0]-a[0], dz=b[1]-a[1], length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length)):0;
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
function closeToBounds(x,z,r,points) {
  return x+r>=Math.min(...points.map(p=>p[0]))&&x-r<=Math.max(...points.map(p=>p[0]))&&z+r>=Math.min(...points.map(p=>p[1]))&&z-r<=Math.max(...points.map(p=>p[1]));
}
export function exclusionMasks(doc,source,x,z,settings) {
  const masks={buildings:[],paths:[],water:[]};
  if(settings.avoidBuildings) for(const building of doc.buildings) {
    const original=source.buildings.find(b=>b.id===building.id);
    if(!original) continue;
    const pose={position:[building.x,objectHeight(doc,building),building.z],yaw:building.yaw};
    const halfWidth=original.w/2+settings.buildingClearance, halfDepth=original.d/2+settings.buildingClearance;
    // Existing layout entrances face local +Z. Include an approach, not just the shell.
    const rects=[[-halfWidth,halfWidth,-halfDepth,halfDepth],[-2,2,original.d/2,original.d/2+5+settings.buildingClearance]];
    for(const rect of rects) {
      const [left,right,rear,front]=rect;
      const points=[[left,rear],[right,rear],[right,front],[left,front]].map(([a,b])=>worldPoint(pose,a,b));
      if(closeToBounds(x,z,settings.radius,points)) masks.buildings.push({id:building.id,pose,rect,points});
    }
  }
  if(settings.avoidPaths) for(const path of [...doc.roads,doc.rail]) {
    const points=path.points.map(([px,pz])=>new Vector3(px,0,pz));
    const curve=new CatmullRomCurve3(points,false,'centripetal');
    // Match the authoring viewport's existing curve sampling. This is a placement
    // exclusion estimate, never a claim about runtime road/rail collision.
    const sampled=curve.getPoints(Math.max(24,points.length*9)).map(p=>[p.x,p.z]);
    const radius=path.width/2+settings.pathClearance;
    if(closeToBounds(x,z,settings.radius+radius,sampled)) masks.paths.push({id:path.id,points:sampled,radius});
  }
  if(settings.avoidWater) for(const volume of doc.water) if(Math.hypot(volume.x-x,volume.z-z)<=volume.radius+settings.radius) masks.water.push({...volume});
  return masks;
}
function spacingIndex(items,spacing) {
  const grid=new Map(),cell=Math.max(.01,spacing);
  const key=(x,z)=>`${Math.floor(x/cell)},${Math.floor(z/cell)}`;
  const add=item=>{const k=key(item.x,item.z);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(item);};
  for(const item of items)add(item);
  return {add,blocked(x,z){if(!spacing)return false;const ix=Math.floor(x/cell),iz=Math.floor(z/cell);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const item of grid.get(`${ix+a},${iz+b}`)||[])if(Math.hypot(item.x-x,item.z-z)<spacing-1e-8)return true;return false;}};
}
function rejectionAt(doc,x,z,settings,masks,index) {
  const bounds=doc.bounds;
  if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return 'bounds';
  for(const building of masks.buildings) {
    const [lx,lz]=localPoint(building.pose,x,z),[left,right,rear,front]=building.rect;
    if(lx>=left&&lx<=right&&lz>=rear&&lz<=front)return 'building';
  }
  for(const path of masks.paths)for(let i=1;i<path.points.length;i++)if(segmentDistance(x,z,path.points[i-1],path.points[i])<=path.radius)return 'path';
  const ground=heightAt(doc,x,z);
  if(settings.avoidWater&&(doc.waterLevel>ground+settings.waterClearance||masks.water.some(w=>Math.hypot(w.x-x,w.z-z)<=w.radius&&w.level>ground+settings.waterClearance)))return 'water';
  if(settings.avoidSlopes) {
    const step=doc.cell/2;
    const dx=(heightAt(doc,x+step,z)-heightAt(doc,x-step,z))/(step*2),dz=(heightAt(doc,x,z+step)-heightAt(doc,x,z-step))/(step*2);
    if(Math.hypot(dx,dz)>settings.maxSlope)return 'slope';
  }
  return index.blocked(x,z)?'spacing':null;
}
export function previewScatter(doc,source,x,z,input={}) {
  if(!finite(x)||!finite(z))throw Error('Brush position must use finite metres.');
  const settings=brushSettings(input),masks=exclusionMasks(doc,source,x,z,settings);
  const seed=dabSeed(settings.seed,x,z),rand=random(seed),index=spacingIndex(doc.foliage,settings.spacing);
  const accepted=[],samples=[],rejections={bounds:0,building:0,path:0,water:0,slope:0,spacing:0,capacity:0};
  const target=Math.max(0,Math.min(settings.count,12000-doc.foliage.length));
  rejections.capacity=settings.count-target;
  const limit=Math.min(4000,settings.count*40);
  let attempts=0;
  while(accepted.length<target&&attempts<limit) {
    attempts++;
    const angle=rand()*Math.PI*2,radius=Math.sqrt(rand())*settings.radius;
    const px=round(x+Math.cos(angle)*radius),pz=round(z+Math.sin(angle)*radius);
    // Consume all variation before rejection so mask changes never alter the
    // generated candidate stream or silently rerandomise surviving instances.
    const instance={kind:settings.kind,x:px,z:pz,offset:0,scale:round(settings.minScale+rand()*(settings.maxScale-settings.minScale),4),yaw:round((settings.minYaw+rand()*(settings.maxYaw-settings.minYaw))*Math.PI/180,6),locked:false};
    const reason=rejectionAt(doc,px,pz,settings,masks,index);
    if(reason){rejections[reason]++;if(samples.length<150)samples.push({x:px,z:pz,reason});}
    else {accepted.push(instance);index.add(instance);}
  }
  return {center:{x,z},seed:settings.seed,dabSeed:seed,settings,requested:settings.count,attempts,accepted,rejections,samples,masks};
}
export function paintScatter(doc,source,x,z,input={}) {
  const result=previewScatter(doc,source,x,z,input),known=new Set(doc.foliage.map(f=>f.id));
  let next=Number.isSafeInteger(doc.nextId)&&doc.nextId>=0&&doc.nextId<1e9?doc.nextId:0;
  for(const instance of result.accepted) {
    let id;do{id='plant-'+(++next);}while(known.has(id));known.add(id);
    const saved={id,...instance};doc.foliage.push(saved);instance.id=id;
  }
  if(result.accepted.length)doc.nextId=next;
  return result;
}
export function eraseScatter(doc,x,z,radius) {
  if(![x,z,radius].every(finite)||radius<=0||radius>100)throw Error('Invalid erase brush position/radius.');
  const removed=[],locked=[];
  doc.foliage=doc.foliage.filter(instance=>{
    if(Math.hypot(instance.x-x,instance.z-z)>radius)return true;
    if(instance.locked){locked.push(instance);return true;}
    removed.push(instance);return false;
  });
  return {removed,locked};
}
