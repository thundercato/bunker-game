#!/usr/bin/env python3
"""Curate verified CC0 Kenney packs into small, lit, single-draw glTF assets.

Masters stay outside site/. Import needs Pillow; --verify uses the standard library.
Run --help for the locked, repeatable download/import/verification workflow.
"""
from __future__ import annotations

import argparse
import hashlib
import http.cookiejar
import io
import json
import math
from pathlib import Path
import re
import struct
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'site/assets/campaign'
ACQUIRED = '2026-11-06'
PACKS = {
    'furniture-kit': ('Furniture Kit 2.0', 5130729, 'e67652d0932cee41683f74711c03d3e192a2af9979ef8e6b237711f5482d46b0'),
    'city-kit-industrial': ('City Kit Industrial 2.0', 5045077, '5b381164e5760f3830a2dbee43b972deee38b2a695d091b56e238ab2910c96d2'),
    'survival-kit': ('Survival Kit 2.0', 1948174, 'c3586341b5932c87eb43d75d915434f47daed168b17ed36a03e8ca9977c7443e'),
    'train-kit': ('Train Kit 1.1', 5266588, 'cf50d77e8cbacbf38dd50826d4bce5392db8e4f67373d3c4e583b0ed0e474475'),
    'city-kit-roads': ('City Kit Roads 2.2', 2852289, '374a4552115cbd11b4ec5c930ee31a533562dc78a09af249a655d03f7ea3b959'),
}
# Source name, reference height in metres, category, search suitability. Only a
# gameplay container binding makes a model searchable; these are authoring hints.
SELECTION = {
    'furniture-kit': [
        ('bathroomCabinet', .85, 'bathroom', True),
        ('bathroomCabinetDrawer', .85, 'bathroom', True),
        ('bathroomSink', .85, 'bathroom', False),
        ('toilet', .78, 'bathroom', False),
        ('shower', 2.05, 'bathroom', False),
        ('bedBunk', 1.85, 'bedroom', True),
        ('bedSingle', .65, 'bedroom', True),
        ('bedDouble', .65, 'bedroom', True),
        ('bookcaseClosed', 1.8, 'storage', True),
        ('bookcaseClosedDoors', 1.8, 'storage', True),
        ('bookcaseClosedWide', 1.8, 'storage', True),
        ('bookcaseOpen', 1.8, 'storage', True),
        ('bookcaseOpenLow', .9, 'storage', True),
        ('cabinetBed', .58, 'bedroom', True),
        ('cabinetBedDrawer', .58, 'bedroom', True),
        ('cabinetBedDrawerTable', .58, 'bedroom', True),
        ('cabinetTelevisionDoors', .62, 'living', True),
        ('cardboardBoxClosed', .45, 'storage', True),
        ('cardboardBoxOpen', .45, 'storage', True),
        ('chair', .9, 'living', False),
        ('chairDesk', 1.0, 'office', False),
        ('chairCushion', .9, 'living', False),
        ('desk', .76, 'office', True),
        ('deskCorner', .76, 'office', True),
        ('kitchenCabinet', .9, 'kitchen', True),
        ('kitchenCabinetDrawer', .9, 'kitchen', True),
        ('kitchenCabinetCornerInner', .9, 'kitchen', True),
        ('kitchenCabinetUpper', .72, 'kitchen', True),
        ('kitchenCabinetUpperDouble', .72, 'kitchen', True),
        ('kitchenCabinetUpperLow', .45, 'kitchen', True),
        ('kitchenFridge', 1.85, 'kitchen', True),
        ('kitchenFridgeLarge', 1.85, 'kitchen', True),
        ('kitchenFridgeSmall', .88, 'kitchen', True),
        ('kitchenMicrowave', .34, 'kitchen', True),
        ('kitchenSink', .9, 'kitchen', False),
        ('kitchenStove', .9, 'kitchen', True),
        ('kitchenStoveElectric', .9, 'kitchen', True),
        ('washer', .88, 'utility', True),
        ('dryer', .88, 'utility', True),
        ('sideTableDrawers', .6, 'living', True),
        ('loungeSofa', .9, 'living', True),
        ('loungeChair', .9, 'living', True),
        ('table', .76, 'living', False),
        ('tableCoffee', .43, 'living', False),
        ('stoolBar', .78, 'kitchen', False),
        ('radio', .27, 'equipment', False),
        ('lampWall', .35, 'lighting', False),
        ('lampSquareCeiling', .16, 'lighting', False),
        ('lampSquareTable', .48, 'lighting', False),
        ('trashcan', .64, 'utility', True),
    ],
    'city-kit-industrial': [
        ('shipping-container-a', 2.59, 'dock', True),
        ('shipping-container-b', 2.59, 'dock', True),
        ('shipping-container-c', 2.59, 'dock', True),
        ('detail-tank', 2.1, 'industrial', False),
        ('detail-tank-large', 3.4, 'industrial', False),
        ('chimney-small', 2.8, 'industrial', False),
        ('chimney-medium', 4.2, 'industrial', False),
        ('chimney-large', 6.2, 'industrial', False),
        ('water-tower', 9.0, 'industrial', False),
    ],
    'survival-kit': [
        ('barrel', .9, 'storage', True),
        ('barrel-open', .9, 'storage', True),
        ('box', .48, 'storage', True),
        ('box-large', .72, 'storage', True),
        ('chest', .62, 'storage', True),
        ('bucket', .35, 'utility', True),
        ('bedroll', .18, 'camp', True),
        ('bedroll-packed', .28, 'camp', True),
        ('fence', 1.35, 'fence', False),
        ('fence-fortified', 1.55, 'fence', False),
        ('fence-doorway', 1.55, 'fence', False),
        ('workbench', .9, 'workshop', True),
        ('workbench-anvil', 1.0, 'workshop', False),
        ('workbench-grind', 1.0, 'workshop', False),
        ('tree-log', .6, 'woodland', False),
        ('tree-log-small', .32, 'woodland', False),
        ('tent', 1.65, 'camp', False),
    ],
    'train-kit': [
        ('railroad-straight', .22, 'rail', False),
        ('railroad-damaged-straight', .22, 'rail', False),
        ('train-carriage-box', 3.6, 'rail', False),
        ('train-carriage-tank', 3.6, 'rail', False),
        ('train-carriage-flatbed', 1.2, 'rail', False),
        ('train-carriage-coal', 3.6, 'rail', False),
        ('train-diesel-a', 4.0, 'rail', False),
    ],
    'city-kit-roads': [
        ('dumpster', 1.4, 'storage', True),
        ('construction-fence', 1.8, 'fence', False),
        ('construction-barrier', 1.0, 'street', False),
        ('construction-cone', .68, 'street', False),
        ('electricity-pole', 7.5, 'infrastructure', False),
        ('light-curved', 5.5, 'lighting', False),
        ('light-square', 5.5, 'lighting', False),
        ('road-sign-warning', 2.2, 'street', False),
    ],
}
ALIASES = {'detail-tank': 'tank', 'detail-tank-large': 'tank_large'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def slug(name):
    return ALIASES.get(name, re.sub(r'(?<!^)(?=[A-Z])', '_', name).replace('-', '_').lower())


def download(masters):
    """Use the same public page/referrer flow as the provider's download button."""
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    opener.addheaders = [('User-Agent', 'Mozilla/5.0 (compatible; FieldSignalAssetImport/1.0)')]
    for pack in PACKS:
        target = masters / (pack + '.zip')
        if target.exists() and sha(target.read_bytes()) == PACKS[pack][2]:
            continue
        page = 'https://kenney.nl/assets/' + pack
        html = opener.open(page, timeout=45).read()
        (masters / (pack + '.html')).write_bytes(html)
        ident = re.search(rb"data-download-id='([^']+)'", html)[1].decode()
        req = urllib.request.Request('https://kenney.nl/download-link/' + ident,
                                     headers={'Referer': page, 'Accept': 'application/json', 'Origin': 'https://kenney.nl'})
        link = json.load(opener.open(req, timeout=45))['url']
        data = opener.open(link, timeout=90).read()
        if sha(data) != PACKS[pack][2]:
            raise ValueError(pack + ': upstream archive changed; inspect licence and update lock explicitly')
        target.write_bytes(data)
        print('Downloaded', pack, len(data), 'bytes')


def read_glb(data):
    if data[:4] != b'glTF' or struct.unpack_from('<I', data, 4)[0] != 2:
        raise ValueError('Not glTF 2.0')
    if struct.unpack_from('<I', data, 8)[0] != len(data):
        raise ValueError('Incorrect GLB length')
    at = 12
    document = binary = None
    while at < len(data):
        length, kind = struct.unpack_from('<II', data, at)
        chunk = data[at + 8:at + 8 + length]
        if kind == 0x4e4f534a:
            document = json.loads(chunk)
        elif kind == 0x004e4942:
            binary = chunk
        at += 8 + length
    if document is None or binary is None:
        raise ValueError('Missing GLB chunks')
    return document, binary


def accessor(document, binary, index):
    acc = document['accessors'][index]
    if 'sparse' in acc:
        raise ValueError('Sparse source unsupported')
    view = document['bufferViews'][acc['bufferView']]
    fmt, width = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
                  5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}[acc['componentType']]
    size = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[acc['type']]
    start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = view.get('byteStride', size * width)
    result = [struct.unpack_from('<' + fmt * size, binary, start + i * stride) for i in range(acc['count'])]
    if acc.get('normalized') and fmt != 'f':
        divisor = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[acc['componentType']]
        result = [tuple(max(-1, v / divisor) for v in row) for row in result]
    return result


