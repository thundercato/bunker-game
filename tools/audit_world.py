#!/usr/bin/env python3
"""Deterministic, read-only inventory and safety audit of the playable world.

No renderer, browser, network request or save is used. Navigation observations
come from the real Python engine; they are deliberately narrower than a playtest.
"""
from __future__ import annotations

import argparse
import base64
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import runpy
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = Path('docs/verification/game-first-world-audit.json')
AUDIT_VERSION = 1


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def rounded(value):
    return round(value, 6)


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


def pose(x, y, z):
    return [rounded(x), rounded(y), rounded(z)]


def load_engine(site, world):
    previous = sys.path[:]
    try:
        sys.path.insert(0, str(site))
        return runpy.run_path(str(site / 'engine.py'), init_globals={'WORLD_JSON': json.dumps(world)})
    finally:
        sys.path[:] = previous


def footprint_interval(a, b, building):
    """Open segment/rectangle intersection; merely touching an edge is excluded."""
    lo, hi = 0., 1.
    for index, axis, size in ((0, 'x', 'w'), (1, 'z', 'd')):
        low, high = building[axis]-building[size]/2, building[axis]+building[size]/2
        delta = b[index]-a[index]
        if abs(delta) < 1e-9:
            if not low < a[index] < high:
                return None
        else:
            t1, t2 = (low-a[index])/delta, (high-a[index])/delta
            lo, hi = max(lo, min(t1, t2)), min(hi, max(t1, t2))
            if hi <= lo:
                return None
    return lo, hi


def path_footprint_overlaps(world):
    overlaps = []
    routes = [(f'road-{i}', route) for i, route in enumerate(world['roads'])]
    routes.append(('rail-main', world['rail']['route']))
    for identity, route in routes:
        for index, (a, b) in enumerate(zip(route, route[1:])):
            for building in world['buildings']:
                interval = footprint_interval(a, b, building)
                if interval:
                    lo, hi = interval
                    overlaps.append({'path': identity, 'segment': index, 'building': building['id'],
                                     'entry': [rounded(a[k]+(b[k]-a[k])*lo) for k in range(2)],
                                     'exit': [rounded(a[k]+(b[k]-a[k])*hi) for k in range(2)],
                                     'lengthInsideFootprint': rounded(math.dist(a, b)*(hi-lo)),
                                     'role': 'endpoint-inside' if lo == 0 or hi == 1 else 'crosses-footprint'})
    return overlaps


def glb_metrics(raw):
    """Count stored primitives, not rendered instances or the manifest's source mesh.

    Geometry buffer bytes count each referenced buffer view once, including
    interleaved stride/padding. Images, animation and unused buffers are excluded.
    Decoded accessor bytes are an estimate, not a driver/GPU memory measurement.
    """
    if len(raw) < 20 or raw[:4] != b'glTF':
        raise ValueError('not a GLB')
    _, version, size = struct.unpack_from('<III', raw)
    if version != 2 or size != len(raw):
        raise ValueError('invalid GLB version/length')
    doc = None
    cursor = 12
    while cursor < len(raw):
        length, kind = struct.unpack_from('<II', raw, cursor)
        cursor += 8
        if cursor + length > len(raw):
            raise ValueError('truncated GLB chunk')
        if kind == 0x4E4F534A:
            doc = json.loads(raw[cursor:cursor + length])
        cursor += length
    if doc is None:
        raise ValueError('GLB has no JSON chunk')
    accessors = doc.get('accessors', [])
    referenced = set()
    triangles = primitives = non_triangle_primitives = 0
    for mesh in doc.get('meshes', []):
        for primitive in mesh.get('primitives', []):
            primitives += 1
            indices = primitive.get('indices', primitive.get('attributes', {}).get('POSITION'))
            count = accessors[indices]['count'] if indices is not None else 0
            mode = primitive.get('mode', 4)
            if mode == 4:
                triangles += count // 3
            elif mode in (5, 6):
                triangles += max(0, count - 2)
            else:
                non_triangle_primitives += 1
            referenced.update(primitive.get('attributes', {}).values())
            if 'indices' in primitive:
                referenced.add(primitive['indices'])
            for target in primitive.get('targets', []):
                referenced.update(target.values())
    views = set()
    decoded = 0
    component_bytes = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
    elements = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
    for index in referenced:
        accessor = accessors[index]
        decoded += accessor['count'] * component_bytes[accessor['componentType']] * elements[accessor['type']]
        if 'bufferView' in accessor:
            views.add(accessor['bufferView'])
        sparse = accessor.get('sparse', {})
        for key in ('indices', 'values'):
            if key in sparse:
                views.add(sparse[key]['bufferView'])
    return {
        'fileBytes': len(raw), 'sha256': digest(raw),
        'meshes': len(doc.get('meshes', [])), 'primitives': primitives,
        'triangles': triangles, 'nonTrianglePrimitives': non_triangle_primitives,
        'materials': len(doc.get('materials', [])), 'textures': len(doc.get('textures', [])),
        'images': len(doc.get('images', [])),
        'geometryBufferBytes': sum(doc['bufferViews'][i]['byteLength'] for i in views),
        'decodedAccessorBytes': decoded,
        'meshInstances': sum('mesh' in node for node in doc.get('nodes', [])),
    }


