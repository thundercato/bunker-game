// Editor viewport updates over the existing fixed world/2 height grid. This
// module changes GPU attributes only; stroke/history remain the canonical tools.
import {heightAt} from '../world-core.js';
import {Color} from '../../vendor/three.js';
const ground=new Color('#597051'),rock=new Color('#74706a');
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function terrainDirtyBounds(doc,x,z,radius) {
  if(![x,z,radius,doc.cell].every(Number.isFinite)||radius<=0||doc.cell<=0)throw Error('Invalid terrain update bounds.');
  const c=doc.cell,r=Math.max(2,radius),b=doc.bounds;
  // A changed height-grid sample influences the adjoining bilinear cells.
  const bounds={minX:Math.max(b.minX,Math.floor((x-r)/c)*c-c),maxX:Math.min(b.maxX,Math.ceil((x+r)/c)*c+c),minZ:Math.max(b.minZ,Math.floor((z-r)/c)*c-c),maxZ:Math.min(b.maxZ,Math.ceil((z+r)/c)*c+c)};
  return bounds.minX>bounds.maxX||bounds.minZ>bounds.maxZ?null:bounds;
}
export function affectsTerrain(bounds,x,z,margin=0) {
  return !!bounds&&x>=bounds.minX-margin&&x<=bounds.maxX+margin&&z>=bounds.minZ-margin&&z<=bounds.maxZ+margin;
}
function rectangle(doc,bounds,extra=0) {
  const b=doc.bounds,c=doc.cell,cols=Math.ceil((b.maxX-b.minX)/c),rows=Math.ceil((b.maxZ-b.minZ)/c);
  return {cols,rows,minI:clamp(Math.floor((bounds.minX-b.minX)/c)-extra,0,cols),maxI:clamp(Math.ceil((bounds.maxX-b.minX)/c)+extra,0,cols),minJ:clamp(Math.floor((bounds.minZ-b.minZ)/c)-extra,0,rows),maxJ:clamp(Math.ceil((bounds.maxZ-b.minZ)/c)+extra,0,rows)};
}
function uploadRows(attribute,rect) {
  if(!attribute)return;
  // Keep earlier disjoint dabs pending until the next render has uploaded them.
  for(let j=rect.minJ;j<=rect.maxJ;j++)attribute.addUpdateRange?.((j*(rect.cols+1)+rect.minI)*3,(rect.maxI-rect.minI+1)*3);
  attribute.needsUpdate=true;
}
export function updateTerrainGeometry(geometry,doc,bounds) {
  if(!bounds)return {positionVertices:0,normalVertices:0,totalVertices:geometry.attributes.position.count};
  const position=geometry.attributes.position,normal=geometry.attributes.normal,color=geometry.attributes.color,r=rectangle(doc,bounds),width=r.cols+1;
  if(position.count!==width*(r.rows+1)||!normal)throw Error('Terrain geometry no longer matches the editor height-grid contract.');
  let positionVertices=0;
  for(let j=r.minJ;j<=r.maxJ;j++)for(let i=r.minI;i<=r.maxI;i++){
    const index=j*width+i,y=heightAt(doc,position.getX(index),position.getZ(index));position.setY(index,y);positionVertices++;
    if(color){const mix=Math.min(1,Math.abs(y)/18);color.setXYZ(index,ground.r+(rock.r-ground.r)*mix,ground.g+(rock.g-ground.g)*mix,ground.b+(rock.b-ground.b)*mix);}
  }
  uploadRows(position,r);uploadRows(color,r);
  const n={...r,minI:Math.max(0,r.minI-1),maxI:Math.min(r.cols,r.maxI+1),minJ:Math.max(0,r.minJ-1),maxJ:Math.min(r.rows,r.maxJ+1)};
  const sums=new Map();for(let j=n.minJ;j<=n.maxJ;j++)for(let i=n.minI;i<=n.maxI;i++)sums.set(j*width+i,[0,0,0]);
  function triangle(a,b,c){
    const abx=position.getX(b)-position.getX(a),aby=position.getY(b)-position.getY(a),abz=position.getZ(b)-position.getZ(a),acx=position.getX(c)-position.getX(a),acy=position.getY(c)-position.getY(a),acz=position.getZ(c)-position.getZ(a);
    const x=aby*acz-abz*acy,y=abz*acx-abx*acz,z=abx*acy-aby*acx;
    for(const index of [a,b,c]){const sum=sums.get(index);if(sum){sum[0]+=x;sum[1]+=y;sum[2]+=z;}}
  }
  // Re-sum every incident triangle of each affected normal, including unchanged
  // neighbours; updating only changed faces leaves a visible lighting seam.
  for(let j=Math.max(0,n.minJ-1);j<=Math.min(r.rows-1,n.maxJ);j++)for(let i=Math.max(0,n.minI-1);i<=Math.min(r.cols-1,n.maxI);i++){
    const a=j*width+i,b=a+1,d=a+width,e=d+1;triangle(a,d,b);triangle(b,d,e);
  }
  for(const [index,[x,y,z]]of sums){const length=Math.hypot(x,y,z)||1;normal.setXYZ(index,x/length,y/length,z/length);}
  uploadRows(normal,n);
  // Raycasting must include raised/lowered vertices. Recalculating these small
  // bounds does not allocate a replacement geometry or re-upload distant data.
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return {positionVertices,normalVertices:sums.size,totalVertices:position.count};
}
