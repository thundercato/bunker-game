#!/usr/bin/env python3
"""Compile candidate road polygons; development dependency: shapely==2.1.2.

Run `node tools/compile_campaign_routes.mjs` for routes plus surfaces, or
`python3 tools/compile_campaign_road_surfaces.py --check` to verify committed data.
Shapely is never imported by the static game or its runtime/build dependencies.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
POLICY={'asphaltIndices':[1,2,3],'asphaltWidth':5.4,'dirtWidth':3.5,
        'capStyle':'flat','joinStyle':'round','quadrantSegments':4,'precisionMetres':.000001,
        'priority':'asphalt-over-dirt','uvSpace':'world-xz','uvBaseMetresPerTile':4}


def fixed(value):
    if not isinstance(value,(int,float))or isinstance(value,bool)or not math.isfinite(value):
        raise ValueError('Road surface inputs must be finite numbers')
    return f'{0 if abs(value)<.0000005 else value:.6f}'


def canonical(value):
    if isinstance(value,(int,float))and not isinstance(value,bool):return fixed(value)
    if isinstance(value,list):return [canonical(v)for v in value]
    if isinstance(value,dict):return {k:canonical(v)for k,v in value.items()}
    return value


def content_hash(value):
    return hashlib.sha256(json.dumps(canonical(value),sort_keys=True,separators=(',',':')).encode()).hexdigest()


def input_fingerprint(source,routes):
    payload={'buildings':[[b['id'],*[fixed(b[k])for k in ['x','z','w','d']]]for b in source['buildings']],
             'sourceRoads':[[[fixed(n)for n in p]for p in line]for line in source['roads']],
             'roads':[[[fixed(n)for n in p]for p in line]for line in routes['roads']],
             'policy':POLICY}
    return content_hash(payload)


def polygon_rows(geometry):
    from shapely.geometry.polygon import orient
    if geometry.is_empty:return []
    polygons=[geometry]if geometry.geom_type=='Polygon'else list(geometry.geoms)
    def ring(coordinates):
        points=[[round(x,6),round(z,6)]for x,z in list(coordinates)[:-1]]
        # Canonical winding/start vertices make the emitted JSON deterministic.
        first=min(range(len(points)),key=lambda i:(points[i][0],points[i][1]))
        points=points[first:]+points[:first]
        return points+[points[0]]
    rows=[]
    for polygon in polygons:
        if polygon.geom_type!='Polygon':raise ValueError('Road union produced a non-polygon')
        polygon=orient(polygon,sign=1.)
        holes=sorted([ring(h.coords)for h in polygon.interiors])
        rows.append({'outer':ring(polygon.exterior.coords),'holes':holes})
    return sorted(rows,key=lambda p:(p['outer'][0],len(p['outer']),p['outer']))


def compile_surfaces(source,routes):
    try:
        import shapely
        from shapely.geometry import LineString,Polygon,box
        from shapely.ops import unary_union
    except ImportError as error:
        raise RuntimeError('Road generation requires development package shapely==2.1.2; runtime/build does not.')from error
    if routes.get('format')!='field-signal-campaign-routes/1'or len(routes['roads'])!=len(source['roads']):
        raise ValueError('Candidate routes do not match the source road catalogue')
    buffers={'asphalt':[],'dirt':[]}
    for index,line in enumerate(routes['roads']):
        if len(line)<2 or any(len(p)!=2 for p in line):raise ValueError('Road needs two-dimensional centre-line points')
        for p in line:
            for n in p:fixed(n)
        material='asphalt'if index in POLICY['asphaltIndices']else'dirt'
        width=POLICY['asphaltWidth']if material=='asphalt'else POLICY['dirtWidth']
        buffers[material].append(LineString(line).buffer(width/2,cap_style='flat',join_style='round',quad_segs=4))
    asphalt=shapely.set_precision(unary_union(buffers['asphalt']),.000001)
    dirt=shapely.set_precision(unary_union(buffers['dirt']).difference(asphalt),.000001)
    for name,geometry in [('asphalt',asphalt),('dirt',dirt)]:
        if not geometry.is_valid:raise ValueError('Invalid '+name+' road surface union')
        for building in source['buildings']:
            footprint=box(building['x']-building['w']/2,building['z']-building['d']/2,
                          building['x']+building['w']/2,building['z']+building['d']/2)
            if geometry.intersection(footprint).area>.000001:
                raise ValueError(name+' road surface overlaps building '+building['id'])
    result=copy.deepcopy(routes)
    result['surfaces']={'asphalt':polygon_rows(asphalt),'dirt':polygon_rows(dirt),
                        'overlapArea':round(asphalt.intersection(dirt).area,9)}
    result['surfaceCompilation']={'format':'field-signal-campaign-road-surfaces/1',
        'generator':'tools/compile_campaign_road_surfaces.py','generatorVersion':1,
        'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'inputsSha256':input_fingerprint(source,routes),'surfacesSha256':content_hash(result['surfaces']),'policy':POLICY,
        'library':{'name':'Shapely','version':shapely.__version__,'geos':shapely.geos_version_string},
        'areaSquareMetres':{'asphalt':round(asphalt.area,6),'dirt':round(dirt.area,6)},
        'polygonCount':len(result['surfaces']['asphalt'])+len(result['surfaces']['dirt']),
        'vertexCount':sum(len(p['outer'])-1+sum(len(h)-1 for h in p['holes'])for key in buffers for p in result['surfaces'][key])}
    # Validate the rounded, emitted representation as well as GEOS's source union.
    for key in buffers:
        for row in result['surfaces'][key]:
            if not Polygon(row['outer'],row['holes']).is_valid:raise ValueError('Rounded road polygon is invalid')
    return result


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=ROOT/'site/world.json')
    parser.add_argument('--routes',type=Path,default=ROOT/'site/campaign-routes.json')
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--stdin',action='store_true',help='Read routes from stdin and emit compiled JSON to stdout')
    args=parser.parse_args(argv)
    source=json.loads(args.source.read_text())
    routes=json.load(sys.stdin)if args.stdin else json.loads(args.routes.read_text())
    expected=compile_surfaces(source,routes)
    if args.check:
        if routes!=expected:raise ValueError('Stale candidate road surfaces: regenerate with node tools/compile_campaign_routes.mjs')
        print('Candidate road surfaces match their routes, source footprints and generator')
    elif args.stdin:print(json.dumps(expected,indent=2)+'\n',end='')
    else:
        args.routes.write_text(json.dumps(expected,indent=2)+'\n')
        meta=expected['surfaceCompilation'];print(f"Compiled {meta['polygonCount']} road polygons / {meta['vertexCount']} vertices")
    return 0


if __name__=='__main__':
    try:raise SystemExit(main())
    except (ValueError,RuntimeError)as error:print(str(error),file=sys.stderr);raise SystemExit(1)