def asset_inventory(site, issues):
    manifests = [
        'assets/v7/asset-manifest.json', 'assets/v9/model-manifest.json',
        'assets/v10/model-manifest.json', 'assets/v11/models.json',
        'assets/campaign/registry.json',
    ]
    provenance = []
    by_path = {}
    by_bank_id = {}
    for name in manifests:
        path = site / name
        if not path.exists():
            continue
        manifest_data = read_json(path)
        for row in manifest_data.get('assets', []) if isinstance(manifest_data, dict) else manifest_data:
            record = {k: row[k] for k in ('id', 'authors', 'source', 'licence', 'modifications', 'changes', 'sourcePack') if k in row}
            record['manifest'] = name
            provenance.append(record)
            if row.get('path'):
                by_path[row['path']] = row
            else:
                by_bank_id[(name.split('/')[1], row['id'])] = row
            if not row.get('authors') or not row.get('licence') or not row.get('source', '').startswith('https://'):
                issues.append({'severity': 'error', 'code': 'asset-provenance', 'id': row.get('id'), 'detail': name})
    models = []
    transfer_paths = set()

    def append_model(location, raw, row=None):
        try:
            metrics = glb_metrics(raw)
        except (ValueError, KeyError, IndexError, struct.error) as error:
            issues.append({'severity': 'error', 'code': 'model-format', 'id': location, 'detail': str(error)})
            return
        metrics['location'] = location
        if row:
            metrics['id'] = row['id']
            metrics['licence'] = row.get('licence')
            for key in ('sourceTriangles', 'triangles', 'runtimeTriangles', 'bytes', 'runtimeBytes'):
                if key in row:
                    metrics['manifest' + key[0].upper() + key[1:]] = row[key]
            if row.get('runtimeBytes') is not None and row['runtimeBytes'] != len(raw):
                issues.append({'severity': 'error', 'code': 'model-bytes', 'id': row['id'], 'detail': location})
            if location.startswith('assets/campaign/'):
                if row.get('sha256') != metrics['sha256'] or row.get('triangles') != metrics['triangles']:
                    issues.append({'severity': 'error', 'code': 'campaign-model-metrics', 'id': row['id'], 'detail': location})
        models.append(metrics)

    for path in sorted((site / 'assets').rglob('*.glb')):
        transfer_paths.add(path)
        name = path.relative_to(site).as_posix()
        append_model(name, path.read_bytes(), by_path.get(name))
    for path in sorted((site / 'assets').rglob('models*.json')):
        data = read_json(path)
        if not isinstance(data, dict) or not isinstance(data.get('models'), dict):
            continue
        transfer_paths.add(path)
        for name, encoded in sorted(data['models'].items()):
            if not isinstance(encoded, str):
                continue
            location = path.relative_to(site).as_posix() + '#' + name
            try:
                raw = base64.b64decode(encoded, validate=True)
                append_model(location, raw, by_bank_id.get((path.parent.name, name)))
            except ValueError as error:
                issues.append({'severity': 'error', 'code': 'model-format', 'id': location, 'detail': str(error)})
    barrier = site / 'assets/barrier/model.json'
    if barrier.exists():
        transfer_paths.add(barrier)
        data = read_json(barrier)
        models.append({
            'id': 'barrier', 'location': 'assets/barrier/model.json', 'format': 'JSON arrays',
            'fileBytes': barrier.stat().st_size, 'sha256': digest(barrier.read_bytes()),
            'triangles': len(data['index']) // 3, 'materials': 1,
            'geometryBufferBytes': 4 * sum(len(data[k]) for k in ('position', 'normal', 'uv', 'index')),
            'provenanceFile': 'assets/barrier/CREDIT.txt',
        })
    surfaces = []
    for name in ('assets/v7/surface-manifest.json', 'assets/v11/surfaces.json'):
        path = site / name
        if path.exists():
            for row in read_json(path):
                surfaces.append({'manifest': name, **row})
    totals = {key: sum(row.get(key, 0) for row in models) for key in (
        'fileBytes', 'triangles', 'materials', 'geometryBufferBytes', 'decodedAccessorBytes', 'textures', 'images')}
    totals['modelFileTransferBytes'] = sum(path.stat().st_size for path in transfer_paths)
    return {
        'scope': 'All stored GLBs, base64 GLB banks and barrier JSON; library totals are not per-frame budgets.',
        'geometryBytesDefinition': 'Unique primitive bufferView byteLength; JSON arrays assume 32-bit values. Excludes images/animations.',
        'payloadBytesDefinition': 'fileBytes counts decoded GLB bytes within base64 banks; modelFileTransferBytes counts actual unique model/bank files.',
        'limitations': ['No GPU allocation/texture decode measurement', 'Stored mesh triangles exclude node/scene instance multiplication',
                        'Source-manifest counts can describe discarded modules; actual stored counts are separate'],
        'modelCount': len(models), 'provenanceEntries': len(provenance),
        'licences': dict(sorted(Counter(row['licence'] for row in provenance).items())),
        'surfaceSets': surfaces, 'totals': totals, 'provenance': provenance, 'models': models,
    }


