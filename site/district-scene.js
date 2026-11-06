import * as T from './vendor/three.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Authored district data is deliberately independent of renderer UUIDs and player state.
export const DISTRICT_FORMAT = 'field-signal-districts/1';
export const DISTRICT_COMPONENTS = Object.freeze([
 'model','cargo-container','garden','street-lamp','bench','noticeboard','waymarker',
 'rail-signal','crossing-barrier','crossing-boards','rail-ballast','utility-cabinet',
 'bollard','floodlight','dock-crane','utility-pole','cable-span','transformer',
 'service-junction','pipe-valve','wall-sign','boot-tray','cable-reel',
]);
const finite = n => typeof n === 'number' && Number.isFinite(n);
const positive = n => finite(n) && n > 0;

export function districtWorldPoint(transform, point) {
 const c=Math.cos(transform.yaw||0),s=Math.sin(transform.yaw||0);
 return {x:transform.x+c*point.x+s*point.z,y:transform.y+point.y,z:transform.z-s*point.x+c*point.z,yaw:(transform.yaw||0)+(point.yaw||0)};
}

export function validateDistrictDefinition(definition) {
 const errors=[],ids=new Set();
 const unique=(id,label)=>{if(typeof id!=='string'||!id.trim())errors.push(label+' needs a stable ID');else if(ids.has(id))errors.push('Duplicate district ID: '+id);else ids.add(id);};
 if(definition?.format!==DISTRICT_FORMAT||definition?.version!==1)errors.push('Unsupported district definition');
 if(!Array.isArray(definition?.districts))return [...errors,'Districts must be an array'];
 for(const district of definition.districts){
  unique(district.id,'District');
  if(!['field','base','cave','bunker','sewer'].includes(district.zone))errors.push(district.id+' has an unknown zone');
  if(!Array.isArray(district.objects)){errors.push(district.id+' needs objects');continue;}
  for(const object of district.objects){
   unique(object.id,'Object');
   if(!DISTRICT_COMPONENTS.includes(object.component))errors.push(object.id+' has an unknown component');
   if(typeof object.asset!=='string'||!object.asset)errors.push(object.id+' needs an asset/provenance reference');
   if(object.assetRotation!==undefined&&(!Array.isArray(object.assetRotation)||object.assetRotation.length!==3||!object.assetRotation.every(finite)))errors.push(object.id+' has an invalid asset rotation');
   if(!object.transform||!['x','y','z','yaw'].every(k=>finite(object.transform[k])))errors.push(object.id+' has an invalid transform');
   if(!Array.isArray(object.size)||object.size.length!==3||!object.size.every(positive))errors.push(object.id+' has invalid dimensions');
   for(const [kind,rows]of [['colliders',object.colliders],['surfaces',object.surfaces]]){
    if(!Array.isArray(rows)){errors.push(object.id+' needs '+kind);continue;}
    const children=new Set();
    for(const q of rows){
     if(typeof q.id!=='string'||children.has(q.id))errors.push(object.id+' has invalid '+kind+' IDs');children.add(q.id);
     if(!['x','y','z'].every(k=>finite(q[k]))||!positive(q.w)||!positive(q.d)||(kind==='colliders'&&!positive(q.h))||(q.yaw!==undefined&&!finite(q.yaw)))errors.push(object.id+' has an invalid '+kind+' rectangle');
    }
   }
   if(object.climb){
    unique(object.climb.id,'Climb');
    if(!Array.isArray(object.climb.routes)||!object.climb.routes.length)errors.push(object.id+' has no climb routes');
    const ladder=object.climb.ladder;
    if(!ladder||!['x','z','bottom','top'].every(k=>finite(ladder[k]))||!positive(ladder.width)||ladder.top<=ladder.bottom)errors.push(object.id+' has invalid ladder geometry');
    for(const route of object.climb.routes||[]){
     unique(route.id,'Climb route');
     if(![route.from,route.to].every(p=>p&&['x','y','z','yaw'].every(k=>finite(p[k])))||!positive(route.reach)||!positive(route.duration))errors.push(route.id+' has invalid climb poses');
     else if([route.from,route.to].some(p=>p.y+object.transform.y<0||p.y+object.transform.y>30))errors.push(route.id+' is outside save height bounds');
     if(route.via!==undefined&&(!Array.isArray(route.via)||route.via.some(p=>!p||!['x','y','z'].every(k=>finite(p[k])))))errors.push(route.id+' has invalid climb waypoints');
    }
   }
   if(object.component==='cable-span'&&(!object.end||!['x','y','z'].every(k=>finite(object.end[k]))))errors.push(object.id+' has invalid cable endpoints');
  }
 }
 return errors;
}

