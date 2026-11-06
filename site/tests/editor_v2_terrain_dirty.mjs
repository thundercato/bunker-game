import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BufferGeometry,Float32BufferAttribute,Color} from '../vendor/three.js';
import {initialWorld,stroke,heightAt} from '../editor/world-core.js';
import {terrainDirtyBounds,affectsTerrain,updateTerrainGeometry} from '../editor/tools/terrain-dirty-core.js';
const source=JSON.parse(fs.readFileSync('site/world.json','utf8'));
function geometry(doc){
 const b=doc.bounds,c=doc.cell,cols=Math.ceil((b.maxX-b.minX)/c),rows=Math.ceil((b.maxZ-b.minZ)/c),pos=[],col=[],indices=[],green=new Color('#597051'),rock=new Color('#74706a');
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const x=Math.min(b.maxX,b.minX+i*c),z=Math.min(b.maxZ,b.minZ+j*c),y=heightAt(doc,x,z),colour=green.clone().lerp(rock,Math.min(1,Math.abs(y)/18));pos.push(x,y,z);col.push(colour.r,colour.g,colour.b);}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,d=a+cols+1,e=d+1;indices.push(a,d,b,b,d,e);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pos,3));g.setAttribute('color',new Float32BufferAttribute(col,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
let cases=0;const check=(name,fn)=>{fn();cases++;console.log('PASS',name);};
function equalGeometry(actual,expected){for(const key of ['position','color','normal']){const a=actual.attributes[key].array,b=expected.attributes[key].array;assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<1e-6,`${key}[${i}]: ${a[i]} vs ${b[i]}`);}}
check('local sculpt reuses geometry and matches a complete position/colour/normal rebuild',()=>{
 const doc=initialWorld(source),g=geometry(doc),position=g.attributes.position,normal=g.attributes.normal;stroke(doc,20,-100,{radius:14,strength:3});
 const dirty=terrainDirtyBounds(doc,20,-100,14),result=updateTerrainGeometry(g,doc,dirty);equalGeometry(g,geometry(doc));assert.equal(g.attributes.position,position);assert.equal(g.attributes.normal,normal);assert.ok(result.positionVertices<result.totalVertices/10);assert.ok(result.normalVertices<result.totalVertices/10);assert.ok(position.updateRanges.length>0);assert.ok(g.boundingBox.max.y>0);
});
check('sequential distant dabs retain pending uploads and never alter distant attributes',()=>{
 const doc=initialWorld(source),g=geometry(doc),before=Array.from(g.attributes.position.array);for(const [x,z]of [[20,-100],[-140,-600]]){stroke(doc,x,z,{radius:12,strength:2});updateTerrainGeometry(g,doc,terrainDirtyBounds(doc,x,z,12));}
 equalGeometry(g,geometry(doc));assert.ok(g.attributes.position.updateRanges.length>=6);let changed=0;for(let i=0;i<before.length;i++)if(before[i]!==g.attributes.position.array[i])changed++;assert.ok(changed<before.length/20);
});
check('boundary and non-grid-aligned world edges retain exact incident normals',()=>{
 const doc=initialWorld(source),g=geometry(doc);for(const [x,z,mode]of [[doc.bounds.minX,doc.bounds.minZ,'lower'],[doc.bounds.maxX,doc.bounds.maxZ,'raise'],[doc.bounds.maxX-4,-100,'smooth']]){stroke(doc,x,z,{radius:24,strength:4,mode});updateTerrainGeometry(g,doc,terrainDirtyBounds(doc,x,z,24));equalGeometry(g,geometry(doc));}
});
check('bilinear dependencies are bounded, with null updates for remote strokes',()=>{
 const doc=initialWorld(source),b=terrainDirtyBounds(doc,0,-100,6);assert.ok(affectsTerrain(b,0,-100));assert.ok(!affectsTerrain(b,200,200));assert.ok(affectsTerrain(b,b.maxX+1,b.maxZ,2));assert.equal(terrainDirtyBounds(doc,100000,100000,6),null);assert.throws(()=>terrainDirtyBounds(doc,NaN,0,10));assert.throws(()=>terrainDirtyBounds(doc,0,0,-1));
});
console.log(`${cases} dirty-terrain tests passed`);
