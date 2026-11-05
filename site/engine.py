"""Field Signal: Below the Pines v6. Original deterministic Python survival simulation.
The client supplies movement and physical ray hits; Python owns inventory, seeded
loot, contracts, prices, enemy decisions, damage, maintenance and persistent saves.
"""
import copy
import json
import math
try:
    DATA = json.loads(WORLD_JSON)
except NameError:
    from pathlib import Path
    DATA = json.loads(Path(__file__).with_name('world.json').read_text())
APP = 'FieldSignalBelowPines'
VERSION = 6
CAT = DATA['catalogue']; BUILDINGS = DATA['buildings']; MISSIONS = {m['id']:m for m in DATA['missions']}
CONTAINERS = {c['id']:c for c in DATA['containers']}
DOORS = {'exit':(0,0), 'rear':(0,14)}
DOORS.update({b['id']:(b['x'],b['z']+b['d']/2) for b in BUILDINGS})
STATIONS = DATA['stations']
ENEMY_TYPES = {
 'drifter': {'health':48,'speed':1.05,'vision':10,'fov':.70,'hearing':5,'damage':10,'reach':1.65,'delay':1.7},
 'stalker': {'health':80,'speed':1.65,'vision':21,'fov':.35,'hearing':14,'damage':15,'reach':1.8,'delay':1.4},
 'wraith': {'health':115,'speed':2.0,'vision':31,'fov':-.10,'hearing':25,'damage':12,'reach':15,'delay':3.2}}
WALLS=[]
for b in [{'id':'base','x':0,'z':7,'w':12,'d':14}]+BUILDINGS:
 if b.get('editorScene'):continue
 x,z,w,d=b['x'],b['z'],b['w'],b['d']
 WALLS += [(x-w/2,z,.25,d),(x+w/2,z,.25,d)]
 for zz in [z-d/2,z+d/2]:
  if b['id']=='base' or zz==z+d/2:
   WALLS += [(x-(w+2.2)/4,zz,(w-2.2)/2,.25),(x+(w+2.2)/4,zz,(w-2.2)/2,.25)]
  else: WALLS += [(x,zz,w,.25)]

# Chest-height sight lines can pass through the side windows. Collision walls
# remain full-height in the top-down walking test, so nobody climbs through them.
VISION_WALLS=[]
for b in [{'id':'base','x':0,'z':7,'w':12,'d':14}]+BUILDINGS:
 if b.get('editorScene'):continue
 x,z,w,d=b['x'],b['z'],b['w'],b['d']
 if b['id']=='base':VISION_WALLS.extend([(x-w/2,z,.25,d),(x+w/2,z,.25,d)])
 else:
  for xx in [x-w/2,x+w/2]:
   VISION_WALLS.extend([(xx,z-d/4-.5,.25,d/2-1),(xx,z+d/4+.5,.25,d/2-1)])
 for zz in [z-d/2,z+d/2]:
  if b['id']=='base' or zz==z+d/2:
   VISION_WALLS.extend([(x-(w+2.2)/4,zz,(w-2.2)/2,.25),(x+(w+2.2)/4,zz,(w-2.2)/2,.25)])
  else:VISION_WALLS.append((x,zz,w,.25))


def dist(p,xy):return math.hypot(p['x']-xy[0],p['z']-xy[1])
def finite(x):return type(x) in (int,float) and math.isfinite(x)
def num(x,lo,hi,label):
 if not finite(x) or not lo<=x<=hi:raise ValueError('Invalid '+label)
 return x

def rng(s):
 s['seed']=(1664525*s['seed']+1013904223)&0xffffffff
 return s['seed']/4294967296

def note(s,text,sound=None,level='info',**extras):s['events'].append({'text':text,'sound':sound,'level':level,**extras})
def near(s,xy,r=3.5):
 if dist(s['player'],xy)>r:raise ValueError('Move closer to interact.')
def inside(p,b):return abs(p['x']-b['x'])<b['w']/2-.12 and abs(p['z']-b['z'])<b['d']/2-.12

def indoors(p):return (-5.9<p['x']<5.9 and .1<p['z']<13.9) or any(inside(p,b) for b in BUILDINGS)
def refuge(p):return -5.9<p['x']<5.9 and .1<p['z']<13.9

def land(x,z):
 b=DATA['bounds'];p=DATA['pier']
 return b['minX']<=x<=b['maxX'] and b['minZ']<=z<=b['maxZ'] and (x<=DATA['shore'] or (p['minX']<=x<=p['maxX'] and p['minZ']<=z<=p['maxZ']))

def walkable(s,x,z,r=.22):
 if not land(x,z):return False
 for cx,cz,w,d in WALLS:
  if abs(x-cx)<w/2+r and abs(z-cz)<d/2+r:return False
 for id,(cx,cz) in DOORS.items():
  if not s['doors'][id] and abs(x-cx)<1.05+r and abs(z-cz)<.12+r:return False
 return True

def crosses(a,b,rect):
 cx,cz,w,d=rect;lo=0.;hi=1.
 for av,dv,mn,mx in [(a[0],b[0]-a[0],cx-w/2,cx+w/2),(a[1],b[1]-a[1],cz-d/2,cz+d/2)]:
  if abs(dv)<1e-9:
   if av<mn or av>mx:return False
  else:
   t1,t2=(mn-av)/dv,(mx-av)/dv
   lo=max(lo,min(t1,t2));hi=min(hi,max(t1,t2))
   if hi<lo:return False
 return True

def clear_line(s,a,b):
 if any(crosses(a,b,r) for r in VISION_WALLS):return False
 return not any(not s['doors'][id] and crosses(a,b,(x,z,2.1,.22)) for id,(x,z) in DOORS.items())

def roll(s,profile):
 result={}
 for k,r in s['rules'][profile].items():
  if r['chance']>0 and rng(s)*100<r['chance']:
   result[k]=r['min']+int(rng(s)*(r['max']-r['min']+1))
 return result

def weight(s):
 return round(1.5+(.75 if s['weapon']['owned'] else 0)+len(s['magazines'])*.11+sum(CAT[k]['weight']*n for k,n in s['bag'].items())+sum(CAT[k]['weight'] for k in s['gear'].values() if k in CAT),3)

def mag(s):return next((m for m in s['magazines'] if m['id']==s['weapon']['inserted']),None)
def ammo_total(s):return s['bag']['ammo']+s['weapon']['chamber']+sum(m['rounds'] for m in s['magazines'])
def enemy(s,id):return next((e for e in s['enemies'] if e['id']==id),None)
def mission_ready(s,id):return s['bag'][MISSIONS[id]['item']]>0