def reference_issues(world):
    """Validate identifiers, bounds, floor ownership and campaign guarantees."""
    issues = []

    def error(code, identity, detail):
        issues.append({'severity': 'error', 'code': code, 'id': identity, 'detail': detail})

    for key in ('buildings', 'containers', 'missions', 'enemies', 'looseSlots'):
        seen = set()
        for row in world.get(key, []):
            if not row.get('id') or row['id'] in seen:
                error('duplicate-id', row.get('id'), key)
            seen.add(row.get('id'))
            for coord in ('x', 'z'):
                if not finite(row.get(coord)):
                    error('invalid-coordinate', row.get('id'), coord)
    buildings = {b['id']: b for b in world['buildings']}
    containers = {c['id']: c for c in world['containers']}
    missions = {m['id']: m for m in world['missions']}
    sources = world['missionSources']
    bounds = world['bounds']
    for b in buildings.values():
        if b.get('floors', 1) not in (1, 2) or not all(finite(b[k]) and b[k] > 0 for k in ('w', 'd')):
            error('building-dimensions', b['id'], 'positive footprint and one/two storeys required')
        if not (bounds['minX'] <= b['x'] - b['w']/2 < b['x'] + b['w']/2 <= bounds['maxX'] and
                bounds['minZ'] <= b['z'] - b['d']/2 < b['z'] + b['d']/2 <= bounds['maxZ']):
            error('building-bounds', b['id'], 'footprint outside field bounds')
    for c in containers.values():
        if c.get('profile') not in world['profiles']:
            error('container-profile', c['id'], str(c.get('profile')))
        if c.get('zone', 'field') not in ('field', *world['zones']):
            error('container-zone', c['id'], str(c.get('zone')))
        for item in c.get('guaranteed', {}):
            if item not in world['catalogue']:
                error('container-item', c['id'], item)
        if c.get('building') in buildings:
            b = buildings[c['building']]
            if abs(c['x']-b['x']) > b['w']/2 or abs(c['z']-b['z']) > b['d']/2:
                error('container-footprint', c['id'], b['id'])
            floor = c.get('floor', 0)
            valid_floor = (finite(floor) and 0 <= floor < b.get('floors', 1)*3.2) if c.get('editorScene') else (
                floor in (0, 3.2) and (floor == 0 or b.get('floors', 1) == 2))
            if not valid_floor:
                error('container-floor', c['id'], b['id'])
    for name, profile in world['profiles'].items():
        for item, rule in profile.items():
            if item not in world['catalogue']:
                error('profile-item', name, item)
            if not all(finite(rule.get(k)) for k in ('chance', 'min', 'max')) or not (0 <= rule['chance'] <= 100 and 0 <= rule['min'] <= rule['max']):
                error('profile-rule', name, item)
    for name, source in sources.items():
        if source.get('station') not in world['stations']:
            error('mission-station', name, str(source.get('station')))
    for m in missions.values():
        if m.get('item') not in world['catalogue']:
            error('mission-item', m['id'], str(m.get('item')))
        if m.get('source') not in sources:
            error('mission-source', m['id'], str(m.get('source')))
        if m.get('container'):
            c = containers.get(m['container'])
            if not c:
                error('mission-container', m['id'], m['container'])
            elif c.get('guaranteed', {}).get(m['item'], 0) < m.get('count', 1):
                error('mission-guarantee', m['id'], 'fixed retrieval item is not guaranteed in its bound container')
        for dep in m.get('requires', []):
            if dep not in missions:
                error('mission-prerequisite', m['id'], dep)
    visited, visiting = set(), set()

    def visit(identity):
        if identity in visiting:
            error('mission-cycle', identity, 'cyclic prerequisite')
            return
        if identity in visited:
            return
        visiting.add(identity)
        for dep in missions[identity].get('requires', []):
            if dep in missions:
                visit(dep)
        visiting.remove(identity)
        visited.add(identity)
    for identity in missions:
        visit(identity)
    return issues


