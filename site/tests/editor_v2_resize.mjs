import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resizeAnchored,edgePoint,localOffset} from '../editor/tools/resize-core.js';
import {seedLayout,validateLayout,collidersFor,geometryPieces,worldPoint} from '../layout-core.js';
const world=JSON.parse(fs.readFileSync(new URL('../world.json',import.meta.url)));
let checks=0;
const equal=(a,b,msg)=>{assert.ok(Math.abs(a-b)<1e-9,msg+`: ${a} != ${b}`);checks++;};
const vec=(a,b,msg)=>a.forEach((x,i)=>equal(x,b[i],msg+' '+i));
const base={id:'test',name:'Floor',type:'floor',position:[0,0,0],size:[4,.16,4],yaw:0,material:'concrete',locked:false,solid:true};
let changed=resizeAnchored(base,0,5,1);
vec(changed.position,[.5,0,0],'positive X centred correctly');vec(edgePoint(changed,[[0,-1]]),edgePoint(base,[[0,-1]]),'negative edge fixed');
assert.equal(base.size[0],4);checks++;
for(const type of ['floor','wall','roof','stairs'])for(const yaw of [0,Math.PI/2,.731,-1.291])for(const axis of [0,1,2])for(const sign of [-1,1]){
 const before={...base,type,yaw,position:[1,2,-3]},after=resizeAnchored(before,axis,before.size[axis]+.63,sign);
 vec(edgePoint(after,[[axis,-sign]]),edgePoint(before,[[axis,-sign]]),'fixed edge in rotated '+type);
 equal(after.size[axis],before.size[axis]+.63,'dimension');
 // Parent rotation composes once using the canonical local-to-world helper.
 const parent={position:[42,0,-7],yaw:.419};
 const beforeEdge=edgePoint(before,[[axis,-sign]]),afterEdge=edgePoint(after,[[axis,-sign]]);
 vec(worldPoint(parent,beforeEdge[0],beforeEdge[2]),worldPoint(parent,afterEdge[0],afterEdge[2]),'fixed under parent yaw');
}
changed=resizeAnchored(base,0,-100,1);equal(changed.size[0],.02,'crossing clamps at minimum');
changed=resizeAnchored(base,0,4.26,1,.25);equal(changed.size[0],4.25,'snap dimension');
changed=resizeAnchored(base,0,4.26,0);vec(changed.position,base.position,'centre anchor unchanged');
assert.throws(()=>resizeAnchored({...base,locked:true},0,5));assert.throws(()=>resizeAnchored(base,0,NaN));checks+=2;
changed=localOffset({...base,yaw:Math.PI/2},[2,.25,3]);vec(changed.position,[3,.25,-2],'object-local numeric move');
const doc=seedLayout(world,'hut'),floor=doc.objects.find(o=>o.id==='ground');
floor.yaw=.731;Object.assign(floor,resizeAnchored(floor,0,floor.size[0]+1.25,1));
const validated=validateLayout(doc,{world});assert.deepEqual(validateLayout(JSON.parse(JSON.stringify(validated)),{world}),validated);checks++;
const collision=collidersFor(validated).find(c=>c.id==='ground'),piece=geometryPieces(validated,floor)[0];
equal(collision.w,floor.size[0],'collision width agrees');equal(piece.size[0],floor.size[0],'mesh geometry width agrees');equal(collision.x,floor.position[0],'collision position agrees');equal(collision.y,floor.position[1]-floor.size[1],'floor top convention');
const door=doc.objects.find(o=>o.type==='doorway');Object.assign(door,resizeAnchored(door,0,.5,1));assert.throws(()=>validateLayout(doc,{world}),/Opening does not fit/);checks++;
console.log(`PASS ${checks} editor anchored resize checks`);