IDENTITY = (1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1.)


def multiply(a, b):
    return tuple(sum(a[r * 4 + k] * b[k * 4 + c] for k in range(4)) for r in range(4) for c in range(4))


def matrix(node):
    if 'matrix' in node:
        return tuple(node['matrix'][c * 4 + r] for r in range(4) for c in range(4))
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    s = node.get('scale', [1, 1, 1])
    t = node.get('translation', [0, 0, 0])
    rotation = [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w), t[0],
                2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w), t[1],
                2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y), t[2], 0, 0, 0, 1]
    return tuple(v * s[i % 4] if i < 12 and i % 4 < 3 else v for i, v in enumerate(rotation))


def point(m, p):
    return tuple(sum(m[r * 4 + c] * p[c] for c in range(3)) + m[r * 4 + 3] for r in range(3))


def normal(m, p):
    # Inverse transpose, including nonuniform source transforms.
    a, b, c, d, e, f, g, h, i = (m[k] for k in (0, 1, 2, 4, 5, 6, 8, 9, 10))
    det = a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g)
    co = (e*i-f*h, f*g-d*i, d*h-e*g, c*h-b*i, a*i-c*g, b*g-a*h,
          b*f-c*e, c*d-a*f, a*e-b*d)
    out = [sum(co[r*3+k]*p[k] for k in range(3))/det for r in range(3)]
    length = math.sqrt(sum(v*v for v in out))
    return tuple(v/length for v in out)