def navigation_inventory(site, world, issues):
    engine = load_engine(site, world)
    state = engine['new_game']()
    for identity in engine['DOORS']:
        state['doors'][identity] = True
    # Searches exercise all real dispatch/floor/range wrappers without combat
    # influencing this static geometry check. Topology and loot rules are intact.
    for enemy in state['enemies']:
        enemy['health'] = 0
    checks = []

    def check(code, identity, passed, detail, **extra):
        checks.append({'check': code, 'id': identity, 'passed': bool(passed), **extra})
        if not passed:
            issues.append({'severity': 'error', 'code': code, 'id': identity, 'detail': detail})

    building_checks = []
    for b in world['buildings']:
        x, z = engine['DOORS'][b['id']]
        state['player'].update(x=x, y=0, z=z)
        state['zone'] = 'field'
        opened = all(engine['walkable'](state, x, z + offset) for offset in (-1, -.5, 0, .5, 1))
        state['doors'][b['id']] = False
        closed = not engine['walkable'](state, x, z)
        state['doors'][b['id']] = True
        check('entrance-open', b['id'], opened, 'opening/one metre approach blocked')
        check('entrance-closed', b['id'], closed, 'closed door does not block its opening')
        record = {'id': b['id'], 'entrance': [x, z], 'openApproachClear': opened, 'closedBlocks': closed}
        if b.get('floors', 1) == 2:
            scene = next((scene for scene in world.get('campaignScenes', []) if scene['id'] == b['id']), None)
            stair = next((o for o in scene['layout']['objects'] if o['type'] == 'stairs'), None) if scene else None
            if stair:
                transform = scene['transform']
                sx, sy, sz = stair['position']
                samples = []
                for i in range(65):
                    lx = sx + math.sin(stair['yaw'])*(stair['size'][2]/2-stair['size'][2]*i/64)
                    lz = sz + math.cos(stair['yaw'])*(stair['size'][2]/2-stair['size'][2]*i/64)
                    yaw = transform['yaw']
                    samples.append((transform['position'][0]+lx*math.cos(yaw)+lz*math.sin(yaw),
                                    transform['position'][2]-lx*math.sin(yaw)+lz*math.cos(yaw)))
            else:
                sx = b['x'] + b['w']/2 - 1.475
                front, back = b['z'] + b['d']/2 - 1, b['z'] - b['d']/2 + 1
                samples = [(sx, front - (front-back)*i/64) for i in range(65)]
            heights, last_y, clear = [], 0, True
            for x, z in samples:
                last_y = engine['surface_height'](x, z, last_y)
                state['player'].update(x=x, y=last_y, z=z)
                heights.append(last_y)
                clear = clear and engine['walkable'](state, x, z)
            monotonic = all(0 <= b-a <= .1 for a, b in zip(heights, heights[1:])) and abs(heights[-1]-3.2) < 1e-6
            check('stair-centre', b['id'], clear and monotonic, 'stair centre blocked or discontinuous')
            record['stairs'] = {'start': pose(samples[0][0], heights[0], samples[0][1]),
                                'end': pose(samples[-1][0], heights[-1], samples[-1][1]),
                                'samples': len(samples), 'clear': clear, 'heightContinuous': monotonic}
        building_checks.append(record)
    portal_checks = []
    for identity, portal in world['portals'].items():
        x, z, _ = portal['target']
        target_zone = engine['zone_at'](x, z)
        passed = target_zone == portal['to'] and engine['walkable'](state, x, z)
        check('portal-destination', identity, passed, 'target has wrong zone or blocked floor')
        portal_checks.append({'id': identity, **portal, 'targetZone': target_zone, 'targetWalkable': passed})
    bridges = []
    r = world['river']
    for bridge in r['bridges']:
        samples = [(r['west']-7 + i*(r['east']-r['west']+14)/80, bridge['z']) for i in range(81)]
        passed = all(engine['walkable'](state, x, z) for x, z in samples)
        check('bridge-centre', bridge['id'], passed, 'bridge centre crosses a blocked boundary')
        bridges.append({'id': bridge['id'], 'samples': len(samples), 'clear': passed,
                        'middleHeight': engine['surface_height']((r['west']+r['east'])/2, bridge['z'])})
    approaches = []
    for c in world['containers']:
        # Test a physical approach on its floor, rather than demanding that a
        # player stand inside the cabinet/partition at the container origin.
        candidates = []
        search_result = None
        yaw = c.get('yaw', 0)
        for distance in (.75, 1.1, 1.6, 2.1, 2.7, 3.4):
            for delta in (i * math.tau/24 for i in range(24)):
                x = c['x'] + math.sin(yaw+delta)*distance
                z = c['z'] + math.cos(yaw+delta)*distance
                height = engine['surface_height'](x, z, c.get('floor', 0))
                state['player'].update(x=x, y=height, z=z)
                state['zone'] = c.get('zone', 'field')
                if (engine['zone_at'](x, z) == c.get('zone', 'field') and engine['walkable'](state, x, z)):
                    candidates.append(pose(x, height, z))
        for x, y, z in candidates:
            state['player'].update(x=x, y=y, z=z)
            state['zone'] = c.get('zone', 'field')
            searched = engine['dispatch'](state, {'type': 'search', 'id': c['id']})
            if c['id'] in searched['containers']:
                search_result = (x, y, z)
                break
        check('container-approach', c['id'], search_result is not None,
              'no sampled walkable approach accepted by actual search dispatch within 3.4 m')
        approaches.append({'id': c['id'], 'originWalkable': engine['walkable'](state, c['x'], c['z']),
                           'approach': search_result, 'sampledWalkableApproaches': len(candidates),
                           'authoredFloor': c.get('floor', 0),
                           'effectiveSearchFloor': rounded(engine['CONTAINERS'][c['id']].get('floor', 0)),
                           'originSurfaceHeight': rounded(engine['surface_height'](c['x'], c['z'], c.get('floor', 0)))})
    state = engine['new_game']()
    for identity in engine['DOORS']:
        state['doors'][identity] = True
    p = state['player']
    check('spawn-floor', 'campaign-spawn', engine['walkable'](state, p['x'], p['z']), 'new game spawn is blocked')
    for identity, (x, z) in world['stations'].items():
        candidates = [(x + dx, z + dz) for dx, dz in ((0, 0), (.7, 0), (-.7, 0), (0, .7), (0, -.7))]
        check('station-approach', identity, any(engine['walkable'](state, xx, zz) for xx, zz in candidates),
              'no local station approach is walkable')
    # Explicitly verify the impassable water strips and compound ingress.
    for z in (-100, -350, -600):
        check('river-blocks', str(z), not engine['land'](99, z), 'river away from bridges is passable')
    for identity, x, z in [('military-gate', world['military']['gateX'], world['military']['maxZ']),
                            ('military-breach', world['military']['gapX'], world['military']['minZ'])]:
        check('compound-ingress', identity, engine['walkable'](state, x, z), 'authored gate/breach blocked')
    return {
        'method': 'Real engine.py with effective world JSON; doors explicitly open except closed-door checks; radius 0.22 m.',
        'limitations': ['Local samples do not prove global paths', 'Python does not contain all renderer furniture/tree colliders',
                        'Container approach uses actual search dispatch but does not prove a renderer ray hit', 'No physical-device/browser playtest'],
        'passed': sum(row['passed'] for row in checks), 'failed': sum(not row['passed'] for row in checks),
        'checks': checks, 'buildings': building_checks, 'portals': portal_checks,
        'bridges': bridges, 'containerApproaches': approaches,
    }


