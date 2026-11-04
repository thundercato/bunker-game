import * as T from './vendor/three.js';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let seed=1979;function rng(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
export function groundHeight(x,z){return 0;}
function textureCanvas(kind){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');let base=kind==='bark'?'#555047':kind==='wood'?'#6a5c48':kind==='ground'?'#49483d':kind==='rust'?'#596157':'#85847a';g.fillStyle=base;g.fillRect(0,0,256,256);for(let i=0;i<7500;i++){let a=rng()*.23;g.fillStyle=`rgba(${rng()<.5?'0,0,0':'205,199,169'},${a})`;let x=rng()*256,y=rng()*256;g.fillRect(x,y,kind==='wood'?1+rng()*2:1+rng()*7,kind==='wood'||kind==='bark'?rng()*45:1+rng()*6);}if(kind==='rust'){for(let i=0;i<90;i++){g.fillStyle=`rgba(86,42,19,${rng()*.5})`;g.beginPath();g.ellipse(rng()*256,rng()*256,3+rng()*12,2+rng()*17,0,0,7);g.fill();}}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;return t;}
function merged(parts){const positions=[],normals=[],uvs=[],colors=[];for(let geo of parts){if(geo.index)geo=geo.toNonIndexed();for(let k of ['position','normal','uv','color']){let a=geo.attributes[k]?.array;if(!a)continue;(k==='position'?positions:k==='normal'?normals:k==='uv'?uvs:colors).push(...a);}}let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(normals.length===positions.length)g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));else g.computeVertexNormals();if(uvs.length===positions.length/3*2)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));if(colors.length===positions.length)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;}
export class BaseWorld{
 constructor(canvas,quality='balanced'){
  this.canvas=canvas;this.quality=quality;this.time=0;this.target=null;this.colliders=[];this.interact=[];this.pickups={};this.doors={};this.occluders=[];this.anim=[];this.flash=0;this.damage=0;this.projectiles=[];this.aim=0;this.crouch=0;this.torchOn=false;this.detectorOn=false;this.reducedMotion=false;
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.8:1.3));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;
  this.scene=new T.Scene();this.scene.background=new T.Color('#697570');this.scene.fog=new T.FogExp2('#697570',.025);
  this.camera=new T.PerspectiveCamera(74,1,.09,150);this.camera.rotation.order='YXZ';this.scene.add(this.camera);
  this.ambient=new T.HemisphereLight('#cbd6d1','#434638',1.05);this.scene.add(this.ambient);
  this.sun=new T.DirectionalLight('#d8ded1',1.05);this.sun.position.set(-25,35,15);this.scene.add(this.sun);
  this.materials={};this.textures={};this.loader=new T.TextureLoader();
  for(let kind of ['ground','wall','wood','bark']){
   this.textures[kind]=textureCanvas(kind);
   this.loader.load('./assets/textures/'+kind+'-colour.jpg',tx=>{tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());for(const m of Object.values(this.materials))if(m.userData.surface===kind&&!m.userData.surfaceLocked){const newMap=tx.clone();newMap.repeat.copy(m.map.repeat);newMap.needsUpdate=true;m.map=newMap;m.needsUpdate=true;}this.textures[kind]=tx;},undefined,()=>{});
  }
  this.rust=textureCanvas('rust');
  this.makeMaterials();this.buildGround();this.buildBase();this.buildHut();this.buildForest();this.buildRiver();this.buildAnomaly();this.buildWatcher();this.buildHand();this.optimiseStatic();this.loadBarrier();
  this.ray=new T.Raycaster();this.ray.far=42;this.v2=new T.Vector2();this.v3=new T.Vector3();this.tmp=new T.Vector3();
  window.addEventListener('resize',()=>this.resize());this.resize();
 }
 async loadBarrier(){
  try{const r=await fetch('./assets/barrier/model.json');if(!r.ok)return;const j=await r.json(),geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(j.position,3));geo.setAttribute('normal',new T.Float32BufferAttribute(j.normal,3));geo.setAttribute('uv',new T.Float32BufferAttribute(j.uv,2));geo.setIndex(j.index);geo.computeBoundingSphere();const material=new T.MeshStandardMaterial({color:'#aab0a2',roughness:1,metalness:0});
   const maps=await Promise.all(['colour','normal','arm'].map(k=>this.loader.loadAsync('./assets/barrier/'+k+'.jpg')));for(const tx of maps)tx.flipY=false;maps[0].colorSpace=T.SRGBColorSpace;material.map=maps[0];material.normalMap=maps[1];material.roughnessMap=maps[2];material.normalScale.set(.7,.7);
   for(const [x,z,rotation]of [[-3.5,-7,.12],[3.9,-10,-.2]]){const mesh=new T.Mesh(geo,material);mesh.position.set(x,.015,z);mesh.rotation.y=rotation;mesh.scale.setScalar(1.3);mesh.updateMatrixWorld();this.scene.add(mesh);this.occluders.push(mesh);this.colliders.push({x,z,w:2.05,d:.9});}this.barriersLoaded=true;
  }catch(e){console.warn('Optional barrier asset:',e.message);}
 }
 optimiseStatic(){
  this.scene.updateMatrixWorld(true);const groups=new Map();
  for(const m of [...this.scene.children])if(m.isMesh&&!m.isInstancedMesh&&!m.userData.interact&&m!==this.water&&m.material.isMeshStandardMaterial){let a=groups.get(m.material)||[];a.push(m);groups.set(m.material,a);}
  for(const [material,objects] of groups){if(objects.length<3)continue;const parts=objects.map(m=>m.geometry.clone().applyMatrix4(m.matrixWorld));const geo=merged(parts),mesh=new T.Mesh(geo,material);geo.computeBoundingSphere();this.scene.add(mesh);for(const m of objects)this.scene.remove(m);for(const g of parts)g.dispose();}
 }
 surface(kind,color,rx=1,ry=1){let tx=this.textures[kind].clone();tx.needsUpdate=true;tx.repeat.set(rx,ry);let m=new T.MeshStandardMaterial({color,map:tx,roughness:.96,metalness:0});m.userData.surface=kind;this.materials['s'+Object.keys(this.materials).length]=m;return m;}
 makeMaterials(){this.mat={concrete:this.surface('wall','#9c9b87',2,1),floor:this.surface('wall','#75786c',4,4),paint:this.surface('wall','#42544c',2,1),wood:this.surface('wood','#89775b',1,1),bark:this.surface('bark','#786a54',1,4),metal:new T.MeshStandardMaterial({color:'#68786e',map:this.rust,metalness:.25,roughness:.88}),black:new T.MeshStandardMaterial({color:'#202824',roughness:.7,metalness:.35}),cloth:this.surface('wall','#595e48',2,2),bed:new T.MeshStandardMaterial({color:'#757868',roughness:1}),brass:new T.MeshStandardMaterial({color:'#c09a54',roughness:.6,metalness:.55}),paper:this.surface('wall','#e0d6b7',1,1),leaf:new T.MeshStandardMaterial({color:'#3d4837',roughness:1,side:T.DoubleSide}),rock:this.surface('wall','#6b7062',1,1),white:new T.MeshStandardMaterial({color:'#d0ccba',roughness:.9}),red:new T.MeshStandardMaterial({color:'#6b3026',roughness:.85})};}
 box(w,h,d,x,y,z,mat=this.mat.concrete,parent=this.scene,solid=false){let m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);if(solid){this.colliders.push({x,z,w,d});this.occluders.push(m);}return m;}
 cylinder(rt,rb,h,x,y,z,mat,parent=this.scene,sides=9){let m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,sides),mat);m.position.set(x,y,z);parent.add(m);return m;}
 beam(a,b,r,mat,parent=this.scene){let start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);let m=this.cylinder(r,r,delta.length(),0,0,0,mat,parent,6);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
 label(text,w,h,color='#d4c6a0',bg='#303a32'){let c=document.createElement('canvas');c.width=512;c.height=128;let g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=3;g.strokeRect(8,8,496,112);g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.font='bold 43px monospace';g.fillText(text,256,65,470);let tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;let m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));return m;}
 addInteract(obj,type,id,label,anchor){const it={obj,type,id,label,name:label,anchor:new T.Vector3(...anchor)};obj.userData.interact=it;obj.traverse(c=>c.userData.interact=it);this.interact.push(it);return it;}
 buildGround(){let mat=this.surface('ground','#a1a18c',33,38);const floor=new T.Mesh(new T.PlaneGeometry(120,148,1,1),mat);floor.rotation.x=-Math.PI/2;floor.position.set(0,-.04,-35);this.scene.add(floor);
  // A physical dirt track provides continuous orientation, not a sequence of screens.
  const path=[];const points=[[0,-1],[0,-10],[3,-19],[7,-26],[6,-33],[0,-40],[-3,-48],[-5,-57],[-5,-65]];
  for(let i=1;i<points.length;i++){let a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);let m=new T.Mesh(new T.PlaneGeometry(3.4,len+.15),this.surface('ground','#b4a28b',1,len/3));m.rotation.set(-Math.PI/2,0,-Math.atan2(b[0]-a[0],b[1]-a[1]));m.position.set((a[0]+b[0])/2,.005,(a[1]+b[1])/2);this.scene.add(m);}
  let path2=new T.Mesh(new T.PlaneGeometry(2.4,11),this.surface('ground','#b2a08a',1,3));path2.rotation.x=-Math.PI/2;path2.rotation.z=-.78;path2.position.set(10,.01,-28);this.scene.add(path2);
 }
 door(id,x,z,face=0){let root=new T.Group();root.position.set(x-1,z===0?0:0,z);this.scene.add(root);let pivot=new T.Group();root.add(pivot);
  this.box(2,2.7,.12,1,1.35,0,this.mat.metal,pivot);this.box(.16,.23,.06,1.72,1.32,.095,this.mat.black,pivot);this.box(.22,.045,.05,1.67,1.34,.15,this.mat.brass,pivot);
  let plate=this.label(id==='exit'?'ВЫХОД / EXIT':'SURVEY 03',1.25,.31);plate.position.set(1,2.07,.075);pivot.add(plate);
  this.box(.16,2.9,.25,x-1.09,1.45,z,this.mat.black);this.box(.16,2.9,.25,x+1.09,1.45,z,this.mat.black);this.box(2.35,.13,.25,x,2.88,z,this.mat.black);
  let collider={x,z,w:2.15,d:.25,door:id};this.colliders.push(collider);this.doors[id]={root,pivot,closedMesh:pivot.children[0],collider,angle:0};this.occluders.push(pivot.children[0]);this.addInteract(pivot,'door',id,'Open door',[x,1.35,z]);
 }
 sealedDoor(x,z,rot,num){let g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;this.scene.add(g);this.box(1.85,2.65,.07,0,1.33,0,this.mat.metal,g);this.box(2,.09,.13,0,2.72,0,this.mat.black,g);this.box(.12,.15,.08,.68,1.3,.08,this.mat.black,g);const sign=this.label('СЕКТОР '+num,1.4,.29,'#bba675','#293c32');sign.position.set(0,2.03,.05);g.add(sign);this.addInteract(g,'sealed','sealed'+num,'Sealed wing '+num,[x,1.3,z]);}
 buildBase(){
  this.box(12.4,.18,14.4,0,-.1,7,this.mat.floor);
  this.box(.35,3.35,14.2,-6,1.65,7,this.mat.concrete,this.scene,true);this.box(.35,3.35,14.2,6,1.65,7,this.mat.concrete,this.scene,true);this.box(4.9,3.35,.35,-3.55,1.65,14,this.mat.concrete,this.scene,true);this.box(4.9,3.35,.35,3.55,1.65,14,this.mat.concrete,this.scene,true);this.box(2.2,.55,.35,0,3.08,14,this.mat.concrete);this.door('rear',0,14);
  this.box(4.9,3.35,.35,-3.55,1.65,0,this.mat.concrete,this.scene,true);this.box(4.9,3.35,.35,3.55,1.65,0,this.mat.concrete,this.scene,true);this.box(2.2,.55,.35,0,3.08,0,this.mat.concrete);
  this.box(12.4,.18,14.4,0,3.45,7,this.mat.concrete); // modest shelter, closed wings
  this.box(.035,1.05,14,-5.81,.52,7,this.mat.paint);this.box(.035,1.05,14,5.81,.52,7,this.mat.paint);this.box(12,1.05,.035,0,.52,13.81,this.mat.paint);
  this.door('exit',0,0);
  this.sealedDoor(-5.78,4.2,Math.PI/2,'02');this.sealedDoor(-5.78,7,Math.PI/2,'03');this.sealedDoor(5.78,11.8,-Math.PI/2,'04');this.sealedDoor(-2.5,13.78,Math.PI,'05');
  // Bunk: scratched steel frame, uneven blanket and pillow.
  this.box(2.05,.18,3,-3.9,.43,10,this.mat.black,this.scene,true);this.box(1.94,.25,2.9,-3.9,.63,10,this.mat.bed);this.box(1.94,.06,1.85,-3.9,.79,9.57,this.mat.cloth);this.box(1.3,.16,.48,-3.9,.85,11.06,this.mat.white);
  for(let x of [-4.85,-2.95])for(let z of [8.6,11.4])this.cylinder(.04,.04,.55,x,.22,z,this.mat.black);
  this.beam([-4.87,.6,11.43],[-4.87,1.1,11.43],.035,this.mat.black);this.beam([-2.93,.6,11.43],[-2.93,1.1,11.43],.035,this.mat.black);this.beam([-4.87,1.1,11.43],[-2.93,1.1,11.43],.035,this.mat.black);
  let bedHit=this.box(1.8,.05,2.8,-3.9,.8,10,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));this.addInteract(bedHit,'bed','bed','Rest and save',[-3.9,.8,10]);
  const worktop=this.table(3.6,4.7,2.7,1.35);this.addInteract(worktop,'bench','bench','Workbench',[3.6,.9,4.7]);this.table(3.7,9.6,2.4,1.2);
  this.radio=new T.Group();this.radio.position.set(3.7,.95,9.6);this.scene.add(this.radio);this.box(1.25,.55,.45,0,.275,0,this.mat.metal,this.radio);this.box(.48,.22,.025,-.19,.32,.24,this.mat.black,this.radio);
  for(let i=0;i<3;i++){let dial=this.cylinder(.065,.065,.04,.25+i*.13,.22,.255,this.mat.black,this.radio,12);dial.rotation.x=Math.PI/2;}
  let ledMat=new T.MeshBasicMaterial({color:'#bca35e'});this.radioLED=this.box(.28,.025,.02,-.2,.32,.26,ledMat,this.radio);this.addInteract(this.radio,'deliver','radio','Relay receiver',[3.7,1.2,9.6]);
  let note=this.label('RELAY / 07',1.3,.32,'#c5bba1','#3c453a');note.position.set(3.7,2.1,13.7);note.rotation.y=Math.PI;this.scene.add(note);
  this.box(.75,1.6,.65,4.85,.8,6.8,this.mat.metal,this.scene,true);for(let y of [.4,.8,1.2])this.box(.28,.035,.04,4.85,y,7.14,this.mat.black);
  // Exposed conduit and warm refuge lights.
  for(let z of [2.5,7.5,12.4]){this.cylinder(.05,.05,11.5,0,3.1,z,this.mat.black).rotation.z=Math.PI/2;const bulb=this.cylinder(.18,.18,.12,0,2.95,z,new T.MeshBasicMaterial({color:'#f7cd88'}));let lamp=new T.PointLight('#ffd492',9,9,2);lamp.position.set(0,2.7,z);this.scene.add(lamp);}
  this.box(1.4,.7,.14,-5.65,.65,12,this.mat.metal);for(let i=0;i<7;i++)this.box(.055,.6,.19,-6+ i*.18,.65,11.94,this.mat.black);
  // Low perimeter concrete slabs and two lanterns outside.
  for(let x of [-8,8]){this.box(.5,1,9,x,.5,-3.7,this.mat.concrete,this.scene,true);this.cylinder(.08,.08,3.7,x,1.85,-7.4,this.mat.black);let lamp=this.box(.38,.27,.4,x,3.5,-7.4,new T.MeshBasicMaterial({color:'#b9b49c'}));}
  let plaque=this.label('RELAY STATION',3,.6);plaque.position.set(0,3.14,-.21);plaque.rotation.y=Math.PI;this.scene.add(plaque);
 }
 table(x,z,w=2.4,d=1.1){let top=this.box(w,.13,d,x,.92,z,this.mat.wood);this.colliders.push({x,z,w,d});for(let dx of [-w/2+.12,w/2-.12])for(let dz of [-d/2+.1,d/2-.1])this.box(.07,.88,.07,x+dx,.44,z+dz,this.mat.black);return top;}
 buildHut(){this.box(8.5,.18,7.5,14,-.1,-31.5,this.mat.floor);this.box(.23,3.05,7.3,10,1.52,-31.5,this.mat.wood,this.scene,true);this.box(.23,3.05,7.3,18,1.52,-31.5,this.mat.wood,this.scene,true);this.box(8,3.05,.23,14,1.52,-35,this.mat.wood,this.scene,true);
  this.box(2.9,3.05,.23,11.45,1.52,-28,this.mat.wood,this.scene,true);this.box(2.9,3.05,.23,16.55,1.52,-28,this.mat.wood,this.scene,true);this.box(2.2,.25,.23,14,2.93,-28,this.mat.wood);
  let roof=this.box(8.9,.18,8,14,3.2,-31.5,this.mat.metal);roof.rotation.x=.055;
  this.door('hut',14,-28);
  this.table(16.8,-33,1.9,1.5);this.box(1.9,.08,1.2,12,.68,-33.7,this.mat.wood,this.scene,true);
  this.box(.9,1.8,.6,17.4,.9,-31.2,this.mat.metal,this.scene,true);
  this.box(.7,.07,.7,12,.42,-31.4,this.mat.wood);for(let dx of [-.27,.27])for(let dz of [-.27,.27])this.box(.04,.42,.04,12+dx,.2,-31.4+dz,this.mat.black);
  let light=new T.PointLight('#dfd3ab',7,9,2);light.position.set(14,2.5,-31);this.scene.add(light);
  let board=this.label('SURVEY / 03',2.4,.45,'#c5c0a5','#4b5144');board.position.set(14,2.65,-27.85);this.scene.add(board);
  // A half-buried supply cache along the path.
  this.box(1.7,.6,.9,-3.8,.3,-23,this.mat.wood,this.scene,true);this.box(1.8,.1,1,-3.8,.65,-23,this.mat.metal);
  let sign=this.label('SURVEY  →',1.6,.35,'#c7b07e','#4a4c3a');sign.position.set(5,1.45,-23);this.scene.add(sign);this.cylinder(.055,.055,1.4,5,.7,-23,this.mat.wood);
 }
 buildForest(){
  let positions=[];for(let i=0;i<430;i++){let x=(rng()-.5)*98,z=-rng()*96+15;let pathX=z>-12?0:z>-30?(z+12)*-.34:z>-48?(z+30)*.4: -5;let nearPath=Math.abs(x-pathX)<4.1&&z<0;let base=x>-9&&x<9&&z>-11;let hut=x>7&&x<22&&z>-40&&z<-22;let an=Math.hypot(x+11,z+48)<6;let river=z<-59&&z>-68;let cache=Math.hypot(x+3.8,z+23)<3;if(nearPath||base||hut||an||river||cache)continue;positions.push([x,z,.72+rng()*.6,rng()*6.28,rng()]);}
  const trunkGeo=new T.CylinderGeometry(.095,.27,10,7,1),trunks=new T.InstancedMesh(trunkGeo,this.mat.bark,positions.length);
  const obj=new T.Object3D();positions.forEach(([x,z,sc,rot],i)=>{obj.position.set(x,sc*5,z);obj.scale.set(sc,sc,sc);obj.rotation.set(0,rot,(rng()-.5)*.03);obj.updateMatrix();trunks.setMatrixAt(i,obj.matrix);this.colliders.push({x,z,r:.28*sc});});this.scene.add(trunks);
  // Individual sprays make irregular, three-dimensional boughs rather than flat background cards.
  const foliage=[],uv=[];
  for(let layer=0;layer<10;layer++){let y=3.1+layer*.73,rad=2.5*(1-layer/11);for(let branch=0;branch<7;branch++){
   const angle=branch/7*Math.PI*2+layer*1.41,len=rad*(.7+rng()*.4),dx=Math.cos(angle),dz=Math.sin(angle);
   for(let plane=0;plane<2;plane++){
    const side=plane?new T.Vector3(dx*.33,.8,dz*.33):new T.Vector3(-dz,0,dx);side.multiplyScalar(len*.48);
    const origin=new T.Vector3(0,y+.15,0),tip=new T.Vector3(dx*len,y-len*.27,dz*len);
    const corners=[origin.clone().addScaledVector(side,-.25),origin.clone().addScaledVector(side,.25),tip.clone().add(side),tip.clone().sub(side)];
    for(const i of [0,1,2,0,2,3]){foliage.push(...corners[i].toArray());uv.push(...[[0,0],[1,0],[1,1],[0,1]][i]);}
   }
  }}
  let fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(foliage,3));fg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));fg.computeVertexNormals();
  const fm=new T.MeshStandardMaterial({color:'#8b9586',side:T.DoubleSide,roughness:1,alphaTest:.35});
  this.loader.load('./assets/textures/pine.webp',tx=>{tx.colorSpace=T.SRGBColorSpace;fm.map=tx;fm.needsUpdate=true;});
  let leaves=new T.InstancedMesh(fg,fm,positions.length);positions.forEach(([x,z,sc,rot],i)=>{obj.position.set(x,0,z);obj.scale.set(sc,sc,sc);obj.rotation.set(0,rot,0);obj.updateMatrix();leaves.setMatrixAt(i,obj.matrix);});this.scene.add(leaves);
  // Cheap soft grounding instead of expensive realtime shadow maps on phones.
  const shadeCanvas=document.createElement('canvas');shadeCanvas.width=shadeCanvas.height=64;const sh=shadeCanvas.getContext('2d'),grad=sh.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(7,12,7,.4)');grad.addColorStop(.4,'rgba(7,12,7,.2)');grad.addColorStop(1,'rgba(7,12,7,0)');sh.fillStyle=grad;sh.fillRect(0,0,64,64);
  const shadowGeo=new T.PlaneGeometry(4,4);shadowGeo.rotateX(-Math.PI/2);const shadowMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadeCanvas),transparent:true,depthWrite:false});const shadows=new T.InstancedMesh(shadowGeo,shadowMat,positions.length);
  positions.forEach(([x,z,sc,rot],i)=>{obj.position.set(x,.001,z);obj.scale.set(sc,sc,sc);obj.rotation.set(0,rot,0);obj.updateMatrix();shadows.setMatrixAt(i,obj.matrix)});this.scene.add(shadows);
  // Fallen branches and stones are instanced, keeping draw calls bounded on iPad.
  let rg=new T.IcosahedronGeometry(1,1),rocks=new T.InstancedMesh(rg,this.mat.rock,70);for(let i=0;i<70;i++){let x=(rng()-.5)*80,z=-rng()*76-2;obj.position.set(x,.12,z);obj.scale.set(.25+rng()*.9,.18+rng()*.6,.3+rng());obj.rotation.set(rng(),rng()*6,rng());obj.updateMatrix();rocks.setMatrixAt(i,obj.matrix);}this.scene.add(rocks);
  let branchGeo=new T.CylinderGeometry(.04,.09,2,5),branches=new T.InstancedMesh(branchGeo,this.mat.bark,90);for(let i=0;i<90;i++){obj.position.set((rng()-.5)*90,.07,-rng()*84);obj.scale.set(1,.5+rng(),1);obj.rotation.set(Math.PI/2,0,rng()*6);obj.updateMatrix();branches.setMatrixAt(i,obj.matrix);}this.scene.add(branches);
  // Narrow birches punctuate the pines and remain recognisable landmarks.
  const birch=this.surface('bark','#d4d3b9',1,4);for(let i=0;i<18;i++){let x=(rng()-.5)*70,z=-rng()*65-8;if(Math.abs(x)<6||Math.hypot(x-14,z+31)<9)continue;const h=8+rng()*5;this.cylinder(.06,.17,h,x,h/2,z,birch);for(let b=0;b<3;b++){let ang=rng()*6.28;this.beam([x,h*.6+b*.7,z],[x+Math.cos(ang)*2,h*.8+b*.8,z+Math.sin(ang)*2],.045,birch);}}
  this.loader.load('./assets/textures/ferns.webp',tx=>{tx.colorSpace=T.SRGBColorSpace;let mat=new T.MeshStandardMaterial({map:tx,alphaTest:.45,side:T.DoubleSide,color:'#a4aa90',roughness:1});let g=new T.PlaneGeometry(1.8,.9);g.translate(0,.4,0);let geo=merged([g,g.clone().rotateY(Math.PI/2)]);let f=new T.InstancedMesh(geo,mat,170);for(let i=0;i<170;i++){let p=positions[i%positions.length];obj.position.set(p[0]+(rng()-.5)*2,0,p[1]+(rng()-.5)*2);let s=.7+rng()*.9;obj.scale.set(s,s,s);obj.rotation.set(0,rng()*6,0);obj.updateMatrix();f.setMatrixAt(i,obj.matrix);}this.scene.add(f)},undefined,()=>{});
  this.treeCount=positions.length;
 }
 buildRiver(){
  const geo=new T.PlaneGeometry(110,6.6,1,1);geo.rotateX(-Math.PI/2);let mat=new T.ShaderMaterial({uniforms:{time:{value:0},fogColor:{value:this.scene.fog.color},fogDensity:{value:.025}},vertexShader:'varying vec2 vUv;varying float depth;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.0);depth=-mv.z;gl_Position=projectionMatrix*mv;}',fragmentShader:'uniform float time;uniform vec3 fogColor;uniform float fogDensity;varying vec2 vUv;varying float depth;void main(){float r=sin(vUv.x*300.+vUv.y*65.+time*.9)*sin(vUv.y*120.-time*.6);vec3 c=vec3(.20,.27,.27)+r*.035;float fog=1.-exp(-fogDensity*fogDensity*depth*depth);gl_FragColor=vec4(mix(c,fogColor,fog),1.);}'});this.water=new T.Mesh(geo,mat);this.water.position.set(0,-.025,-63.5);this.scene.add(this.water);
  for(let z of [-60,-67])this.box(110,.12,.6,0,-.02,z,this.mat.rock);
  this.box(3,.18,9,-5,.09,-63.5,this.mat.wood);for(let x of [-6.4,-3.6]){this.beam([x,.85,-59],[x,.85,-68],.055,this.mat.wood);for(let z of [-59,-62,-65,-68])this.cylinder(.055,.06,.85,x,.42,z,this.mat.wood);}
 }
 buildAnomaly(){const g=new T.Group();g.position.set(-11,0,-48);this.scene.add(g);this.anomaly=g;const mat=new T.MeshBasicMaterial({color:'#89bcc0',transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false});let ring=new T.Mesh(new T.RingGeometry(2.2,2.26,48),mat);ring.rotation.x=-Math.PI/2;ring.position.y=.04;g.add(ring);this.anomalyRing=ring;
  const points=[];for(let i=0;i<48;i++){let a=rng()*6.28,r=.4+rng()*2;points.push(Math.cos(a)*r,rng()*2.8,Math.sin(a)*r)}let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));this.anomalyDust=new T.Points(geo,new T.PointsMaterial({color:'#b2d4ce',size:.045,transparent:true,opacity:.6,depthWrite:false}));g.add(this.anomalyDust);
  this.box(.7,.08,.6,-11,.02,-48,this.mat.rock);
 }
 buildWatcher(){const g=new T.Group();this.scene.add(g);this.enemyGroup=g;const m=new T.MeshStandardMaterial({color:'#192220',roughness:.88,metalness:.15});const head=this.cylinder(.16,.12,.37,0,1.8,0,m,g,7);this.box(.5,.75,.28,0,1.25,0,m,g);this.enemyParts=[];for(let side of [-1,1]){let leg=this.box(.16,.8,.18,side*.15,.52,0,m,g);this.enemyParts.push(leg);let arm=this.box(.13,.82,.15,side*.37,1.15,0,m,g);arm.rotation.z=side*.11;this.enemyParts.push(arm);}
  let eyeMat=new T.MeshBasicMaterial({color:'#c5b580'});this.box(.14,.018,.02,0,1.84,.165,eyeMat,g);g.userData.enemy=true;g.traverse(o=>o.userData.enemy=true);g.position.set(5,0,-43);
 }
 gunModel(parent,scale=1){const group=new T.Group();parent.add(group);this.box(.14,.13,.36,0,0,-.07,this.mat.black,group);this.box(.075,.04,.12,0,.086,-.18,this.mat.metal,group);this.box(.1,.22,.12,0,-.16,.05,this.mat.wood,group).rotation.x=-.15;let barrel=this.cylinder(.027,.027,.12,0,-.025,-.28,this.mat.black,group,12);barrel.rotation.x=Math.PI/2;this.box(.022,.028,.025,0,.09,-.22,this.mat.black,group);this.box(.085,.015,.04,0,.09,.06,this.mat.black,group);group.scale.setScalar(scale);return group;}
 buildHand(){this.hands=new T.Group();this.camera.add(this.hands);this.heldGun=this.gunModel(this.hands,1);this.hands.position.set(.26,-.23,-.48);
  const glove=new T.MeshStandardMaterial({color:'#4e5147',roughness:1});this.box(.12,.13,.18,.015,-.13,.12,glove,this.hands);const sleeve=this.cylinder(.065,.1,.44,.05,-.2,.31,this.mat.cloth,this.hands);sleeve.rotation.x=-1.1;
  this.muzzle=new T.Mesh(new T.SphereGeometry(.045,5,4),new T.MeshBasicMaterial({color:'#ffe1a4',transparent:true,opacity:.9}));this.muzzle.position.set(0,0,-.37);this.muzzle.visible=false;this.hands.add(this.muzzle);
  this.flashlight=new T.SpotLight('#e6e5cf',0,29,.35,.65,1.5);this.flashlight.position.set(.16,-.1,-.2);this.camera.add(this.flashlight);const target=new T.Object3D();target.position.set(0,0,-12);this.camera.add(target);this.flashlight.target=target;
 }
 lootModel(kind){let g=new T.Group();if(kind==='gun'){this.gunModel(g,.9).rotation.set(Math.PI/2,0,.3);}else if(kind==='magazine'){this.box(.08,.05,.23,0,.035,0,this.mat.black,g);for(let i=0;i<4;i++)this.box(.014,.004,.015,.041,.045,-.09+i*.045,this.mat.brass,g);}else if(kind==='ammo'){this.box(.28,.14,.18,0,.07,0,this.mat.paper,g);let l=this.label('9 x 18',.24,.09,'#282f27','#b9a478');l.position.set(0,.09,.095);g.add(l);}else if(kind==='food'){this.cylinder(.1,.1,.2,0,.1,0,this.mat.metal,g,16);this.cylinder(.101,.101,.02,0,.2,0,this.mat.black,g,16);}else if(kind==='recorder'){this.box(.24,.10,.39,0,.05,0,this.mat.black,g);this.box(.16,.015,.16,0,.11,-.025,this.mat.metal,g);for(let x of [-.05,.05])this.cylinder(.035,.035,.016,x,.125,-.03,this.mat.white,g,12);this.box(.05,.014,.05,.05,.12,.12,this.mat.red,g);}else if(kind==='shard'){let m=new T.Mesh(new T.OctahedronGeometry(.20,0),new T.MeshStandardMaterial({color:'#d1b26a',emissive:'#a05c12',emissiveIntensity:1.15,roughness:.3,metalness:.3}));m.position.y=.25;g.add(m);}else if(kind==='coat'){this.box(.5,.1,.54,0,.05,0,this.mat.cloth,g);this.box(.22,.1,.2,.27,.03,0,this.mat.cloth,g);}else if(kind==='med'){this.box(.2,.08,.17,0,.04,0,this.mat.white,g);this.box(.14,.003,.034,0,.083,0,this.mat.red,g);this.box(.035,.003,.13,0,.085,0,this.mat.red,g);}else{this.box(.18,.035,.25,0,.02,0,this.mat.paper,g);this.box(.025,.037,.25,-.08,.023,0,this.mat.wood,g);}return g;}
 populateLoot(loot){if(this.lootReady)return;this.lootReady=true;for(const [id,item] of Object.entries(loot)){let g=this.lootModel(item.kind);let y=id.startsWith('hut_')?(id==='hut_food'?.74:id==='hut_med'?1.85:.995):id.startsWith('cache')?.72:id==='coat'?.51:id==='shard'?.04:.995;g.position.set(item.x,y,item.z);this.scene.add(g);this.pickups[id]=g;this.addInteract(g,'pickup',id,item.name,[item.x,y+.1,item.z]);}}
 updateState(s,loot){this.state=s;this.populateLoot(loot);for(const [id,g] of Object.entries(this.pickups))g.visible=!s.taken.includes(id);for(const [id,d]of Object.entries(this.doors)){d.collider.off=s.doors[id];d.closedMesh.userData.open=s.doors[id];}this.hands.visible=s.weapon.owned;this.enemyGroup.visible=s.enemy.health>0;if(!this.enemyTarget){this.enemyGroup.position.set(s.enemy.x,0,s.enemy.z);this.enemyTarget=new T.Vector3();}this.enemyTarget.set(s.enemy.x,0,s.enemy.z);this.enemyGroup.lookAt(s.player.x,0,s.player.z);if(s.quest==='done')this.radioLED.material.color.set('#a8cd8c');
  if(s.corpse){if(!this.bagMesh){this.bagMesh=this.box(.6,.4,.45,s.corpse.x,.22,s.corpse.z,this.mat.cloth);this.addInteract(this.bagMesh,'recover','corpse','Recover field pack',[s.corpse.x,.4,s.corpse.z]);}this.bagMesh.visible=true;this.bagMesh.position.set(s.corpse.x,.22,s.corpse.z);this.bagMesh.userData.interact.anchor.set(s.corpse.x,.4,s.corpse.z);}else if(this.bagMesh)this.bagMesh.visible=false;
 }
 movePlayer(p,dx,dz){const result={...p};const radius=.29;const blocked=(x,z)=>{if(x < -47||x>47||z < -78||z>16.5)return true;if(z<-60.2&&z>-67.1&&(x<-6.28||x>-3.72))return true;return this.colliders.some(c=>!c.off&&(c.r?Math.hypot(x-c.x,z-c.z)<c.r+radius:Math.abs(x-c.x)<c.w/2+radius&&Math.abs(z-c.z)<c.d/2+radius));};const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));for(let i=0;i<steps;i++){if(!blocked(result.x+dx/steps,result.z))result.x+=dx/steps;if(!blocked(result.x,result.z+dz/steps))result.z+=dz/steps;}return result;}
 rayAt(x=0,y=0){this.ray.setFromCamera(new T.Vector2(x,y),this.camera);return this.ray;}
 syncPose(p){this.camera.position.set(p.x,1.67-this.crouch*.52,p.z);this.camera.rotation.set(p.pitch,p.yaw,0,'YXZ');this.camera.updateMatrixWorld();}
 select(x=0,y=0){this.camera.updateMatrixWorld();this.scene.updateMatrixWorld();this.rayAt(x,y);const candidates=this.interact.filter(it=>this.visible(it.obj)).map(it=>it.obj);const hits=this.ray.intersectObjects(candidates,true);let exact=null;for(const h of hits){if(h.distance>3.2)break;const it=h.object.userData.interact;if(it&&!this.blockedRay(h.point,h.distance,it.obj)){exact=it;break;}}
  if(exact&&exact.type!=='bench')return exact;
  // A small physical aim tolerance makes tiny magazines usable by a fingertip.
  let best=null,score=Infinity;for(const it of this.interact){if(it.type!=='pickup'||!this.visible(it.obj))continue;const delta=it.anchor.clone().sub(this.camera.position),along=delta.dot(this.ray.ray.direction),dist=delta.length();if(along<=0||dist>3.1)continue;const off=this.ray.ray.distanceSqToPoint(it.anchor);if(off<Math.pow(.11+dist*.025,2)&&off<score&&!this.blockedRay(it.anchor,dist,it.obj)){best=it;score=off;}}
  return best||exact;
 }
 visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
 blockedRay(point,dist,exclude=null){const hits=this.ray.intersectObjects(this.occluders.filter(o=>this.visible(o)&&!o.userData.open),false);return hits.some(h=>h.distance<dist-.12&&h.object!==exclude&&!this.ancestor(h.object,exclude));}
 ancestor(o,parent){for(let p=o;p;p=p.parent)if(p===parent)return true;return false;}
 shot(){this.rayAt();let hits=this.ray.intersectObject(this.enemyGroup,true);let hit=this.enemyGroup.visible&&hits.length&&hits[0].distance<42&&!this.blockedRay(hits[0].point,hits[0].distance);this.flash=.07;this.muzzle.visible=true;return !!hit;}
 lineOfSightToEnemy(p){const origin=new T.Vector3(p.x,1.5,p.z),dest=this.enemyGroup.position.clone().add(new T.Vector3(0,1.3,0)),dist=origin.distanceTo(dest);const r=new T.Raycaster(origin,dest.sub(origin).normalize(),0,dist);return !r.intersectObjects(this.occluders.filter(o=>!o.userData.open),false).length;}
 throwProbe(){const g=new T.Mesh(new T.SphereGeometry(.035,5,4),this.mat.metal);g.position.copy(this.camera.position);let direction=new T.Vector3(0,.12,-1).applyQuaternion(this.camera.quaternion).normalize();this.projectiles.push({mesh:g,v:direction.multiplyScalar(11),life:0});this.scene.add(g);}
 environment(p){let indoor=(-6<p.x&&p.x<6&&0<p.z&&p.z<14)||(10<p.x&&p.x<18&&-35<p.z&&p.z<-28);let ad=Math.hypot(p.x+11,p.z+48);return {area:indoor?'base':ad<14?'anomaly':p.z<-40?'deep':'forest',indoor,river:clamp(1-Math.abs(p.z+63.5)/14,0,1)};}
 frame(p,dt,{aim=false,crouch=false,torch=false,detector=false,active=false}={}){this.time+=dt;this.aim+=(Number(aim)-this.aim)*Math.min(1,dt*11);this.crouch+=(Number(crouch)-this.crouch)*Math.min(1,dt*10);this.camera.position.set(p.x,1.67-this.crouch*.52,p.z);this.camera.rotation.set(p.pitch,p.yaw,0,'YXZ');const fov=74-this.aim*19;if(Math.abs(this.camera.fov-fov)>.01){this.camera.fov=fov;this.camera.updateProjectionMatrix();}this.hands.position.set(.26*(1-this.aim),-.23+this.aim*.045,-.48+this.aim*.08);this.hands.rotation.z=0;
  if(this.flash>0){this.flash-=dt;this.hands.position.z+=this.flash*.24;this.muzzle.visible=this.flash>0;}
  for(const [id,d]of Object.entries(this.doors)){let goal=this.state?.doors[id]?-Math.PI*.58:0;d.angle+=(goal-d.angle)*Math.min(1,dt*9);d.pivot.rotation.y=d.angle;}
  this.flashlight.intensity=torch?22:0;
  this.water.material.uniforms.time.value=this.time;
  this.anomalyDust.rotation.y=this.time*.08;this.anomalyDust.position.y=Math.sin(this.time*.45)*.12;
  let revealed=this.state&&this.state.clock<this.state.anomalyUntil;this.anomalyRing.material.opacity=revealed?.7:.08;this.anomalyRing.material.color.set(revealed?'#b8d7bb':'#89bcc0');
  if(this.pickups.shard&&!this.reducedMotion){this.pickups.shard.rotation.y=this.time*.35;this.pickups.shard.position.y=.25+Math.sin(this.time)*.045;}
  if(active){let n=0;for(const part of this.enemyParts)part.rotation.x=Math.sin(this.time*4+(n++%2)*Math.PI)*.10;}
  for(let i=this.projectiles.length-1;i>=0;i--){let b=this.projectiles[i];b.life+=dt;b.v.y-=9.8*dt;b.mesh.position.addScaledVector(b.v,dt);if(b.mesh.position.y<.04){b.mesh.position.y=.04;b.v.multiplyScalar(0);}if(b.life>3){this.scene.remove(b.mesh);b.mesh.geometry.dispose();this.projectiles.splice(i,1);}}
  if(this.enemyTarget)this.enemyGroup.position.lerp(this.enemyTarget,Math.min(1,dt*14));this.renderer.render(this.scene,this.camera);
 }
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 setQuality(q){this.quality=q;this.renderer.setPixelRatio(Math.min(devicePixelRatio,q==='low'?.85:q==='high'?1.8:1.3));this.resize();}
 info(){return {calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,trees:this.treeCount,scannedBarriers:!!this.barriersLoaded,textures:this.renderer.info.memory.textures};}
}
