/* Authoring contract and pure compiler. This module does not activate a preview,
   patch DATA, load assets or read/write browser storage. See docs/WORLD_DOCUMENT.md. */
import {
  clone, validateLayout, geometryPieces, collidersFor, worldPoint, localPoint, bindingAnchor,
} from './layout-core.js';
import {
  initialWorld, validate as validateDraft, objectHeight,
} from './editor/world-core.js';

export const FORMAT = 'field-signal-world-document';
export const VERSION = 1;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const fail = message => { throw Error(message); };

function revision(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) {
    fail('A full source Git revision is required.');
  }
  return value;
}

// Adopt existing portable drafts without rewriting their format, IDs or origins.
export function createWorldDocument({source, sourceRevision, draft = initialWorld(source), layouts = []}) {
  return validateWorldDocument({
    format: FORMAT, version: VERSION,
    source: {id: 'overgrowth-v11', revision: sourceRevision},
    authoring: draft, interiors: layouts,
  }, {source, sourceRevision});
}

export function validateWorldDocument(input, {source, sourceRevision, assets = null}) {
  revision(sourceRevision);
  if (!input || input.format !== FORMAT || input.version !== VERSION) {
    fail('Not a Field Signal world document v1.');
  }
  if (input.source?.id !== 'overgrowth-v11' || revision(input.source?.revision) !== sourceRevision) {
    fail('World document source revision mismatch. Rebase explicitly before compiling.');
  }
  const draft = validateDraft(input.authoring, source);
  // v2 accepts out-of-map placement and optional offsets; compilation must not.
  for (const b of draft.buildings) {
    if (b.x < draft.bounds.minX || b.x > draft.bounds.maxX ||
        b.z < draft.bounds.minZ || b.z > draft.bounds.maxZ ||
        Math.abs(b.y) > 55 || Math.abs(b.yaw) > Math.PI * 16 ||
        typeof b.locked !== 'boolean' ||
        (b.offset !== undefined && (!finite(b.offset) || Math.abs(b.offset) > 55))) {
      fail('Invalid building placement: ' + b.id);
    }
  }
  if (!Array.isArray(input.interiors) || input.interiors.length > source.buildings.length) {
    fail('Interiors must be an array of existing building layouts.');
  }
  const ids = new Set();
  const interiors = input.interiors.map(layout => {
    const doc = validateLayout(layout, {world: source, assets});
    if (ids.has(doc.buildingId)) fail('Duplicate interior: ' + doc.buildingId);
    ids.add(doc.buildingId);
    return doc;
  });
  return {
    format: FORMAT, version: VERSION,
    source: {id: 'overgrowth-v11', revision: sourceRevision},
    authoring: draft, interiors,
  };
}

// Y-up metres, radians. Matches Three.js/layout-core positive Y rotation:
// +local Z rotates towards +world X; a child yaw is added exactly once.
export function toWorld(transform, position) {
  const [x, z] = worldPoint(transform, position[0], position[2]);
  return [x, transform.position[1] + position[1], z];
}

export function toLocal(transform, position) {
  const [x, z] = localPoint(transform, position[0], position[2]);
  return [x, position[1] - transform.position[1], z];
}

function pose(transform, object) {
  return {...clone(object), position: toWorld(transform, object.position), yaw: transform.yaw + object.yaw};
}

// Deliberately compile ONE building, not a purported playable v2 world. Uncompiled
// terrain/roads/water/foliage stay authored data. No source object is modified.
export function compileBuilding(input, buildingId, context) {
  const doc = validateWorldDocument(input, context);
  const layout = doc.interiors.find(d => d.buildingId === buildingId);
  if (!layout) fail('An explicit v1 interior is required for ' + buildingId);
  const placement = doc.authoring.buildings.find(b => b.id === buildingId);
  const transform = {
    position: [placement.x, objectHeight(doc.authoring, placement), placement.z],
    yaw: placement.yaw,
  };
  const objects = layout.objects.map(o => ({
    ...pose(transform, o),
    // Pieces remain in the object's frame (including floor stair cut-outs).
    pieces: geometryPieces(layout, o),
  }));
  const colliders = collidersFor(layout, {doorsOpen: false}).map(c => {
    const [x, y, z] = toWorld(transform, [c.x, c.y, c.z]);
    return {...c, x, y, z, yaw: transform.yaw + c.yaw};
  });
  const interactions = [];
  for (const o of layout.objects) {
    if (o.binding) {
      const container = o.binding.type === 'container';
      const position = toWorld(transform, bindingAnchor(o));
      interactions.push({
        ...o.binding, objectId: o.id, buildingId, position,
        floor: transform.position[1] + (o.binding.floor ?? o.position[1]), yaw: transform.yaw + o.yaw,
        ...(container ? {} : {surface: {width: o.size[0], depth: o.size[2]}}),
      });
    }
    if (o.type === 'doorway' && o.doorId) {
      interactions.push({type: 'door', id: o.doorId, objectId: o.id, buildingId,
        position: toWorld(transform, [o.position[0], o.position[1] + 1.3, o.position[2]]),
        yaw: transform.yaw + o.yaw});
    }
  }
  const containers = new Map(interactions.filter(i => i.type === 'container').map(i => [i.id, i]));
  const missionTargets = context.source.missions.filter(m => containers.has(m.container)).map(m => ({
    id: m.id, containerId: m.container, buildingId,
    position: [...containers.get(m.container).position],
  }));
  const spawn = objects.find(o => o.type === 'spawn');
  return {
    format: 'field-signal-compiled-building', version: 1, source: doc.source,
    id: buildingId, transform, bounds: [...layout.bounds],
    layout, objects, colliders, interactions, missionTargets,
    spawn: {objectId: spawn.id, position: [...spawn.position], yaw: spawn.yaw},
  };
}