def optional_registries(site, world, issues):
    result = {}
    known_models = {}
    for name in ('assets/v7/asset-manifest.json', 'assets/v9/model-manifest.json',
                 'assets/v10/model-manifest.json', 'assets/v11/models.json', 'assets/campaign/registry.json'):
        path = site / name
        if path.exists():
            data = read_json(path)
            for row in data.get('assets', []) if isinstance(data, dict) else data:
                known_models[row['id']] = row
    props_path = site / 'search-props.json'
    if props_path.exists():
        registry = read_json(props_path)
        props = registry.get('props', registry.get('variants', []))
        ids = set()
        for row in props:
            identity = row.get('id')
            detail = None
            if not identity or identity in ids:
                detail = 'missing/duplicate stable ID'
            ids.add(identity)
            if row.get('profile') not in world['profiles']:
                detail = 'unknown loot profile'
            if not all(finite(v) and v > 0 for v in row.get('dimensions', [])) or len(row.get('dimensions', [])) != 3:
                detail = 'invalid prop dimensions'
            interaction = row.get('interaction', {})
            if interaction.get('binding') != 'container' or not finite(interaction.get('reach')) or not 0 < interaction['reach'] <= 3.5:
                detail = 'invalid container interaction/reach'
            licensed = row.get('licensedAsset')
            if licensed and (licensed.get('id') not in known_models or
                             known_models[licensed['id']].get('path') != licensed.get('path') or
                             not (site / licensed.get('path', '')).is_file()):
                detail = 'licensed visual is not a registered local model'
            if not all(row.get('provenance', {}).get(k) for k in ('author', 'source', 'licence')):
                detail = 'missing prop provenance'
            if detail:
                issues.append({'severity': 'error', 'code': 'search-prop', 'id': identity, 'detail': detail})
        for c in world['containers']:
            identity = c.get('searchProp')
            if identity and identity not in ids:
                issues.append({'severity': 'error', 'code': 'container-search-prop', 'id': c['id'], 'detail': identity})
        result['searchProps'] = {'path': 'search-props.json', 'sha256': digest(props_path.read_bytes()),
                                 'variants': len(props), 'profiles': dict(sorted(Counter(p.get('profile') for p in props).items()))}
    districts_path = site / 'districts.json'
    if districts_path.exists():
        data = read_json(districts_path)
        districts = data.get('districts', [])
        ids = set()
        object_ids = set()
        objects = []
        collider_count = surface_count = climb_count = 0
        for district in districts:
            identity = district.get('id')
            if not identity or identity in ids:
                issues.append({'severity': 'error', 'code': 'district-id', 'id': identity, 'detail': 'missing/duplicate ID'})
            ids.add(identity)
            objects.extend(district.get('objects', []))
            for obj in district.get('objects', []):
                oid = obj.get('id')
                problem = None
                if not oid or oid in object_ids:
                    problem = 'missing/duplicate object ID'
                object_ids.add(oid)
                transform = obj.get('transform', {})
                if not all(finite(transform.get(key)) for key in ('x', 'y', 'z', 'yaw')):
                    problem = 'invalid transform'
                size = obj.get('size', [])
                if len(size) != 3 or not all(finite(v) and v > 0 for v in size):
                    problem = 'invalid dimensions'
                if district.get('zone') not in ('field', *world['zones']):
                    problem = 'unknown zone'
                asset = obj.get('asset', '')
                if not asset.startswith('field-signal:') and asset not in known_models:
                    problem = 'unknown licensed model reference'
                child_ids = set()
                for collider in obj.get('colliders', []):
                    collider_count += 1
                    cid = collider.get('id')
                    if not cid or cid in child_ids:
                        problem = 'missing/duplicate local collider ID'
                    child_ids.add(cid)
                    if (not all(finite(collider.get(k)) for k in ('x', 'y', 'z', 'w', 'h', 'd', 'yaw')) or
                            any(collider[k] <= 0 for k in ('w', 'h', 'd'))):
                        problem = 'invalid local collider'
                for surface in obj.get('surfaces', []):
                    surface_count += 1
                    if (not all(finite(surface.get(k)) for k in ('x', 'y', 'z', 'w', 'd')) or
                            any(surface[k] <= 0 for k in ('w', 'd'))):
                        problem = 'invalid local surface'
                climb = obj.get('climb')
                if climb:
                    climb_count += 1
                    for route in climb.get('routes', []):
                        for end in ('from', 'to'):
                            if not all(finite(route.get(end, {}).get(k)) for k in ('x', 'y', 'z', 'yaw')):
                                problem = 'invalid climb endpoint'
                        if not finite(route.get('reach')) or not 0 < route['reach'] <= 3.5:
                            problem = 'invalid climb reach'
                        # Raised endpoints need a declared horizontal landing.
                        target = route.get('to', {})
                        if finite(target.get('y')) and target['y'] > 0 and not any(
                                abs(target['x']-s['x']) <= s['w']/2 and abs(target['z']-s['z']) <= s['d']/2 and
                                abs(target['y']-s['y']) < .05 for s in obj.get('surfaces', [])):
                            problem = 'climb endpoint has no matching landing surface'
                if problem:
                    issues.append({'severity': 'error', 'code': 'district-object', 'id': oid, 'detail': problem})
        result['districts'] = {'path': 'districts.json', 'sha256': digest(districts_path.read_bytes()),
                               'count': len(districts), 'objects': len(objects), 'ids': sorted(ids),
                               'colliders': collider_count, 'surfaces': surface_count, 'climbStructures': climb_count,
                               'definitions': districts,
                               'protectedApproaches': data.get('protectedApproaches', [])}
    campaign_path = site / 'assets/campaign/registry.json'
    if campaign_path.exists():
        registry = read_json(campaign_path)
        result['campaignAssets'] = {'path': 'assets/campaign/registry.json', 'sha256': digest(campaign_path.read_bytes()),
                                    'summary': registry.get('summary', {}), 'format': registry.get('format')}
    return result


