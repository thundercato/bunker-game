// Read-only adapters for actual source IDs. This module defines no gameplay schema.
const finite = value => typeof value === 'number' && Number.isFinite(value);
export const missionHref = id => 'editor/missions.html?mission=' + encodeURIComponent(id);
export const lootHref = id => 'editor/loot.html?container=' + encodeURIComponent(id);

export function stationReferences(source) {
  return Object.entries(source.stations || {}).map(([id, position]) => {
    const point = Array.isArray(position) && position.length >= 2 && position.slice(0, 2).every(finite)
      ? [position[0], position[1]] : null;
    const sourceIds = Object.entries(source.missionSources || {})
      .filter(([, definition]) => definition.station === id).map(([sourceId]) => sourceId);
    return {
      id, position: point, sourceIds,
      name: sourceIds.map(sourceId => source.missionSources[sourceId].name).join(' / ') || id,
      missions: (source.missions || []).filter(mission => sourceIds.includes(mission.source)).map(mission => ({
        id: mission.id, title: mission.title, item: mission.item, container: mission.container || null,
        href: missionHref(mission.id),
      })),
    };
  });
}

export function bindingReferences(source, layout, objectId) {
  const object = layout?.objects.find(candidate => candidate.id === objectId);
  if (!object) return null;
  const binding = object.binding;
  const record = binding?.type === 'container' ? source.containers.find(c => c.id === binding.id)
    : binding?.type === 'loose' ? source.looseSlots.find(c => c.id === binding.id) : null;
  return {
    objectId: object.id, buildingId: layout.buildingId,
    kind: binding?.type || (object.doorId ? 'door' : 'decoration'),
    bindingId: binding?.id || object.doorId || null,
    record: record ? {...record} : null,
    missions: (source.missions || []).filter(mission => binding?.type === 'container' && mission.container === binding.id)
      .map(mission => ({id: mission.id, title: mission.title, source: mission.source, href: missionHref(mission.id)})),
    loot: binding?.type === 'container' && record ? lootHref(binding.id) : null,
  };
}

export function bindingIssues(source, layout) {
  if (!layout) return [];
  const issues = [], seen = new Map(), authored = new Set();
  const report = (id, message, repair) => issues.push({id, message, repair});
  for (const object of layout.objects) {
    if (!object.binding && !object.doorId) continue;
    const kind = object.binding?.type || 'door', id = object.binding?.id || object.doorId;
    const key = kind + ':' + id;
    if (seen.has(key)) report(object.id, 'Repeated interaction reference: ' + id,
      'Keep one authored object per binding; restore the original object rather than copying its interaction.');
    seen.set(key, object.id); authored.add(key);
    if (object.binding) {
      const records = kind === 'container' ? source.containers : kind === 'loose' ? source.looseSlots : [];
      const record = records.find(candidate => candidate.id === id);
      if (!record) report(object.id, 'Missing source interaction: ' + id, 'Restore a source ID from this building; decoration cannot create a new interaction.');
      else if (record.building !== layout.buildingId) report(object.id, 'Interaction belongs to another building: ' + id,
        'Restore the original binding in its own building. Do not copy quest or loot identities.');
    }
  }
  for (const [kind, records] of [['container', source.containers], ['loose', source.looseSlots]]) {
    for (const record of records.filter(candidate => candidate.building === layout.buildingId)) {
      if (!authored.has(kind + ':' + record.id)) report(null, 'Required interaction is absent: ' + record.id,
        'Restore the protected source object from a backup or reviewed template.');
    }
  }
  for (const mission of source.missions || []) {
    if (!mission.container) continue;
    const target = source.containers.find(candidate => candidate.id === mission.container);
    if (!target) report(null, 'Mission ' + mission.id + ' has no source container: ' + mission.container,
      'Repair the source mission/container contract before preview. Do not replace its target with coordinates.');
  }
  return issues;
}

export function refugeReference(source) {
  const zone = source.zones?.base;
  if (!zone || ![zone.minX, zone.maxX, zone.minZ, zone.maxZ].every(finite)) throw Error('Refuge source bounds unavailable.');
  const contains = point => point && point[0] >= zone.minX && point[0] <= zone.maxX && point[1] >= zone.minZ && point[1] <= zone.maxZ;
  return {
    id: 'base', name: zone.name,
    bounds: [zone.minX, zone.minZ, zone.maxX, zone.maxZ],
    rooms: (source.rooms || []).filter(room => contains([room.x, room.z])).map(room => ({...room})),
    stations: stationReferences(source).filter(station => contains(station.position)),
    containers: source.containers.filter(container => container.zone === 'base').map(container => ({...container, href: lootHref(container.id)})),
    portals: Object.entries(source.portals || {}).filter(([, portal]) => portal.from === 'base').map(([id, portal]) => ({id, ...portal})),
  };
}