def new_game(profiles=None):
 s={'app':APP,'version':VERSION,'seed':604921,'player':{'x':0.,'z':10.,'yaw':0.,'pitch':0.},
    'health':100.,'stamina':100.,'food':100.,'clock':1030.,'elapsed':0.,'credits':160,
    'weapon':{'owned':False,'inserted':None,'chamber':0,'safe':True,'jammed':False,'condition':88.},
    'magazines':[{'id':'m1','rounds':8,'condition':100}], 'nextMag':2,
    'bag':{k:0 for k in CAT},'gear':{'head':'cap','jacket':'jacket','trousers':'trousers','feet':'boots'},
    'hand':'gun','battery':100.,'torchOn':True,'taken':[],'loose':{},'nextDrop':1,'containers':{},
    'doors':{id:False for id in DOORS},'rules':copy.deepcopy(profiles or DATA['profiles']),'rulesVersion':1,
    'missions':{id:('active' if i==0 else 'locked') for i,id in enumerate(MISSIONS)},'pinned':'signal',
    'enemies':[], 'anomalyUntil':{a['id']:0 for a in DATA['anomalies']},'bottles':[True]*9,
    'deaths':0,'corpse':None,'stats':{'shots':0,'hits':0,'found':0,'searched':0,'metres':0.,'knives':0,'bottles':0,'cleaned':0},'events':[],'revision':0}
 s['bag'].update(ammo=32,food=2,med=2,probes=16)
 for spec in DATA['enemies']:
  e=copy.deepcopy(spec);e.update(health=ENEMY_TYPES[e['kind']]['health'],mode='patrol',cooldown=0.,memory=0.,target=[e['x'],e['z']],home=[e['x'],e['z']],phase=0.);s['enemies'].append(e)
 def loose(id,k,n,x,z,y=.99):s['loose'][id]={'id':id,'kind':k,'count':n,'name':CAT[k]['name'],'x':x,'z':z,'y':y}
 loose('pistol','gun',1,3.6,4.7);loose('base_mag','magazine',1,3.18,4.7);loose('base_ammo','ammo',24,4.05,4.7)
 for i,slot in enumerate(DATA['looseSlots']):
  rolled=roll(s,'loose')
  for j,(k,n) in enumerate(rolled.items()):
   loose('loose_'+str(i)+'_'+k,k,n,slot['x']+(j%3-1)*.24,slot['z']+(j//3)*.19,slot['y'])
 for i,a in enumerate(DATA['anomalies']):loose('artefact_'+a['id'],'shard' if i else 'bead',1,a['x']+.8,a['z'],.12)
 return s

def add_item(s,k,n):
 if k not in CAT or type(n)is not int or n<1:raise ValueError('Invalid item or quantity.')
 if weight(s)+CAT[k]['weight']*n>30:raise ValueError('That will exceed your 30 kg pack limit.')
 if k=='magazine':
  if len(s['magazines'])+n>30:raise ValueError('Too many magazines.')
  for _ in range(n):s['magazines'].append({'id':'m'+str(s['nextMag']),'rounds':0,'condition':100});s['nextMag']+=1
 elif k=='gun' and not s['weapon']['owned']:
  s['weapon']['owned']=True;s['bag']['gun']+=n-1
 else:s['bag'][k]+=n
 s['stats']['found']+=n

def drop(s,k,n,x,z,y=.08):
 id='drop'+str(s['nextDrop']);s['nextDrop']+=1
 s['loose'][id]={'id':id,'kind':k,'count':n,'name':CAT[k]['name'],'x':x,'z':z,'y':y}
 return id

def die(s):
 # Preserve one recoverable pack per death. Earlier unrecovered pack is merged so missions cannot be lost.
 saved=copy.deepcopy(s['bag'])
 if s['corpse']:
  for k,v in s['corpse']['bag'].items():saved[k]+=v
 s['corpse']={'x':s['player']['x'],'z':s['player']['z'],'bag':saved}
 s['bag']={k:0 for k in CAT};s['bag']['med']=1;s['bag']['probes']=5
 s['health']=100.;s['stamina']=100.;s['food']=max(45,s['food']);s['player']={'x':0.,'z':10.,'yaw':0.,'pitch':0.}
 s['hand']='gun';s['weapon']['safe']=True;s['deaths']+=1
 for e in s['enemies']:e['mode']='patrol';e['memory']=0;e['x'],e['z']=e['home']
 note(s,'You wake at Relay 07. Your slung pistol stayed with you. Recover the marked field pack.','danger','danger')

def advance(s,seconds,move=False,sprint=False,crouch=False,sight=None,noise=0):
 if seconds<=0:return
 if crouch:sprint=False
 seconds=min(seconds,8);s['clock']+=seconds*.18;s['elapsed']+=seconds
 s['food']=max(0,s['food']-seconds*.008)
 s['stamina']=max(0,min(100,s['stamina']+seconds*(-8 if move and sprint else 5)))
 if s['food']<12:s['stamina']=min(55,s['stamina'])
 if s['hand']=='torch' and s['bag']['torch'] and s['torchOn']:
  old=s['battery'];s['battery']=max(0,old-seconds*.075)
  if old and not s['battery']:note(s,'The torch battery is flat. Replace a battery in your pack.','safety','warning')
 p=s['player'];foot=CAT.get(s['gear']['feet'],{}).get('noise',1)
 if move:noise=max(noise,(9 if sprint else 3 if crouch else 5.5)*foot)
 safe=refuge(p)
 protection=min(.35,sum(CAT.get(k,{}).get('protection',0) for k in s['gear'].values()))
 for e in s['enemies']:
  if e['health']<=0:continue
  t=ENEMY_TYPES[e['kind']];dx=p['x']-e['x'];dz=p['z']-e['z'];d=math.hypot(dx,dz)
  if d>80:continue
  e['cooldown']=max(0,e['cooldown']-seconds);e['memory']=max(0,e['memory']-seconds)
  los=(sight.get(e['id']) if isinstance(sight,dict) and e['id'] in sight else clear_line(s,(e['x'],e['z']),(p['x'],p['z'])))
  dot=(-math.sin(e['yaw'])*dx-math.cos(e['yaw'])*dz)/max(.001,d)
  hour=(s['clock']/60)%24;night=hour>=19 or hour<6
  lit=s['hand']=='torch' and s['bag']['torch']>0 and s['torchOn'] and s['battery']>0
  vision=t['vision']*(.68 if night and not lit else 1)*( .7 if crouch else 1)
  sees=not safe and los and d<vision and (dot>t['fov'] or d<2)
  hears=not safe and noise>0 and d<min(t['hearing']+noise*.45,noise*2.5)
  if sees:
   e['mode']='chase';e['memory']=9 if e['kind']=='drifter' else 18;e['target']=[p['x'],p['z']]
  elif hears:
   e['mode']='investigate';e['memory']=12;e['target']=[p['x'],p['z']]
  elif e['mode']=='chase':e['mode']='search'
  if safe:e['memory']=0;e['mode']='patrol'
  if e['memory']<=0:e['mode']='patrol'
  if e['mode']=='patrol':
   e['phase']+=seconds*.08
   e['target']=[e['home'][0]+math.sin(e['phase'])*3,e['home'][1]+math.cos(e['phase'])*3]
  tx,tz=e['target'];vx=tx-e['x'];vz=tz-e['z'];dd=math.hypot(vx,vz)
  if dd>.3:
   e['yaw']=-math.atan2(vx,-vz)
   stop=t['reach']*.8 if sees else .25
   speed=t['speed']*(.45 if e['mode']=='patrol' else 1)
   if dd>stop:
    step=min(dd-stop,seconds*speed);nx=e['x']+vx/dd*step;nz=e['z']+vz/dd*step
    if walkable(s,nx,e['z'],.25) and not refuge({'x':nx,'z':e['z']}):e['x']=nx
    if walkable(s,e['x'],nz,.25) and not refuge({'x':e['x'],'z':nz}):e['z']=nz
  if sees and d<t['reach'] and e['cooldown']<=0:
   e['cooldown']=t['delay'];s['health']-=t['damage']*(1-protection)
   note(s,('A cold pulse tears through you.' if e['kind']=='wraith' else 'The '+e['kind']+' strikes. Retreat or fight.'),'danger','danger',enemy=e['id'])
 for a in DATA['anomalies']:
  if dist(p,(a['x'],a['z']))<a['radius'] and not (s['elapsed']<s['anomalyUntil'][a['id']] and p['x']>a['x']+.2):s['health']-=seconds*16
 if s['health']<=0:die(s)

def validated_rules(value):
 if not isinstance(value,dict) or set(value)!=set(DATA['profiles']):raise ValueError('Rules must contain all container profiles.')
 result={}
 for profile,entries in value.items():
  if not isinstance(entries,dict) or set(entries)!=set(DATA['profiles'][profile]):raise ValueError('Unknown or missing item in '+profile)
  result[profile]={}
  for k,r in entries.items():
   if not isinstance(r,dict) or set(r)!={'chance','min','max'}:raise ValueError('Malformed probability entry.')
   p=num(r['chance'],0,100,'percentage')
   lo,hi=r['min'],r['max']
   if type(lo)is not int or type(hi)is not int or not 1<=lo<=hi<=120:raise ValueError('Quantity must be whole numbers from 1 to 120.')
   result[profile][k]={'chance':float(p),'min':lo,'max':hi}
 return result

def dispatch(state,a):
 s=copy.deepcopy(state);s['events']=[]
 try:
  if not isinstance(a,dict):raise ValueError('Invalid action.')
  op=a.get('type');w=s['weapon'];p=s['player'];sight=a.get('sight')
  if op=='tick':
   dt=float(num(a.get('dt',0),0,.75,'time step'));q=a.get('player',p)
   vals={k:float(num(q.get(k,p[k]),-1e6,1e6,'position')) for k in p}
   if not land(vals['x'],vals['z']):raise ValueError('Deep water. There is no swimming here.')
   moved=math.hypot(vals['x']-p['x'],vals['z']-p['z'])
   if moved>6:raise ValueError('Movement was interrupted. Try again.')
   s['player']=vals;s['stats']['metres']+=moved
   if a.get('active'):advance(s,dt,moved>.0001,bool(a.get('sprint')),bool(a.get('crouch')),sight)
  elif op=='door':
   id=a.get('id')
   if id not in DOORS:raise ValueError('This wing is sealed.')
   near(s,DOORS[id]);s['doors'][id]=not s['doors'][id];note(s,('Opened' if s['doors'][id] else 'Closed')+' the door.','door');advance(s,.25,sight=sight)
  elif op=='pickup':
   id=a.get('id');it=s['loose'].get(id)
   if not it or id in s['taken'] or it['count']<=0:raise ValueError('Nothing left to take.')
   near(s,(it['x'],it['z']),3.4);add_item(s,it['kind'],it['count']);s['taken'].append(id)
   note(s,'Picked up '+it['name']+' ×'+str(it['count'])+'.','loot');advance(s,.25,sight=sight)
  elif op=='search':
   id=a.get('id');c=CONTAINERS.get(id)
   if not c:raise ValueError('Unknown container.')
   near(s,(c['x'],c['z']))
   if id not in s['containers']:
    contents=roll(s,c['profile'])
    for k,n in c.get('guaranteed',{}).items():contents[k]=contents.get(k,0)+n
    s['containers'][id]={'items':contents,'rulesVersion':s['rulesVersion']};s['stats']['searched']+=1
    advance(s,2,sight=sight,noise=2)
    note(s,'Search complete. '+str(len(contents))+' kinds of item found.','search')
   else:note(s,'This container has already been searched.')
  elif op in ('take','take_all'):
   id=a.get('id');c=CONTAINERS.get(id)
   if not c or id not in s['containers']:raise ValueError('Search the container first.')
   near(s,(c['x'],c['z']));contents=s['containers'][id]['items']
   keys=list(contents) if op=='take_all' else [a.get('kind')]
   total=0
   for k in keys:
    if k not in contents:continue
    n=contents[k] if op=='take_all' or a.get('all') else a.get('count',1)
    if type(n)is not int or not 1<=n<=contents[k]:raise ValueError('Invalid quantity.')
    capacity=max(0,int((30-weight(s)+1e-8)/CAT[k]['weight']))
    if k=='magazine':capacity=min(capacity,30-len(s['magazines']))
    if op=='take_all':n=min(n,capacity)
    if n:
     add_item(s,k,n);contents[k]-=n;total+=n
     if contents[k]==0:del contents[k]
   if not total:raise ValueError('Nothing fits. Make space in your backpack.')
   note(s,'Packed '+str(total)+' item'+('s.' if total!=1 else '.'),'loot');advance(s,.3,sight=sight)
  elif op=='rules':
   s['rules']=validated_rules(a.get('profiles'));s['rulesVersion']+=1
   note(s,'Loot rules saved. Only unopened containers use the new probabilities. Existing finds and mission items stay unchanged.','claim')
  elif op=='equip':
   hand=a.get('hand')
   if hand not in ('gun','knife','torch'):raise ValueError('Unknown hand slot.')
   if hand=='gun' and not w['owned']:raise ValueError('Pick up the PM on your workbench.')
   if hand!='gun' and not s['bag'][hand]:raise ValueError('You have no '+hand+'. Search the supply locker.')
   s['hand']=hand;note(s,{'gun':'PM ready in hand.','knife':'Knife equipped. Fire slashes; aim and fire throws.','torch':'Torch equipped. The gun is holstered.'}[hand],'loot')
  elif op=='torch_toggle':s['torchOn']=not s['torchOn'];note(s,'Torch '+('on.' if s['torchOn'] else 'off.'),'safety')
  elif op in ('eject','insert','rack','safe','clear','fire','clean'):
   if not w['owned']:raise ValueError('Pick up the PM on the refuge workbench first.')
   if op=='eject':
    if w['inserted'] is None:raise ValueError('No magazine inserted.')
    w['inserted']=None;note(s,'Magazine removed. Chamber '+('still loaded.' if w['chamber'] else 'empty.'),'eject')
   elif op=='insert':
    if w['inserted']:raise ValueError('Eject the magazine first.')
    available=[m for m in s['magazines'] if m.get('family','pm')==s.get('activeWeapon','pm') and(not a.get('id')or m['id']==a['id'])]
    if not available:raise ValueError('No compatible magazine.')
    m=max(available,key=lambda m:m['rounds']);w['inserted']=m['id'];note(s,'Inserted '+m['id'].upper()+': '+str(m['rounds'])+'/'+str(mag_capacity(m))+'. '+('Rack the slide.' if not w['chamber'] else 'Chamber remains loaded.'),'insert')
   elif op=='rack':
    if w['jammed']:raise ValueError('Clear the jam first.')
    if w['chamber']:w['chamber']=0;s['bag']['ammo']+=1
    m=mag(s)
    if m and m['rounds']:m['rounds']-=1;w['chamber']=1;note(s,'Round chambered. Safety '+('ON.' if w['safe'] else 'OFF.'),'chamber')
    else:note(s,'Empty chamber. Insert a loaded magazine.','chamber')
   elif op=='safe':w['safe']=not w['safe'];note(s,'Safety '+('ON.' if w['safe'] else 'OFF.'),'safety')
   elif op=='clear':
    if not w['jammed']:raise ValueError('The pistol is not jammed.')
    w['jammed']=False
    if w['chamber']:w['chamber']=0;s['bag']['ammo']+=1
    note(s,'Jam cleared. Rack the slide.','clear')
   elif op=='clean':
    near(s,STATIONS['bench']);amount=min(1.,100-w['condition'])
    if amount<=.001:raise ValueError('Your PM is already clean.')
    if s['credits']<2:raise ValueError('Cleaning requires 2 credits per 1% restored.')
    s['credits']-=2;w['condition']=min(100,w['condition']+amount);s['stats']['cleaned']+=1
    note(s,'Cleaning: '+str(round(w['condition']))+'% · −2 credits.')
   else:
    if s['hand']!='gun':raise ValueError('Equip your pistol before firing.')
    if w['safe']:raise ValueError('Safety is ON.')
    if w['jammed']:raise ValueError('Jammed. Clear, then rack.')
    if not w['chamber']:raise ValueError('Empty chamber. Insert a magazine, then rack.')
    probability=.001+((100-w['condition'])/100)**3*.24
    if rng(s)<probability:w['jammed']=True;note(s,'STOPPAGE. Clear the jam.','jam','danger')
    else:
     w['chamber']=0;m=mag(s)
     if m and m['rounds']:m['rounds']-=1;w['chamber']=1
     w['condition']=max(0,w['condition']-WEAPONS[s.get('activeWeapon','pm')]['wear']);s['stats']['shots']+=1
     hit=a.get('hit');e=enemy(s,hit)
     if e and e['health']>0 and dist(p,(e['x'],e['z']))<=WEAPONS[s.get('activeWeapon','pm')]['range'] and clear_line(s,(p['x'],p['z']),(e['x'],e['z'])):
      e['health']=max(0,e['health']-WEAPONS[s.get('activeWeapon','pm')]['damage']);e['mode']='chase';e['memory']=15;e['target']=[p['x'],p['z']];s['stats']['hits']+=1
      note(s,('The '+e['kind']+' dissolves.' if e['health']==0 else 'Hit.'),'fire',fired=True,hit=hit)
     elif isinstance(hit,str) and hit.startswith('bottle') and hit[6:].isdigit() and 0<=int(hit[6:])<9 and dist(p,(0,34))<40:
      i=int(hit[6:]);s['bottles'][i]=False;s['stats']['bottles']+=1;note(s,'Bottle shattered.','fire',fired=True,bottle=i)
     else:note(s,'Shot fired.','fire',fired=True)
     advance(s,.3,sight=sight,noise=35)
   if op!='fire':advance(s,.2,sight=sight)
  elif op=='fill':
   m=next((m for m in s['magazines'] if m['id']==a.get('id')),None)
   if not m:raise ValueError('Magazine not found.')
   if w['inserted']==m['id']:raise ValueError('Eject this magazine before filling it.')
   n=min(mag_capacity(m)-m['rounds'],s['bag']['ammo'])
   if not n:raise ValueError('Magazine full or no loose rounds.')
   m['rounds']+=n;s['bag']['ammo']-=n;note(s,'Loaded '+str(n)+' rounds.','insert');advance(s,n*.22,sight=sight)
  elif op=='knife':
   if s['hand']!='knife' or not s['bag']['knife']:raise ValueError('Equip a knife first.')
   thrown=bool(a.get('throw'));e=enemy(s,a.get('hit'));reach=16 if thrown else 2.5
   if e and e['health']>0 and dist(p,(e['x'],e['z']))<=reach and clear_line(s,(p['x'],p['z']),(e['x'],e['z'])):
    e['health']=max(0,e['health']-(55 if thrown else 35));e['mode']='chase';e['memory']=10;e['target']=[p['x'],p['z']]
   if thrown:
    pos=a.get('land',{});x=float(num(pos.get('x',p['x']),-2000,600,'knife landing'));z=float(num(pos.get('z',p['z']),-900,250,'knife landing'))
    if math.hypot(x-p['x'],z-p['z'])>17:raise ValueError('Knife landing out of range.')
    s['bag']['knife']-=1;s['stats']['knives']+=1
    if land(x,z):drop(s,'knife',1,x,z)
    note(s,'Knife thrown. Recover it where it lands.','knife',thrown=True)
   else:note(s,'Knife slash.','knife')
   advance(s,.55,sight=sight,noise=3)
  elif op=='probe':
   if not s['bag']['probes']:raise ValueError('No probes left.')
   s['bag']['probes']-=1;detected=False
   for f in DATA['anomalies']:
    if dist(p,(f['x'],f['z']))<17:s['anomalyUntil'][f['id']]=s['elapsed']+28;detected=True
   note(s,'The probe exposes an eastern approach. Move carefully.' if detected else 'The bolt lands without a reaction.','probe');advance(s,.3,sight=sight)
  elif op=='use':
   k=a.get('kind')
   if k not in CAT or not s['bag'][k]:raise ValueError('None left in your pack.')
   use=CAT[k].get('use')
   if use=='wear':
    slot=CAT[k]['slot'];old=s['gear'][slot];s['bag'][k]-=1
    if old in CAT:s['bag'][old]+=1
    s['gear'][slot]=k;note(s,'Equipped '+CAT[k]['name']+'.','loot')
   elif use=='equip':
    s['hand']=k;note(s,CAT[k]['name']+' equipped.','loot')
   elif use in ('med','medkit','bead'):
    if s['health']>=100:raise ValueError('You are already at full health.')
    s['bag'][k]-=1;s['health']=min(100,s['health']+{'med':28,'medkit':60,'bead':35}[use]);note(s,'Used '+CAT[k]['name']+'.','heal')
   elif use=='food':
    if s['food']>=100:raise ValueError('You are not hungry yet.')
    s['bag'][k]-=1;s['food']=min(100,s['food']+(38 if k=='food' else 18));note(s,'Ate '+CAT[k]['name']+'.','eat')
   elif use in ('water','energy'):
    s['bag'][k]-=1;s['stamina']=min(100,s['stamina']+(40 if use=='water' else 70));s['food']=min(100,s['food']+5);note(s,'Drank '+CAT[k]['name']+'.','eat')
   elif use=='battery':
    if s['battery']>=100:raise ValueError('Torch battery already full.')
    s['bag'][k]-=1;s['battery']=min(100,s['battery']+45);note(s,'Torch battery replaced.','insert')
   else:raise ValueError('This is salvage. Sell it at Relay 07.')
   advance(s,.35,sight=sight)
  elif op=='drop':
   k=a.get('kind')
   if k not in CAT or CAT[k]['category']=='mission':raise ValueError('Mission items stay in your pack.')
   if not s['bag'][k]:raise ValueError('None to drop.')
   s['bag'][k]-=1;drop(s,k,1,p['x'],p['z']);note(s,'Left '+CAT[k]['name']+' on the ground.','loot')
  elif op=='range_reset':
   near(s,STATIONS['range']);s['bottles']=[True]*9;note(s,'Nine fresh bottles placed on the fence.','claim')
  elif op=='bed':
   near(s,STATIONS['bed']);s['health']=100.;s['stamina']=100.;s['food']=max(15,s['food']-8)
   if a.get('dawn'):s['clock']=(math.floor(s['clock']/1440)+(1 if s['clock']%1440>=360 else 0))*1440+360
   else:s['clock']+=60
   note(s,'Rested. Your progress is saved.','heal')
  elif op=='accept':
   id=a.get('id')
   if s['missions'].get(id)!='available':raise ValueError('This contract is not available.')
   s['missions'][id]='active';s['pinned']=id;note(s,'Contract accepted: '+MISSIONS[id]['title']+'.','claim')
  elif op=='pin':
   id=a.get('id')
   if s['missions'].get(id)not in ('active','available'):raise ValueError('Choose an available contract.')
   s['pinned']=id;note(s,'Objective pinned to your map.')
  elif op=='deliver':
   near(s,STATIONS['radio']);id=a.get('id',s['pinned']);m=MISSIONS.get(id)
   if not m or s['missions'][id]!='active':raise ValueError('Accept the contract first.')
   if not s['bag'][m['item']]:raise ValueError('The marked item is still out there.')
   s['bag'][m['item']]-=1;s['missions'][id]='done';s['credits']+=m['reward'];s['bag']['med']+=1
   for k,st in list(s['missions'].items()):
    if st=='locked':s['missions'][k]='available'
   note(s,'Contract complete: '+m['title']+'. +'+str(m['reward'])+' credits and a dressing.','claim','success')
   s['pinned']=next((k for k,v in s['missions'].items() if v=='active'),next((k for k,v in s['missions'].items() if v=='available'),id))
  elif op in ('sell','sell_junk','buy'):
   near(s,STATIONS['trade'])
   if op=='sell_junk':
    payout=0
    for k,v in list(s['bag'].items()):
     if CAT[k]['category']=='salvage':payout+=CAT[k]['value']*v;s['bag'][k]=0
    if not payout:raise ValueError('No salvage to sell.')
    s['credits']+=payout;note(s,'Sold salvage for '+str(payout)+' credits.','buy')
   else:
    k=a.get('kind');n=a.get('count',1)
    if k not in CAT or CAT[k]['category']=='mission' or type(n)is not int or not 1<=n<=120:raise ValueError('Invalid trade.')
    if op=='buy':
     price=math.ceil(CAT[k]['value']*1.7)*n
     if s['credits']<price:raise ValueError('Not enough credits.')
     add_item(s,k,n);s['credits']-=price;note(s,'Purchased '+CAT[k]['name']+' ×'+str(n)+'.','buy')
    else:
     if s['bag'][k]<n:raise ValueError('Not enough to sell. Equipped items and individual magazines stay with you.')
     s['bag'][k]-=n;s['credits']+=CAT[k]['value']*n;note(s,'Sold '+CAT[k]['name']+' ×'+str(n)+'.','buy')
  elif op=='recover':
   c=s['corpse']
   if not c:raise ValueError('No field pack to recover.')
   near(s,(c['x'],c['z']))
   for k,v in list(c['bag'].items()):
    n=min(v,max(0,int((30-weight(s)+1e-8)/CAT[k]['weight'])))
    if n:add_item(s,k,n);c['bag'][k]-=n
   if not any(c['bag'].values()):s['corpse']=None
   note(s,'Recovered what fits from your field pack.','loot')
  elif op=='state':pass
  else:raise ValueError('Unknown action.')
 except (ValueError,TypeError,KeyError,OverflowError) as e:
  s=copy.deepcopy(state);s['events']=[];note(s,str(e),None,'warning')
 s['revision']+=1
 return s


def validate_save(s):
 if not isinstance(s,dict) or s.get('app')!=APP or s.get('version')!=VERSION:raise ValueError('Choose a Below the Pines v6 campaign. Earlier games remain separate.')
 base=new_game()
 for k in base:
  if k not in s:raise ValueError('Incomplete save: '+k)
 for f in ['health','stamina','food','battery']:num(s[f],0,100,f)
 for f in ['clock','elapsed','credits','deaths','revision','nextDrop','nextMag','rulesVersion','seed']:num(s[f],0,1e12,f)
 for f in ['credits','deaths','revision','nextDrop','nextMag','rulesVersion','seed']:
  if type(s[f])is not int:raise ValueError('Invalid integer '+f)
 p=s['player']
 if not isinstance(p,dict) or set(p)!=set(base['player']):raise ValueError('Invalid position.')
 for k,v in p.items():num(v,-1e6,1e6,k)
 if not land(p['x'],p['z']) or abs(p['pitch'])>1.5:raise ValueError('Position outside the playable area.')
 def bag(b):
  if not isinstance(b,dict) or set(b)!=set(CAT) or any(type(v)is not int or not 0<=v<=100000 for v in b.values()):raise ValueError('Invalid inventory.')
 bag(s['bag'])
 if s['hand']not in ('gun','knife','torch') or type(s['torchOn'])is not bool:raise ValueError('Invalid equipped item.')
 if not isinstance(s['gear'],dict) or set(s['gear'])!=set(base['gear']):raise ValueError('Invalid clothing slots.')
 for slot,k in s['gear'].items():
  if k not in CAT or CAT[k].get('slot')!=slot:raise ValueError('Invalid clothing.')
 mags=s['magazines'];ids=set()
 if not isinstance(mags,list) or not 0<=len(mags)<=30:raise ValueError('Invalid magazines.')
 for m in mags:
  if not isinstance(m,dict) or not isinstance(m.get('id'),str) or len(m['id'])>24 or m['id']in ids or type(m.get('rounds'))is not int or not 0<=m['rounds']<=mag_capacity(m):raise ValueError('Invalid magazine.')
  ids.add(m['id']);num(m.get('condition'),0,100,'magazine')
 w=s['weapon']
 if not isinstance(w,dict) or set(w)!=set(base['weapon']):raise ValueError('Invalid weapon.')
 if any(type(w[k])is not bool for k in ['owned','safe','jammed']) or type(w['chamber'])is not int or w['chamber']not in (0,1):raise ValueError('Invalid weapon state.')
 if w['inserted'] is not None and w['inserted']not in ids:raise ValueError('Missing magazine.')
 num(w['condition'],0,100,'condition')
 if not isinstance(s['doors'],dict) or set(s['doors'])!=set(DOORS) or any(type(v)is not bool for v in s['doors'].values()):raise ValueError('Invalid doors.')
 if not isinstance(s['missions'],dict) or set(s['missions'])!=set(MISSIONS) or any(v not in ['locked','available','active','done'] for v in s['missions'].values()) or s['pinned']not in MISSIONS:raise ValueError('Invalid contracts.')
 validated_rules(s['rules'])
 if not isinstance(s['containers'],dict) or len(s['containers'])>len(CONTAINERS):raise ValueError('Invalid containers.')
 for id,c in s['containers'].items():
  if id not in CONTAINERS or not isinstance(c,dict) or not isinstance(c.get('items'),dict):raise ValueError('Invalid container.')
  for k,n in c['items'].items():
   if k not in CAT or type(n)is not int or not 1<=n<=10000:raise ValueError('Invalid container contents.')
  num(c.get('rulesVersion'),1,1e9,'rules version')
 if not isinstance(s['loose'],dict) or not len(s['loose'])<=3000:raise ValueError('Invalid loose loot.')
 for id,it in s['loose'].items():
  if not isinstance(id,str) or len(id)>80 or not isinstance(it,dict) or it.get('kind')not in CAT or type(it.get('count'))is not int or not 1<=it['count']<=10000:raise ValueError('Invalid loose item.')
  if not land(num(it.get('x'),-2000,600,'item position'),num(it.get('z'),-900,250,'item position')):raise ValueError('Unreachable loose item.')
  num(it.get('y'),-8,15,'item height')
  if not isinstance(it.get('name'),str) or len(it['name'])>100:raise ValueError('Invalid item name.')
 if not isinstance(s['taken'],list) or len(set(s['taken']))!=len(s['taken']) or any(k not in s['loose'] for k in s['taken']):raise ValueError('Invalid collected loot.')
 if not isinstance(s['bottles'],list) or len(s['bottles'])!=9 or any(type(v)is not bool for v in s['bottles']):raise ValueError('Invalid range.')
 if not isinstance(s['enemies'],list) or len(s['enemies'])!=len(DATA['enemies']):raise ValueError('Invalid enemies.')
 for e,ref in zip(s['enemies'],DATA['enemies']):
  if e.get('id')!=ref['id'] or e.get('kind')!=ref['kind'] or e.get('mode')not in ['patrol','investigate','chase','search','windup','leap','recover','relocate','crouchfire','closefire']:raise ValueError('Invalid creature.')
  for k in ['x','z','yaw','phase']:num(e.get(k),-10000,10000,k)
  for k in ['health','cooldown','memory']:num(e.get(k),0,1000,k)
  if not land(e['x'],e['z']):raise ValueError('Invalid creature position.')
  for k in ['home','target']:
   if not isinstance(e[k],list) or len(e[k])!=2 or any(not finite(v) or abs(v)>2000 for v in e[k]):raise ValueError('Invalid creature target.')
 for k in ['anomalyUntil','stats']:
  if not isinstance(s[k],dict) or set(s[k])!=set(base[k]) or any(not finite(v) or v<0 for v in s[k].values()):raise ValueError('Invalid '+k)
 c=s['corpse']
 if c is not None:
  if not isinstance(c,dict) or set(c)!={'x','z','bag','y'}:raise ValueError('Invalid lost pack.')
  bag(c['bag']);num(c['x'],-2000,600,'pack position');num(c['z'],-900,250,'pack position')
  if not land(c['x'],c['z']):raise ValueError('Lost pack is outside the area.')
 s=copy.deepcopy(s);s['events']=[];return s

# Below the Pines v6 expansion. Pure, deterministic domain rules.
_BASE_NEW=new_game;_BASE_DISPATCH=dispatch;_BASE_VALIDATE=validate_save;_BASE_ADVANCE=advance;_BASE_DIE=die;_BASE_ADD=add_item;_BASE_WEIGHT=weight;_BASE_CLEAR=clear_line
WEAPONS={'pm':{'name':'PM service pistol','capacity':8,'damage':27,'wear':.28,'range':65},'carbine':{'name':'M12 patrol carbine','capacity':12,'damage':42,'wear':.22,'range':90}}
ENEMY_TYPES['skitter']={'health':36,'speed':2.7,'vision':16,'fov':-.25,'hearing':14,'damage':30,'reach':1.15,'delay':2.5}
for z,rects in DATA['interiorWalls'].items():WALLS.extend(tuple(r)for r in rects);VISION_WALLS.extend(tuple(r)for r in rects)

def clamp(x,a=0.,b=1.):return max(a,min(b,x))
def smooth(x):x=clamp(x);return x*x*(3-2*x)
def zone_at(x,z):
 for id,q in DATA['zones'].items():
  if q['minX']-1<x<q['maxX']+1 and q['minZ']-1<z<q['maxZ']+1:return id
 return 'field'
def segment_distance(x,z,a,b):
 dx=b[0]-a[0];dz=b[1]-a[1];u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz or 1))
 return math.hypot(x-a[0]-dx*u,z-a[1]-dz*u)