def sombre(colour):
    grey = sum(a*b for a, b in zip(colour[:3], (.2126, .7152, .0722)))
    return tuple(round(255 * max(0, min(1, (.55*v+.45*grey)*.78*t))) for v, t in zip(colour[:3], (1., .98, .93))) + (255,)


def flatten(document, binary):
    vertices, indices, lookup = [], [], {}
    source_draws = 0
    textured = bool(document.get('textures'))

    def visit(index, parent):
        nonlocal source_draws
        node = document['nodes'][index]
        m = multiply(parent, matrix(node))
        if 'mesh' in node:
            for primitive in document['meshes'][node['mesh']]['primitives']:
                if primitive.get('mode', 4) != 4:
                    raise ValueError('Non-triangle primitive')
                source_draws += 1
                attrs = primitive['attributes']
                pos = accessor(document, binary, attrs['POSITION'])
                norm = accessor(document, binary, attrs['NORMAL'])
                uv = accessor(document, binary, attrs['TEXCOORD_0']) if 'TEXCOORD_0' in attrs else [(0., 0.)]*len(pos)
                material = document.get('materials', [{}])[primitive.get('material', 0)]
                pbr = material.get('pbrMetallicRoughness', {})
                colour = sombre(pbr.get('baseColorFactor', [1, 1, 1, 1])) if not textured else (255, 255, 255, 255)
                transform = pbr.get('baseColorTexture', {}).get('extensions', {}).get('KHR_texture_transform', {})
                scale, offset = transform.get('scale', [1, 1]), transform.get('offset', [0, 0])
                if transform.get('rotation', 0):
                    raise ValueError('Review rotated texture transform')
                source_indices = [r[0] for r in accessor(document, binary, primitive['indices'])] if 'indices' in primitive else range(len(pos))
                determinant = (m[0]*(m[5]*m[10]-m[6]*m[9])-m[1]*(m[4]*m[10]-m[6]*m[8])
                               +m[2]*(m[4]*m[9]-m[5]*m[8]))
                if determinant < 0:
                    source_indices = [source_indices[i+j] for i in range(0, len(source_indices), 3) for j in (0, 2, 1)]
                for old in source_indices:
                    tex = tuple(uv[old][i]*scale[i]+offset[i] for i in range(2))
                    v = tuple(round(x, 6) for x in point(m, pos[old])+normal(m, norm[old])+tex) + colour
                    if v not in lookup:
                        lookup[v] = len(vertices)
                        vertices.append(v)
                    indices.append(lookup[v])
        for child in node.get('children', []):
            visit(child, m)

    for index in document['scenes'][document.get('scene', 0)]['nodes']:
        visit(index, IDENTITY)
    return vertices, indices, source_draws


