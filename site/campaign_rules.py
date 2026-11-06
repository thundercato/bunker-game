"""Pure candidate geometry, consumed by the existing deterministic Python engine.
Authored data only: no evaluation/import of scripts from a world document.
"""
import math


def local(x,z,position,yaw):
    dx=x-position[0];dz=z-position[2];c=math.cos(yaw);s=math.sin(yaw)
    return dx*c-dz*s,dx*s+dz*c


class CampaignGeometry:
    def __init__(self,data):
        self.data=data
        self.scenes=data.get('campaignScenes',[])
        geometry=data.get('campaignGeometry',{})
        self.colliders=list(geometry.get('colliders',[]))
        self.surfaces=geometry.get('surfaces',[])
        self.climbs={r['id']:r for r in geometry.get('climbs',[])}
        self.doors={}
        for scene in self.scenes:
            for c in scene['colliders']:
                self.colliders.append({**c,'minY':c['y'],'maxY':c['y']+c['h']})
            for i in scene['interactions']:
                if i['type']=='door':self.doors[i['id']]=(i['position'][0],i['position'][2])
        for c in data['containers']:
            if not c.get('searchDimensions') or c.get('editorScene'):continue
            w,h,d=c['searchDimensions'];y=c.get('floor',0)+c.get('searchMount',0)
            self.colliders.append({'x':c['x'],'z':c['z'],'w':w,'d':d,'minY':y,'maxY':y+h,'yaw':c.get('yaw',0)})

    def scene_at(self,x,z,margin=.6):
        for scene in self.scenes:
            t=scene['transform'];lx,lz=local(x,z,t['position'],t['yaw'])
            if abs(lx)<scene['bounds'][0]/2+margin and abs(lz)<scene['bounds'][1]/2+margin:return scene
        return None

    def height(self,x,z,last_y,base_height):
        scene=self.scene_at(x,z)
        if scene:
            t=scene['transform'];x,z=local(x,z,t['position'],t['yaw']);last_y-=t['position'][1]
            for o in scene['layout']['objects']:
                if o['type']!='stairs':continue
                lx,lz=local(x,z,o['position'],o['yaw']);w,h,d=o['size']
                if abs(lx)<=w/2-.06 and -d/2-.25<=lz<=d/2+.25:
                    y=o['position'][1]+max(0,min(1,(d/2-lz)/d))*h
                    if abs(last_y-y)<.65 or last_y>=o['position'][1] and lz>d/2-.25:return t['position'][1]+y
            floor=0
            for o in scene['objects']:
                if o['type']!='floor':continue
                # Floor pieces are in the object's own frame; sample in world space.
                wx=t['position'][0]+x*math.cos(t['yaw'])+z*math.sin(t['yaw'])
                wz=t['position'][2]-x*math.sin(t['yaw'])+z*math.cos(t['yaw'])
                lx,lz=local(wx,wz,o['position'],o['yaw'])
                if o['position'][1]<=last_y+t['position'][1]+.45:
                    if any(abs(lx-p['position'][0])<=p['size'][0]/2 and abs(lz-p['position'][2])<=p['size'][2]/2 for p in o['pieces']):floor=max(floor,o['position'][1]-t['position'][1])
            return t['position'][1]+floor
        pier=self.data['pier'];height=base_height
        if pier['minX']<x<pier['maxX'] and pier['minZ']<z<pier['maxZ']:height=0
        for s in self.surfaces:
            lx,lz=local(x,z,[s['x'],s['y'],s['z']],s.get('yaw',0))
            if abs(lx)<=s['w']/2 and abs(lz)<=s['d']/2 and s['y']<=last_y+.6:height=max(height,s['y'])
        return height

    def blocked(self,x,z,y,doors,r=.22):
        for c in self.colliders:
            if c.get('doorId') and doors.get(c['doorId'],True):continue
            if y>=c['maxY']-(.15 if c.get('kind')=='floor' else .035) or y+1.65<=c['minY']+.02:continue
            lx,lz=local(x,z,[c['x'],0,c['z']],c.get('yaw',0))
            if abs(lx)<c['w']/2+r and abs(lz)<c['d']/2+r:return True
        return False

    def line_blocked(self,a,b,y,doors):
        count=max(1,int(math.hypot(a[0]-b[0],a[1]-b[1])/.15))
        return any(self.blocked(a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count,y,doors,.02) for i in range(count+1))

    def climb(self,player,route_id,zone):
        route=self.climbs.get(route_id)
        if not route or zone!=route['zone']:raise ValueError('This ladder is not available here.')
        start=route['from']
        if math.hypot(player['x']-start['x'],player['z']-start['z'])>route['reach'] or abs(player.get('y',0)-start['y'])>.85:raise ValueError('Stand at this ladder landing first.')
        target=route['to']
        if not all(math.isfinite(target[k])for k in ('x','y','z','yaw'))or not 0<=target['y']<=30:raise ValueError('Invalid ladder landing.')
        return {**player,**target,'pitch':0},route