function materials(world) {
 const basic=(colour,metalness=0,roughness=.94)=>new T.MeshStandardMaterial({color:colour,metalness,roughness});
 const tint=(source,colour,fallback)=>{const m=source?.clone()||basic(fallback);m.color.set(colour);return m;};
 return {
  wood:world.naturalMaterials?.wood||world.mat?.wood||basic('#756a53'),
  rust:world.naturalMaterials?.rust||world.mat?.metal||basic('#706251',.35),
  iron:basic('#394844',.64,.74),steel:basic('#83938d',.72,.58),
  paint:tint(world.naturalMaterials?.rust,'#737e63','#6a755f'),
  yellow:tint(world.naturalMaterials?.rust,'#b6a065','#ad985c'),
  dark:basic('#28332f'),stone:world.mat?.rock||basic('#6c7367'),
  concrete:world.mat?.concrete||basic('#747b70'),
  paper:basic('#b4b29a'),glass:basic('#4a6c6b',.34,.35),
  lamp:new T.MeshStandardMaterial({color:'#d5d1a1',emissive:'#a6ad82',emissiveIntensity:.7,roughness:.5}),
  red:new T.MeshStandardMaterial({color:'#943c30',emissive:'#6e2a1a',emissiveIntensity:.35,roughness:.7}),
 };
}

function toolsFor(world,group,m) {
 const mesh=(geometry,material)=>{const o=new T.Mesh(geometry,material);o.castShadow=true;o.receiveShadow=true;o.userData.districtOwnedGeometry=true;group.add(o);return o;};
 const box=(w,h,d,x,y,z,material=m.iron)=>{
  const geometry=new T.BoxGeometry(w,h,d),a=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
  // Project textures in metres so a 20 m boom does not stretch one rust tile over its length.
  for(let i=0;i<a.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(ny>.7?a.getX(i):nx>.7?a.getZ(i):a.getX(i))/1.8,(ny>.7?a.getZ(i):a.getY(i))/1.8);}
  const o=mesh(geometry,material);o.position.set(x,y,z);return o;
 };
 const cylinder=(r,h,x,y,z,material=m.iron,sides=8,rTop=r)=>{const o=mesh(new T.CylinderGeometry(rTop,r,h,sides),material);o.position.set(x,y,z);return o;};
 const beam=(a,b,r=.035,material=m.iron)=>{const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),o=cylinder(r,delta.length(),0,0,0,material,6);o.position.copy(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;};
 const torus=(radius,tube,x,y,z,material=m.iron)=>{const o=mesh(new T.TorusGeometry(radius,tube,6,16),material);o.position.set(x,y,z);return o;};
 const sign=(text,w,h,x,y,z,yaw=0)=>{if(!world.label)return;const o=world.label(text,w,h,'#d0c59f','#34443b');o.position.set(x,y,z);o.rotation.y=yaw;o.userData.districtLabel=true;group.add(o);return o;};
 const cable=(points,r=.012,material=m.dark)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,r,4,false),material);
 return {mesh,box,cylinder,beam,torus,sign,cable,m};
}

function fence(ctx,a,b,height=1.16,style='timber') {
 const {box,beam,m}=ctx,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(length/1.8));
 for(let i=0;i<=steps;i++){const t=i/steps,x=a[0]+dx*t,z=a[1]+dz*t;box(.12,height+.13,.12,x,height/2,z,m.wood);}
 for(const y of [height*.28,height*.76])beam([a[0],y,a[1]],[b[0],y,b[1]],.047,style==='timber'?m.wood:m.iron);
 if(style==='timber')for(let i=0;i<Math.ceil(length/.22);i++){const t=(i+.5)/Math.ceil(length/.22),o=box(.13,height*.77,.045,a[0]+dx*t,height*.53,a[1]+dz*t,m.wood);o.rotation.y=-Math.atan2(dz,dx);}
}