def encode_glb(name, vertices, indices, texture):
    binary = bytearray()
    document = {'asset': {'version': '2.0', 'generator': 'Field Signal CC0 campaign importer 1'},
                'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': name}],
                'meshes': [{'name': name, 'primitives': []}], 'bufferViews': [], 'accessors': [],
                'materials': [{'name': 'Campaign weathered matte', 'pbrMetallicRoughness': {
                    'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}, 'doubleSided': False}]}

    def append(values, fmt, kind, component, target, bounds=False):
        while len(binary) % 4:
            binary.append(0)
        start = len(binary)
        for row in values:
            binary.extend(struct.pack('<'+fmt*len(row), *row))
        view = len(document['bufferViews'])
        document['bufferViews'].append({'buffer': 0, 'byteOffset': start, 'byteLength': len(binary)-start, 'target': target})
        acc = {'bufferView': view, 'componentType': component, 'count': len(values), 'type': kind}
        if component == 5121 and kind == 'VEC4':
            acc['normalized'] = True
        if bounds:
            acc['min'] = [min(v[c] for v in values) for c in range(3)]
            acc['max'] = [max(v[c] for v in values) for c in range(3)]
        document['accessors'].append(acc)
        return len(document['accessors'])-1

    attrs = {'POSITION': append([v[:3] for v in vertices], 'f', 'VEC3', 5126, 34962, True),
             'NORMAL': append([v[3:6] for v in vertices], 'f', 'VEC3', 5126, 34962)}
    if texture:
        attrs['TEXCOORD_0'] = append([v[6:8] for v in vertices], 'f', 'VEC2', 5126, 34962)
        document['images'] = [{'uri': '../textures/'+texture+'.png'}]
        document['samplers'] = [{'magFilter': 9728, 'minFilter': 9984, 'wrapS': 33071, 'wrapT': 33071}]
        document['textures'] = [{'source': 0, 'sampler': 0}]
        document['materials'][0]['pbrMetallicRoughness']['baseColorTexture'] = {'index': 0}
    else:
        attrs['COLOR_0'] = append([v[8:12] for v in vertices], 'B', 'VEC4', 5121, 34962)
    if len(vertices) > 65535:
        raise ValueError('Curated mesh unexpectedly exceeds 16-bit indices')
    index = append([(i,) for i in indices], 'H', 'SCALAR', 5123, 34963)
    document['meshes'][0]['primitives'].append({'attributes': attrs, 'indices': index, 'material': 0, 'mode': 4})
    document['buffers'] = [{'byteLength': len(binary)}]
    j = json.dumps(document, separators=(',', ':')).encode()
    j += b' ' * (-len(j) % 4)
    binary.extend(b'\0' * (-len(binary) % 4))
    return (struct.pack('<III', 0x46546c67, 2, 28+len(j)+len(binary)) + struct.pack('<II', len(j), 0x4e4f534a)
            + j + struct.pack('<II', len(binary), 0x004e4942) + binary)


def thumbnail(vertices, indices, texture_image, target):
    """Small actual-geometry isometric preview; no browser/GPU is required."""
    from PIL import Image
    im = Image.new('RGBA', (192, 192), (30, 35, 32, 0))
    pixels = im.load()
    depth_buffer = [-math.inf]*(192*192)
    right, up, view = (.781, 0, .625), (-.265, .911, .331), (.596, .447, -.745)
    dot = lambda a, b: sum(x*y for x, y in zip(a, b))
    xy = [(dot(v[:3], right), -dot(v[:3], up)) for v in vertices]
    lo = tuple(min(p[c] for p in xy) for c in (0, 1))
    hi = tuple(max(p[c] for p in xy) for c in (0, 1))
    scale = 168/max(hi[0]-lo[0], hi[1]-lo[1])
    screen = [((p[0]-(lo[0]+hi[0])/2)*scale+96, (p[1]-(lo[1]+hi[1])/2)*scale+96) for p in xy]
    depths = [dot(v[:3], view) for v in vertices]
    faces = [indices[i:i+3] for i in range(0, len(indices), 3)]
    for face in faces:
        vs = [vertices[i] for i in face]
        n = [sum(v[3+c] for v in vs)/3 for c in range(3)]
        if dot(n, view) < -.01:
            continue
        shade = .4+.6*max(0, dot(n, (.3, .85, -.43)))
        if texture_image:
            u, v = (sum(row[k] for row in vs)/3 for k in (6, 7))
            colour = texture_image.getpixel((min(texture_image.width-1, max(0, int(u*texture_image.width))),
                                            min(texture_image.height-1, max(0, int(v*texture_image.height)))))[:3]
        else:
            linear = [sum(v[8+c] for v in vs)/765 for c in range(3)]
            colour = [255*(12.92*x if x <= .0031308 else 1.055*x**(1/2.4)-.055) for x in linear]
        fill = tuple(max(0, min(255, round(x*shade))) for x in colour) + (255,)
        a, b, c = [screen[i] for i in face]
        area = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(area) < 1e-9:
            continue
        x0, x1 = max(0, math.floor(min(a[0], b[0], c[0]))), min(191, math.ceil(max(a[0], b[0], c[0])))
        y0, y1 = max(0, math.floor(min(a[1], b[1], c[1]))), min(191, math.ceil(max(a[1], b[1], c[1])))
        da, db, dc = [depths[i] for i in face]
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                alpha = ((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/area
                beta = ((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/area
                gamma = 1-alpha-beta
                if min(alpha, beta, gamma) < -1e-6:
                    continue
                depth = alpha*da+beta*db+gamma*dc
                at = y*192+x
                if depth > depth_buffer[at]:
                    depth_buffer[at] = depth
                    pixels[x, y] = fill
    im.save(target, 'WEBP', lossless=True)


def contact_sheet(registry):
    from PIL import Image, ImageDraw
    width, cell, rows = 8*180, 204, math.ceil(len(registry)/8)
    im = Image.new('RGB', (width, rows*cell), '#202722')
    draw = ImageDraw.Draw(im)
    for i, item in enumerate(registry):
        x, y = (i % 8)*180, (i//8)*cell
        thumb = Image.open(ROOT/'site'/item['thumbnail'])
        thumb.thumbnail((168, 168))
        im.paste(thumb, (x+6, y), thumb)
        label = item['id'].removeprefix('campaign_')
        for line in range(2):
            draw.text((x+5, y+166+line*14), label[line*25:(line+1)*25], fill='#d9dfd4')
    im.save(DEST/'catalogue-preview.webp', 'WEBP', quality=85)


def import_assets(masters):
    from PIL import Image, ImageEnhance
    for folder in ('models', 'textures', 'thumbnails', 'licences'):
        (DEST/folder).mkdir(parents=True, exist_ok=True)
    registry, sources = [], []
    for pack, (title, expected_bytes, expected_hash) in PACKS.items():
        archive = (masters/(pack+'.zip')).read_bytes()
        if len(archive) != expected_bytes or sha(archive) != expected_hash:
            raise ValueError(pack+': archive does not match verified source lock')
        z = zipfile.ZipFile(io.BytesIO(archive))
        licence = z.read('License.txt')
        if b'Creative Commons Zero, CC0' not in licence or b'Kenney' not in licence:
            raise ValueError(pack+': unexpected licence')
        (DEST/'licences'/(pack+'.txt')).write_bytes(licence)
        authors = ['Kenney'] + (['Guus Vermeulen', 'Tony Schaer'] if pack == 'train-kit' else [])
        source = {'id': pack, 'name': title, 'authors': authors, 'source': 'https://kenney.nl/assets/'+pack,
                  'licence': 'CC0-1.0', 'licenceUrl': 'https://creativecommons.org/publicdomain/zero/1.0/',
                  'licenceEvidence': 'assets/campaign/licences/'+pack+'.txt', 'licenceEvidenceSha256': sha(licence),
                  'acquired': ACQUIRED, 'archiveBytes': expected_bytes, 'archiveSha256': expected_hash,
                  'archiveFile': pack+'.zip', 'downloadMethod': 'Public provider page -> download-link with page Referer -> signed ZIP; see importer.'}
        sources.append(source)
        texture = None
        names = z.namelist()
        for source_name, height, category, searchable in SELECTION[pack]:
            suffix = '/'+source_name+'.glb'
            member = next(n for n in names if n.endswith(suffix))
            raw = z.read(member)
            document, binary = read_glb(raw)
            verts, indices, source_draws = flatten(document, binary)
            source_min = [min(v[c] for v in verts) for c in range(3)]
            source_max = [max(v[c] for v in verts) for c in range(3)]
            scale = height/(source_max[1]-source_min[1])
            pivot = [(source_min[0]+source_max[0])/2, source_min[1], (source_min[2]+source_max[2])/2]
            verts = [tuple(round((v[c]-pivot[c])*scale, 6) for c in range(3))+v[3:] for v in verts]
            # This pack's cabinet doors face +Z. Standardise the entire furniture
            # family to -Z, matching the editor's front convention.
            yaw = math.pi if pack == 'furniture-kit' else 0
            if yaw:
                verts = [(-v[0], v[1], -v[2], -v[3], v[4], -v[5])+v[6:] for v in verts]
            dims = [round((source_max[c]-source_min[c])*scale, 6) for c in range(3)]
            if document.get('images') and texture is None:
                path = str(Path(member).parent/document['images'][0]['uri'])
                original_texture = z.read(path)
                texture = Image.open(io.BytesIO(original_texture)).convert('RGB')
                texture = ImageEnhance.Color(texture).enhance(.55)
                texture = ImageEnhance.Brightness(texture).enhance(.88)
                texture.thumbnail((256, 256), Image.Resampling.NEAREST)
                texture.save(DEST/'textures'/(pack+'.png'), optimize=True)
                source['textureSourceBytes'] = len(original_texture)
                source['textureSourceDimensions'] = list(Image.open(io.BytesIO(original_texture)).size)
            name = slug(source_name)
            asset_id = 'campaign_'+name
            glb = encode_glb(name, verts, indices, pack if document.get('images') else None)
            target = DEST/'models'/(name+'.glb')
            target.write_bytes(glb)
            thumb = DEST/'thumbnails'/(name+'.webp')
            thumbnail(verts, indices, texture, thumb)
            tex_memory = texture.width*texture.height*4*4//3 if texture else 0
            collision = {'type': 'box', 'size': dims, 'centre': [0, round(dims[1]/2, 6), 0]}
            if category in ('lighting', 'equipment'):
                collision = {'type': 'none', 'reason': 'Small fixture; attach to authored wall/ceiling/surface.'}
            if source_name in ('fence-doorway', 'tent'):
                collision = {'type': 'authored', 'reason': 'Use separate wall/post proxies; a whole-object AABB blocks the opening.'}
            if category == 'rail':
                collision = {'type': 'authored', 'reason': 'Keep running-surface and wagon-body collision separate from this decorative mesh.'}
            registry.append({'id': asset_id, 'name': re.sub(r'(?<!^)(?=[A-Z])', ' ', source_name).replace('-', ' ').capitalize(),
                'path': 'assets/campaign/models/'+name+'.glb', 'category': category, 'tags': [category, pack, 'low-poly', 'CC0'],
                'authors': authors, 'licence': 'CC0-1.0', 'source': source['source'], 'sourcePack': pack,
                'sourceMember': member, 'sourceSha256': sha(raw), 'sourceBytes': len(raw),
                'sourceTriangles': len(indices)//3, 'sourceDrawCalls': source_draws,
                'runtimeBytes': len(glb), 'sha256': sha(glb), 'triangles': len(indices)//3,
                'vertices': len(verts), 'drawCalls': 1, 'materials': 1,
                'texture': 'assets/campaign/textures/'+pack+'.png' if texture else None,
                'textureDimensions': list(texture.size) if texture else [], 'textureGpuBytesWithMipmaps': tex_memory,
                'textureSharing': pack if texture else None, 'geometryGpuBytes': len(verts)*(32 if texture else 28)+len(indices)*2,
                'dimensions': dims, 'units': 'metres', 'pivot': 'bottom-centre', 'up': '+Y',
                'front': '-Z' if pack == 'furniture-kit' or source_name.startswith('shipping-container') else None,
                'orientationNote': 'Furniture and shipping-container front verified -Z; other models retain source facing and should be checked for their authored use.',
                'sourceAppliedScale': round(scale, 9), 'sourceAppliedYaw': yaw,
                'sourceBounds': {'min': source_min, 'max': source_max},
                'collision': collision, 'searchableSuitable': searchable, 'interaction': None,
                'interactionNote': 'Authoring hint only. Requires stable gameplay container ID and reachable anchor; no loot is created by loading this model.',
                'lods': [{'level': 0, 'path': 'assets/campaign/models/'+name+'.glb', 'triangles': len(indices)//3}],
                'lodNote': 'Already low-poly; no separate mesh LOD. Distance cull/instance in renderer; benchmark actual placement.',
                'thumbnail': 'assets/campaign/thumbnails/'+name+'.webp', 'thumbnailMethod': 'Actual optimised mesh, deterministic software isometric raster.',
                'changes': 'Baked source node transforms; scaled uniformly to reference metres; bottom-centre pivot; furniture rotated 180 degrees to face -Z; merged static closed-pose geometry; deduplicated vertices; 16-bit indices; removed tangents/unused UVs/unlit extension; single matte opaque PBR material; subdued colours; shared 256px atlas where textured. No triangle decimation.'})
    (DEST/'sources.json').write_text(json.dumps({'format': 'field-signal-asset-sources/1', 'acquired': ACQUIRED, 'sources': sources}, indent=2)+'\n')
    summary = {'models': len(registry), 'runtimeModelBytes': sum(a['runtimeBytes'] for a in registry),
               'sourceModelBytes': sum(a['sourceBytes'] for a in registry), 'triangles': sum(a['triangles'] for a in registry),
               'sharedTextureBytes': sum(p.stat().st_size for p in (DEST/'textures').glob('*.png')),
               'sharedTextureGpuBytesWithMipmaps': sum(256*256*4*4//3 for p in (DEST/'textures').glob('*.png')),
               'searchableSuitableModels': sum(a['searchableSuitable'] for a in registry)}
    (DEST/'registry.json').write_text(json.dumps({'format': 'field-signal-asset-registry/1', 'acquired': ACQUIRED,
        'summary': summary, 'assets': registry}, indent=2)+'\n')
    contact_sheet(registry)
    print(json.dumps(summary, indent=2))


def verify():
    registry = json.loads((DEST/'registry.json').read_text())
    sources = {s['id']: s for s in json.loads((DEST/'sources.json').read_text())['sources']}
    seen = set()
    for source in sources.values():
        data = (ROOT/'site'/source['licenceEvidence']).read_bytes()
        assert sha(data) == source['licenceEvidenceSha256']
        assert b'Creative Commons Zero, CC0' in data
    for item in registry['assets']:
        assert item['id'] not in seen, item['id']
        seen.add(item['id'])
        path = ROOT/'site'/item['path']
        data = path.read_bytes()
        assert len(data) == item['runtimeBytes'] and sha(data) == item['sha256'], item['id']
        doc, binary = read_glb(data)
        primitives = doc['meshes'][0]['primitives']
        assert len(primitives) == 1 and len(doc['materials']) == 1
        primitive = primitives[0]
        assert doc['accessors'][primitive['indices']]['count']//3 == item['triangles']
        verts = accessor(doc, binary, primitive['attributes']['POSITION'])
        normals = accessor(doc, binary, primitive['attributes']['NORMAL'])
        indices = accessor(doc, binary, primitive['indices'])
        assert max(v[0] for v in indices) < len(verts)
        assert all(math.isfinite(c) for v in verts for c in v)
        assert abs(min(v[1] for v in verts)) < 1e-5
        assert all(abs(sum(c*c for c in n)-1) < 1e-4 for n in normals)
        for c in range(3):
            lower, upper = min(v[c] for v in verts), max(v[c] for v in verts)
            assert abs(upper-lower-item['dimensions'][c]) < 1e-5
            if c != 1:
                assert abs(lower+upper) < 1e-5
        assert len(indices) % 3 == 0
        for at in range(0, len(indices), 3):
            face = [i[0] for i in indices[at:at+3]]
            a, b, c = [verts[i] for i in face]
            ab, ac = [b[k]-a[k] for k in range(3)], [c[k]-a[k] for k in range(3)]
            cross = (ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0])
            averaged = [sum(normals[i][k] for i in face) for k in range(3)]
            assert sum(x*y for x, y in zip(cross, averaged)) >= -1e-8, item['id']+': reversed winding'
        for image in doc.get('images', []):
            resolved = (path.parent/image['uri']).resolve()
            assert resolved.is_relative_to(DEST.resolve()) and resolved.exists()
        assert (ROOT/'site'/item['thumbnail']).is_file()
        assert item['sourcePack'] in sources and item['licence'] == 'CC0-1.0'
    print('Verified', len(seen), 'unique CC0 GLBs: hashes, indices, normals/winding, one draw call, metre bounds, bottom pivots, textures, thumbnails and licence evidence.')


def verify_blender():
    """Independent glTF parser check using an already-installed Blender."""
    import subprocess
    import tempfile
    script = f'''import bpy, json, pathlib
root = pathlib.Path({str(ROOT/'site')!r})
assets = json.loads((root/'assets/campaign/registry.json').read_text())['assets']
for asset in assets:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(root/asset['path']))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    assert len(meshes) == 1, asset['id']
    assert sum(len(o.data.polygons) for o in meshes) == asset['triangles'], asset['id']
    assert len(meshes[0].data.materials) == 1, asset['id']
print('CAMPAIGN_BLENDER_VALIDATED', len(assets), 'GLBs; Blender', bpy.app.version_string)
'''
    with tempfile.NamedTemporaryFile('w', suffix='.py') as handle:
        handle.write(script)
        handle.flush()
        run = subprocess.run(['blender', '-b', '--factory-startup', '--python-exit-code', '1', '--python', handle.name],
                             text=True, capture_output=True, check=False)
    marker = next((s for s in run.stdout.splitlines() if s.startswith('CAMPAIGN_BLENDER_VALIDATED')), None)
    if run.returncode or marker is None:
        raise RuntimeError('Blender glTF check failed:\n'+run.stdout[-5000:]+run.stderr[-3000:])
    print(marker)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--masters', type=Path, default=ROOT.parent/'asset-source-masters', help='Non-shipping source ZIP directory')
    parser.add_argument('--download', action='store_true', help='Fetch hash-locked provider archives; preserve originals outside site/')
    parser.add_argument('--import', dest='do_import', action='store_true', help='Regenerate curated GLBs, atlas textures, thumbnails and registries (Pillow required)')
    parser.add_argument('--verify', action='store_true', help='Verify shipping assets without network or optional packages')
    parser.add_argument('--blender-verify', action='store_true', help='Independently import every GLB using an already-installed Blender (no rendering)')
    args = parser.parse_args()
    if not any((args.download, args.do_import, args.verify, args.blender_verify)):
        parser.error('Choose --download, --import, --verify and/or --blender-verify')
    if args.masters.resolve().is_relative_to((ROOT/'site').resolve()):
        parser.error('Master archives must remain outside shipping site/')
    if args.download:
        args.masters.mkdir(parents=True, exist_ok=True)
        download(args.masters)
    if args.do_import:
        import_assets(args.masters)
    if args.verify:
        verify()
    if args.blender_verify:
        verify_blender()


if __name__ == '__main__':
    main()
