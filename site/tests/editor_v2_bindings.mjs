import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seedLayout, clone} from '../layout-core.js';
import {stationReferences, bindingReferences, bindingIssues, refugeReference, missionHref, lootHref} from '../editor/panels/bindings-core.js';
const source=JSON.parse(fs.readFileSync('site/world.json')),original=JSON.stringify(source),layout=seedLayout(source,'hut');
let tests=0;const test=(name,fn)=>{fn();tests++;console.log('PASS',name);};
test('station identities and current source offers match actual world records',()=>{
 const rows=stationReferences(source),radio=rows.find(row=>row.id==='radio');assert.equal(rows.length,Object.keys(source.stations).length);assert.deepEqual(radio.position,source.stations.radio);assert.deepEqual(radio.missions.map(m=>m.id),source.missions.filter(m=>m.source==='radio').map(m=>m.id));
});
test('mission links encode actual stable mission identities',()=>assert.equal(missionHref('signal'), 'editor/missions.html?mission=signal'));
test('container links open its proposal rather than declaring runtime loot changed',()=>assert.equal(lootHref('hut_c1'),'editor/loot.html?container=hut_c1'));
test('selected real container reports binding, mission and per-container authoring links',()=>{
 const ref=bindingReferences(source,layout,'container-hut_c1');assert.equal(ref.kind,'container');assert.equal(ref.bindingId,'hut_c1');assert.equal(ref.record.id,'hut_c1');assert.equal(ref.missions[0].id,'signal');assert.equal(ref.loot,lootHref('hut_c1'));
});
test('rotating or moving a child never changes interaction identity',()=>{
 const edited=clone(layout),object=edited.objects.find(o=>o.id==='container-hut_c1');object.position=[-2,3.2,1];object.yaw=.912;assert.deepEqual(bindingReferences(source,edited,object.id),bindingReferences(source,layout,object.id));
});
test('loose surfaces and doors retain distinct existing interaction kinds',()=>{
 assert.equal(bindingReferences(source,layout,'surface-hut_table').kind,'loose');assert.equal(bindingReferences(source,layout,'entrance').kind,'door');assert.equal(bindingReferences(source,layout,'entrance').bindingId,'hut');
});
test('decoration cannot masquerade as a searchable object',()=>{
 const ref=bindingReferences(source,layout,'ground');assert.equal(ref.kind,'decoration');assert.equal(ref.loot,null);assert.deepEqual(ref.missions,[]);
});
test('no selection has no invented binding',()=>assert.equal(bindingReferences(source,layout,'absent'),null));
test('existing seeded building interaction references validate',()=>assert.deepEqual(bindingIssues(source,layout),[]));
test('duplicate interaction selects the copied offending object and explains repair',()=>{
 const edited=clone(layout),copy=clone(edited.objects.find(o=>o.id==='container-hut_c1'));copy.id='copy';edited.objects.push(copy);const issue=bindingIssues(source,edited).find(q=>q.message.includes('Repeated'));assert.equal(issue.id,'copy');assert.match(issue.repair,/one authored object/);
});
test('foreign binding is not treated as another decorative identity',()=>{
 const edited=clone(layout);edited.objects.find(o=>o.id==='container-hut_c1').binding.id='forester_c0';assert.ok(bindingIssues(source,edited).some(q=>q.message.includes('another building')));
});
test('missing source binding is a focused repair diagnostic',()=>{
 const edited=clone(layout);edited.objects.find(o=>o.id==='container-hut_c1').binding.id='absent';const issue=bindingIssues(source,edited).find(q=>q.message.includes('Missing source'));assert.equal(issue.id,'container-hut_c1');assert.match(issue.repair,/source ID/);
});
test('removed required interaction is reported without guessing a replacement',()=>{
 const edited=clone(layout);edited.objects=edited.objects.filter(o=>o.id!=='container-hut_c1');const issue=bindingIssues(source,edited).find(q=>q.message.includes('Required interaction'));assert.equal(issue.id,null);assert.match(issue.message,/hut_c1/);
});
test('broken mission reference reports source contract failure',()=>{
 const world=clone(source);world.missions[0].container='missing';assert.ok(bindingIssues(world,layout).some(q=>q.message.includes('Mission signal')));
});
test('refuge view retains actual rooms, station IDs, container and transitions',()=>{
 const ref=refugeReference(source);assert.equal(ref.id,'base');assert.equal(ref.rooms.length,source.rooms.length);assert.deepEqual(ref.rooms.map(r=>r.id),source.rooms.map(r=>r.id));assert.deepEqual(ref.containers.map(c=>c.id),source.containers.filter(c=>c.zone==='base').map(c=>c.id));assert.deepEqual(ref.portals.map(p=>p.id),Object.entries(source.portals).filter(([,p])=>p.from==='base').map(([id])=>id));
});
test('refuge excludes field range station without relocating it',()=>{
 const ref=refugeReference(source);assert.ok(ref.stations.some(s=>s.id==='radio'));assert.ok(!ref.stations.some(s=>s.id==='range'));assert.ok(ref.stations.every(s=>s.position[0]>=ref.bounds[0]&&s.position[0]<=ref.bounds[2]));
});
test('bad source station position is explicit and excluded from refuge map',()=>{
 const world=clone(source);world.stations.radio=[NaN,44];assert.equal(stationReferences(world).find(s=>s.id==='radio').position,null);assert.ok(!refugeReference(world).stations.some(s=>s.id==='radio'));
});
test('reference inspection never mutates source or canonical layout JSON',()=>{assert.equal(JSON.stringify(source),original);assert.deepEqual(layout,seedLayout(source,'hut'));});
console.log(`${tests} editor binding/reference tests passed`);