function railing(ctx,a,b,y) {
 const {beam,cylinder,box,m}=ctx,length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/1.4);
 for(let i=0;i<=n;i++){const t=i/n;cylinder(.033,1.13,a[0]+(b[0]-a[0])*t,y+.56,a[1]+(b[1]-a[1])*t,m.yellow,6);}
 for(const h of [.55,1.1])beam([a[0],y+h,a[1]],[b[0],y+h,b[1]],.033,m.yellow);
 const toe=box(Math.max(.04,Math.abs(b[0]-a[0])),.1,Math.max(.04,Math.abs(b[1]-a[1])),(a[0]+b[0])/2,y+.05,(a[1]+b[1])/2,m.yellow);return toe;
}

const builders={
 garden(ctx,q){const {box,m}=ctx,w=q.size[0],gap=q.gap||3,depth=q.depth||4.8;fence(ctx,[-w/2,0],[-gap/2,0]);fence(ctx,[gap/2,0],[w/2,0]);if(depth>2){fence(ctx,[-w/2,0],[-w/2,-depth]);fence(ctx,[w/2,0],[w/2,-depth]);}
  // Each gate is fixed visibly open, leaving the same three metre gap as collision.
  fence(ctx,[-gap/2,0],[-gap/2,-1.05],1.02);box(.18,.25,.27,w/2-.1,1.15,.12,m.iron);box(.25,.16,.16,w/2-.1,1.4,.12,m.yellow);
 },
 bench({box,beam,m}){for(const z of [-.23,0,.23])box(1.8,.055,.15,0,.49,z,m.wood);for(const y of [.69,.88])box(1.8,.12,.055,0,y,-.28,m.wood);for(const x of [-.66,.66]){beam([x,.05,-.23],[x,.49,-.23],.035);beam([x,.05,.23],[x,.49,.23],.035);beam([x,.49,-.23],[x,.95,-.28],.025);}},
 noticeboard({box,sign,m},q){for(const x of [-1,1])box(.13,2.5,.13,x,1.25,0,m.wood);box(2.5,1.2,.16,0,1.7,0,m.wood);box(2.3,1,.03,0,1.7,.1,m.paper);box(2.7,.12,.55,0,2.4,0,m.rust);sign(q.text||'FIELD NOTICE',2.15,.3,0,1.95,.13);for(const [x,y]of [[-.55,1.5],[.45,1.5]]){const p=box(.54,.5,.01,x,y,.128,m.paper);p.rotation.z=x*.08;}},
 waymarker({box,sign,m},q){box(.13,q.size[1],.13,0,q.size[1]/2,0,m.wood);box(1.25,.3,.07,0,q.size[1]-.3,0,m.paint);sign(q.text,1.15,.23,0,q.size[1]-.3,.045);},
 'rail-signal'({box,cylinder,sign,m}){box(.6,.18,.6,0,.09,0,m.concrete);cylinder(.075,3.7,0,1.95,0);box(.46,1.14,.3,0,3.7,0,m.dark);for(let i=0;i<3;i++){const lens=cylinder(.115,.055,0,4.01-i*.3,.18,i===2?m.red:m.dark,10);lens.rotation.x=Math.PI/2;box(.34,.055,.23,0,4.16-i*.3,.16,m.iron);}for(let i=0;i<10;i++){box(.4,.025,.04,0,.4+i*.31,-.14,m.iron);}sign('STOP',.55,.22,0,2.5,.085);},
 'crossing-barrier'({box,cylinder,m}){box(.55,1.05,.55,0,.525,0,m.paint);cylinder(.18,.24,0,1.02,.26,m.iron,10).rotation.x=Math.PI/2;const arm=box(.15,4.35,.12,0,3.22,0,m.paper);arm.rotation.z=.14;for(let i=0;i<7;i++){const stripe=box(.165,.22,.13,-Math.sin(.14)*(i*.55+.4),1.25+i*.55,0,m.red);stripe.rotation.z=.14;}},
 'crossing-boards'({box,m},q){for(let i=0;i<20;i++)for(const x of [-1.18,0,1.18])box(x===0?1.25:.55,.045,.26,x,0,-q.size[2]/2+(i+.5)*q.size[2]/20,m.wood);},
 'rail-ballast'({box,cylinder,m},q){for(const side of [-1,1]){box(.7,.14,q.size[2],side*1.85,0,0,m.stone);for(let i=0;i<7;i++){box(.18,.07,.15,side*.76,.14,-q.size[2]/2+.65+i*1.5,m.iron);cylinder(.035,.05,side*.85,.19,-q.size[2]/2+.65+i*1.5,m.steel,6);}}},
 'utility-cabinet'({box,beam,sign,m},q){const [w,h,d]=q.size;box(w,h,d,0,h/2,0,m.paint);box(w*.88,h*.88,.04,0,h/2,d/2+.015,m.iron);for(let i=0;i<5;i++)box(w*.54,.025,.025,0,h*.72-i*.06,d/2+.05,m.dark);beam([w*.29,h*.36,d/2+.07],[w*.29,h*.49,d/2+.07],.025,m.steel);sign('⚡',w*.32,h*.23,0,h*.34,d/2+.07);},
 bollard({cylinder,box,torus,m}){cylinder(.22,.48,0,.24,0,m.iron,10,.16);box(.68,.17,.25,0,.51,0,m.iron);cylinder(.36,.08,0,.04,0,m.rust,10);const rope=torus(.25,.035,0,.14,0,m.wood);rope.rotation.x=Math.PI/2;},
 floodlight({cylinder,beam,box,m}){cylinder(.1,6.7,0,3.35,0,m.iron);beam([-1,6.55,0],[1,6.55,0],.055);for(const x of [-.72,.72]){const body=box(.68,.4,.23,x,6.55,0,m.iron);body.rotation.x=.35;const lens=box(.55,.28,.025,x,6.52,.14,m.lamp);lens.rotation.x=.35;}box(.26,.55,.18,0,1.45,.12,m.paint);},
 'utility-pole'({cylinder,box,beam,m}){cylinder(.15,7.5,0,3.75,0,m.wood,8,.1);box(2.8,.13,.18,0,6.75,0,m.wood);for(const x of [-1,0,1]){cylinder(.07,.3,x,6.97,0,m.glass,8);cylinder(.09,.04,x,6.95,0,m.paper,8);}for(const z of [-.04,.04])beam([0,5.8,z],[1.1,6.7,z],.025,m.iron);},
 'cable-span'({cable,m},q){const e=q.end;for(const x of [-1,0,1])cable([[x,7.12,0],[e.x/2+x,5.8+e.y/2,e.z/2],[e.x+x,7.12+e.y,e.z]],.012,m.dark);},
 transformer(ctx){const {box,cylinder,sign,m}=ctx;box(1.6,.2,1.2,0,.1,0,m.concrete);box(1.3,1.65,.8,0,1.05,0,m.paint);for(const side of [-1,1])for(let i=0;i<8;i++)box(.13,1.3,.72,side*(.66+i*.035),1.04,0,m.iron);for(const x of [-.4,0,.4]){cylinder(.055,.6,x,2.12,0,m.steel);for(let y=1.99;y<2.45;y+=.1)cylinder(.1,.045,x,y,0,m.paper);}sign('DANGER / 6 kV',1.15,.3,0,1.1,.415);},
 'service-junction'({box,beam,m}){box(.2,.52,.34,0,.24,0,m.paint);box(.23,.035,.38,0,.51,0,m.iron);for(const side of [-1,1]){beam([-.15,side*.13+.25,-.32],[.04,side*.13+.25,-.15],.025,m.dark);box(.07,.09,.02,.11,.24+side*.13,.14,m.steel);}box(.025,.12,.025,.105,.18,0,m.yellow);},
 'pipe-valve'({beam,torus,box,m}){beam([0,-.32,0],[0,.32,0],.075,m.rust);beam([0,0,0],[0,0,.16],.03,m.iron);torus(.17,.025,0,0,.17,m.red);for(const a of [0,Math.PI/2])beam([-.16*Math.cos(a),-.16*Math.sin(a),.17],[.16*Math.cos(a),.16*Math.sin(a),.17],.012,m.red);box(.18,.08,.18,0,-.26,0,m.steel);},
 'wall-sign'({sign},q){sign(q.text,q.size[0],q.size[1],0,0,0);},
 'boot-tray'({box,cylinder,m}){box(.7,.035,.45,0,.025,0,m.iron);for(const x of [-.17,.17]){box(.16,.14,.32,x,.12,0,m.dark);cylinder(.075,.21,x,.17,-.06,m.dark,8);}},
 'cable-reel'({cylinder,beam,m}){const drum=cylinder(.18,.35,0,.27,0,m.dark,12);drum.rotation.z=Math.PI/2;for(const x of [-.21,.21]){const rim=cylinder(.27,.045,x,.27,0,m.wood,12);rim.rotation.z=Math.PI/2;}beam([-.32,.04,0],[.32,.04,0],.045,m.iron);},
 'street-lamp'(ctx){const {cylinder,beam,box,m}=ctx;cylinder(.075,5.7,0,2.85,0,m.iron);beam([0,5.65,0],[1.15,5.65,0],.05);box(.72,.15,.35,1.12,5.57,0,m.paint);box(.58,.035,.25,1.12,5.48,0,m.lamp);},
};

