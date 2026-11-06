/* Deterministic, reviewable detours preserve building/mission coordinates. */
import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync('site/world.json'));
const inside=(p,r)=>p[0]>r[0]&&p[0]<r[2]&&p[1]>r[1]&&p[1]<r[3];
function intersects(a,b,r){
 let lo=0,hi=1;
 for(let axis=0;axis<2;axis++){
  const delta=b[axis]-a[axis],mn=r[axis],mx=r[axis+2];
  if(Math.abs(delta)<1e-9){if(a[axis]<=mn||a[axis]>=mx)return false;continue;}
  let t0=(mn-a[axis])/delta,t1=(mx-a[axis])/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(hi<=lo)return false;
 }return hi>lo+1e-8;
}
function routing(width){
 const pad=width/2+.15,obstacles=source.buildings.map(b=>[b.x-b.w/2-pad,b.z-b.d/2-pad,b.x+b.w/2+pad,b.z+b.d/2+pad]);
 const free=p=>!obstacles.some(r=>inside(p,r));
 const visible=(a,b)=>!obstacles.some(r=>intersects(a,b,r));
 const corners=obstacles.flatMap(r=>[[r[0]-.03,r[1]-.03],[r[2]+.03,r[1]-.03],[r[2]+.03,r[3]+.03],[r[0]-.03,r[3]+.03]]).filter(free);
 const nearest=p=>{
  if(free(p))return p;
  const candidates=obstacles.flatMap(r=>[[r[0]-.03,p[1]],[r[2]+.03,p[1]],[p[0],r[1]-.03],[p[0],r[3]+.03]]).filter(free);
  return candidates.sort((a,b)=>Math.hypot(a[0]-p[0],a[1]-p[1])-Math.hypot(b[0]-p[0],b[1]-p[1]))[0];
 };
 return points=>{
  const fixed=points.map(nearest),result=[fixed[0]];
  for(let i=1;i<fixed.length;i++){
   const a=result.at(-1),b=fixed[i];if(visible(a,b)){result.push(b);continue;}
   const vertices=[a,b,...corners],distance=vertices.map(()=>Infinity),previous=[],done=new Set();distance[0]=0;
   while(!done.has(1)){
    let next=-1;for(let k=0;k<vertices.length;k++)if(!done.has(k)&&(next===-1||distance[k]<distance[next]))next=k;
    if(next===-1||!Number.isFinite(distance[next]))throw Error('No safe route');done.add(next);
    for(let k=0;k<vertices.length;k++)if(!done.has(k)&&visible(vertices[next],vertices[k])){
     const length=distance[next]+Math.hypot(vertices[next][0]-vertices[k][0],vertices[next][1]-vertices[k][1]);
     if(length<distance[k]){distance[k]=length;previous[k]=next;}
    }
   }
   const path=[];for(let k=1;k!==0;k=previous[k])path.unshift(vertices[k]);result.push(...path);
  }
  return result.map(p=>p.map(n=>+n.toFixed(3)));
 };
}
const roads=source.roads.map((p,i)=>routing(i===0?3.5:5.4)(p));
const rail=routing(2.2)(source.rail.route);
const output={format:'field-signal-campaign-routes/1',version:1,sourceRevision:'6b4f9fb9401398a65eee576f40b2d80805ef6c76',policy:'Preserve building, container and mission IDs/coordinates. Detour existing path indices around expanded footprints.',roads,rail};
fs.writeFileSync('site/campaign-routes.json',JSON.stringify(output,null,2)+'\n');
console.log(`Compiled ${roads.length} roads and ${rail.length} rail nodes without building intersections`);
