import * as T from './vendor/three.js';
import {World as PinesWorld,DATA} from './world-v6.js';
import {terrainHeight,zoneAt} from './terrain.js';
import {AssetLibrary} from './asset-library.js';
export {DATA};
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
function merge(parts){const p=[],n=[],uv=[];for(let g of parts){if(g.index)g=g.toNonIndexed();for(const v of g.attributes.position.array)p.push(v);for(const v of g.attributes.normal?.array||[])n.push(v);for(const v of g.attributes.uv?.array||[])uv.push(v);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));if(n.length===p.length)g.setAttribute('normal',new T.Float32BufferAttribute(n,3));else g.computeVertexNormals();if(uv.length===p.length/3*2)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;}
export class World extends PinesWorld {
 constructor(canvas,quality='balanced'){
  super(canvas,quality);this.importedProps=[];this.assetErrors=[];this.fixtureStates=[];this.decorGroups=[];this.library=new AssetLibrary();this.surfaceImages={};this.fixtureBindings=[];this.baseRadioPosition={x:-487,y:1.4,z:14};this.industrialBuild='7.0';
  this.renderer.shadowMap.enabled=quality!=='low';this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.camera.far=480;this.camera.updateProjectionMatrix();
  this.scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material?.transparent){o.castShadow=true;o.receiveShadow=true;}});
  this.buildDrainGrilles();this.buildBaseServices();this.buildRouteMarkings();this.buildLockers();this.buildCamp();this.buildMountainBoundary();this.buildFixtureVisuals();this.makeShadowLight();
  for(const m of this.terrainChunks)m.userData.terrain=true;this.v7Ready=this.loadAssets();
 }
 box(w,h,d,x,y,z,mat=this.mat?.concrete,parent=this.scene,solid=false){
  // Do not cover the actual drain cavities with the original full-width floor.
  if(w===6&&h===.16&&d===46&&x===-500&&Math.abs(y+.09)<.001){const group=new T.Group();group.userData={zone:'base',keep:true};this.scene.add(group);for(const[a,b]of [[-3,-2.35],[-1.95,1.95],[2.35,3]])super.box(b-a,h,d,-500+(a+b)/2,y,z,mat,parent,false);return group;}
  const m=super.box(w,h,d,x,y,z,mat,parent,solid);if(parent===this.scene&&mat?.userData.surface&&m.geometry){const a=m.geometry.attributes.position,n=m.geometry.attributes.normal,uv=m.geometry.attributes.uv;const repeat=mat.map?.repeat||{x:1,y:1};for(let i=0;i<a.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));let u,v;if(ny>.5){u=a.getX(i)+x;v=a.getZ(i)+z;}else if(nx>.5){u=a.getZ(i)+z;v=a.getY(i)+y;}else{u=a.getX(i)+x;v=a.getY(i)+y;}uv.setXY(i,u/(1.7*repeat.x),v/(1.7*repeat.y));}uv.needsUpdate=true;}m.castShadow=true;m.receiveShadow=true;return m;
 }
 group(zone='base'){const g=new T.Group();g.userData={zone,keep:true};g.visible=zone===this.currentZone;this.scene.add(g);(this.decorGroups||=[]).push(g);return g;}
 partsMesh(parts,mat,parent){if(!parts.length)return null;const mesh=new T.Mesh(merge(parts),mat);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 cubePart(w,h,d,x,y,z){const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);return g;}
 buildDrainGrilles(){
  const group=this.group(),iron=new T.MeshStandardMaterial({color:'#55544b',roughness:.78,metalness:.7}),dark=new T.MeshStandardMaterial({color:'#1a201b',roughness:1});const steel=[],bottom=[];
  for(const x of [-502.15,-497.85]){
   bottom.push(this.cubePart(.4,.025,45.6,x,-.36,23));for(const side of [-1,1]){bottom.push(this.cubePart(.025,.34,45.6,x+side*.20,-.18,23));steel.push(this.cubePart(.035,.035,45.6,x+side*.18,-.003,23));}
   for(let z=.35;z<45.7;z+=.115)steel.push(this.cubePart(.365,.035,.025,x,.002,z));
   for(let z=.5;z<45.7;z+=1.2)steel.push(this.cubePart(.39,.045,.035,x,-.004,z));
  }
  this.partsMesh(bottom,dark,group);this.partsMesh(steel,iron,group);this.drainGeometry={channels:2,length:45.6,bars:steel.length,depth:.36,physicalVoid:true};
 }
 buildBaseServices(){
  const group=this.group(),metal=this.mat.metal,black=this.mat.black;const pipes=[],trim=[];
  // Branch pipes and brackets are real geometry. Licensed modules form the main runs.
  for(const z of [4,14,20,31,43]){for(const x of [-502.75,-497.25]){const c=new T.CylinderGeometry(.10,.10,2.1,12);c.translate(x,1.75,z);pipes.push(c);for(const y of [.85,2.55]){const t=new T.TorusGeometry(.115,.014,5,12);t.rotation=0;t.rotateX(Math.PI/2);t.translate(x,y,z);trim.push(t);}}}
  this.partsMesh(pipes,new T.MeshStandardMaterial({color:'#735544',metalness:.72,roughness:.72}),group);this.partsMesh(trim,black,group);
  // Suspended cable trays, wall shelf brackets, and hanging service leads.
  const tray=[];for(const z of [7,19,31,42])for(let k=-2;k<=2;k++){tray.push(this.cubePart(4.6,.025,.025,-500,3.02+k*.035,z));}this.partsMesh(tray,metal,group);
  for(const [x,z]of [[-502.55,17],[-497.45,32]])for(let i=0;i<3;i++){const curve=new T.CatmullRomCurve3([new T.Vector3(x,2.9,z-3),new T.Vector3(x+.05,2.63-i*.035,z-1),new T.Vector3(x+.08,2.58-i*.035,z+1),new T.Vector3(x,2.84,z+3)]);const m=new T.Mesh(new T.TubeGeometry(curve,24,.012,5,false),black);group.add(m);}
  // Wall-mounted shelves: no collisions in the walking route.
  this.shelfSpots=[[-516.5,1.85,37.0,Math.PI/2],[-514,1.9,6.3,0],[-489,1.8,5.4,0],[-486,1.9,31.65,Math.PI],[-514,1.8,20.35,0]];
  for(const[x,y,z,rot]of this.shelfSpots){const sh=new T.Group();sh.position.set(x,y,z);sh.rotation.y=rot;group.add(sh);this.box(2.3,.08,.38,0,0,0,this.mat.wood,sh);for(const xx of [-.8,.8]){this.box(.035,.40,.035,xx,-.18,-.14,metal,sh);this.beam([xx,-.37,-.14],[xx,-.04,.16],.018,metal,sh);}}
  // Radiators under the room's shelving, plus louvred physical wall vents.
  const ribs=[];for(let i=0;i<13;i++)ribs.push(this.cubePart(.065,.65,.18,-516.55,.55,40.2+i*.11));this.partsMesh(ribs,metal,group);
  this.radioTable=this.table(-487,14,1.65,.8);const hit=this.box(.85,.54,.38,-487,1.22,14,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.userData.keep=true;this.addInteract(hit,'music-radio','base_music_radio','Canteen radio · switch on / off',[-487,1.3,14]);this.radioInteract=hit.userData.interact;this.radioLED7=this.box(.035,.035,.018,-486.66,1.23,13.68,new T.MeshBasicMaterial({color:'#a8bb70'}));
 }
 buildRouteMarkings(){
  const group=this.group(),colours={blue:'#507f9d',red:'#a95345',green:'#69967a',amber:'#b19358'},routes=[['blue',-501.05,1,44,-500],['red',-500.65,1,25,-511],['green',-500.25,1,11,-510],['amber',-499.85,1,27,-486]];
  for(const[k,x,z0,z1,tx]of routes){const mat=new T.MeshStandardMaterial({color:colours[k],roughness:.97,polygonOffset:true,polygonOffsetFactor:-2});const parts=[];for(let z=z0;z<z1;z+=.65)parts.push(this.cubePart(.075,.005,.60,x,.012,z+.3));const n=Math.ceil(Math.abs(tx-x)/.65);for(let i=0;i<n;i++){const xx=x+(tx-x)*(i+.5)/n;parts.push(this.cubePart(Math.abs(tx-x)/n-.025,.005,.075,xx,.012,z1));}this.partsMesh(parts,mat,group);for(const z of [6,18,34].filter(z=>z<z1)){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-.15,.018,z-.1,x+.15,.018,z-.1,x,.018,z+.24],3));g.computeVertexNormals();group.add(new T.Mesh(g,mat));}}
 }
 buildLockers(){
  const group=this.group(),paint=new T.MeshStandardMaterial({color:'#59695a',map:this.rust,metalness:.45,roughness:.88}),ribs=[];
  // Six slim, vented metal lockers in the workshop and otherwise empty corners.
  for(const[x,z,rot]of [[-483.6,24.3,-Math.PI/2],[-483.6,25.0,-Math.PI/2],[-483.6,25.7,-Math.PI/2],[-507,44.45,Math.PI],[-506.3,44.45,Math.PI],[-505.6,44.45,Math.PI]]){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;group.add(g);this.box(.62,1.95,.48,0,1,0,paint,g);this.box(.54,1.8,.035,0,1,.26,paint,g);for(const y of [.34,1.64])for(let k=0;k<5;k++){this.box(.35,.018,.035,0,y+k*.055,.285,this.mat.black,g);}this.box(.035,.17,.06,.17,1.05,.31,this.mat.brass,g);this.box(.16,.07,.01,0,1.42,.29,this.mat.paper,g);}
 }
 buildFixtureVisuals(){
  this.fixtureBindings=[];const group=this.group(),tubeMat=()=>new T.MeshStandardMaterial({color:'#c8d6cb',emissive:'#bddacf',emissiveIntensity:1.8,roughness:.4});
  for(const l of this.lamps){l.fixtureID='lamp-'+this.lamps.indexOf(l);l.v7Level=1;const p=l.position;
   if(l.zone==='base'&&Math.abs(p.x+500)<.01&&p.y>2.9){const m=tubeMat(),f=new T.Group();f.position.set(p.x,3.24,p.z);group.add(f);this.box(1.85,.10,.38,0,.02,0,this.mat.metal,f);for(const z of [-.10,.10]){const tube=this.cylinder(.038,.038,1.58,0,-.055,z,m,f,12);tube.rotation.z=Math.PI/2;}for(const x of [-.9,.9])this.box(.10,.12,.44,x,-.02,0,this.mat.black,f);for(let x=-.8;x<=.8;x+=.2)this.beam([x,-.13,-.22],[x,-.13,.22],.009,this.mat.black,f);l.v7Material=m;l.ballast=true;this.fixtureBindings.push(l);}
  }
 }
 makeShadowLight(){this.contactSpot=new T.SpotLight('#e8d5aa',0,13,.95,.55,1.5);this.contactSpot.castShadow=true;this.contactSpot.shadow.mapSize.set(512,512);this.contactSpot.shadow.bias=-.0004;this.contactSpot.shadow.normalBias=.025;this.contactSpot.userData.global=true;this.scene.add(this.contactSpot);this.contactSpot.target.userData.global=true;this.scene.add(this.contactSpot.target);}
 updateLightField(p,zone){
  const now=this.time;this.fixtureStates=[];const nearby=[];
  for(const l of this.lamps){const period=15+(l.seed||0)*1.8,phase=(now+(l.seed||0)*5)%period;const level=l.flicker&&!this.reducedMotion?(phase<.18?.24:1):1;l.v7Level=level;if(l.v7Material){l.v7Material.emissiveIntensity=1.55*level;l.v7Material.color.setScalar(.6+.4*level);}if(l.zone===zone){const d=l.position.distanceToSquared(this.camera.position);nearby.push({l,d});if(d<250)this.fixtureStates.push({id:l.fixtureID||'lamp-'+this.lamps.indexOf(l),x:l.position.x,y:l.position.y,z:l.position.z,level,ballast:!!l.ballast,fault:level<.5});}}
  nearby.sort((a,b)=>a.d-b.d);this.lightPool.forEach((light,i)=>{const q=nearby[i];if(!q||q.d>400){light.intensity=0;return;}light.position.copy(q.l.position);light.color.set(q.l.colour);light.intensity=q.l.intensity*q.l.v7Level;light.distance=zone==='field'?13:12;});
  if(this.contactSpot){this.contactSpot.castShadow=this.quality!=='low'&&zone==='base';const chosen=nearby.find(q=>q.l.position.y>(p.y||0)+2&&q.d<90);this.contactSpot.intensity=chosen&&zone==='base'&&this.quality!=='low'?chosen.l.intensity*.38*chosen.l.v7Level:0;if(chosen){this.contactSpot.position.copy(chosen.l.position);this.contactSpot.target.position.set(chosen.l.position.x,0,chosen.l.position.z);this.contactSpot.color.set(chosen.l.colour);}}
 }
 buildCamp(){const group=this.group('field'),canvas=new T.MeshStandardMaterial({color:'#616c48',map:this.rust,roughness:1,side:T.DoubleSide});
  for(const[x,z,yaw]of [[-151,-260,-.3],[-140,-268,.5],[-145,-254,2.7]]){const g=new T.Group();g.position.set(x,terrainHeight(x,z),z);g.rotation.y=yaw;group.add(g);const pos=[-1.7,0,-2,0,1.8,-2,0,1.8,2,-1.7,0,-2,0,1.8,2,-1.7,0,2,0,1.8,-2,1.7,0,-2,1.7,0,2,0,1.8,-2,1.7,0,2,0,1.8,2,-1.7,0,-2,1.7,0,-2,0,1.8,-2];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));const uv=[];for(let i=0;i<pos.length/9;i++)uv.push(0,0,1,1,1,0);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const mesh=new T.Mesh(geo,canvas);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);this.beam([0,0,2],[0,1.9,2],.025,this.mat.metal,g);this.beam([0,1.8,-2],[0,1.8,2],.03,this.mat.metal,g);for(const side of [-1,1]){this.beam([0,1.8,2],[side*2.5,0,3],.008,this.mat.cloth,g);this.box(.7,.08,2.4,side*.7,.06,.3,this.mat.cloth,g);}this.colliders.push({x,z,w:2.7,d:3.4,minY:0,maxY:1.8,zone:'field'});}
  // Campfire is unlit and cool: charred wood and stones, not a fake light source.
  for(let i=0;i<10;i++){const a=i/10*6.28,m=new T.Mesh(new T.DodecahedronGeometry(.25,0),this.mat.rock);m.position.set(-144+Math.cos(a)*.7,.13,-260+Math.sin(a)*.7);m.scale.y=.6;group.add(m);}for(let i=0;i<3;i++){const m=this.cylinder(.08,.11,1.3,-144,.12,-260,this.mat.black,group);m.rotation.z=Math.PI/2;m.rotation.y=i*1.4;}
  const sign=this.label('ТАБІР / CAMP 04',2.5,.45);sign.position.set(-140,1.5,-254);sign.userData.zone='field';group.add(sign);
 }
 buildMountainBoundary(){
  const group=this.group('field'),mat=this.surface('wall','#666b62',12,10);const g=new T.PlaneGeometry(150,390,38,75);g.rotateX(-Math.PI/2);const a=g.attributes.position;
  for(let i=0;i<a.count;i++){let x=a.getX(i)-246,z=a.getZ(i)-240;const wave=Math.sin(z*.038)*.5+.5,edge=clamp((-x-197)/25);let y=edge*(10+23*wave+9*Math.sin(z*.089)**2+5*Math.sin(x*.12+z*.08));a.setXYZ(i,x,y-2,z);}g.computeVertexNormals();const mountain=new T.Mesh(g,mat);mountain.castShadow=false;mountain.receiveShadow=true;group.add(mountain);const water=new T.Mesh(new T.PlaneGeometry(62,170),new T.MeshStandardMaterial({color:'#304b4c',metalness:.25,roughness:.29}));water.rotation.x=-Math.PI/2;water.position.set(-217,-.9,-320);group.add(water);this.mountainBoundary={impassable:true,westOf:-190,lake:true};
 }
 async loadAssets(){
  try{const r=await fetch('./assets/v7/surfaces.json');if(!r.ok)throw Error('Surface pack unavailable');this.surfaceImages=await r.json();await this.upgradeSurfaces();this.addSignsAndRugs();}catch(e){this.assetErrors.push(e.message);}
  const jobs=[],add=(id,spec)=>jobs.push(this.library.place(this,id,spec));
  // Full licensed 3D props, not images pasted onto boxes.
  for(const z of [8,18,30,42])add('power_box_01',{x:-502.7,y:1.35,z,height:.95,yaw:Math.PI/2});
  for(const z of [5,20,35])add('modular_electric_cables',{parts:['cable_box_4way'],x:-497.16,y:2.45,z,height:.28,yaw:-Math.PI/2});
  for(let z=2.2;z<44;z+=3){for(const x of [-502.62,-497.38])add('modular_industrial_pipes_01',{parts:['modular_industrial_pipes_01_pipe02'],x,y:2.98,z,dim:[.22,3,.22],pivot:'centre',rotation:[Math.PI/2,0,0]});add('modular_airduct_rectangular_01',{parts:['modular_airduct_rectangular_01_tripple_01'],x:-499.1,y:3.00,z,dim:[.58,.32,3],pivot:'centre'});add('modular_electric_cables',{parts:['cable_double_alt_long'],x:-502.48,y:2.65,z,dim:[.06,3,.035],pivot:'centre',rotation:[Math.PI/2,0,0]});}
  for(const[x,z,yaw]of [[-502.82,7,Math.PI/2],[-502.82,34,Math.PI/2],[-497.18,18,-Math.PI/2],[-483.19,29,-Math.PI/2],[-516.81,40,Math.PI/2]])add('modular_airduct_rectangular_01',{parts:['modular_airduct_rectangular_01_vent_01'],x,y:2.25,z,width:.9,yaw});
  for(const[x,y,z]of [[-515,1.0,37],[-485,1.0,27],[-509,.99,9],[-512,.99,24]])add('desk_lamp_arm_01',{x,y,z,height:.62,yaw:.4});
  for(const[x,z,yaw]of [[-502.68,19,Math.PI/2],[-497.32,32,-Math.PI/2],[-516.65,41,Math.PI/2],[-483.35,12,-Math.PI/2]])add('industrial_wall_lamp',{x,y:1.95,z,height:.5,yaw});
  add('vintage_radio_transceiver',{x:-487,y:.99,z:14,width:1.16,yaw:Math.PI,interact:{type:'music-radio',id:'base_music_radio',name:'Canteen radio · switch on / off',y:.35}});
  add('vintage_radio_transceiver',{x:-500,y:1.0,z:44,width:1.15,yaw:Math.PI,interact:{type:'radio',id:'radio',name:'Relay radio · contracts',y:.35}});
  for(const[x,y,z]of [[-515,.99,37],[-508,.99,27],[-487,.99,14],[-514,.99,24]])add('metal_jug',{x,y,z,height:.25});
  for(const[x,z,yaw]of [[-508.9,28.15,.2],[-507,28.1,-.1],[-486,15.1,2.9],[-490,15,3.3],[-514.2,38.25,Math.PI/2]])add('painted_wooden_chair_01',{x,z,height:.96,yaw});
  add('wooden_bookshelf_worn',{x:-516.5,z:10,height:2.35,yaw:Math.PI/2});add('wooden_bookshelf_worn',{x:-483.4,z:10,height:2.2,yaw:-Math.PI/2});add('painted_wooden_cabinet_02',{x:-507.2,z:33.5,height:2.2,yaw:0});
  const sixBooks=[1,2,3,4,5,6].map(i=>'book_encyclopedia_set_01_book'+String(i).padStart(2,'0'));
  for(const[x,y,z,yaw]of [[-515.1,1.9,37,Math.PI/2],[-513.8,1.95,6.35,0],[-486.7,1.95,31.6,Math.PI]])add('book_encyclopedia_set_01',{parts:sixBooks,x,y,z,height:.33,yaw});
  for(const[x,y,z]of [[-489.3,1.85,5.45],[-488.7,1.85,5.45],[-514,1.85,20.4],[-513.3,1.85,20.4],[-512.7,1.85,20.4]])add('russian_food_cans_01',{x,y,z,height:.22});
  for(const[x,y,z]of [[-486.7,.99,27],[-484.8,.99,26.7],[-513.4,0,43.6]])add('metal_toolbox',{x,y,z,width:.65});
  for(const[x,y,z,rot]of [[-504.3,0,42,0],[-504.3,.55,42,.1],[-496,0,20,1],[-513.8,0,6.8,0],[-489,0,31,1],[-505.5,0,15.1,0]])add('old_military_crate',{x,y,z,width:1.0,yaw:rot});
  for(const[x,y,z]of [[-516,0,34],[-516,.6,34],[-485,0,23],[-484.6,0,30.3],[-493,0,6]])add('cardboard_box_01',{x,y,z,size:.65});
  for(const[x,y,z]of [[-488,.99,14],[-512,.99,24]])add('vintage_oil_lamp',{x,y,z,height:.44});
  for(const[x,z]of [[-484.1,28],[-496,6],[-515,15]])add('metal_jerrycan',{x,z,height:.55});
  add('propane_tank',{x:-515.8,z:22,height:1.05});
  for(const[x,y,z]of [[-515.5,1.85,20.35],[-488.8,1.85,5.4],[-485.7,1.95,31.6]])add('can_rusted',{x,y,z,height:.18});
  for(const[x,z,yaw]of [[-84,-138.1,0],[-107,-70.85,0],[24,-73.85,0]])add('power_box_01',{x,y:1.3,z,height:.8,yaw,zone:'field'});
  // The same licensed kit carries into the campsite, railway and barracks.
  for(const[x,z]of [[-149,-264],[-137,-262],[-116,-84],[-104,-84],[-107,-179],[-83,-138]]){const y=terrainHeight(x,z);add('old_military_crate',{x,y,z,width:1.1,zone:'field'});add('metal_jerrycan',{x:x+.8,y,z:z+.2,height:.6,zone:'field'});}
  for(const[x,z]of [[-143,-260],[-110,-86],[-85,-140]])add('vintage_oil_lamp',{x,y:.5+terrainHeight(x,z),z,height:.48,zone:'field'});
  await Promise.all(jobs);this.detailsReady=true;this.scene.updateMatrixWorld(true);this.setZone(this.currentZone);this.addContactShadows();
  return {families:this.library.loaded.size,instances:this.importedProps.length,errors:this.assetErrors};
 }
 async upgradeSurfaces(){const roles={wall:'wall',ground:'ground',metal:'metal',roof:'roof',brick:'brick',floor:'floor'};this.v7Textures={};for(const role of Object.keys(roles)){const maps={};for(const slot of ['colour','normal','rough'])if(this.surfaceImages[role+'-'+slot]){const tx=await this.loader.loadAsync(this.surfaceImages[role+'-'+slot]);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());if(slot==='colour')tx.colorSpace=T.SRGBColorSpace;maps[slot]=tx;}this.v7Textures[role]=maps;}
  const updates=new Set(Object.values(this.materials));this.scene.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material))updates.add(o.material)});
  for(const m of updates){if(!m?.isMeshStandardMaterial)continue;let role=m===this.mat.floor?'floor':m===this.mat.metal?'metal':m.userData.surface;const tx=this.v7Textures[role];if(!tx?.colour)continue;const repeat=m.map?.repeat||new T.Vector2(1,1);const clone=(src)=>{const t=src.clone();t.repeat.copy(repeat);t.needsUpdate=true;return t};m.userData.surfaceLocked=true;m.map=clone(tx.colour);if(tx.normal){m.normalMap=clone(tx.normal);m.normalScale.set(.48,.48)}if(tx.rough)m.roughnessMap=clone(tx.rough);m.needsUpdate=true;}
 }
 addSignsAndRugs(){
  const group=this.group();const sign=(key,x,y,z,w,h,yaw=0)=>{const url=this.surfaceImages[key];if(!url)return;const tx=this.loader.load(url);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tx,roughness:1,side:T.FrontSide,polygonOffset:true,polygonOffsetFactor:-2}));m.position.set(x,y,z);m.rotation.y=yaw;group.add(m);return m};
  for(const z of [8,18,30,42])sign('warning-voltage',-502.57,1.9,z,.26,.34,Math.PI/2);
  sign('route-guide',-502.86,1.7,37,.75,1.1,Math.PI/2);sign('no-smoking',-497.14,1.8,17,.45,.62,-Math.PI/2);
  sign('canteen-sign',-513.0,2.55,20.13,2.25,.48,0);sign('store-sign',-509,2.55,6.13,2.3,.48,0);sign('range-sign',-500,2.65,45.85,2.1,.42,Math.PI);
  sign('ukrainian-1917',-516.84,1.95,36.1,.62,.91,Math.PI/2);sign('water-poster',-485.0,1.85,31.87,.72,1.0,Math.PI);
  const tex=this.loader.load(this.surfaceImages['woven-rug']||this.surfaceImages['floor-colour']);tex.colorSpace=T.SRGBColorSpace;for(const[x,z,w,d]of [[-511.1,39.7,3.8,2.4],[-509.8,12.5,4,2.3],[-489.8,12.2,3.8,2.5]]){const mat=new T.MeshStandardMaterial({map:tex,roughness:1,color:'#c3b49a'}),rug=new T.Mesh(new T.BoxGeometry(w,.022,d),mat);rug.position.set(x,.014,z);rug.receiveShadow=true;group.add(rug);}
 }
 addContactShadows(){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,3,32,32,31);g.addColorStop(0,'rgba(0,0,0,.33)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,64,64);const map=new T.CanvasTexture(canvas);for(const root of this.importedProps){if(root.position.y>.1||root.userData.zone!=='base')continue;const b=new T.Box3().setFromObject(root),s=b.getSize(new T.Vector3());if(s.x>.2&&s.z>.2){const sh=new T.Mesh(new T.PlaneGeometry(s.x*1.2,s.z*1.2),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:.65}));sh.rotation.x=-Math.PI/2;sh.position.set(root.position.x,.017,root.position.z);sh.userData={zone:'base',centre:[root.position.x,root.position.z],cull:18,keep:true};this.scene.add(sh);}}}
 info(){return {...super.info(),build:'Relay Refit 7.0',licensedModelFamilies:this.library?.loaded.size||0,importedInstances:this.importedProps?.length||0,assetErrors:this.assetErrors||[],drains:this.drainGeometry,radioPosition:this.baseRadioPosition};}
}