builders['dock-crane']=function(ctx,q){
 const {box,beam,cylinder,cable,torus,sign,m}=ctx;
 // Structural legs and opposing cross braces form a clear lattice silhouette.
 for(const x of [-1.5,1.5])for(const z of [-1.35,1.35]){box(.55,.3,.55,x,.15,z,m.concrete);beam([x,.2,z],[x*.65,14,z*.65],.13,m.yellow);}
 for(let y=1;y<13;y+=2.6)for(const side of [-1,1]){
  beam([-1.5,y,side*1.35],[1.5,y+2.6,side*1.35],.055,m.rust);beam([1.5,y,side*1.35],[-1.5,y+2.6,side*1.35],.055,m.rust);
  beam([side*1.5,y,-1.35],[side*1.5,y+2.6,1.35],.055,m.rust);
 }
 for(const surface of q.surfaces){
  const y=surface.y;
  // Slatted decks are top-aligned to exactly the authored walkable height.
  box(surface.w,.11,surface.d,0,y-.14,0,m.iron);
  for(let x=-2.94;x<3;x+=.18)box(.1,.07,3.94,x,y-.035,0,m.steel);
  for(const z of [-1.45,1.45])box(6,.22,.15,0,y-.25,z,m.yellow);
  railing(ctx,[-3,-1.97],[3,-1.97],y);railing(ctx,[-3,1.97],[3,1.97],y);railing(ctx,[2.97,-1.97],[2.97,1.97],y);
  railing(ctx,[-2.97,-1.97],[-2.97,-.675],y);railing(ctx,[-2.97,.675],[-2.97,1.97],y);
 }
 const ladder=q.climb.ladder;
 for(const z of [-ladder.width/2,ladder.width/2])beam([ladder.x,0,z],[ladder.x,12.95,z],.035,m.yellow);
 for(let y=.25;y<=12;y+=.28)beam([ladder.x,y,-ladder.width/2],[ladder.x,y,ladder.width/2],.023,m.steel);
 // The outside cage encloses the player route. Decks stop east of this shaft.
 for(let y=2;y<12;y+=1.1){const hoop=torus(.55,.023,ladder.x-.35,y,0,m.yellow);hoop.rotation.x=Math.PI/2;}
 for(const y of [1,4,8,12])for(const z of [-ladder.width/2,ladder.width/2])beam([ladder.x,y,z],[-1.5,y,z],.03,m.rust);
 cylinder(.95,.35,0,13.7,0,m.iron,14);box(3.8,.55,2.5,0,14.1,0,m.yellow);
 // Cab is offset from the ladder; the tower-top walkway remains usable.
 box(1.8,1.65,1.65,.6,15.12,-.25,m.paint);for(const z of [-1.09,.59])box(1.55,.84,.045,.6,15.37,z,m.glass);box(.045,.84,1.45,1.52,15.37,-.25,m.glass);box(2.05,.14,1.92,.6,16.03,-.25,m.yellow);
 // East boom and west counterweight stay decorative above the authored decks.
 for(const z of [-.53,.53]){beam([-6,14.8,z],[21,14.8,z],.11,m.yellow);beam([-6,16.05,z],[21,15.4,z],.09,m.yellow);for(let x=-6;x<21;x+=2.7){beam([x,14.8,z],[Math.min(21,x+2.7),16.05-(x+8.7)*.024,z],.055,m.rust);beam([x,16.05-(x+6)*.024,z],[Math.min(21,x+2.7),14.8,z],.055,m.rust);}}
 for(let x=-6;x<22;x+=2.7)beam([x,14.8,-.53],[x,14.8,.53],.055,m.rust);
 for(const z of [-.45,.45]){beam([0,17.8,0],[17,15.4,z],.025,m.dark);beam([0,17.8,0],[-6,16.05,z],.025,m.dark);}
 beam([0,14.5,0],[0,17.8,0],.09,m.yellow);box(2.3,1.25,2,-4.5,14,0,m.concrete);
 box(1.05,.38,1.5,15,14.55,0,m.iron);for(const z of [-.35,.35])beam([15,14.5,z],[15,4,z],.018,m.dark);
 cylinder(.25,.6,15,3.9,0,m.yellow,10);const hook=torus(.3,.065,15,3.4,0,m.iron);hook.geometry.dispose();hook.geometry=new T.TorusGeometry(.3,.065,6,16,Math.PI*1.5);
 sign(q.label,3.2,.48,0,13.05,-2.015,Math.PI);
 for(const x of [-1.5,1.5])for(const z of [-1.35,1.35])for(let i=0;i<3;i++){const stripe=box(.57,.13,.03,x,.3+i*.2,z+.29,m.dark);stripe.rotation.z=-.55;}
};