def mission_inventory(world, engine):
    containers = {c['id']: c for c in world['containers']}
    records = []
    for m in world['missions']:
        c = containers.get(m.get('container'))
        station = world['missionSources'][m['source']]['station']
        records.append({
            'id': m['id'], 'source': m['source'], 'sourceStation': station,
            'sourcePosition': world['stations'][station], 'requires': m.get('requires', []),
            'item': m['item'], 'count': m.get('count', 1), 'container': m.get('container'),
            'mapTarget': [m['x'], m['z']],
            'containerPosition': pose(c['x'], c.get('floor', 0), c['z']) if c else None,
            'containerZone': c.get('zone', 'field') if c else None,
            'mapTargetRole': 'entrance' if c and engine['zone_at'](c['x'], c['z']) != 'field' else 'container' if c else 'search-area',
            'fieldTargetDriftMetres': rounded(math.hypot(m['x']-c['x'], m['z']-c['z'])) if c and c.get('zone', 'field') == 'field' else None,
        })
    return records


def audit(root=ROOT, world=None, include_assets=True):
    site = Path(root) / 'site'
    source_bytes = (site / 'world.json').read_bytes()
    original = json.loads(source_bytes)
    world = original if world is None else world
    issues = reference_issues(world)
    snapshot = read_json(site / 'world-source.json')
    if snapshot['sha256'] != digest(source_bytes):
        issues.append({'severity': 'error', 'code': 'source-digest', 'id': snapshot['id'], 'detail': 'world.json differs from reviewed source'})
    nav = navigation_inventory(site, world, issues)
    engine = load_engine(site, world)
    original_engine = load_engine(site, original)
    missions = mission_inventory(world, engine)
    historical_drift = mission_inventory(original, original_engine)
    original_surface_offsets = []
    for c in original['containers']:
        if c.get('zone', 'field') != 'field':
            continue
        height = original_engine['surface_height'](c['x'], c['z'], c.get('floor', 0))
        if abs(height-c.get('floor', 0)) > .5:
            original_surface_offsets.append({'id': c['id'], 'position': [c['x'], c['z']],
                                             'authoredFloor': c.get('floor', 0), 'surfaceHeight': rounded(height),
                                             'offset': rounded(height-c.get('floor', 0))})
    overlaps = path_footprint_overlaps(world)
    for overlap in overlaps:
        issues.append({'severity': 'warning', 'code': 'path-building-overlap',
                       'id': f"{overlap['path']}:{overlap['segment']}:{overlap['building']}",
                       'detail': f"{overlap['lengthInsideFootprint']} m of centreline inside footprint ({overlap['role']})"})
    for m in missions:
        if m['fieldTargetDriftMetres'] and m['fieldTargetDriftMetres'] > .01:
            issues.append({'severity': 'warning', 'code': 'mission-map-drift', 'id': m['id'],
                           'detail': f"field marker {m['fieldTargetDriftMetres']} m from bound container"})
    building_records = []
    for b in world['buildings']:
        cs = [c for c in world['containers'] if c.get('building') == b['id']]
        building_records.append({**b, 'storeys': b.get('floors', 1),
                                 'footprint': {'minX': b['x']-b['w']/2, 'maxX': b['x']+b['w']/2,
                                               'minZ': b['z']-b['d']/2, 'maxZ': b['z']+b['d']/2},
                                 'containerIds': [c['id'] for c in cs],
                                 'missionIds': [m['id'] for m in world['missions'] if m.get('container') in {c['id'] for c in cs}]})
    counts = {key: len(world.get(key, [])) for key in ('buildings', 'containers', 'missions', 'enemies', 'profiles',
              'roads', 'vehicles', 'looseSlots', 'landmarks', 'partitions', 'rooms', 'portals', 'stations', 'anomalies')}
    counts.update(twoStoreyBuildings=sum(b.get('floors', 1) == 2 for b in world['buildings']),
                  storeys=sum(b.get('floors', 1) for b in world['buildings']),
                  containersByZone=dict(sorted(Counter(c.get('zone', 'field') for c in world['containers']).items())),
                  containersByProfile=dict(sorted(Counter(c['profile'] for c in world['containers']).items())))
    report = {
        'format': 'field-signal-world-audit', 'version': AUDIT_VERSION,
        'units': {'distance': 'metres', 'axes': 'x/y/z, y up; world.json map points are x/z'},
        'inputs': {'world': 'site/world.json', 'worldSha256': digest(source_bytes),
                   'reviewedSource': snapshot, 'engineSha256': digest((site / 'engine.py').read_bytes()),
                   'effectiveSource': 'campaign adapter' if world.get('campaign') else 'preserved world.json',
                   'runtimeModules': {name: digest((site / name).read_bytes()) for name in
                                      ('terrain.js', 'campaign-core.js', 'campaign-interiors.js', 'campaign-routes.json',
                                       'campaign_rules.py') if (site / name).exists()},
                   'effectiveWorldSha256': digest(json.dumps(world, sort_keys=True, separators=(',', ':')).encode())},
        'counts': counts,
        'historicalCounts': {'scope': 'MEGA_BUILD_README historical baseline; no count is a permanent content target',
                             'expected': {'buildings': 37, 'containers': 139, 'missions': 15, 'roads': 15},
                             'discrepancies': {key: {'historical': expected, 'actual': counts[key]} for key, expected in
                                               {'buildings': 37, 'containers': 139, 'missions': 15, 'roads': 15}.items() if counts[key] != expected},
                             'preservedSourceFieldTargetDrift': [m for m in historical_drift if m['fieldTargetDriftMetres'] and m['fieldTargetDriftMetres'] > .01]},
        'preservedSourceLayoutFindings': {'pathBuildingOverlaps': path_footprint_overlaps(original),
                                         'containerSurfaceOffsets': original_surface_offsets},
        'regions': {'field': {'bounds': world['bounds'], 'movementMaxZ': world['swamp']['limit']},
                     'underground': world['zones'],
                     'note': 'Underground zones intentionally use separate coordinates outside field bounds.'},
        'buildings': building_records, 'containers': world['containers'],
        'profiles': [{'id': key, 'rules': len(value), 'eligibleItems': [k for k, v in value.items() if v['chance'] > 0]}
                     for key, value in world['profiles'].items()],
        'missions': missions,
        'transport': {'roads': [{'id': f'road-{i}', 'points': points, 'segments': len(points)-1,
                                  'length': rounded(sum(math.dist(a, b) for a, b in zip(points, points[1:])))}
                                 for i, points in enumerate(world['roads'])],
                      'rail': world['rail'], 'river': world['river'], 'pier': world['pier'],
                      'pathBuildingOverlaps': overlaps,
                      'coastline': {'historicalShoreX': world['shore'], 'currentShape': 'eastern river with land on both banks'},
                      'military': world['military'], 'bog': world['swamp'],
                      'landmarks': world['landmarks'], 'searchableVehicles': world['vehicles']},
        'navigation': nav,
        'registries': optional_registries(site, world, issues),
    }
    if include_assets:
        report['assets'] = asset_inventory(site, issues)
    report['issues'] = issues
    report['summary'] = {'errors': sum(i['severity'] == 'error' for i in issues),
                          'warnings': sum(i['severity'] == 'warning' for i in issues)}
    return report