def terrain_height(x,z):
 if zone_at(x,z)!='field':return 0.
 f=smooth((66-x)/24)*smooth(max(abs(x)-9,max(-z-11,z-42))/9)
 for b in BUILDINGS:f=min(f,smooth(max(abs(x-b['x'])-b['w']/2-2,abs(z-b['z'])-b['d']/2-2)/9))
 for path in DATA['roads']:
  for a,b in zip(path,path[1:]):f=min(f,smooth((segment_distance(x,z,a,b)-4)/7))
 if DATA['rail']['minZ']-5<z<DATA['rail']['maxZ']+5:f=min(f,smooth((abs(x-DATA['rail']['x'])-4)/7))
 for a in DATA['anomalies']:f=min(f,smooth((math.hypot(x-a['x'],z-a['z'])-a['radius']-1)/7))
 for xx,zz in [(-123,-285),(35,-276)]:f=min(f,smooth((math.hypot(x-xx,z-zz)-5)/8))
 f=min(f,smooth((math.hypot(x+145,z+261)-16)/8))
 h=2+1.2*math.sin(x*.034)*math.cos(z*.027)+.8*math.sin(x*.079+z*.035)+.24*math.sin(x*.31)*math.cos(z*.29)+8*math.exp(-((x+143)**2+(z+312)**2)/1800)+5*math.exp(-((x+55)**2+(z+395)**2)/2200)
 return max(0,h*f)