function fallbackModel(ctx,q) {
 const {box,beam,m}=ctx,[w,h,d]=q.size;
 if(q.component==='cargo-container'){
  box(w,h,d,0,h/2,0,m.paint);
  for(const side of [-1,1]){for(let x=-w/2+.14;x<w/2;x+=.22)box(.055,h-.18,.055,x,h/2,side*(d/2+.025),m.rust);for(const y of [.08,h-.08])box(w,.1,.1,0,y,side*d/2,m.rust);}
  for(const x of [-w/2+.08,w/2-.08])for(const z of [-d/2+.08,d/2-.08])box(.14,h,.14,x,h/2,z,m.rust);
  for(const z of [-d*.24,d*.24])beam([w/2+.03,.12,z],[w/2+.03,h-.12,z],.023,m.steel);
 }else if(q.asset==='campaign_light_curved')builders['street-lamp'](ctx,q);
 else {const rock=ctx.mesh(new T.IcosahedronGeometry(1,1),m.stone);rock.position.y=h*.42;rock.scale.set(w/2,h/2,d/2);}
}

function mergeStaticGroup(group,zone,counts) {
 group.updateMatrixWorld(true);
 const inverse=new T.Matrix4().copy(group.matrixWorld).invert(),parts=new Map(),remove=[];
 group.traverse(o=>{
  if(!o.isMesh||o.userData.districtLabel||Array.isArray(o.material)||o.material.transparent)return;
  let geometry=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
  if(geometry.index){const indexed=geometry;geometry=geometry.toNonIndexed();indexed.dispose();}
  for(const key of Object.keys(geometry.attributes))if(!['position','normal','uv',...(o.material.vertexColors?['color']:[])].includes(key))geometry.deleteAttribute(key);
  if(o.material.vertexColors&&!geometry.attributes.color)geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));
  if(!geometry.attributes.uv)geometry.setAttribute('uv',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
  if(!geometry.attributes.normal)geometry.computeVertexNormals();
  const list=parts.get(o.material)||[];list.push(geometry);parts.set(o.material,list);remove.push(o);
 });
 for(const o of remove){o.parent.remove(o);if(o.userData.districtOwnedGeometry)o.geometry.dispose();}
 for(const [material,geometries]of parts){const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!geometry)throw Error('District geometry formats disagree');geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.zone=zone;group.add(mesh);counts.mergedMeshes++;}
}

