import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createWorldDocument, validateWorldDocument, compileBuilding, toWorld, toLocal,
} from '../world-document.js';
import {
  seedLayout, compiledWorld, clone, blocked, surfaceAt, moveInLayout,
  localPoint,
} from '../layout-core.js';
import {initialWorld, stroke} from '../editor/world-core.js';

const source = JSON.parse(fs.readFileSync(new URL('../world.json', import.meta.url)));
// Fixture identity; production callers must use the actual reviewed source SHA.
const sourceRevision = '0'.repeat(40);
const context = {source, sourceRevision};
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const pointNear = (a, b) => a.forEach((v, i) => near(v, b[i]));
const make = (id = 'hut') => createWorldDocument({...context, layouts: [seedLayout(source, id)]});
const placed = (id = 'hut') => {
  const d = make(id), p = d.authoring.buildings.find(b => b.id === id);
  Object.assign(p, {x: -70, z: -100, y: 2, yaw: Math.PI / 2, foundation: 'manual'});
  return d;
};
let count = 0;
function check(name, fn) { fn(); count++; console.log('PASS', name); }

check('v1 interiors and v2 authoring adopt and round-trip without migration', () => {
  const draft = initialWorld(source), layout = seedLayout(source, 'hut');
  stroke(draft, 0, -100, {radius: 30, strength: 2});
  const d = createWorldDocument({...context, draft, layouts: [layout]});
  assert.deepEqual(d.authoring, draft); assert.deepEqual(d.interiors, [layout]);
  assert.deepEqual(validateWorldDocument(JSON.parse(JSON.stringify(d)), context), d);
});
check('Unedited container and mission output agrees with the current v1 compiler', () => {
  const d = make(), c = compileBuilding(d, 'hut', context), legacy = compiledWorld(d.interiors[0], source);
  for (const i of c.interactions.filter(i => i.type !== 'door')) {
    const q = (i.type === 'container' ? legacy.containers : legacy.looseSlots).find(q => q.id === i.id);
    pointNear(i.position, [q.x, q.y, q.z]); near(i.floor, q.floor); near(i.yaw, q.yaw);
  }
  const m = c.missionTargets.find(m => m.id === 'signal');
  const q = legacy.missions.find(m => m.id === 'signal'); pointNear([m.position[0], m.position[2]], [q.x, q.z]);
});
check('90-degree moved and raised cupboard, door, furniture and mission agree', () => {
  const d = placed(), c = compileBuilding(d, 'hut', context);
  const cupboard = c.interactions.find(i => i.id === 'hut_c1');
  // Authored (3.5, 0, -2.4) rotates to (-2.4, 0, -3.5).
  pointNear(cupboard.position, [-72.4, 2.39, -103.5]);
  const model = c.objects.find(o => o.binding?.id === cupboard.id);
  pointNear(model.position, [-72.4, 2, -103.5]);
  near(model.yaw, Math.PI / 2 + d.interiors[0].objects.find(o => o.id === model.id).yaw);
  pointNear(c.missionTargets.find(m => m.id === 'signal').position, cupboard.position);
  pointNear(c.interactions.find(i => i.id === 'hut').position, [-66.5, 3.3, -100]);
  pointNear(c.spawn.position, [-65.1, 2, -100]); near(c.spawn.yaw, Math.PI / 2);
});
check('Inverse transform restores local positions across rotations and negative coordinates', () => {
  for (const yaw of [0, Math.PI / 2, -Math.PI / 2, .713, Math.PI]) {
    const t = {position: [-71, 4.2, -111], yaw};
    for (const p of [[0, 0, 0], [-3, 3.2, 2], [10, -1, -7]]) pointNear(toLocal(t, toWorld(t, p)), p);
  }
});
check('Each compiled collider transforms once and keeps local dimensions and stable door ID', () => {
  const c = compileBuilding(placed(), 'hut', context);
  const wall = c.colliders.find(o => o.id === 'wall-north');
  pointNear([wall.x, wall.y, wall.z], [-73.5, 2, -100]); near(wall.yaw, Math.PI / 2);
  const door = c.colliders.find(o => o.doorId === 'hut');
  pointNear([door.x, door.y, door.z], [-66.5, 2, -100]); near(door.w, 2.2);
});
check('Closed/open door and crossing its threshold agree in the transformed local frame', () => {
  const c = compileBuilding(placed(), 'hut', context), p = toLocal(c.transform, [-66.5, 2, -100]);
  assert.ok(blocked(c.layout, p[0], p[2], p[1], {doorsOpen: false}));
  assert.ok(!blocked(c.layout, p[0], p[2], p[1], {doorsOpen: false, openDoors: {hut: true}}));
  const start = toLocal(c.transform, c.spawn.position);
  const end = moveInLayout(c.layout, {x: start[0], y: start[1], z: start[2]}, 0, -2, {doorsOpen: true});
  const worldEnd = toWorld(c.transform, [end.x, end.y, end.z]);
  assert.ok(worldEnd[0] < -66.5); near(worldEnd[2], -100); near(worldEnd[1], 2);
});
check('Search distances are preserved and the old cupboard position is no longer its anchor', () => {
  const c = compileBuilding(placed(), 'hut', context), anchor = c.interactions.find(i => i.id === 'hut_c1');
  const local = toLocal(c.transform, anchor.position), player = [local[0] - 1, local[1], local[2]];
  const wp = toWorld(c.transform, player);
  near(Math.hypot(...wp.map((n, i) => n - anchor.position[i])), 1);
  const old = source.containers.find(i => i.id === anchor.id);
  assert.ok(Math.hypot(old.x - anchor.position[0], old.z - anchor.position[2]) > 50);
});
check('Loose loot surface dimensions, yaw and height follow its parent prop', () => {
  const d = placed(), o = d.interiors[0].objects.find(o => o.binding?.type === 'loose');
  o.position = [-1, 3.2, 2]; o.yaw = .4;
  const c = compileBuilding(d, 'hut', context), i = c.interactions.find(i => i.id === o.binding.id);
  pointNear(i.position, [-68, 6.2, -99]); near(i.floor, 5.2); near(i.yaw, Math.PI / 2 + .4);
  assert.deepEqual(i.surface, {width: o.size[0], depth: o.size[2]});
});
check('Upstairs item and floor, stair cut-out and stair slope survive building rotation/raise', () => {
  const d = placed('forester'), l = d.interiors[0];
  const o = l.objects.find(o => o.binding?.type === 'container'); o.position = [-2, 3.2, 0];
  const c = compileBuilding(d, 'forester', context), i = c.interactions.find(i => i.id === o.binding.id);
  near(i.floor, 5.2);
  const local = toLocal(c.transform, i.position); near(surfaceAt(c.layout, local[0], local[2], local[1]), 3.2);
  const floor = c.objects.find(o => o.id === 'upper'); near(floor.position[1], 5.2); assert.ok(floor.pieces.length > 1);
  const stairs = l.objects.find(o => o.type === 'stairs');
  const worldMid = toWorld(c.transform, stairs.position), mid = toLocal(c.transform, worldMid);
  near(surfaceAt(c.layout, mid[0], mid[2], 1.6), 1.6);
});
check('World floor cut-out retains the same hole after transforming floor and staircase', () => {
  const d = placed('forester'), c = compileBuilding(d, 'forester', context);
  const stairs = c.objects.find(o => o.type === 'stairs'), floor = c.objects.find(o => o.id === 'upper');
  const [x, z] = localPoint(floor, stairs.position[0], stairs.position[2]);
  assert.ok(!floor.pieces.some(p => Math.abs(x - p.position[0]) < p.size[0] / 2 && Math.abs(z - p.position[2]) < p.size[2] / 2));
});
check('Auto foundation uses draft height; manual and locked heights remain explicit', () => {
  const d = make(), b = d.authoring.buildings.find(b => b.id === 'hut');
  stroke(d.authoring, b.x, b.z, {radius: 40, strength: 3});
  assert.ok(compileBuilding(d, 'hut', context).transform.position[1] > 0);
  b.foundation = 'manual'; b.y = 4; near(compileBuilding(d, 'hut', context).transform.position[1], 4);
  b.foundation = 'auto'; b.locked = true; near(compileBuilding(d, 'hut', context).transform.position[1], 4);
});
check('Recompile is deterministic without accumulating transformations or mutating drafts/source', () => {
  const d = placed(), before = JSON.stringify({d, source});
  const first = compileBuilding(d, 'hut', context); first.objects[0].position[0] = 900;
  const a = compileBuilding(d, 'hut', context), b = compileBuilding(d, 'hut', context);
  assert.deepEqual(a, b); assert.equal(JSON.stringify({d, source}), before);
});
check('Legacy origins stay fixed; applying a placement cannot rewrite child coordinates', () => {
  const d = placed(); d.interiors[0].origin = [-70, 2, -100];
  assert.throws(() => compileBuilding(d, 'hut', context), /origin cannot move/);
});
check('World collision samples agree with local collision at arbitrary building rotation', () => {
  const d = placed(); d.authoring.buildings[0].yaw = .713;
  const c = compileBuilding(d, 'hut', context);
  for (const open of [false, true]) for (const y of [0, 1, 3.2]) {
    for (let x = -4.5; x <= 4.5; x += .5) for (let z = -4; z <= 4; z += .5) {
      const p = toWorld(c.transform, [x, y, z]);
      const hit = c.colliders.some(box => {
        if (box.doorId && open || p[1] >= box.y + box.h - .035 || p[1] + 1.65 <= box.y + .02) return false;
        const [lx, lz] = localPoint({position: [box.x, box.y, box.z], yaw: box.yaw}, p[0], p[2]);
        return Math.abs(lx) < box.w / 2 + .25 && Math.abs(lz) < box.d / 2 + .25;
      });
      // Avoid exact edges where floating-point sin/cos round-off changes '<'.
      const local = toLocal(c.transform, p);
      assert.equal(hit, blocked(c.layout, local[0], local[2], local[1], {doorsOpen: false, openDoors: {hut: open}}));
    }
  }
});
check('Only container-bound existing missions get targets; unrelated missions remain unchanged', () => {
  const d = make(), c = compileBuilding(d, 'hut', context);
  assert.deepEqual(c.missionTargets.map(m => m.id), ['signal']);
  assert.equal(source.missions.find(m => m.id === 'signal').x, 17.5);
});
for (const b of source.buildings) check('All source templates preserve binding IDs when compiled: ' + b.id, () => {
  const c = compileBuilding(make(b.id), b.id, context);
  assert.deepEqual(c.interactions.filter(i => i.type === 'container').map(i => i.id).sort(), source.containers.filter(i => i.building === b.id).map(i => i.id).sort());
  assert.ok(c.interactions.some(i => i.type === 'door' && i.id === b.id));
});
check('Reject unsupported versions, missing/stale source revisions and raw legacy drafts', () => {
  for (const mutate of [d => d.version++, d => d.source.revision = 'a'.repeat(40), d => delete d.source, d => d.source.id = 'v12']) {
    const d = make(); mutate(d); assert.throws(() => validateWorldDocument(d, context));
  }
  assert.throws(() => createWorldDocument({source, sourceRevision: 'main'}), /revision/);
  assert.throws(() => validateWorldDocument(initialWorld(source), context), /world document/);
});
check('Reject duplicate/missing interiors and unsupported new building instances', () => {
  const d = make(); d.interiors.push(clone(d.interiors[0])); assert.throws(() => compileBuilding(d, 'hut', context), /Duplicate interior/);
  assert.throws(() => compileBuilding(make(), 'forester', context), /explicit v1 interior/);
  const unknown = make(); unknown.authoring.buildings[0].id = 'copy-hut'; assert.throws(() => compileBuilding(unknown, 'hut', context));
});
check('Reject invalid transforms before returning any compiled data', () => {
  for (const patch of [{x: NaN}, {yaw: Infinity}, {yaw: 60}, {y: 100}, {x: 900}, {offset: '4'}, {locked: 'yes'}]) {
    const d = make(); Object.assign(d.authoring.buildings[0], patch); assert.throws(() => compileBuilding(d, 'hut', context));
  }
});
check('Reject protected binding deletion, foreign IDs and asset URL injection', () => {
  for (const mutate of [
    d => d.interiors[0].objects = d.interiors[0].objects.filter(o => o.binding?.id !== 'hut_c1'),
    d => d.interiors[0].objects.find(o => o.binding).binding.id = 'forester_c0',
    d => d.interiors[0].objects.find(o => o.binding).asset = 'https://bad.invalid/code.js',
  ]) {const d = make(); mutate(d); assert.throws(() => compileBuilding(d, 'hut', context));}
  assert.throws(() => compileBuilding(make(), 'hut', {...context, assets: new Set()}), /Unknown asset/);
});
check('Uncompiled terrain/roads/water remain in the authoring document, never a runtime override', () => {
  const d = make(); d.authoring.water.push({x: 0, z: -80, radius: 10, level: 2});
  const c = compileBuilding(d, 'hut', context);
  assert.equal(c.editorLayout, undefined); assert.equal(c.buildings, undefined); assert.equal(c.authoring, undefined);
  assert.equal(d.authoring.water.length, 1);
});
console.log(`${count} world document tests passed`);