def serialise(report):
    return json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False) + '\n'


def runtime_source(site):
    """Use the candidate's existing pure adapter; never duplicate its compiler."""
    if not (site / 'campaign-core.js').exists():
        return None
    if not all((site / name).exists() for name in ('districts.json', 'search-props.json')):
        return None
    script = """
import fs from 'node:fs';
import {applyCampaignSource} from './campaign-core.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=read('world.json'),districts=read('districts.json'),props=read('search-props.json');
const sourceRevision=read('world-source.json').revision;
const interiors=fs.existsSync('campaign-interiors.js')?(await import('./campaign-interiors.js')).createCampaignInteriors(source):[];
const routes=fs.existsSync('campaign-routes.json')?read('campaign-routes.json'):undefined;
console.log(JSON.stringify(applyCampaignSource(source,{districts,props,interiors,routes,sourceRevision})));
"""
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], cwd=site, text=True))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--check', action='store_true', help='fail if checked-in report is stale; do not write')
    parser.add_argument('--world', type=Path, help='audit an effective compiled/runtime source JSON, preserving original source evidence')
    parser.add_argument('--source-only', action='store_true', help='inspect preserved source before candidate runtime fixes')
    args = parser.parse_args(argv)
    world = read_json(args.world) if args.world else None if args.source_only else runtime_source(ROOT / 'site')
    report = audit(world=world)
    rendered = serialise(report)
    output = args.output if args.output.is_absolute() else ROOT / args.output
    if args.check:
        if not output.exists() or output.read_text(encoding='utf-8') != rendered:
            print(f'World audit is stale: regenerate with python3 tools/audit_world.py --output {args.output}', file=sys.stderr)
            return 1
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding='utf-8')
    counts, summary = report['counts'], report['summary']
    print(f"World audit: {counts['buildings']} buildings / {counts['storeys']} storeys, {counts['containers']} containers, "
          f"{counts['missions']} missions; {report['navigation']['passed']} navigation checks passed; "
          f"{summary['errors']} errors, {summary['warnings']} warnings")
    return 1 if summary['errors'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