/** Build decoration only. The campaign compiler owns the same definition's physics. */
export async function buildDistrictScene(world,definition) {
 const invalid=validateDistrictDefinition(definition);if(invalid.length)throw Error(invalid.join('; '));
 const root=new T.Group();root.name='Authored district candidate';root.userData={global:true,districtRoot:true,keep:true};world.scene.add(root);
 const groups=[],objects=new Map(),errors=[],m=materials(world),cells=new Map(),modelCache=new Map();
 const counts={districts:definition.districts.length,objects:0,assetInstances:0,proceduralObjects:0,mergedMeshes:0,meshes:0,triangles:0,visibleCells:0};
 const cellSize=definition.budgets?.cellSize||24;
 for(const district of definition.districts)for(const q of district.objects){
  const key=q.climb?q.id:[district.zone,Math.floor(q.transform.x/cellSize),Math.floor(q.transform.z/cellSize),q.vegetation?'vegetation':'structure'].join(':');
  let cell=cells.get(key);
  if(!cell){cell=new T.Group();const cx=q.climb?q.transform.x:(Math.floor(q.transform.x/cellSize)+.5)*cellSize,cz=q.climb?q.transform.z:(Math.floor(q.transform.z/cellSize)+.5)*cellSize;cell.position.set(cx,0,cz);cell.userData={zone:district.zone,keep:true,centre:[cx,cz],cull:q.cull||definition.budgets?.defaultCull||115,districtCell:true,vegetation:!!q.vegetation,authoredIds:[]};root.add(cell);cells.set(key,cell);groups.push(cell);}
  const group=new T.Group();group.name=q.id;group.position.set(q.transform.x-cell.position.x,q.transform.y,q.transform.z-cell.position.z);group.rotation.y=q.transform.yaw;group.userData={authoredId:q.id,zone:district.zone,asset:q.asset};cell.add(group);cell.userData.authoredIds.push(q.id);objects.set(q.id,{definition:q,districtId:district.id,group,cell});
  const ctx=toolsFor(world,group,m);
  const imported=['model','cargo-container','street-lamp'].includes(q.component)&&!q.asset.startsWith('field-signal:');
  if(imported){
   try{const key=JSON.stringify([q.asset,q.size,q.parts,q.assetRotation]);let template=modelCache.get(key);if(!template){template=await world.model(q.asset,{dim:q.size,parts:q.parts,rotate:q.assetRotation});modelCache.set(key,template);}group.add(template.clone(true));counts.assetInstances++;}
   catch(error){errors.push({id:q.id,asset:q.asset,message:error.message});fallbackModel(ctx,q);counts.proceduralObjects++;}
  }else {builders[q.component](ctx,q);counts.proceduralObjects++;}
  group.traverse(o=>{if(o.isMesh){o.userData={...o.userData,zone:district.zone,authoredId:q.id};o.castShadow=true;o.receiveShadow=true;}});
  counts.objects++;
 }
 root.updateMatrixWorld(true);
 for(const cell of groups){const climb=cell.userData.authoredIds.map(id=>objects.get(id)).find(record=>record.definition.climb);mergeStaticGroup(climb?climb.group:cell,cell.userData.zone,counts);}
 root.traverse(o=>{if(o.isMesh){counts.meshes++;counts.triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(!o.material.transparent&&!o.userData.districtLabel)world.occluders?.push(o);}});
 const updateVisibility=(position,zone=world.currentZone,quality=world.quality)=>{
  const max=quality==='low'?80:quality==='high'?165:115;let visible=0;
  for(const group of groups){const [x,z]=group.userData.centre;group.visible=zone===group.userData.zone&&(!group.userData.vegetation||world.renderSettings?.vegetation!==false)&&Math.hypot(position.x-x,position.z-z)<Math.min(max,group.userData.cull)+(group.visible?8:0);if(group.visible)visible++;}
  counts.visibleCells=visible;
 };
 updateVisibility(world.state?.player||world.camera?.position||{x:-500,z:24});
 return {root,groups,objects,counts,errors,updateVisibility};
}
