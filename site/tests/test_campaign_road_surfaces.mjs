import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.js';
import {applyCampaignSource} from '../campaign-core.js';

const read=file=>JSON.parse(fs.readFileSync(new URL('../'+file,import.meta.url)));
const source=read('world.json'),routes=read('campaign-routes.json'),before=JSON.stringify(source);
const canonical=value=>typeof value==='number'?(Math.abs(value)<.0000005?0:value).toFixed(6):Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const fingerprint=(world,roads)=>hash({buildings:world.buildings.map(b=>[b.id,...['x','z','w','d'].map(k=>b[k])]),sourceRoads:world.roads,roads:roads.roads,policy:roads.surfaceCompilation.policy});
const meta=routes.surfaceCompilation;
assert.equal(meta.format,'field-signal-campaign-road-surfaces/1');
assert.deepEqual(meta.policy.asphaltIndices,[1,2,3]);assert.equal(meta.policy.asphaltWidth,5.4);assert.equal(meta.policy.dirtWidth,3.5);
assert.equal(meta.policy.joinStyle,'round');assert.equal(meta.policy.uvSpace,'world-xz');
assert.equal(meta.inputsSha256,fingerprint(source,routes));
assert.equal(meta.surfacesSha256,hash(routes.surfaces));
assert.equal(meta.generatorSha256,createHash('sha256').update(fs.readFileSync(new URL('../../'+meta.generator,import.meta.url))).digest('hex'));
const stale=structuredClone(routes);stale.roads[0][1][0]+=.1;assert.notEqual(stale.surfaceCompilation.inputsSha256,fingerprint(source,stale));

const area=ring=>Math.abs(ring.slice(1).reduce((sum,p,i)=>sum+ring[i][0]*p[1]-p[0]*ring[i][1],0))/2;
let triangles=0,polygons=0;
for(const material of ['asphalt','dirt']){
 let total=0;
 for(const row of routes.surfaces[material]){
  polygons++;assert.deepEqual(row.outer[0],row.outer.at(-1));
  const shape=new T.Shape(row.outer.map(p=>new T.Vector2(...p)));
  for(const hole of row.holes)shape.holes.push(new T.Path(hole.map(p=>new T.Vector2(...p))));
  const geometry=new T.ShapeGeometry(shape),positions=geometry.attributes.position,indices=geometry.index;
  let triangulated=0;
  for(let i=0;i<indices.count;i+=3){const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);triangulated+=Math.abs((positions.getX(b)-positions.getX(a))*(positions.getY(c)-positions.getY(a))-(positions.getX(c)-positions.getX(a))*(positions.getY(b)-positions.getY(a)))/2;}
  const expected=area(row.outer)-row.holes.reduce((sum,hole)=>sum+area(hole),0);
  assert.ok(Math.abs(triangulated-expected)<.01,'Committed global coordinates triangulate without self-intersection or filled holes');
  triangles+=indices.count/3;total+=expected;geometry.dispose();
 }
 assert.ok(Math.abs(total-meta.areaSquareMetres[material])<.00001);
}
assert.equal(polygons,meta.polygonCount);
const options={districts:read('districts.json'),props:read('search-props.json'),routes,sourceRevision:read('world-source.json').revision};
const world=applyCampaignSource(source,options);
assert.deepEqual(world.roads,routes.roads);assert.deepEqual(world.roadsUnified,routes.surfaces);
assert.notDeepEqual(world.roadsUnified,source.roadsUnified,'The visible road layer replaces stale source polygons');
assert.equal(JSON.stringify(source),before);
const ringContains=(ring,[x,z])=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const painted=(surfaces,point)=>['asphalt','dirt'].some(key=>surfaces[key].some(p=>ringContains(p.outer,point)&&!p.holes.some(h=>ringContains(h,point))));
assert.ok(painted(source.roadsUnified,[-12,-168]));assert.ok(!painted(world.roadsUnified,[-12,-168]),'Old road through Postmaster house is gone');
assert.ok(painted(world.roadsUnified,[-5.07,-172.57]),'Repaired village route is visibly painted');
assert.ok(!painted(world.roadsUnified,[-86,-143]));assert.ok(painted(world.roadsUnified,[-86,-150.38]),'Road goes round the signal box');
const preview={...source,editorLayout:{buildingId:'hut'}};assert.equal(applyCampaignSource(preview,options),preview);assert.deepEqual(preview.roadsUnified,source.roadsUnified);
const invalid=structuredClone(routes);delete invalid.surfaces;assert.throws(()=>applyCampaignSource(source,{...options,routes:invalid}),/road surfaces/);
world.roadsUnified.asphalt[0].outer[0][0]+=100;assert.deepEqual(routes.surfaces,read('campaign-routes.json').surfaces,'Runtime geometry is cloned');
console.log(`PASS candidate road surfaces: ${polygons} polygons, ${triangles} triangles, source/generator fingerprints, actual Three.js triangulation, route paint and preview isolation`);