def surface_height(x,z,last_y=0):
 zone=zone_at(x,z)
 if zone=='base':return 0.
 if zone=='cave':return -5*clamp((z-7)/15)
 if zone=='bunker':return -4.2*clamp((z-3)/12)
 for b in BUILDINGS:
  if b.get('floors')==2 and abs(x-b['x'])<b['w']/2-.15 and abs(z-b['z'])<b['d']/2-.15:
   lo=b['x']+b['w']/2-2.6;hi=b['x']+b['w']/2-.35;front=b['z']+b['d']/2-1;back=b['z']-b['d']/2+1
   if lo<x<hi and back-.15<z<front+.3:return 3.2*clamp((front-z)/(front-back))
   return 3.2 if last_y>1.75 else 0.
 return terrain_height(x,z)
def land(x,z):
 zone=zone_at(x,z)
 if zone=='base'and any(abs(x-(-500+r['side']*3))<.55 and abs(z-r['doorZ'])<1.08 for r in DATA['rooms']):return True
 if zone=='base':return (abs(x+500)<3 and 0<z<46)or any(abs(x-b['x'])<b['w']/2 and abs(z-b['z'])<b['d']/2 for b in DATA['rooms'])
 if zone=='cave':return 0<z<64 and abs(x+800)<(3.2 if z<21 else 18)
 if zone=='bunker':return 0<z<38 and abs(x+650)<(2.5 if z<16 else 13)
 b=DATA['bounds'];p=DATA['pier'];return b['minX']<=x<=b['maxX'] and b['minZ']<=z<=b['maxZ'] and(x<=DATA['shore']or p['minX']<=x<=p['maxX']and p['minZ']<=z<=p['maxZ'])
def refuge(p):return zone_at(p['x'],p['z'])=='base'
def indoors(p):return zone_at(p['x'],p['z'])!='field'or any(inside(p,b)for b in BUILDINGS)
def near(s,xy,r=3.5):
 p=s['player']
 if zone_at(*xy[:2])!=zone_at(p['x'],p['z'])or dist(p,xy)>r:raise ValueError('Walk closer to use this.')
def mag_capacity(m):return WEAPONS.get(m.get('family','pm'),WEAPONS['pm'])['capacity']
def bind_weapon(s):
 if 'weapons'in s:s['weapon']=s['weapons'][s['activeWeapon']]
 return s['weapon']
def weight(s):
 extra=sum(2.1 if k=='carbine'else .75 for k,w in s.get('weapons',{}).items()if w['owned']and k!=s.get('activeWeapon'))
 return round(_BASE_WEIGHT(s)+extra+(1.35 if s.get('activeWeapon')=='carbine'and s['weapon']['owned']else 0),3)
def add_item(s,k,n):
 if k=='carbine':
  if weight(s)+CAT[k]['weight']*n>30:raise ValueError('That exceeds the pack limit.')
  if not s['weapons']['carbine']['owned']:s['weapons']['carbine']['owned']=True;n-=1
  s['bag'][k]+=n;s['stats']['found']+=n+1;return
 if k=='gun'and 'weapons'in s:
  if not s['weapons']['pm']['owned']:s['weapons']['pm']['owned']=True;n-=1
  s['bag'][k]+=n;s['stats']['found']+=n+1;bind_weapon(s);return
 if k=='carbine_mag':
  if len(s['magazines'])+n>30 or weight(s)+.19*n>30:raise ValueError('No room for these magazines.')
  for _ in range(n):s['magazines'].append({'id':'m'+str(s['nextMag']),'rounds':0,'condition':100,'family':'carbine'});s['nextMag']+=1
  s['stats']['found']+=n;return
 _BASE_ADD(s,k,n)
 for m in s['magazines']:m.setdefault('family','pm')
