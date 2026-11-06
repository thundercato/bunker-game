import * as T from './vendor/three.js';
import {BaseWorld} from './world-core.js';
import {applyEditorPreview} from './layout-preview.js';
const sourceJSON=await(await fetch('./world.json')).text();
export const DATA=await applyEditorPreview(JSON.parse(sourceJSON),sourceJSON);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));let seed=604921;
function r(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
function merge(parts){const pos=[],nor=[],uv=[];for(let g of parts){if(g.index)g=g.toNonIndexed();pos.push(...g.attributes.position.array);if(g.attributes.normal)nor.push(...g.attributes.normal.array);if(g.attributes.uv)uv.push(...g.attributes.uv.array);}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(nor.length===pos.length)g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));else g.computeVertexNormals();if(uv.length===pos.length/3*2)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;}
function inBuilding(p,b){if(b.editorTransform){const a=b.editorTransform.yaw,dx=p.x-b.x,dz=p.z-b.z;return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<b.editorBounds[0]/2&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<b.editorBounds[1]/2;}return Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.z-b.z)<b.d/2;}
export function land(x,z){let b=DATA.bounds,p=DATA.pier;return x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ&&(x<DATA.shore-.3||(x>p.minX&&x<p.maxX-.4&&z>p.minZ+.4&&z<p.maxZ-.4));}
function distSegment(x,z,a,b){let dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u);}
export class World extends BaseWorld{
 constructor(canvas,quality='balanced'){
  super(canvas,quality);this.camera.far=180;this.camera.updateProjectionMatrix();this.skyDay=new T.Color('#7a837c');this.skyNight=new T.Color('#111c27');this.aimState=false;this.staticVisibility=[];this.lastCull=0;this.ray.far=80;this.gunKick=0;this.nightBoost=.15;
 }
 buildGround(){
  const ground=this.surface('ground','#9a9b89',72,95),floor=new T.Mesh(new T.PlaneGeometry(260,340),ground);floor.rotation.x=-Math.PI/2;floor.position.set(-64,-.06,-110);this.scene.add(floor);
  const sand=this.surface('ground','#c1b695',8,65),beach=new T.Mesh(new T.PlaneGeometry(17,330),sand);beach.rotation.x=-Math.PI/2;beach.position.set(58,-.025,-110);this.scene.add(beach);
  this.roadMat=this.surface('wall','#65685f',2,8);this.pathMat=this.surface('ground','#b09c7f',1,5);
  for(let route=0;route<DATA.roads.length;route++)for(let i=1;i<DATA.roads[route].length;i++){
   const a=DATA.roads[route][i-1],b=DATA.roads[route][i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);let m=new T.Mesh(new T.PlaneGeometry(route===0?3.5:5.4,len+.5),route===0?this.pathMat:this.roadMat);m.rotation.set(-Math.PI/2,0,-Math.atan2(b[0]-a[0],b[1]-a[1]));m.position.set((a[0]+b[0])/2,.001,(a[1]+b[1])/2);this.scene.add(m);
  }
  // A marked gravel lane behind the refuge leads to the physical shooting range.
  this.box(11,.025,25,0,-.005,26,this.mat.floor);
  this.groups=[];this.containerMeshes={};this.trees=[];
 }
 buildBase(){super.buildBase();
  const table=this.box(1.4,1.1,.55,-4.7,.55,3.4,this.mat.metal,this.scene,true);this.addInteract(table,'trade','trade','Quartermaster terminal',[-4.7,1.1,3.4]);const sign=this.label('SUPPLY / TRADE',1.2,.26);sign.position.set(-4.7,1.5,3.7);this.scene.add(sign);
  const book=this.box(.36,.04,.3,2.7,.99,4.55,this.mat.paper);this.addInteract(book,'rules','rules','Loot rules notebook',[2.7,1.03,4.55]);
  this.buildRange();
 }
 door(id,x,z){
  let root=new T.Group();root.position.set(x-1,0,z);this.scene.add(root);let pivot=new T.Group();root.add(pivot);
  this.box(2,2.7,.12,1,1.35,0,this.mat.metal,pivot);this.box(.16,.23,.06,1.72,1.32,.095,this.mat.black,pivot);this.box(.22,.045,.05,1.67,1.34,.15,this.mat.brass,pivot);
  const name=id==='exit'?'ВЫХОД / EXIT':id==='rear'?'RANGE / REAR':(DATA.buildings.find(b=>b.id===id)?.name||'STORE').toUpperCase();let plate=this.label(name,1.75,.3);plate.position.set(1,2.08,.075);pivot.add(plate);
  for(const xx of [x-1.09,x+1.09])this.box(.16,2.9,.25,xx,1.45,z,this.mat.black);this.box(2.35,.13,.25,x,2.88,z,this.mat.black);
  let collider={x,z,w:2.15,d:.25,door:id};this.colliders.push(collider);this.doors[id]={root,pivot,closedMesh:pivot.children[0],collider,angle:0};this.occluders.push(pivot.children[0]);this.addInteract(pivot,'door',id,name,[x,1.35,z]);
 }
 buildHut(){
  this.buildingObjects={};const pale=this.surface('wall','#b1afa0',3,2),slate=this.surface('wall','#555e60',3,2),grey=this.surface('wall','#8e8f81',3,2),pierPaint=this.surface('wood','#647c77',3,2);
  DATA.buildings.forEach((b,n)=>{
   const {x,z,w,d}=b;const mat=b.kind==='hut'?this.mat.wood:b.kind==='pier'?pierPaint:n%3===0?pale:grey;
   this.box(w+.2,.08,d+.2,x,-.015,z,this.mat.floor);
   // Front door plus a window in each side wall. Windows retain physical collision.
   for(let side of [-1,1]){
    const xx=x+side*w/2;
    this.box(.22,1.15,d,xx,.575,z,mat,this.scene,true);this.box(.22,.65,d,xx,2.725,z,mat);
    this.box(.22,1.25,d/2-1,xx,1.775,z-d/4-.5,mat,this.scene,true);this.box(.22,1.25,d/2-1,xx,1.775,z+d/4+.5,mat,this.scene,true);
    this.box(.24,.09,2.1,xx,1.18,z,this.mat.wood);this.box(.24,1.3,.055,xx,1.8,z,this.mat.wood);this.box(.24,.06,2.1,xx,1.82,z,this.mat.wood);
   }
   this.box(w,3.05,.23,x,1.52,z-d/2,mat,this.scene,true);
   const half=(w-2.2)/2;for(let side of [-1,1])this.box(half,3.05,.23,x+side*(w+2.2)/4,1.52,z+d/2,mat,this.scene,true);
   this.box(2.2,.3,.25,x,2.96,z+d/2,mat);this.door(b.id,x,z+d/2);
   if(['cottage','clinic','shop'].includes(b.kind)){
    for(let side of [-1,1]){let roof=this.box(w*.57,.17,d+.9,x+side*w*.25,3.72,z,slate);roof.rotation.z=-side*.37;}
    for(let end of [-1,1]){let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-w/2,0,0,w/2,0,0,0,1.05,0],3));g.computeVertexNormals();let m=new T.Mesh(g,new T.MeshStandardMaterial({color:n%2?'#999e90':'#a2a293',roughness:1,side:T.DoubleSide}));m.position.set(x,3.05,z+end*d/2);this.scene.add(m);}
    this.box(.65,1.6,.7,x-w*.24,4.1,z-d*.2,this.mat.concrete);
   }else{let roof=this.box(w+.6,.17,d+.6,x,3.17,z,this.mat.metal);roof.rotation.x=.035;}
   let label=this.label(b.name.toUpperCase(),Math.min(3.3,w-.4),.34,'#d5c399',b.kind==='pier'?'#435d57':'#3d4940');label.position.set(x,2.65,z+d/2+.15);this.scene.add(label);
   // Tables are physical surfaces, with the loose loot placed by the Python rules.
   const slot=DATA.looseSlots.find(s=>s.building===b.id);if(slot)this.table(slot.x,slot.z,2.1,1.25);
   if(b.kind==='cottage'){this.box(1.5,.45,2.3,x-w/2+1.2,.22,z+.9,this.mat.bed,this.scene,true);this.box(1.4,.07,1.4,x-w/2+1.2,.5,z+.6,this.mat.cloth);}
   if(b.kind==='pier'){for(const dx of [-w/2+.4,w/2-.4])this.cylinder(.07,.07,1.5,x+dx,.75,z+d/2+.7,this.mat.red);}
  });
  for(const c of DATA.containers)this.container(c);
  this.buildRailway();
 }
 container(c){
  const group=new T.Group();group.position.set(c.x,0,c.z);this.scene.add(group);let h=c.profile==='locker'?1.9:c.profile==='cupboard'||c.profile==='medical'?1.05:.8;
  const bottom=(c.profile==='cupboard'||c.profile==='medical')?.85:0;let w=c.profile==='crate'?1.15:.9,d=.6;
  this.box(w,.065,d,0,bottom+h,0,this.mat.wood,group);this.box(w,.065,d,0,bottom,0,this.mat.wood,group);this.box(w,h,.06,0,bottom+h/2,-d/2,this.mat.wood,group);
  for(const xx of [-w/2,w/2])this.box(.065,h,d,xx,bottom+h/2,0,c.profile==='medical'?this.mat.white:this.mat.wood,group);
  this.box(w,.06,d,0,bottom+h*.5,0,this.mat.wood,group);
  const hinge=new T.Group();hinge.position.set(-w/2,0,d/2+.02);group.add(hinge);let front=this.box(w,h,.065,w/2,bottom+h/2,0,c.profile==='locker'?this.mat.metal:c.profile==='medical'?this.mat.white:this.mat.wood,hinge);
  this.box(.07,.15,.05,w-.12,bottom+h*.52,.05,this.mat.black,hinge);
  if(c.profile==='drawers')for(const y of [.25,.5,.75])this.box(w,.012,.015,w/2,y*h,.04,this.mat.black,hinge);
  if(c.profile==='medical'){this.box(.28,.05,.015,w/2,bottom+h/2,.05,this.mat.red,hinge);this.box(.05,.28,.015,w/2,bottom+h/2,.06,this.mat.red,hinge);}
  this.colliders.push({x:c.x,z:c.z,w:w+.05,d:d+.08});this.containerMeshes[c.id]={group,hinge,angle:0};this.addInteract(group,'container',c.id,c.name+' · '+c.profile,[c.x,bottom+h*.5,c.z+.35]);
 }
 buildRange(){
  this.bottleMeshes=[];this.rangeHitboxes=[];const glass=new T.MeshStandardMaterial({color:'#8bb191',roughness:.15,metalness:.18,transparent:true,opacity:.77});
  for(const z of [34.3]){for(const y of [.55,1.2])this.box(12,.22,.13,0,y,z,this.mat.wood);for(let x=-6;x<=6;x+=2)this.box(.13,1.6,.14,x,.8,z,this.mat.wood,this.scene,true);}
  this.box(16,2,.6,0,1,37,this.mat.wood,this.scene,true);
  for(let i=0;i<9;i++){const group=new T.Group();group.position.set((i-4)*1.15,1.33,34.25);this.scene.add(group);this.cylinder(.105,.115,.32,0,.16,0,glass,group,10);this.cylinder(.05,.105,.11,0,.375,0,glass,group,10);this.cylinder(.047,.047,.12,0,.49,0,glass,group,10);group.traverse(o=>o.userData.targetId='bottle'+i);this.bottleMeshes.push(group);this.rangeHitboxes.push(group);}
  this.box(1.1,.95,.7,7,.475,32,this.mat.wood,this.scene,true);let button=this.box(.3,.13,.25,7,1.02,32,this.mat.red);this.addInteract(button,'range','range','Replace range bottles',[7,1.03,32]);const sign=this.label('REPLACE BOTTLES',2,.34);sign.position.set(7,1.6,32.3);this.scene.add(sign);
  const firingline=new T.Mesh(new T.PlaneGeometry(9,.15),new T.MeshBasicMaterial({color:'#d5c17d'}));firingline.rotation.x=-Math.PI/2;firingline.position.set(0,.02,24);this.scene.add(firingline);
 }
 buildRailway(){
  const x=DATA.rail.x,from=DATA.rail.minZ,to=DATA.rail.maxZ,len=to-from;
  this.box(5.2,.025,len,x,-.01,(from+to)/2,this.mat.rock);
  const sleeperGeo=new T.BoxGeometry(2.9,.11,.22),count=Math.floor(len/.9);let sleeper=new T.InstancedMesh(sleeperGeo,this.mat.wood,count),o=new T.Object3D();for(let i=0;i<count;i++){o.position.set(x,.025,from+i*.9);o.updateMatrix();sleeper.setMatrixAt(i,o.matrix)}this.scene.add(sleeper);
  for(const xx of [x-.78,x+.78])this.box(.10,.13,len,xx,.08,(from+to)/2,this.mat.metal);
  for(const z of [-191,-207]){this.box(3.1,3.2,12,x,1.9,z,this.mat.metal,this.scene,true);this.box(3.3,.15,12.2,x,3.6,z,this.mat.black);for(const side of [-1,1])for(const dz of [-4,4]){let wh=this.cylinder(.42,.42,.2,x+side*1.3,.4,z+dz,this.mat.black);wh.rotation.z=Math.PI/2;}}
  for(let z=to;z>from;z-=22){this.cylinder(.09,.14,6,x-4,3,z,this.mat.wood);this.beam([x-5.5,5.5,z],[x-2.5,5.5,z],.06,this.mat.wood);if(z-22>from)this.beam([x-4,5.7,z],[x-4,5.7,z-22],.014,this.mat.black);}
 }
 buildForest(){
  this.forestChunks=[];const points=[];
  for(let i=0;i<1700;i++){
   const x=-137+r()*188,z=-255+r()*290;
   if(Math.abs(x)<10&&z>-13)continue;
   if(DATA.buildings.some(b=>Math.abs(x-b.x)<b.w/2+3.2&&Math.abs(z-b.z)<b.d/2+3.2))continue;
   if(DATA.anomalies.some(a=>Math.hypot(x-a.x,z-a.z)<7))continue;
   if(DATA.roads.some(route=>route.some((b,j)=>j&&distSegment(x,z,route[j-1],b)<4.5)))continue;
   if(Math.abs(x-DATA.rail.x)<5.2)continue;
   if(x>-42&&x<38&&z<-155&&z>-203)continue;
   points.push([x,z,.65+r()*.65,r()*Math.PI*2]);
  }
  const trunkGeo=new T.CylinderGeometry(.085,.25,10,6),obj=new T.Object3D(),foliage=[],uv=[];
  for(let level=0;level<7;level++){let y=3.3+level*.95,rad=2.6*(1-level/8);for(let b=0;b<5;b++){let a=b/5*6.283+level*1.39,len=rad*(.7+r()*.35),dx=Math.cos(a),dz=Math.sin(a);for(let plane=0;plane<2;plane++){let side=plane?new T.Vector3(dx*.3,.8,dz*.3):new T.Vector3(-dz,0,dx);side.multiplyScalar(len*.48);let origin=new T.Vector3(0,y+.1,0),tip=new T.Vector3(dx*len,y-len*.25,dz*len),v=[origin.clone().addScaledVector(side,-.25),origin.clone().addScaledVector(side,.25),tip.clone().add(side),tip.clone().sub(side)];for(let k of [0,1,2,0,2,3]){foliage.push(...v[k].toArray());uv.push(...[[0,0],[1,0],[1,1],[0,1]][k]);}}}}
  const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(foliage,3));fg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));fg.computeVertexNormals();const fm=new T.MeshStandardMaterial({color:'#889180',roughness:1,side:T.DoubleSide,alphaTest:.38});this.loader.load('./assets/textures/pine.webp',tx=>{tx.colorSpace=T.SRGBColorSpace;fm.map=tx;fm.needsUpdate=true;});
  const chunks=new Map();for(const pt of points){const key=Math.floor(pt[0]/38)+','+Math.floor(pt[1]/38);if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(pt);this.colliders.push({x:pt[0],z:pt[1],r:.25*pt[2]});this.trees.push({x:pt[0],z:pt[1],r:.25*pt[2]});}
  for(const [key,list]of chunks){const group=new T.Group(),trunks=new T.InstancedMesh(trunkGeo,this.mat.bark,list.length),leaves=new T.InstancedMesh(fg,fm,list.length);let [gx,gz]=key.split(',').map(Number);group.userData.centre=[gx*38+19,gz*38+19];list.forEach(([x,z,s,rot],i)=>{obj.position.set(x,s*5,z);obj.rotation.set(0,rot,0);obj.scale.set(s,s,s);obj.updateMatrix();trunks.setMatrixAt(i,obj.matrix);obj.position.y=0;obj.updateMatrix();leaves.setMatrixAt(i,obj.matrix);});trunks.computeBoundingSphere();leaves.computeBoundingSphere();group.add(trunks,leaves);this.scene.add(group);this.forestChunks.push(group);}
  this.treeCount=points.length;
  const rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),this.mat.rock,170);for(let i=0;i<170;i++){let p=points[i*3%points.length];obj.position.set(p[0]+1,.18,p[1]);obj.scale.set(.3+r()*.7,.2+r()*.4,.3+r());obj.rotation.set(r(),r()*6,r());obj.updateMatrix();rocks.setMatrixAt(i,obj.matrix)}this.scene.add(rocks);
  this.loader.load('./assets/textures/ferns.webp',tx=>{tx.colorSpace=T.SRGBColorSpace;const mat=new T.MeshStandardMaterial({map:tx,color:'#98a080',alphaTest:.4,side:T.DoubleSide,roughness:1});let g=new T.PlaneGeometry(1.8,.9);g.translate(0,.4,0);const geo=merge([g,g.clone().rotateY(Math.PI/2)]),mesh=new T.InstancedMesh(geo,mat,300);for(let i=0;i<300;i++){let p=points[i*2%points.length];obj.position.set(p[0]+.7,.02,p[1]);obj.rotation.set(0,r()*6,0);obj.scale.setScalar(.6+r()*.7);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix)}this.scene.add(mesh)});
  // Distant ground rises outside the traversable perimeter; no invisible cliff shortcuts.
  for(let i=0;i<16;i++){let hill=new T.Mesh(new T.ConeGeometry(30+r()*20,9+r()*13,8),this.mat.leaf);hill.position.set(-158-r()*20,-1,-255+i*20);this.scene.add(hill);}
 }
 buildRiver(){
  const mat=new T.ShaderMaterial({uniforms:{time:{value:0},night:{value:0},fogColor:{value:this.scene.fog.color}},vertexShader:'varying vec3 wp;varying float dep;void main(){vec4 p=modelMatrix*vec4(position,1.);wp=p.xyz;vec4 v=viewMatrix*p;dep=-v.z;gl_Position=projectionMatrix*v;}',fragmentShader:'uniform float time;uniform float night;uniform vec3 fogColor;varying vec3 wp;varying float dep;void main(){float rip=sin(wp.x*2.1+wp.z*.6-time*.8)*sin(wp.z*1.4+time*.5);float foam=pow(max(0.,sin(wp.x*1.1+time*.7)),14.)*smoothstep(73.,66.,wp.x);vec3 col=mix(vec3(.27,.36,.38),vec3(.035,.075,.11),night)+rip*.018+foam*.12;float fog=1.-exp(-.00021*dep*dep);gl_FragColor=vec4(mix(col,fogColor,fog),1.);}'});
  let geo=new T.PlaneGeometry(520,750);geo.rotateX(-Math.PI/2);this.water=new T.Mesh(geo,mat);this.water.position.set(326,-.13,-110);this.scene.add(this.water);
  const p=DATA.pier;this.box(p.maxX-p.minX,.22,p.maxZ-p.minZ,(p.maxX+p.minX)/2,-.14,(p.maxZ+p.minZ)/2,this.mat.wood);
  for(const z of [p.minZ,p.maxZ]){this.box(p.maxX-p.minX,1,.09,(p.minX+p.maxX)/2,.6,z,this.mat.metal,this.scene,true);for(let x=p.minX;x<p.maxX;x+=4)this.cylinder(.045,.045,1.25,x,.62,z,this.mat.metal);}
  this.box(.1,1,p.maxZ-p.minZ,p.maxX,.6,(p.maxZ+p.minZ)/2,this.mat.metal,this.scene,true);
  for(let x=67;x<120;x+=8)for(const z of [-154,-136])this.cylinder(.24,.3,3,x,-1.5,z,this.mat.wood);
  let board=this.label('SEAWARD PIER',4.5,.65,'#d1ba92','#496662');board.position.set(65,3.1,-134);this.scene.add(board);for(const x of [62.5,67.5])this.cylinder(.12,.12,3,x,1.5,-134,this.mat.wood);
  for(let i=0;i<18;i++){this.cylinder(.11,.15,1.3,64,.5,-240+i*15,this.mat.wood);}
 }
 buildAnomaly(){this.anomalyGroups=[];for(const a of DATA.anomalies){const group=new T.Group();group.position.set(a.x,0,a.z);this.scene.add(group);const mat=new T.MeshBasicMaterial({color:'#83b7b5',transparent:true,opacity:.1,side:T.DoubleSide,depthWrite:false});let ring=new T.Mesh(new T.RingGeometry(a.radius-.1,a.radius,48),mat);ring.rotation.x=-Math.PI/2;ring.position.y=.025;group.add(ring);const pts=[];for(let i=0;i<44;i++){let t=r()*6.28,q=r()*a.radius;pts.push(Math.cos(t)*q,r()*2.8,Math.sin(t)*q)}let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));let dust=new T.Points(geo,new T.PointsMaterial({color:'#accac0',size:.06,transparent:true,opacity:.6,depthWrite:false}));group.add(dust);this.anomalyGroups.push({id:a.id,group,ring,dust});}}
 buildWatcher(){
  this.enemyMeshes={};this.enemyHitboxes=[];this.smokeMaterials=[];
  for(const kind of ['drifter','stalker','wraith']){
   const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},colour:{value:new T.Color(kind==='wraith'?'#50505c':kind==='stalker'?'#373d3c':'#414641')}},vertexShader:'uniform float time;attribute float seed;attribute float radius;varying float v;void main(){v=seed;vec3 p=position;p.x+=sin(time*.9+seed*26.+p.y)*.07;p.z+=cos(time*.8+seed*32.)*.07;p.y+=sin(time*.6+seed*17.)*.055;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(radius*430./max(1.,-mv.z),2.,70.);gl_Position=projectionMatrix*mv;}',fragmentShader:'uniform vec3 colour;uniform float time;varying float v;void main(){vec2 p=gl_PointCoord-.5;float d=length(p)*2.;if(d>1.)discard;float f=sin(p.x*16.+time+v*5.)*cos(p.y*12.-time*.5+v*7.);float alpha=pow(1.-d,1.55)*(.43+f*.09);gl_FragColor=vec4(colour*(.6+.4*d),alpha);}'});this.smokeMaterials.push(material);
   for(const e of DATA.enemies.filter(e=>e.kind===kind)){
    let g=new T.Group();this.scene.add(g);g.position.set(e.x,0,e.z);const pos=[],sd=[],ra=[];let scale=kind==='wraith'?1.22:kind==='stalker'?1.1:1;
    for(let i=0;i<170;i++){let x,y,z;
     if(i<35){const a=r()*6.28,yy=(r()-.5)*.4;x=Math.cos(a)*.16;y=1.8+yy;z=Math.sin(a)*.14;}
     else if(i<100){x=(r()-.5)*.48;y=.85+r()*.78;z=(r()-.5)*.3;}
     else if(i<135){const side=i%2?1:-1;x=side*(.27+r()*.12);y=.65+r()*.8;z=(r()-.5)*.18;}
     else {const side=i%2?1:-1;x=side*(.10+r()*.09);y=.12+r()*.8;z=(r()-.5)*.18;}
     pos.push(x*scale,y*scale,z*scale);sd.push(r());ra.push((.22+r()*.22)*scale);
    }
    let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('seed',new T.Float32BufferAttribute(sd,1));geo.setAttribute('radius',new T.Float32BufferAttribute(ra,1));const smoke=new T.Points(geo,material);smoke.raycast=()=>{};g.add(smoke);
    let hit=new T.Mesh(new T.CapsuleGeometry(.24,1.25,3,7),new T.MeshBasicMaterial({colorWrite:false,depthWrite:false}));hit.position.y=1.05;hit.scale.setScalar(scale);hit.userData.targetId=e.id;g.add(hit);this.enemyHitboxes.push(hit);this.enemyMeshes[e.id]={group:g,target:new T.Vector3(e.x,0,e.z),kind};
   }
  }
 }
 gunModel(parent,scale=1){const g=new T.Group();parent.add(g);this.box(.14,.13,.36,0,0,-.07,this.mat.black,g);this.box(.075,.04,.12,0,.07,-.18,this.mat.metal,g);this.box(.1,.22,.12,0,-.16,.05,this.mat.wood,g).rotation.x=-.15;let barrel=this.cylinder(.027,.027,.12,0,-.025,-.28,this.mat.black,g,12);barrel.rotation.x=Math.PI/2;
  // Real notch and front post: the sight line lies at local y=.108 on the camera axis in ADS.
  this.box(.018,.025,.026,0,.102,-.235,this.mat.black,g);this.box(.005,.006,.004,0,.112,-.22,this.mat.white,g);
  for(const x of [-.028,.028]){this.box(.018,.027,.025,x,.1,.055,this.mat.black,g);this.box(.004,.006,.003,x,.11,.07,this.mat.white,g);}
  g.scale.setScalar(scale);return g;
 }
 buildHand(){super.buildHand();this.knifeHand=new T.Group();this.camera.add(this.knifeHand);this.knifeModel(this.knifeHand);this.torchHand=new T.Group();this.camera.add(this.torchHand);this.torchModel(this.torchHand);this.knifeHand.position.set(.25,-.23,-.5);this.torchHand.position.set(.25,-.18,-.45);this.knifeHand.visible=false;this.torchHand.visible=false;}
 knifeModel(g){this.box(.055,.07,.16,0,-.02,.12,this.mat.wood,g);this.box(.14,.035,.04,0,0,.035,this.mat.metal,g);let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-.04,0,.02,.04,0,.02,0,0,-.32],3));geo.computeVertexNormals();let blade=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#bfc4bc',metalness:.7,roughness:.3,side:T.DoubleSide}));g.add(blade);return g;}
 torchModel(g){let b=this.cylinder(.055,.05,.32,0,0,0,this.mat.black,g,12);b.rotation.x=Math.PI/2;let h=this.cylinder(.085,.055,.08,0,0,-.19,this.mat.metal,g,12);h.rotation.x=Math.PI/2;let lens=this.cylinder(.07,.07,.005,0,0,-.235,this.mat.white,g,12);lens.rotation.x=Math.PI/2;return g;}
 lootModel(kind){if(kind==='knife'){const g=new T.Group();this.knifeModel(g);g.position.y=.05;return g;}if(kind==='torch'){const g=new T.Group();this.torchModel(g);return g;}
  if(['battery','oil','energy','water'].includes(kind)){let g=new T.Group();this.cylinder(.055,.06,.19,0,.1,0,kind==='water'?this.mat.metal:this.mat.black,g,10);return g;}
  if(['helmet','cap'].includes(kind)){let g=new T.Group(),m=new T.Mesh(new T.SphereGeometry(.18,10,6,0,Math.PI*2,0,Math.PI/2),this.mat.metal);m.position.y=.05;g.add(m);return g;}
  if(['ledger','postbag','case','sample','fuse','relay'].includes(kind))return super.lootModel(kind==='case'?'med':kind==='relay'?'recorder':kind==='sample'?'shard':'junk');
  if(kind==='bead')return super.lootModel('shard');if(['jacket','trousers','boots','trainers'].includes(kind))return super.lootModel('coat');return super.lootModel(kind);
 }
 populateLoot(loot){for(const [id,item] of Object.entries(loot)){if(this.pickups[id])continue;let g=this.lootModel(item.kind);g.position.set(item.x,item.y??.08,item.z);this.scene.add(g);this.pickups[id]=g;this.addInteract(g,'pickup',id,item.name+(item.count>1?' ×'+item.count:''),[item.x,(item.y??.08)+.1,item.z]);}}
 updateState(s,loot){this.state=s;this.populateLoot(loot);for(const [id,g]of Object.entries(this.pickups))g.visible=!!loot[id]&&!s.taken.includes(id);for(const[id,d]of Object.entries(this.doors)){d.collider.off=!!s.doors[id];d.closedMesh.userData.open=!!s.doors[id];}
  for(const e of s.enemies){const m=this.enemyMeshes[e.id];m.group.visible=e.health>0;m.target.set(e.x,0,e.z);m.group.rotation.y=e.yaw;}
  for(let i=0;i<9;i++)this.bottleMeshes[i].visible=s.bottles[i];this.radioLED.material.color.set(Object.values(s.missions).includes('active')?'#d2b35e':'#97bd8a');
  if(s.corpse){if(!this.bagMesh){this.bagMesh=this.box(.55,.4,.4,s.corpse.x,.2,s.corpse.z,this.mat.cloth);this.addInteract(this.bagMesh,'recover','corpse','Recover field pack',[s.corpse.x,.4,s.corpse.z]);}this.bagMesh.visible=true;this.bagMesh.position.set(s.corpse.x,.2,s.corpse.z);this.bagMesh.userData.interact.anchor.set(s.corpse.x,.4,s.corpse.z);}else if(this.bagMesh)this.bagMesh.visible=false;
 }
 movePlayer(p,dx,dz){const q={...p},radius=.29;const near=this.colliders.filter(c=>!c.off&&Math.abs(c.x-p.x)<(c.w||c.r||1)/2+3&&Math.abs(c.z-p.z)<(c.d||c.r||1)/2+3);const blocked=(x,z)=>!land(x,z)||near.some(c=>c.r?Math.hypot(x-c.x,z-c.z)<c.r+radius:Math.abs(x-c.x)<c.w/2+radius&&Math.abs(z-c.z)<c.d/2+radius);let steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));for(let i=0;i<steps;i++){if(!blocked(q.x+dx/steps,q.z))q.x+=dx/steps;if(!blocked(q.x,q.z+dz/steps))q.z+=dz/steps;}return q;}
 shot(aim=false,knife=false,throwing=false){
  this.scene.updateMatrixWorld();let seed=(this.state.seed*1664525+1013904223)>>>0;const rr=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const spread=knife?(throwing?.012:0):aim?.0032:.045;
  const yaw=(rr()-.5)*spread*2,pitch=(rr()-.5)*spread*2;const dir=new T.Vector3(yaw,pitch,-1).normalize().applyQuaternion(this.camera.quaternion);const range=knife?(throwing?16:2.5):70;this.ray.set(this.camera.position,dir);this.ray.far=range;
  const targets=[...this.enemyHitboxes.filter(o=>this.visible(o)),...this.bottleMeshes.filter(o=>o.visible)];const hits=this.ray.intersectObjects(targets,true),walls=this.ray.intersectObjects(this.occluders.filter(o=>!o.userData.open),false);let stop=walls[0]?.distance??range,hit=null;
  if(hits.length&&hits[0].distance<=stop){hit=hits[0].object.userData.targetId;stop=hits[0].distance;}
  const point=this.camera.position.clone().addScaledVector(dir,Math.min(stop,range));this.ray.far=80;return {hit,land:{x:point.x,z:point.z},point};
 }
 flashShot(){this.flash=.07;this.gunKick=.025;this.muzzle.visible=true;}
 thrownKnife(land){const g=this.knifeModel(new T.Group());g.position.copy(this.camera.position);this.scene.add(g);const end=new T.Vector3(land.x,.08,land.z);this.projectiles.push({mesh:g,start:g.position.clone(),end,flight:0,kind:'knife'});}
 breakBottle(i){const base=this.bottleMeshes[i].position;for(let n=0;n<7;n++){let g=new T.Mesh(new T.TetrahedronGeometry(.045),this.mat.white);g.position.copy(base).y+=.2;this.scene.add(g);this.projectiles.push({mesh:g,v:new T.Vector3((r()-.5)*2,1+r()*2,(r()-.5)*2),life:0});}}
 lineOfSightToEnemies(p){const out={};const origin=new T.Vector3(p.x,1.45,p.z);for(const e of this.state?.enemies||[]){if(e.health<=0||Math.hypot(e.x-p.x,e.z-p.z)>42)continue;const dest=new T.Vector3(e.x,1.25,e.z),len=origin.distanceTo(dest),ray=new T.Raycaster(origin,dest.sub(origin).normalize(),0,len);out[e.id]=!ray.intersectObjects(this.occluders.filter(o=>!o.userData.open),false).length;}return out;}
 lineOfSightToEnemy(p){return this.lineOfSightToEnemies(p);}
 environment(p){const base=Math.abs(p.x)<6&&p.z>0&&p.z<14,b=DATA.buildings.find(b=>inBuilding(p,b)),an=DATA.anomalies.some(a=>Math.hypot(p.x-a.x,p.z-a.z)<14);let name=base?'RELAY 07 · REFUGE':b?b.name.toUpperCase():p.x>66?'SEAWARD PIER':p.x>49?'COLD COAST · BEACH':Math.abs(p.x+89)<8?'OLD RAILWAY':p.z<-153&&p.z>-207&&p.x>-42&&p.x<39?'NORTHCROFT VILLAGE':an?'ANOMALY FIELD':p.z<-95?'DEEP WOODLAND':'FOREST APPROACH';return {area:base||b?'base':an?'anomaly':p.z<-95?'deep':'forest',indoor:!!(base||b),river:clamp((p.x-44)/22,0,1),name,surface:base||b?'stone':p.x>49?'sand':'grass'};}
 frame(p,dt,{aim=false,crouch=false,torch=false,detector=false,active=false}={}){
  this.time+=dt;this.aim+=(Number(aim&&this.state?.hand==='gun')-this.aim)*Math.min(1,dt*12);this.crouch+=(Number(crouch)-this.crouch)*Math.min(1,dt*10);this.syncPose(p);
  let fov=74-this.aim*19;if(Math.abs(this.camera.fov-fov)>.02){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
  this.hands.visible=!!this.state?.weapon.owned&&this.state.hand==='gun';this.knifeHand.visible=this.state?.hand==='knife'&&this.state.bag.knife>0;this.torchHand.visible=this.state?.hand==='torch'&&this.state.bag.torch>0;
  this.gunKick*=Math.exp(-dt*16);this.hands.position.set(.26*(1-this.aim),-.23+this.aim*.122,-.48+this.aim*.12+this.gunKick);this.hands.rotation.set(0,0,0);
  if(this.flash>0){this.flash-=dt;this.muzzle.visible=this.flash>0;}
  for(const [id,d]of Object.entries(this.doors)){let goal=this.state?.doors[id]?-Math.PI*.58:0;d.angle+=(goal-d.angle)*Math.min(1,dt*9);d.pivot.rotation.y=d.angle;}
  for(const[id,c]of Object.entries(this.containerMeshes)){let goal=this.state?.containers[id]?-.95:0;c.angle+=(goal-c.angle)*Math.min(1,dt*7);c.hinge.rotation.y=c.angle;}
  const env=this.environment(p);const h=((this.state?.clock||1030)/60)%24;let daylight=h>=6&&h<=17?1:h>17&&h<19?1-(h-17)/2:h>=5&&h<6?h-5:0;
  const n=1-daylight;this.scene.background.copy(this.skyDay).lerp(this.skyNight,n);this.scene.fog.color.copy(this.scene.background);this.scene.fog.density=.014+n*.003;
  this.ambient.intensity=(.19+daylight*.8)+(this.nightBoost||0)*n;this.sun.intensity=.04+daylight*.92;this.renderer.toneMappingExposure=env.indoor?.97:1.02;
  this.flashlight.intensity=torch?36:0;this.flashlight.distance=29;this.flashlight.angle=.40;
  this.water.material.uniforms.time.value=this.time;this.water.material.uniforms.night.value=n;
  for(const a of this.anomalyGroups){a.dust.rotation.y=this.time*.08;a.dust.position.y=Math.sin(this.time*.4)*.1;const reveal=this.state&&this.state.elapsed<this.state.anomalyUntil[a.id];a.ring.material.opacity=reveal?.6:.06;}
  for(const mat of this.smokeMaterials)mat.uniforms.time.value=this.reducedMotion?0:this.time;
  for(const m of Object.values(this.enemyMeshes))m.group.position.lerp(m.target,Math.min(1,dt*15));
  if(this.time-this.lastCull>.4){this.lastCull=this.time;for(const g of this.forestChunks){const [x,z]=g.userData.centre;g.visible=Math.hypot(p.x-x,p.z-z)<115;}for(const c of Object.values(this.containerMeshes))c.group.visible=Math.hypot(p.x-c.group.position.x,p.z-c.group.position.z)<100;}
  for(let i=this.projectiles.length-1;i>=0;i--){const b=this.projectiles[i];if(b.kind==='knife'){b.flight+=dt;let t=clamp(b.flight/.7,0,1);b.mesh.position.lerpVectors(b.start,b.end,t);b.mesh.position.y+=Math.sin(t*Math.PI)*.25;b.mesh.rotation.x+=dt*15;if(t>=1){this.scene.remove(b.mesh);this.projectiles.splice(i,1)}}else{b.life+=dt;b.v.y-=9.8*dt;b.mesh.position.addScaledVector(b.v,dt);if(b.mesh.position.y<.04){b.mesh.position.y=.04;b.v.multiplyScalar(0)}if(b.life>2.4){this.scene.remove(b.mesh);b.mesh.geometry.dispose();this.projectiles.splice(i,1)}}}
  this.renderer.render(this.scene,this.camera);
 }
 info(){return {...super.info(),buildings:DATA.buildings.length,containers:DATA.containers.length,creatures:DATA.enemies.length};}
}
