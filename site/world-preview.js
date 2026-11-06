// Pure preview adapter. Normal gameplay never calls this compiler.
import {clone, geometryPieces, moveInLayout, surfaceAt} from './layout-core.js';
import {compileBuilding, toWorld, toLocal} from './world-document.js';

export function insidePreview(building, x, z, margin = .35) {
  const p = toLocal(building.transform, [x, 0, z]);
  return Math.abs(p[0]) < building.bounds[0] / 2 + margin &&
    Math.abs(p[2]) < building.bounds[1] / 2 + margin;
}

export function previewSurface(building, x, z, lastY = 0) {
  const p = toLocal(building.transform, [x, lastY, z]);
  return building.transform.position[1] + surfaceAt(building.layout, p[0], p[2], p[1]);
}

export function moveInPreview(building, player, dx, dz, options) {
  const p = toLocal(building.transform, [player.x, player.y || 0, player.z]);
  const yaw = building.transform.yaw, c = Math.cos(yaw), s = Math.sin(yaw);
  const q = moveInLayout(building.layout, {x: p[0], y: p[1], z: p[2]},
    dx * c - dz * s, dx * s + dz * c, options);
  const [x, y, z] = toWorld(building.transform, [q.x, q.y, q.z]);
  return {...player, x, y, z};
}

export function compilePreviewWorld(document, buildingId, context) {
  const building = compileBuilding(document, buildingId, context);
  const world = clone(context.source), spec = world.buildings.find(b => b.id === buildingId);
  const [x, y, z] = building.transform.position;
  if (y < 0 || y > 8) throw Error('Building preview foundation must be between 0 and 8 metres.');
  const c = Math.abs(Math.cos(building.transform.yaw)), s = Math.abs(Math.sin(building.transform.yaw));
  const w = spec.w * c + spec.d * s, d = spec.d * c + spec.w * s, pad = 2.5;
  const bounds = world.bounds, river = world.river;
  if (x - w/2 - pad <= bounds.minX || x + w/2 + pad >= bounds.maxX ||
      z - d/2 - pad <= bounds.minZ || z + d/2 + pad >= world.swamp.start ||
      !(x + w/2 + pad < river.west || x - w/2 - pad > river.east)) {
    throw Error('Place this preview building on dry field ground, inside the map and north of the swamp.');
  }
  if (world.buildings.some(b => b.id !== buildingId && Math.abs(x-b.x) < (w+b.w)/2+pad && Math.abs(z-b.z) < (d+b.d)/2+pad)) {
    throw Error('This preview building overlaps another building. Move it into a clear area.');
  }
  Object.assign(spec, {x, z, w, d, yaw: building.transform.yaw, editorScene: true,
    editorBounds: building.bounds, editorTransform: building.transform});
  world.editorLayout = building.layout;
  world.editorBuilding = building;
  world.editorColliders = building.colliders;
  world.editorFloors = building.layout.objects.filter(o => o.type === 'floor').map(o => ({...o, pieces: geometryPieces(building.layout, o)}));
  for (const i of building.interactions.filter(i => i.type !== 'door')) {
    const q = (i.type === 'container' ? world.containers : world.looseSlots).find(q => q.id === i.id);
    Object.assign(q, {x: i.position[0], y: i.position[1], z: i.position[2], floor: i.floor, yaw: i.yaw, editorScene: true});
    if (i.surface) q.editorSurface = {...i.surface, yaw: i.yaw};
  }
  for (const target of building.missionTargets) {
    const m = world.missions.find(m => m.id === target.id);
    m.x = target.position[0]; m.z = target.position[2];
  }
  for (const p of world.partitions.filter(p => p.building === buildingId)) p.editorScene = true;
  return world;
}

// Adapt legacy previews to the same coordinate helpers without changing their JSON.
export function previewBuilding(data) {
  if (data.editorBuilding) return data.editorBuilding;
  const layout = data.editorLayout;
  return layout ? {layout, bounds: layout.bounds, transform: {position: layout.origin, yaw: 0}} : null;
}