def market(s):
 choices=['tuna','battery','wire','med'];k=choices[int(s['clock']//1440)%len(choices)]
 return {'kind':k,'multiplier':2.5,'text':'Today: '+CAT[k]['name']+' wanted. Paying 2.5× the usual rate.'}
def sale_price(s,k):return math.ceil(CAT[k]['value']*(2.5 if market(s)['kind']==k else 1))
def new_game(profiles=None):
 s=_BASE_NEW(profiles);s['player']={'x':-510.,'z':39.,'yaw':2.05,'pitch':-.12,'y':0.};s['zone']='base';s['thirst']=100.;s['clock']=900.
 s['stash']={k:0 for k in CAT};s['storedMagazines']=[];s['storedWeapons']={};s['roomOwned']=[];s['decor']={'wallA':'none','wallB':'none','rug':False,'lamp':'warm'}
 s['weather']={'mode':'clear','override':'auto','nextAt':220.,'count':0};s['scanned']=[];s['lastJump']=-2.;s['stats']['jumps']=0;s['stats']['scans']=0
 s['weapons']={'pm':s['weapon'],'carbine':{**copy.deepcopy(s['weapon']),'owned':False,'inserted':None,'chamber':0,'condition':79.}};s['activeWeapon']='pm';bind_weapon(s)
 for m in s['magazines']:m['family']='pm'
 for e in s['enemies']:
  e['y']=surface_height(e['x'],e['z']);e.update(windup=0.,leapTime=0.,leapFrom=[e['x'],e['z']],leapTo=[e['x'],e['z']],leapHit=False)
 for k,it in list(s['loose'].items()):
  if k in ['pistol','base_mag','base_ammo']:it['x']+=-486-3.6;it['z']+=27-4.7
  if k.startswith('artefact_'):
   a=next((a for a in DATA['anomalies']if k=='artefact_'+a['id']),None)
   if a:it.update(kind=a['artifact'],name=CAT[a['artifact']]['name'],x=a['x']+a['radius']*.6,z=a['z'],y=.15)
 return s

def die(s):
 old_y=s['player'].get('y',0);_BASE_DIE(s);s['player']={'x':-510.,'z':39.,'yaw':2.05,'pitch':-.12,'y':0.};s['zone']='base';s['thirst']=max(55,s['thirst']);s['corpse']['y']=old_y
 for e in s['enemies']:e['y']=surface_height(e['x'],e['z']);e['windup']=0.;e['leapTime']=0.
 bind_weapon(s)
def clear_line(s,a,b):
 if zone_at(*a)!=zone_at(*b):return False
 return _BASE_CLEAR(s,a,b)

def advance(s,seconds,move=False,sprint=False,crouch=False,sight=None,noise=0):
 if seconds<=0:return
 seconds=min(seconds,8);p=s['player'];z=zone_at(p['x'],p['z']);active=s['enemies'];crawlers=[e for e in active if e['kind']=='skitter'];regular=[e for e in active if e['kind']!='skitter'and e.get('zone','field')==z]
 s['enemies']=regular
 # The old AI reads the same weather-attenuated visibility that the renderer uses.
 original_visions={k:v['vision']for k,v in ENEMY_TYPES.items()};factor={'clear':1,'rain':.88,'fog':.48,'storm':.7}[s['weather']['mode']]
 if z=='field':
  for v in ENEMY_TYPES.values():v['vision']*=factor
 # Do not attack through floors. The ray query also tests the actual 3D walls.
 sight=dict(sight or {})
 for e in regular:
  e['y']=surface_height(e['x'],e['z'],e.get('y',0))
  if abs(e['y']-p.get('y',0))>2.2:sight[e['id']]=False
 _BASE_ADVANCE(s,seconds,move,sprint,crouch,sight,noise)
 for k,v in original_visions.items():ENEMY_TYPES[k]['vision']=v
 s['enemies']=active
 s['thirst']=max(0,s['thirst']-seconds*(.022 if sprint else .012))
 if s['thirst']<18:s['stamina']=min(48,s['stamina'])
 if s['thirst']<=0:s['health']=max(0,s['health']-seconds*.45)
 p=s['player'];z=zone_at(p['x'],p['z'])
 for e in crawlers:
  if e['health']<=0 or e.get('zone','field')!=z:continue
  e['cooldown']=max(0,e['cooldown']-seconds);d=dist(p,(e['x'],e['z']));e['y']=surface_height(e['x'],e['z'])
  if refuge(p):e['mode']='patrol';continue
  if e['mode']=='windup':
   e['windup']-=seconds
   if e['windup']<=0:e['mode']='leap';e['leapTime']=0
  elif e['mode']=='leap':
   oldx,oldz=e['x'],e['z'];e['leapTime']+=seconds;u=clamp(e['leapTime']/.9);fx,fz=e['leapFrom'];tx,tz=e['leapTo'];nx=fx+(tx-fx)*u;nz=fz+(tz-fz)*u
   steps=max(1,int(math.hypot(nx-oldx,nz-oldz)/.25)+1)
   blocked=False
   for i in range(1,steps+1):
    xx=oldx+(nx-oldx)*i/steps;zz=oldz+(nz-oldz)*i/steps
    if not walkable(s,xx,zz,.16):blocked=True;break
    e['x']=xx;e['z']=zz
    if not e['leapHit']and dist(p,(xx,zz))<.8 and abs(p.get('y',0)-surface_height(xx,zz))<1.35:
     s['health']-=30;e['leapHit']=True;note(s,'The skitter slams into you. Sidestep its committed leap.','danger',level='danger')
   e['y']=surface_height(e['x'],e['z'])+math.sin(u*math.pi)*1.15
   if u>=1 or blocked:e['mode']='recover';e['cooldown']=2.2;e['y']=surface_height(e['x'],e['z'])
  elif e['mode']=='recover':
   if e['cooldown']<=0:e['mode']='patrol'
  elif d<17*factor and clear_line(s,(e['x'],e['z']),(p['x'],p['z'])):
   e['mode']='chase';dx=p['x']-e['x'];dz=p['z']-e['z'];e['yaw']=-math.atan2(dx,-dz)
   if d<=5.1 and e['cooldown']<=0:
    e['mode']='windup';e['windup']=.65;e['leapFrom']=[e['x'],e['z']];length=min(10,d+4);e['leapTo']=[e['x']+dx/max(.01,d)*length,e['z']+dz/max(.01,d)*length];e['leapHit']=False
    note(s,'A skitter coils to leap. Move sideways.','skitter',level='warning',enemy=e['id'])
   elif d>1:
    step=min(seconds*2.7,d-.8);nx=e['x']+dx/d*step;nz=e['z']+dz/d*step
    if walkable(s,nx,e['z'],.18):e['x']=nx
    if walkable(s,e['x'],nz,.18):e['z']=nz
  else:e['mode']='patrol'
 if s['weather']['override']=='auto'and s['elapsed']>=s['weather']['nextAt']:
  w=s['weather'];w['count']+=1;w['mode']=['clear','rain','fog','storm'][w['count']%4];w['nextAt']=s['elapsed']+180+rng(s)*120;note(s,{'rain':'Rain moves in over the pines.','fog':'Mist thickens between the trees.','storm':'A storm gathers over the coast.','clear':'The weather lifts.'}[w['mode']])
 if s['health']<=0:die(s)

def _finish(s):
 s['zone']=zone_at(s['player']['x'],s['player']['z']);bind_weapon(s);s['revision']+=1;return s

def dispatch(state,a):
 s=copy.deepcopy(state);bind_weapon(s);s['events']=[];op=a.get('type')if isinstance(a,dict)else None
 try:
  p=s['player'];w=s['weapon'];zone=zone_at(p['x'],p['z'])
  if op=='portal':
   q=DATA['portals'].get(a.get('id'))
   if not q or q['from']!=zone:raise ValueError('This passage is not here.')
   near(s,(q['x'],q['z']),3.6);x,z,yaw=q['target'];s['player']={'x':float(x),'z':float(z),'yaw':float(yaw),'pitch':0.,'y':surface_height(x,z)};s['zone']=q['to'];note(s,q['name']+'.','door');return _finish(s)
  if op=='jump':
   if s['stamina']<7 or s['elapsed']-s['lastJump']<.7:raise ValueError('Catch your breath before jumping.')
   s['stamina']-=7;s['lastJump']=s['elapsed'];s['stats']['jumps']+=1;note(s,'A short hop.',jump=True);advance(s,.08);return _finish(s)
  if op=='weather':
   mode=a.get('mode')
   if mode not in ['auto','clear','rain','fog','storm']:raise ValueError('Invalid weather mode.')
   s['weather']['override']=mode
   if mode!='auto':s['weather']['mode']=mode
   note(s,'Weather: '+mode+'.');return _finish(s)
  if op=='scan':
   if not s['bag']['detector']:raise ValueError('Take the detector from the supply locker.')
   found=0
   for ar in DATA['anomalies']:
    if zone=='field'and dist(p,(ar['x'],ar['z']))<ar['radius']+9:
     id='artefact_'+ar['id']
     if id not in s['scanned']:s['scanned'].append(id);found+=1
   s['stats']['scans']+=1;note(s,'Scan revealed '+str(found)+' new artefact signal'+('s.'if found!=1 else '.'),'detector');advance(s,1.3);return _finish(s)
  if op in ['stash_put','stash_take','stash_mag','unstash_mag','stash_weapon','unstash_weapon']:
   near(s,STATIONS['stash'])
   if op in ['stash_put','stash_take']:
    k=a.get('kind');n=a.get('count',1)
    if k not in CAT or CAT[k]['category']=='mission'or type(n)is not int or not 1<=n<=100000:raise ValueError('Choose a valid non-mission item.')
    src,dst=(s['bag'],s['stash'])if op=='stash_put'else(s['stash'],s['bag'])
    if src[k]<n:raise ValueError('Not enough of that item.')
    if op=='stash_take'and weight(s)+CAT[k]['weight']*n>30:raise ValueError('Your pack would be too heavy.')
    src[k]-=n;dst[k]+=n
   elif op in ['stash_mag','unstash_mag']:
    src,dst=(s['magazines'],s['storedMagazines'])if op=='stash_mag'else(s['storedMagazines'],s['magazines']);m=next((m for m in src if m['id']==a.get('id')),None)
    if not m:raise ValueError('Magazine not found.')
    if any(x['inserted']==m['id']for x in s['weapons'].values()):raise ValueError('Eject this magazine before storing it.')
    if op=='unstash_mag'and len(dst)>=30:raise ValueError('Too many carried magazines.')
    src.remove(m);dst.append(m)
   else:
    k=a.get('weapon',s['activeWeapon'])
    if k not in WEAPONS:raise ValueError('Unknown weapon.')
    if op=='stash_weapon':
     ww=s['weapons'][k]
     if not ww['owned']:raise ValueError('Weapon not carried.')
     if ww['inserted']or ww['chamber']:raise ValueError('Eject the magazine and rack the chamber empty before storing.')
     s['storedWeapons'][k]=copy.deepcopy(ww);ww['owned']=False
    else:
     if k not in s['storedWeapons']:raise ValueError('Weapon not stored.')
     if weight(s)+(2.1 if k=='carbine'else .75)>30:raise ValueError('Your pack is too heavy.')
     s['weapons'][k]=s['storedWeapons'].pop(k);s['weapons'][k]['owned']=True
   note(s,'Storage updated. Equipment stays here between expeditions.','loot');return _finish(s)
  if op=='decorate':
   near(s,STATIONS['decorate'],7);slot=a.get('slot');k=a.get('kind')
   if slot not in ['wallA','wallB','rug','lamp']:raise ValueError('Choose a room fitting.')
   if slot in ['wallA','wallB']:
    if k!='none'and(k not in s['roomOwned']or not k.startswith('poster_')):raise ValueError('Buy that print from the trader first.')
    s['decor'][slot]=k
   elif slot=='rug':
    if bool(a.get('enabled'))and 'rug'not in s['roomOwned']:raise ValueError('Buy the rug first.')
    s['decor']['rug']=bool(a.get('enabled'))
   else:
    if k not in ['warm','blue']or k=='blue'and 'lamp_blue'not in s['roomOwned']:raise ValueError('Buy the blue lamp shade first.')
    s['decor']['lamp']=k
   note(s,'Your room has been updated.','loot');return _finish(s)
  if op in ['meal','drink','bar_drink']:
   station='bar'if op=='bar_drink'else 'canteen';near(s,STATIONS[station]);cost={'meal':25,'drink':8,'bar_drink':12}[op]
   if s['credits']<cost:raise ValueError('Not enough credits.')
   s['credits']-=cost
   if op=='meal':s['food']=min(100,s['food']+50);s['thirst']=min(100,s['thirst']+10)
   else:s['thirst']=min(100,s['thirst']+(45 if op=='drink'else 20));s['stamina']=min(100,s['stamina']+15)
   note(s,'A warm meal.'if op=='meal'else'A quiet drink.','eat');advance(s,2);return _finish(s)
  if op=='weapon_select':
   k=a.get('weapon')
   if k not in WEAPONS or not s['weapons'][k]['owned']:raise ValueError('Find that weapon first.')
   s['activeWeapon']=k;bind_weapon(s);s['hand']='gun';note(s,WEAPONS[k]['name']+' equipped.','loot');return _finish(s)
  if op=='use'and a.get('kind')in ['water','energy']:
   k=a['kind']
   if s['bag'][k]<=0:raise ValueError('No drink left.')
   s['bag'][k]-=1;s['thirst']=min(100,s['thirst']+(45 if k=='water'else 22));s['stamina']=min(100,s['stamina']+(15 if k=='water'else 45));note(s,'Drank '+CAT[k]['name']+'.','eat');advance(s,.35);return _finish(s)
  if op=='use'and a.get('kind')in ['gun','carbine']:return dispatch(s,{'type':'weapon_select','weapon':'pm'if a['kind']=='gun'else'carbine'})
  if op=='use'and a.get('kind')=='detector':return dispatch(s,{'type':'scan'})
  if op=='buy'and CAT.get(a.get('kind'),{}).get('category')=='decor':
   near(s,STATIONS['trade']);k=a['kind'];price=math.ceil(CAT[k]['value']*1.7)
   if k in s['roomOwned']:raise ValueError('You already own that room fitting.')
   if s['credits']<price:raise ValueError('Not enough credits.')
   s['credits']-=price;s['roomOwned'].append(k);note(s,'Bought '+CAT[k]['name']+'. Fit it in your room.','buy');return _finish(s)
  if op in ['sell','buy']:
   near(s,STATIONS['trade']);k=a.get('kind');n=a.get('count',1)
   if k not in CAT or CAT[k]['category']in ['mission','decor']or type(n)is not int or not 1<=n<=120:raise ValueError('Invalid trade.')
   unit=sale_price(s,k)
   if op=='buy':
    price=math.ceil(unit*1.7)*n
    if s['credits']<price:raise ValueError('Not enough credits.')
    add_item(s,k,n);s['credits']-=price
   else:
    if s['bag'][k]<n:raise ValueError('Not enough to sell.')
    s['bag'][k]-=n;s['credits']+=unit*n
   note(s,('Bought 'if op=='buy'else'Sold ')+CAT[k]['name']+'.','buy');return _finish(s)
  if op=='pickup':
   it=s['loose'].get(a.get('id'))
   if it and a['id'].startswith('artefact_')and a['id']not in s['scanned']:raise ValueError('Use your detector scan to reveal this artefact.')
   if it and abs(p.get('y',0)-(it['y'] if it['y']<0 else surface_height(it['x'],it['z'])))>2.3:raise ValueError('You are on another floor.')
  if op in ['search','take','take_all']:
   c=CONTAINERS.get(a.get('id'))
   if c and abs(p.get('y',0)-c.get('floor',0))>1.7:raise ValueError('Reach this container’s floor first.')
  if op=='tick':
   q=a.get('player',p)
   if zone_at(q.get('x',p['x']),q.get('z',p['z']))!=zone:raise ValueError('Use the entrance to change areas.')
   y=q.get('y',p.get('y',0));num(y,-8,30,'height')
   floor=surface_height(q.get('x',p['x']),q.get('z',p['z']),p.get('y',0))
   if y<floor-.25 or y>floor+1.2:raise ValueError('Keep your feet on the terrain.')
  # Original actions still own magazine handling, chests, contracts and upkeep.
  result=_BASE_DISPATCH(s,a);bind_weapon(result);
  if op in ['drop','knife']:
   for id,it in result['loose'].items():
    if id not in state['loose']:
     it['y']=surface_height(it['x'],it['z'],p.get('y',0))+.08
  result['zone']=zone_at(result['player']['x'],result['player']['z']);return result
 except (ValueError,TypeError,KeyError,OverflowError)as e:
  s=copy.deepcopy(state);s['events']=[];note(s,str(e),level='warning');return _finish(s)

def validate_save(s):
 # Full legacy validation remains in force; v6 fields receive additional bounds.
 s=_BASE_VALIDATE(s)
 for k in ['zone','thirst','stash','storedMagazines','storedWeapons','roomOwned','decor','weather','scanned','weapons','activeWeapon','lastJump']:
  if k not in s:raise ValueError('Incomplete v6 save: '+k)
 if s['zone']!=zone_at(s['player']['x'],s['player']['z']):raise ValueError('Mismatched region.')
 num(s['thirst'],0,100,'thirst')
 if s['activeWeapon']not in WEAPONS or set(s['weapons'])!=set(WEAPONS):raise ValueError('Invalid weapons.')
 for ww in s['weapons'].values():
  if set(ww)!=set(s['weapon'])or any(type(ww[k])is not bool for k in ['owned','safe','jammed'])or ww['chamber']not in [0,1]:raise ValueError('Invalid stored weapon state.')
  num(ww['condition'],0,100,'weapon condition')
 if s['weapon']!=s['weapons'][s['activeWeapon']]:raise ValueError('Mismatched equipped weapon.')
 if set(s['stash'])!=set(CAT)or any(type(n)is not int or not 0<=n<=100000 for n in s['stash'].values()):raise ValueError('Invalid storage.')
 if any(k not in CAT or CAT[k]['category']!='decor'for k in s['roomOwned']):raise ValueError('Invalid room collection.')
 if s['weather'].get('mode')not in ['clear','rain','fog','storm']or s['weather'].get('override')not in ['auto','clear','rain','fog','storm']:raise ValueError('Invalid weather.')
 num(s['weather']['nextAt'],0,1e12,'weather time')
 if any(k not in s['loose']or not k.startswith('artefact_')for k in s['scanned']):raise ValueError('Invalid detector discoveries.')
 bind_weapon(s);return s


def migrate_refit_save(saved):
 if not isinstance(saved,dict) or saved.get('app')!=APP or saved.get('version')!=VERSION:
  raise ValueError('Choose a Below the Pines v6 or Relay Refit campaign.')
 saved=copy.deepcopy(saved)
 if not isinstance(saved.get('doors'),dict):raise ValueError('Invalid doors.')
 for key in DOORS:saved['doors'].setdefault(key,False)
 return saved

# DEAD AIR v9: continuous simulation, contact-owned contracts and occluded enemies.
_V8_NEW=new_game;_V8_DISPATCH=dispatch;_V8_VALIDATE=validate_save;_V8_ADD=add_item;_V8_WEIGHT=weight;_V8_DIE=die;_V8_TERRAIN=terrain_height;_V8_SURFACE=surface_height
APP='FieldSignalDeadAir';VERSION=9
WEAPONS['rifle']={'name':'R7 patrol rifle','capacity':5,'damage':82,'wear':.32,'range':120}
ENEMY_TYPES['rifleman']={'health':95,'speed':4.6,'vision':48,'fov':.35,'hearing':25,'damage':19,'reach':65,'delay':1.0}
for q in DATA.get('partitions',[]):
 if q.get('editorScene'):continue
 x,z,w=q['x'],q['z'],q['w'];WALLS.extend(tuple(v)for v in q['segments']);DOORS[q['id']]=(x,z)
# Fortified perimeter: front gate plus a deliberate, smaller rear breach.
f=DATA['military'];mx=(f['minX']+f['maxX'])/2;mz=(f['minZ']+f['maxZ'])/2
FORT_WALLS=[(f['minX'],mz,.5,f['maxZ']-f['minZ']),(f['maxX'],mz,.5,f['maxZ']-f['minZ'])]
for z,gap,gapw in [(f['maxZ'],f['gateX'],7.),(f['minZ'],f['gapX'],f['gapWidth'])]:
 for left,right in [(f['minX'],gap-gapw/2),(gap+gapw/2,f['maxX'])]:FORT_WALLS.append(((left+right)/2,z,right-left,.5))
WALLS.extend(FORT_WALLS);VISION_WALLS[:]=WALLS[:]
# Initial above-ground rectangle is a shell replaced by a stairwell in v9.
WALLS[:]=[r for r in WALLS if not(abs(r[0])<=6.1 and -.3<=r[1]<=14.3)]
VISION_WALLS[:]=WALLS[:]

def building_at(x,z):return next((b['id']for b in BUILDINGS if abs(x-b['x'])<b['w']/2-.15 and abs(z-b['z'])<b['d']/2-.15),None)
def boundary_passable(x,z):
 r=DATA['river'];p=DATA['pier'];b=DATA['bounds']
 if not (b['minX']<=x<=b['maxX'] and b['minZ']<=z<=DATA['swamp']['limit']):return False
 return x<r['west'] or x>r['east'] or any(abs(z-q['z'])<q['halfWidth']for q in r['bridges'])or(p['minX']<=x<=p['maxX']and p['minZ']<=z<=p['maxZ'])
def land(x,z):
 zone=zone_at(x,z)
 if zone=='base':
  return(abs(x+500)<2.95 and -7.8<z<53.8)or any(abs(x-(-500+b['side']*3))<.56 and abs(z-b['doorZ'])<1.08 for b in DATA['rooms'])or any(abs(x-b['x'])<b['w']/2-.05 and abs(z-b['z'])<b['d']/2-.05 for b in DATA['rooms'])
 if zone=='cave':return 0<z<64 and abs(x+800)<(3.2 if z<21 else 18)
 if zone=='bunker':return 0<z<38 and abs(x+650)<(2.5 if z<16 else 13)
 if zone=='sewer':return(0<z<114 and abs(x+1100)<2.65)or(38<z<54 and abs(x+1100)<7)or(67.5<z<72.5 and -1101<x<-1084)
 return boundary_passable(x,z)
def terrain_height(x,z):
 if zone_at(x,z)!='field':return 0.
 if 66<=x<=132:return -1.
 if z>=58:return 0.
 if x<66:return _V8_TERRAIN(x,z)
 f=smooth((x-132)/14)
 for b in BUILDINGS:f=min(f,smooth(max(abs(x-b['x'])-b['w']/2-2,abs(z-b['z'])-b['d']/2-2)/8))
 for route in DATA['roads']:
  for a,b in zip(route,route[1:]):f=min(f,smooth((segment_distance(x,z,a,b)-4)/7))
 if 178<x<297 and -609<z<-475:f=0
 for q in [(154,-348),(210,-422)]:f=min(f,smooth((math.hypot(x-q[0],z-q[1])-5)/7))
 return max(0,(2.4+1.3*math.sin(x*.038)*math.cos(z*.025)+.45*math.sin(x*.19+z*.17))*f)
def surface_height(x,z,last_y=0):
 zone=zone_at(x,z)
 if zone=='base':return 2.6*clamp(-z/7)if z<0 else 2.6*clamp((z-46)/7)if z>46 else 0.
 if zone=='sewer':return -4.2*clamp((z-3)/12)
 if zone in ['cave','bunker']:return _V8_SURFACE(x,z,last_y)
 if abs(x)<1.8 and 0<z<8:return -3*clamp(z/7)
 if abs(x)<1.8 and 9<z<14:return -3*clamp((14-z)/7)
 r=DATA['river']
 if r['west']-7<x<r['east']+7:
  for br in r['bridges']:
   if abs(z-br['z'])<br['halfWidth']+1:return .45*min(smooth((x-(r['west']-7))/7),smooth(((r['east']+7)-x)/7))
 for b in BUILDINGS:
  if b.get('floors')==2 and abs(x-b['x'])<b['w']/2-.15 and abs(z-b['z'])<b['d']/2-.15:
   front=b['z']+b['d']/2-1;back=b['z']-b['d']/2+1
   if b['x']+b['w']/2-2.6<x<b['x']+b['w']/2-.35 and back-.15<z<front+.3:return 3.2*clamp((front-z)/(front-back))
   return 3.2 if last_y>1.75 else 0.
 return terrain_height(x,z)

def new_enemy(spec):
 e=copy.deepcopy(spec);e.update(health=ENEMY_TYPES[e['kind']]['health'],mode='patrol',cooldown=0.,memory=0.,target=[e['x'],e['z']],home=[e['x'],e['z']],phase=0.,y=surface_height(e['x'],e['z']),windup=0.,leapTime=0.,leapFrom=[e['x'],e['z']],leapTo=[e['x'],e['z']],leapHit=False,cycle=0.,runTime=0.,lastSeen=-100.,follow=None,roam=0.)
 return e

def mission_available(s,m):return all(s['missions'].get(k)=='done'for k in m.get('requires',[]))
def refresh_missions(s):
 offered=[]
 for m in DATA['missions']:
  if s['missions'].get(m['id'])=='locked'and mission_available(s,m):
   s['missions'][m['id']]='available';s['missionLog'].setdefault(m['id'],{})['offeredAt']=s['clock'];offered.append(m)
 radio=[m for m in offered if m.get('source','radio')=='radio']
 if radio:note(s,str(len(radio))+' new transmission'+('s'if len(radio)!=1 else'')+' waiting at Relay 07.','mission_beep',newMission=True)
 return offered

def radio_unread(s):return [m['id']for m in DATA['missions']if m.get('source','radio')=='radio'and s['missions'].get(m['id'])in['active','available']and m['id']not in s['readOffers']]

def new_game(profiles=None):
 s=_V8_NEW(profiles);s['app']=APP;s['version']=VERSION
 s['weapons']['rifle']={'owned':False,'inserted':None,'chamber':0,'safe':True,'jammed':False,'condition':92.};bind_weapon(s)
 s.update(playSeconds=0.,missionLog={'signal':{'offeredAt':s['clock'],'acceptedAt':s['clock'],'acceptedPlay':0}},readOffers=[],revealed=[],knifeGrip='forward',torchType='torch',torchMode='high',swampDepth=0.,lastShot=-10.,lastKnife=-10.,lastBuilding=None,expeditions=0)
 s['enemies']=[new_enemy(e)for e in DATA['enemies']]
 # Ordinary contents keep their probabilities; fixed campaign objects remain guaranteed.
 return s

def add_item(s,k,n):
 if k=='rifle':
  if weight(s)+CAT[k]['weight']*n>30:raise ValueError('That exceeds your pack limit.')
  if not s['weapons']['rifle']['owned']:s['weapons']['rifle']['owned']=True;n-=1
  s['bag'][k]+=n;s['stats']['found']+=n+1;return
 if k=='rifle_mag':
  if len(s['magazines'])+n>30 or weight(s)+.2*n>30:raise ValueError('No room for more magazines.')
  for _ in range(n):s['magazines'].append({'id':'m'+str(s['nextMag']),'rounds':0,'condition':100,'family':'rifle'});s['nextMag']+=1
  s['stats']['found']+=n;return
 _V8_ADD(s,k,n)

def ammo_kind(weapon):return 'rifle_ammo'if weapon=='rifle'else'ammo'
def weight(s):return round(_V8_WEIGHT(s)+((3.4-.75)if s.get('activeWeapon')=='rifle'and s['weapon']['owned']else(3.4-.75)if s.get('activeWeapon')!='rifle'and s.get('weapons',{}).get('rifle',{}).get('owned')else 0),3)

def clear_line(s,a,b):
 if zone_at(*a)!=zone_at(*b):return False
 if zone_at(*a)=='field':
  ba,bb=building_at(*a),building_at(*b)
  if ba!=bb:
   # Full walls, including windows, block sight. Only an actual open doorway can bridge rooms.
   for bid in [ba,bb]:
    if not bid:continue
    spec=next(q for q in BUILDINGS if q['id']==bid);door=(spec['x'],spec['z']+spec['d']/2)
    if not s['doors'].get(bid)or not crosses(a,b,(door[0],door[1],2.15,.45)):return False
 if any(crosses(a,b,r)for r in WALLS):return False
 return not any(not s['doors'].get(id,False)and crosses(a,b,(x,z,2.1,.18))for id,(x,z)in DOORS.items()if id not in['exit','rear'])

def walkable(s,x,z,r=.22):
 if not land(x,z):return False
 if any(abs(x-cx)<w/2+r and abs(z-cz)<d/2+r for cx,cz,w,d in WALLS):return False
 return not any(not s['doors'].get(id,False)and abs(x-cx)<1.05+r and abs(z-cz)<.12+r for id,(cx,cz)in DOORS.items()if id not in['exit','rear'])

def enemy_step(s,e,target,seconds,speed):
 dx=target[0]-e['x'];dz=target[1]-e['z'];d=math.hypot(dx,dz)
 if d<.1:return
 e['yaw']=-math.atan2(dx,-dz);step=min(d,seconds*speed);steps=max(1,int(step/.2)+1)
 for _ in range(steps):
  nx=e['x']+dx/max(.001,d)*step/steps;nz=e['z']+dz/max(.001,d)*step/steps
  if walkable(s,nx,e['z'],.22):e['x']=nx
  if walkable(s,e['x'],nz,.22):e['z']=nz
 e['y']=surface_height(e['x'],e['z'],e.get('y',0))

def sees_player(s,e,crouch=False,sight=None):
 p=s['player'];t=ENEMY_TYPES[e['kind']]
 if refuge(p)or e.get('zone','field')!=zone_at(p['x'],p['z']):return False
 d=dist(p,(e['x'],e['z']));dy=abs((p.get('y')or 0)-(e.get('y')or 0))
 if dy>2.3 or not clear_line(s,(e['x'],e['z']),(p['x'],p['z'])):return False
 if isinstance(sight,dict)and sight.get(e['id'])is False:return False
 dot=(-math.sin(e['yaw'])*(p['x']-e['x'])-math.cos(e['yaw'])*(p['z']-e['z']))/max(.001,d)
 lit=s['hand']=='torch'and s['torchOn']and s['battery']>0;night=(s['clock']/60)%24<6 or (s['clock']/60)%24>=19;dark=indoors(p)or night
 factor=(1.32 if lit else .36 if dark else 1)*(.66 if crouch else 1)*({'fog':.5,'storm':.7,'rain':.88}.get(s['weather']['mode'],1)if zone_at(p['x'],p['z'])=='field'else 1)
 return d<t['vision']*factor and(dot>t['fov']or d<1.5 or lit and d<5)

def shooter_chance(distance,crouch=False,sprint=False):return min(.5,max(.04,.5-(max(0,distance-6)/56)*.46))*(.72 if crouch else 1)*(.68 if sprint else 1)
def enemy_fire(s,e,d,crouch,sprint):
 hit=rng(s)<shooter_chance(d,crouch,sprint);protect=min(.35,sum(CAT.get(k,{}).get('protection',0)for k in s['gear'].values()))
 if hit:s['health']=max(0,s['health']-19*(1-protect))
 e['cooldown']=.78 if d<7 else 2.2
 note(s,'A rifle echo fires.'+(' You are hit.'if hit else''),'enemy_rifle','danger'if hit else'info',enemyShot={'id':e['id'],'hit':hit,'from':[e['x'],e['y']+(1.0 if e['mode']=='crouchfire'else 1.5),e['z']],'to':[s['player']['x'],s['player'].get('y',0)+1.2,s['player']['z']]})

def advance(s,seconds,move=False,sprint=False,crouch=False,sight=None,noise=0):
 if s.get('_freezeActionClock'):
  if noise>15:
   for e in s['enemies']:
    if e['health']>0 and e.get('zone','field')==s['zone']and dist(s['player'],(e['x'],e['z']))<35:e['memory']=12;e['target']=[s['player']['x'],s['player']['z']];e['mode']='investigate'
  return
 if seconds<=0:return
 seconds=min(float(seconds),2.0);p=s['player'];zone=zone_at(p['x'],p['z']);rate=1/60 if zone=='base'else 1/5
 s['clock']+=seconds*rate;s['elapsed']+=seconds;s['playSeconds']+=seconds
 s['food']=max(0,s['food']-seconds*rate*.075);s['thirst']=max(0,s['thirst']-seconds*rate*(.16 if sprint else .12));s['stamina']=max(0,min(100,s['stamina']+seconds*(-9 if move and sprint else 5)))
 if s['food']<15 or s['thirst']<18:s['stamina']=min(55,s['stamina'])
 if s['thirst']==0:s['health']=max(0,s['health']-seconds*.18)
 if s['hand']=='torch'and s['torchOn']:s['battery']=max(0,s['battery']-seconds*({'low':.025,'red':.022,'green':.022}.get(s['torchMode'],.06)))
 depth=clamp((p['z']-DATA['swamp']['start'])/40)if zone=='field'else 0.;s['swampDepth']+=max(-seconds*.55,min(seconds*.08,depth-s['swampDepth']))
 factor={'rain':.88,'fog':.5,'storm':.7}.get(s['weather']['mode'],1)
 currentBuilding=building_at(p['x'],p['z'])if zone=='field'else zone
 for e in s['enemies']:
  if e['health']<=0 or e.get('zone','field')!=zone:continue
  d=dist(p,(e['x'],e['z']));e['cooldown']=max(0,e['cooldown']-seconds);e['memory']=max(0,e['memory']-seconds);e['cycle']=max(0,e.get('cycle',0)-seconds);e['y']=surface_height(e['x'],e['z'],e.get('y',0))
  if d>120 or zone=='base':continue
  sees=sees_player(s,e,crouch,sight);e['sees']=sees
  if sees:
   if e['memory']<=0 and indoors(p)and s['hand']=='torch'and s['torchOn']:note(s,'A shape shrieks from the darkness.','ghost_alert','danger',enemy=e['id'])
   e['memory']=15;e['lastSeen']=s['elapsed'];e['target']=[p['x'],p['z']]
  elif currentBuilding!=s.get('lastBuilding')and currentBuilding and s['elapsed']-e.get('lastSeen',-100)<2.5:e['follow']=currentBuilding;e['memory']=12
  elif noise>8 and d<noise*1.2:e['memory']=10;e['target']=[p['x'],p['z']]
  # A spider commits its leap target. Sidestepping never retargets the leap.
  if e['kind']=='skitter':
   if e['mode']=='windup':
    e['windup']-=seconds
    if e['windup']<=0:e['mode']='leap';e['leapTime']=0
   elif e['mode']=='leap':
    ox,oz=e['x'],e['z'];e['leapTime']+=seconds;u=clamp(e['leapTime']/.9);fx,fz=e['leapFrom'];tx,tz=e['leapTo'];nx=fx+(tx-fx)*u;nz=fz+(tz-fz)*u;steps=max(1,int(math.hypot(nx-ox,nz-oz)/.18)+1)
    for i in range(1,steps+1):
     x=ox+(nx-ox)*i/steps;z=oz+(nz-oz)*i/steps
     if not walkable(s,x,z,.16):u=1;break
     e['x'],e['z']=x,z
     if not e['leapHit']and dist(p,(x,z))<.8:e['leapHit']=True;s['health']-=30;note(s,'The skitter hits you.','danger','danger')
    e['y']=surface_height(e['x'],e['z'])+math.sin(u*math.pi)*1.0
    if u>=1:e['mode']='recover';e['cooldown']=2.1
   elif e['mode']=='recover':
    if e['cooldown']<=0:e['mode']='patrol'
   elif sees and d<=5.2 and e['cooldown']<=0:
    e['mode']='windup';e['windup']=.65;e['leapFrom']=[e['x'],e['z']];dx=p['x']-e['x'];dz=p['z']-e['z'];reach=min(10,d+4);e['leapTo']=[e['x']+dx/max(d,.01)*reach,e['z']+dz/max(d,.01)*reach];e['leapHit']=False;note(s,'A skitter coils to leap.','skitter','warning')
   elif e['memory']>0:e['mode']='chase';enemy_step(s,e,e['target'],seconds,2.7)
   continue
  if e['kind']=='rifleman'and sees:
   if d<7:
    e['mode']='closefire';e['yaw']=-math.atan2(p['x']-e['x'],-(p['z']-e['z']))
    if e['cooldown']<=0:enemy_fire(s,e,d,crouch,sprint)
   elif e['mode']=='relocate'and e['runTime']>0:
    e['runTime']-=seconds;enemy_step(s,e,e['runTo'],seconds,4.6)
    if e['runTime']<=0:e['mode']='crouchfire';e['cycle']=.7
   elif e['mode']=='crouchfire':
    e['yaw']=-math.atan2(p['x']-e['x'],-(p['z']-e['z']))
    if e['cycle']<=0 and e['cooldown']<=0:enemy_fire(s,e,d,crouch,sprint);e['mode']='recover';e['cycle']=.4
   elif e['cycle']<=0:
    angle=math.atan2(p['z']-e['z'],p['x']-e['x'])+(1 if rng(s)<.5 else-1)*1.2;reach=8+rng(s)*6;e['runTo']=[e['x']+math.cos(angle)*reach,e['z']+math.sin(angle)*reach];e['runTime']=3+rng(s);e['mode']='relocate'
   continue
  if e['memory']>0:
   e['mode']='chase'if sees else'search';target=e['target']
   bid=e.get('follow')or(currentBuilding if sees else None)
   if bid and bid not in ['base','cave','bunker','sewer']and building_at(e['x'],e['z'])!=bid:
    b=next((b for b in BUILDINGS if b['id']==bid),None)
    if b and s['doors'].get(bid):target=[b['x'],b['z']+b['d']/2+(1.3 if e['z']>b['z']+b['d']/2+.3 else-1.2)]
   if sees or e['memory']>0:enemy_step(s,e,target,seconds,ENEMY_TYPES[e['kind']]['speed'])
   if sees and d<ENEMY_TYPES[e['kind']]['reach']and e['cooldown']<=0:
    e['cooldown']=ENEMY_TYPES[e['kind']]['delay'];s['health']-=ENEMY_TYPES[e['kind']]['damage'];note(s,'The '+e['kind']+' strikes.','danger','danger',enemy=e['id'])
  else:
   e['follow']=None;e['mode']='patrol';e['roam']=e.get('roam',0)-seconds
   if e['roam']<=0:
    e['roam']=4+rng(s)*7;angle=rng(s)*math.tau;distance=1.5+rng(s)*3;e['target']=[e['home'][0]+math.cos(angle)*distance,e['home'][1]+math.sin(angle)*distance]
   if e['roam']>2:enemy_step(s,e,e['target'],seconds,ENEMY_TYPES[e['kind']]['speed']*.28)
 s['lastBuilding']=currentBuilding
 if zone=='field':
  for a in DATA['anomalies']:
   d=dist(p,(a['x'],a['z']))
   # The probe reveals the field, not immunity. An artefact sits in a narrow safe pocket.
   pocket=math.hypot(p['x']-(a['x']+a['radius']*.6),p['z']-a['z'])<1.1
   if d<a['radius']*.48 and not pocket:s['health']-=seconds*18
 if s['weather']['override']=='auto'and s['elapsed']>=s['weather']['nextAt']:
  w=s['weather'];w['count']+=1;w['mode']=['clear','rain','fog','storm'][w['count']%4];w['nextAt']=s['elapsed']+210+rng(s)*180;note(s,{'clear':'The sky clears.','rain':'Rain arrives from the river.','fog':'Mist gathers between the trees.','storm':'A storm gathers.'}[w['mode']])
 if s['health']<=0:die(s)

def die(s):
 _V8_DIE(s);s['revealed']=[];s['scanned']=[];s['swampDepth']=0.;s['lastBuilding']='base'
 for e in s['enemies']:e.setdefault('cycle',0.);e.setdefault('roam',0.);e.setdefault('follow',None)

def dispatch(state,a):
 s=copy.deepcopy(state);bind_weapon(s);s['events']=[];op=a.get('type')if isinstance(a,dict)else None
 try:
  p=s['player'];w=s['weapon'];zone=zone_at(p['x'],p['z'])
  if op=='tick':
   dt=float(num(a.get('dt',0),0,1.0,'time step'));q=a.get('player',p);vals={k:float(num(q.get(k,p[k]),-2000,2000,'position'))for k in p}
   if zone_at(vals['x'],vals['z'])!=zone:raise ValueError('Use the passage to change areas.')
   if not land(vals['x'],vals['z']):raise ValueError('The boundary cannot be crossed here.')
   floor=surface_height(vals['x'],vals['z'],p.get('y',0))
   if abs(vals.get('y',floor)-floor)>1.3:raise ValueError('Keep your feet on the terrain.')
   moved=math.hypot(vals['x']-p['x'],vals['z']-p['z'])
   if moved>7:raise ValueError('Movement was interrupted. Try again.')
   s['player']=vals;s['stats']['metres']+=moved
   advance(s,dt,moved>.001,bool(a.get('sprint')),bool(a.get('crouch')),a.get('sight'),9 if a.get('sprint')and moved>.01 else 0)
   return _finish(s)
  if op=='read_missions':
   source=a.get('source','radio');station=DATA['missionSources'].get(source,{}).get('station')
   if not station:raise ValueError('Unknown contact.')
   near(s,STATIONS[station],4.5)
   for m in DATA['missions']:
    if m.get('source','radio')==source and s['missions'][m['id']]in['active','available']and m['id']not in s['readOffers']:s['readOffers'].append(m['id'])
   return _finish(s)
  if op in ['accept','pin','deliver']:
   id=a.get('id');m=MISSIONS.get(id)
   if not m:raise ValueError('Unknown contract.')
   if op=='accept':
    if s['missions'][id]!='available':raise ValueError('This contract is not currently offered.')
    near(s,STATIONS[DATA['missionSources'][m.get('source','radio')]['station']],4.5)
    s['missions'][id]='active';s['pinned']=id;s['missionLog'].setdefault(id,{}).update(acceptedAt=s['clock'],acceptedPlay=s['playSeconds']);note(s,'Accepted: '+m['title']+'.','claim')
   elif op=='pin':
    if s['missions'][id]not in['active','available']:raise ValueError('That mission is not on your board.')
    s['pinned']=id
   else:
    if s['missions'][id]!='active':raise ValueError('Accept the contract first.')
    near(s,STATIONS[DATA['missionSources'][m.get('source','radio')]['station']],4.5);count=m.get('count',1)
    if s['bag'][m['item']]<count:raise ValueError('You have not recovered everything yet.')
    s['bag'][m['item']]-=count;s['missions'][id]='done';s['credits']+=m['reward'];log=s['missionLog'].setdefault(id,{});log.update(completedAt=s['clock'],completedPlay=s['playSeconds'],reward=m['reward']);note(s,'Contract complete: '+m['title']+'. +'+str(m['reward'])+' credits.','claim','success');refresh_missions(s);s['pinned']=next((k for k,v in s['missions'].items()if v=='active'),next((k for k,v in s['missions'].items()if v=='available'),'signal'))
   return _finish(s)
  if op=='scan':
   if s['bag']['detector']<1:raise ValueError('Carry the detector from your supply locker.')
   nearfields=[v for v in DATA['anomalies']if zone=='field'and dist(p,(v['x'],v['z']))<v['radius']+14]
   for v in nearfields:
    id='artefact_'+v['id']
    if id not in s['scanned']:s['scanned'].append(id)
   s['stats']['scans']+=1;note(s,'Interference nearby. Throw a probe to expose the field.'if nearfields else'No nearby interference.','detector');return _finish(s)
  if op=='probe':
   if s['bag']['probes']<1:raise ValueError('No probes left.')
   s['bag']['probes']-=1;point=a.get('land')or{};x=num(point.get('x',p['x']-math.sin(p['yaw'])*12),-2000,1000,'probe');z=num(point.get('z',p['z']-math.cos(p['yaw'])*12),-1000,500,'probe')
   if math.hypot(x-p['x'],z-p['z'])>19:raise ValueError('Probe throw too far.')
   found=[]
   if zone=='field':
    for v in DATA['anomalies']:
     if segment_distance(v['x'],v['z'],[p['x'],p['z']],[x,z])<v['radius']and dist(p,(v['x'],v['z']))<v['radius']+17:
      if v['id']not in s['revealed']:s['revealed'].append(v['id'])
      s['anomalyUntil'][v['id']]=1e10;found.append(v['id'])
   note(s,'The probe exposes a hazardous field. It remains visible until you return to base.'if found else'The probe lands without a reaction.','probe',probeLand=[x,z]);return _finish(s)
  if op=='safe':
   if s['hand']=='knife':s['knifeGrip']='reverse'if s['knifeGrip']=='forward'else'forward';note(s,'Knife grip: '+s['knifeGrip']+'.','safety');return _finish(s)
   if s['hand']=='torch':
    modes=['high','red','green','off']if s['torchType']=='signal_torch'else['high','low','off'];s['torchMode']=modes[(modes.index(s['torchMode'])+1)%len(modes)]if s['torchMode']in modes else'high';s['torchOn']=s['torchMode']!='off';note(s,'Torch: '+s['torchMode']+'.','safety');return _finish(s)
  if op=='torch_toggle':s['torchOn']=not s['torchOn'];s['torchMode']='high'if s['torchOn']else'off';return _finish(s)
  if op=='use'and a.get('kind')=='signal_torch':
   if s['bag']['signal_torch']<1:raise ValueError('Find the signal torch first.')
   s['torchType']='signal_torch';s['hand']='torch';s['torchMode']='high';s['torchOn']=True;return _finish(s)
  if op=='use'and a.get('kind')=='torch':s['torchType']='torch';s['torchMode']='high';s['torchOn']=True
  if op=='equip'and a.get('hand')=='torch'and s['bag']['torch']<1 and s['bag']['signal_torch']>0:s['torchType']='signal_torch';s['hand']='torch';return _finish(s)
  if op=='use'and a.get('kind')=='rifle':return dispatch(s,{'type':'weapon_select','weapon':'rifle'})
  if op=='fill':
   m=next((m for m in s['magazines']if m['id']==a.get('id')),None)
   if not m:raise ValueError('Magazine not found.')
   if any(ww['inserted']==m['id']for ww in s['weapons'].values()):raise ValueError('Eject it before filling.')
   ammo=ammo_kind(m.get('family','pm'));n=min(mag_capacity(m)-m['rounds'],s['bag'][ammo])
   if n<=0:raise ValueError('Magazine full or no compatible loose ammunition.')
   m['rounds']+=n;s['bag'][ammo]-=n;note(s,'Loaded '+str(n)+' rounds.','insert');return _finish(s)
  if op in ['rack','clear']and s['activeWeapon']=='rifle':
   if not w['owned']:raise ValueError('Find that rifle first.')
   if op=='clear':w['jammed']=False
   elif w['jammed']:raise ValueError('Clear the stoppage first.')
   if w['chamber']:s['bag']['rifle_ammo']+=1;w['chamber']=0
   if op=='rack':
    m=mag(s)
    if m and m['rounds']>0:m['rounds']-=1;w['chamber']=1
   note(s,'Rifle action cycled.','chamber');return _finish(s)
  if op=='fire'and s['elapsed']-s['lastShot']<(.7 if s['activeWeapon']=='rifle'else.20):raise ValueError('Weapon settling.')
  if op=='knife'and s['elapsed']-s['lastKnife']<.45:raise ValueError('Finish the swing first.')
  if op=='pickup':
   it=s['loose'].get(a.get('id'))
   if it and a['id'].startswith('artefact_'):
    field=a['id'][9:]
    if field not in s['revealed']:raise ValueError('Throw a probe to reveal the field first.')
    if a['id']not in s['scanned']:s['scanned'].append(a['id'])
  s['_freezeActionClock']=True;beforeHealth={e['id']:e['health']for e in s['enemies']};result=_V8_DISPATCH(s,a);result.pop('_freezeActionClock',None)
  ok=not any(e.get('level')=='warning'for e in result['events'])
  if op=='door'and ok:
   for event in result['events']:
    if event.get('sound')=='door':event['sound']='door_open_real'if result['doors'].get(a.get('id'))else'door_close_real'
  if op=='fire'and any(e.get('fired')for e in result['events']):result['lastShot']=result['elapsed']
  if op=='knife'and ok:result['lastKnife']=result['elapsed'];result['events'].append({'text':'','knifeSwing':not bool(a.get('throw')),'sound':None,'level':'info'})
  if op in ['fire','knife']:
   for e in result['enemies']:
    if e['health']<beforeHealth.get(e['id'],e['health']):result['events'].append({'text':'','hitFlash':e['id'],'sound':None,'level':'info'})
  if op=='portal'and ok:
   if result['zone']=='base':result['revealed']=[];result['scanned']=[];result['anomalyUntil']={id:0 for id in result['anomalyUntil']};result['swampDepth']=0.;result['expeditions']+=1
   result['lastBuilding']=None
  return result
 except(ValueError,TypeError,KeyError,OverflowError)as e:
  s=copy.deepcopy(state);s['events']=[];note(s,str(e),level='warning');return _finish(s)

def migrate_dead_air(saved):
 if not isinstance(saved,dict)or saved.get('app')not in['FieldSignalBelowPines',APP]or saved.get('version')not in[6,9]:raise ValueError('Choose a v6, v7, v8 or Dead Air campaign.')
 s=copy.deepcopy(saved);fresh=new_game();old=s.get('version')!=9
 if old:
  for key,val in fresh.items():s.setdefault(key,copy.deepcopy(val))
  for bagname in ['bag','stash']:
   if not isinstance(s.get(bagname),dict):raise ValueError('Invalid inventory.')
   for key in CAT:s[bagname].setdefault(key,0)
  if s.get('corpse'):
   for key in CAT:s['corpse']['bag'].setdefault(key,0)
  for key in DOORS:s['doors'].setdefault(key,False)
  for key in WEAPONS:s['weapons'].setdefault(key,copy.deepcopy(fresh['weapons'][key]))
  for key in MISSIONS:s['missions'].setdefault(key,'locked')
  for profile,entries in DATA['profiles'].items():
   s['rules'].setdefault(profile,copy.deepcopy(entries))
   for key,v in entries.items():s['rules'][profile].setdefault(key,copy.deepcopy(v))
  oldEnemies={e['id']:e for e in s['enemies']};s['enemies']=[]
  for spec in DATA['enemies']:
   e=new_enemy(spec);e.update(oldEnemies.get(spec['id'],{}));s['enemies'].append(e)
  for k,it in fresh['loose'].items():s['loose'].setdefault(k,copy.deepcopy(it))
  for a in DATA['anomalies']:s['anomalyUntil'].setdefault(a['id'],0)
  s['missionLog']={}
  for id,status in s['missions'].items():
   s['missionLog'][id]={'migrated':True,'offeredAt':None,'acceptedAt':None,'acceptedPlay':None}
   if status=='done':s['missionLog'][id]['completedAt']=None;s['missionLog'][id]['completedPlay']=None
   if status=='available'and not mission_available(s,MISSIONS[id]):s['missions'][id]='locked'
  s['clock']=max(0,s['clock']);s['events']=[];refresh_missions(s);s['events']=[]
 s['app']=APP;s['version']=VERSION;bind_weapon(s);return s

def validate_save(s):
 s=_V8_VALIDATE(s)
 for k in ['playSeconds','missionLog','readOffers','revealed','knifeGrip','torchType','torchMode','swampDepth','lastShot','lastKnife','lastBuilding','expeditions']:
  if k not in s:raise ValueError('Incomplete Dead Air save: '+k)
 num(s['playSeconds'],0,1e12,'play time');num(s['swampDepth'],0,1,'swamp depth')
 if s['knifeGrip']not in['forward','reverse']or s['torchMode']not in['high','low','red','green','off']or s['torchType']not in['torch','signal_torch']:raise ValueError('Invalid held equipment state.')
 if any(k not in MISSIONS for k in s['readOffers'])or any(k not in s['anomalyUntil']for k in s['revealed']):raise ValueError('Invalid discoveries.')
 for id,log in s['missionLog'].items():
  if id not in MISSIONS or not isinstance(log,dict):raise ValueError('Invalid completion record.')
  for key in ['offeredAt','acceptedAt','acceptedPlay','completedAt','completedPlay']:
   if key in log and log[key]is not None:num(log[key],0,1e12,'mission timestamp')
 return s



# Optional editor preview is supplied as validated data by the same-origin UI.
# No ordinary campaign geometry is changed without an explicit preview URL.
_EDITOR_DOC=DATA.get('editorLayout')
_EDITOR_SURFACE=surface_height
_EDITOR_NEW=new_game
_EDITOR_CLEAR=clear_line
_EDITOR_WALKABLE=walkable

def _editor_local(o,x,z):
 a=o.get('yaw',0);dx=x-o['position'][0];dz=z-o['position'][2]
 return dx*math.cos(a)-dz*math.sin(a),dx*math.sin(a)+dz*math.cos(a)

def _editor_inside(x,z,margin=.35):
 return bool(_EDITOR_DOC and abs(x-_EDITOR_DOC['origin'][0])<_EDITOR_DOC['bounds'][0]/2+margin and abs(z-_EDITOR_DOC['origin'][2])<_EDITOR_DOC['bounds'][1]/2+margin)

def surface_height(x,z,last_y=0):
 if not _editor_inside(x,z):return _EDITOR_SURFACE(x,z,last_y)
 x-=_EDITOR_DOC['origin'][0];z-=_EDITOR_DOC['origin'][2]
 for o in _EDITOR_DOC['objects']:
  if o['type']!='stairs':continue
  lx,lz=_editor_local(o,x,z);w,h,d=o['size']
  if abs(lx)<=w/2-.06 and -d/2-.1<=lz<=d/2+.25:
   y=o['position'][1]+clamp((d/2-lz)/d)*h
   if abs(last_y-y)<.65 or last_y>=o['position'][1]and lz>d/2-.25:return y
 floor=0.
 for o in DATA.get('editorFloors',[]):
  lx,lz=_editor_local(o,x,z)
  if o['position'][1]<=last_y+.45:
   for p in o['pieces']:
    if abs(lx-p['position'][0])<=p['size'][0]/2 and abs(lz-p['position'][2])<=p['size'][2]/2:floor=max(floor,o['position'][1])
 return floor

def _editor_collides(s,x,z,y=0):
 if not _EDITOR_DOC:return False
 x-=_EDITOR_DOC['origin'][0];z-=_EDITOR_DOC['origin'][2]
 for c in DATA.get('editorColliders',[]):
  if c.get('doorId')and s['doors'].get(c['doorId'],True):continue
  if y>=c['y']+c['h']-.035 or y+1.65<=c['y']+.02:continue
  lx,lz=_editor_local({'position':[c['x'],c['y'],c['z']],'yaw':c['yaw']},x,z)
  if abs(lx)<c['w']/2+.22 and abs(lz)<c['d']/2+.22:return True
 return False

def walkable(s,x,z,r=.22):
 if _editor_inside(x,z,.6):return land(x,z)and not _editor_collides(s,x,z,surface_height(x,z))
 return _EDITOR_WALKABLE(s,x,z,r)

def clear_line(s,a,b):
 if not _EDITOR_DOC or not(_editor_inside(*a,1)or _editor_inside(*b,1)):return _EDITOR_CLEAR(s,a,b)
 n=max(1,int(math.hypot(a[0]-b[0],a[1]-b[1])/.15))
 for i in range(n+1):
  t=i/n;x=a[0]+(b[0]-a[0])*t;z=a[1]+(b[1]-a[1])*t
  if _editor_inside(x,z,.3)and _editor_collides(s,x,z):return False
 return zone_at(*a)==zone_at(*b)

def new_game(profiles=None):
 s=_EDITOR_NEW(profiles)
 if _EDITOR_DOC:
  o=next(o for o in _EDITOR_DOC['objects']if o['type']=='spawn');x=_EDITOR_DOC['origin'][0]+o['position'][0];z=_EDITOR_DOC['origin'][2]+o['position'][2]
  s['player']={'x':x,'z':z,'y':o['position'][1],'yaw':o['yaw'],'pitch':0.};s['zone']='field'
  # Safe isolated layout preview; real campaign remains a different storage key.
  for e in s['enemies']:e['health']=0
 return s

if _EDITOR_DOC:
 for o in _EDITOR_DOC['objects']:
  if o['type']=='doorway'and o.get('doorId'):DOORS[o['doorId']]=(_EDITOR_DOC['origin'][0]+o['position'][0],_EDITOR_DOC['origin'][2]+o['position'][2])


_state=None

def api(raw):
 global _state
 a=json.loads(raw)
 if not isinstance(a,dict):raise ValueError('Invalid request.')
 if a.get('type')=='init':_state=validate_save(migrate_dead_air(a['saved'])) if a.get('saved') else new_game()
 elif a.get('type')=='import':_state=validate_save(migrate_dead_air(a.get('saved')))
 elif a.get('type')=='reset':_state=new_game(validated_rules(a['profiles']) if a.get('profiles') else None)
 else:_state=dispatch(_state or new_game(),a)
 return json.dumps({'state':_state,'weight':weight(_state),'loot':_state['loose']},allow_nan=False,separators=(',',':'))
