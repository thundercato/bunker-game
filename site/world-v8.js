import * as T from './vendor/three.js';
import{RoundedBoxGeometry}from'./vendor/RoundedBoxGeometry.js';
import{World as RefitWorld,DATA}from'./world-v7.js';
import{terrainHeight,surfaceHeight,zoneAt}from'./terrain.js';
export{DATA};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export class World extends RefitWorld{
 constructor(canvas,quality='balanced'){
  super(canvas,quality);this.performanceStats={fps:0,ms:0,draws:0,triangles:0};this.renderSettings={exposure:1.08,fov:74,shadows:true,vegetation:true,showStats:false,quietLights:false};this.placementAudit=[];this.lightAssignments=[];this.cullHistory=new Map();this.lastMetrics=0;
  this.camera.near=.09;this.camera.far=360;this.camera.updateProjectionMatrix();this.renderer.setClearColor('#253b35');this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.baseRadioPosition={x:-486,y:1.35,z:14};this.upgradeWorldGeometry();this.addVillageDetails();this.addAmbientDetails();
 }
 buildGround(){super.buildGround();if(!DATA.roadsUnified)return;this.unifiedRoads=[];for(const[k,polys]of Object.entries(DATA.roadsUnified)){if(!Array.isArray(polys))continue;const mat=k==='asphalt'?this.roadMat:this.pathMat;mat.polygonOffset=true;mat.polygonOffsetFactor=-1;for(const p of polys){const shape=new T.Shape(p.outer.map(([x,z])=>new T.Vector2(x,z)));for(const h of p.holes)shape.holes.push(new T.Path(h.map(([x,z])=>new T.Vector2(x,z))));const geo=new T.ShapeGeometry(shape),a=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getY(i);a.setXYZ(i,x,.028,z);uv.setXY(i,x/(4*(mat.map?.repeat.x||1)),z/(4*(mat.map?.repeat.y||1)));}geo.computeVertexNormals();const m=new T.Mesh(geo,mat);m.material.side=T.DoubleSide;m.userData={zone:'field',keep:true,road8:true};m.receiveShadow=true;this.scene.add(m);this.unifiedRoads.push(m);}}}
  buildInteriors(){
  this.supports={};this.serviceFixtures=[];this.namedNodes={};
  const wall=this.surface('wall','#b3b8ab',2,2),paint=this.surface('wall','#50675d',2,1),ceiling=this.surface('wall','#a0a79e',3,2);this.roomWallMaterial=wall;this.baseSurfaceMaterials=[wall,paint,ceiling,this.mat.floor];
  // One structural shell per wall, no overlapping corridor/room wall copies.
  this.box(6,.16,46,-500,-.09,23,this.mat.floor);this.box(6,.18,46,-500,3.5,23,ceiling);
  for(const r of DATA.rooms){this.box(r.w,.16,r.d,r.x,-.09,r.z,this.mat.floor);this.box(r.w,.16,r.d,r.x,3.5,r.z,ceiling);const sign=this.label(r.name,2.0,.28,'#d7c79f','#263e35');sign.position.set(-500+r.side*2.84,2.65,r.doorZ);sign.rotation.y=-r.side*Math.PI/2;sign.material.side=T.FrontSide;sign.userData.zone='base';this.scene.add(sign);}
  for(const[x,z,w,d]of DATA.interiorWalls.base){this.box(w,3.5,d,x,1.75,z,wall,this.scene,true);const lower=this.box(w+.018,1.03,d+.018,x,.515,z,paint);lower.userData.v8Wainscot=true;}
  const trim=[];for(const[x,z,w,d]of DATA.interiorWalls.base)trim.push(this.cubePart(w+.03,.045,d+.03,x,1.06,z));this.partsMesh(trim,this.mat.wood,this.group());
  for(const z of [3,10,18,26,34,42]){this.lamp(-500,3.0,z,'#bad8ce',18,'base',z===18||z===34);this.cylinder(.035,.035,5.6,-500,3.2,z,this.mat.black).rotation.z=Math.PI/2;}
  let index=20;for(const[side,z]of [[-1,2],[-1,18],[-1,32],[1,2],[1,20],[1,35],[1,39],[1,43]])this.sealedDoor(-500+side*2.83,z,-side*Math.PI/2,String(index++));
  this.portal('leave_base');this.portal('base_range');
  // A steel bunk with rounded rails and separate mattress and folded blanket.
  this.box(1.9,.15,3,-514,.42,41,this.mat.black,this.scene,true);this.rounded(1.83,.22,2.85,-514,.60,41,this.mat.bed,.07);this.box(1.83,.045,1.8,-514,.735,40.5,this.mat.cloth);this.rounded(1.15,.16,.48,-514,.80,42.0,this.mat.white,.06);
  for(const xx of [-514.96,-513.04]){this.beam([xx,.1,39.47],[xx,1.05,39.47],.035,this.mat.metal);this.beam([xx,.1,42.53],[xx,1.1,42.53],.035,this.mat.metal);}for(const zz of [39.47,42.53]){this.beam([-514.96,1.03,zz],[-513.04,1.03,zz],.035,this.mat.metal);}
  const bed=this.box(1.8,.07,2.8,-514,.75,41,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));this.addInteract(bed,'bed','bed','Your bunk · rest and save',[-514,.8,41]);
  const stash=this.box(1.45,1.85,.65,-514,.925,35,this.mat.metal,this.scene,true);this.box(.09,.21,.05,-513.62,1.05,35.36,this.mat.brass);this.addInteract(stash,'stash','stash','Your storage cabinet',[-514,1,35.4]);for(let i=0;i<5;i++)this.box(.9,.025,.015,-514,1.56+i*.047,35.34,this.mat.black);
  this.supportTable('desk',-515,37,2.05,1.05);this.lamp(-514.75,1.63,37,'#efc28a',7.5,'base');this.lamp(-512,2.7,41,'#e9bf88',23,'base');this.roomLamp=this.lamps.at(-1);
  const decor=this.box(.45,.20,.04,-516.85,1.6,38,this.mat.brass);this.addInteract(decor,'decorate','decorate','Arrange your quarters',[-516.7,1.6,38]);
  const work=this.supportTable('workbench',-486,27,3.2,1.4);this.addInteract(work,'bench','bench','Weapon maintenance',[-486,1,27]);this.lamp(-485.0,1.64,27,'#efd2a1',10,'base');this.lamp(-489,2.9,27,'#ccd6be',19,'base');
  const notebook=this.box(.3,.035,.25,-487,.998,26.85,this.mat.paper);this.addInteract(notebook,'rules','rules','Loot rules notebook',[-487,1.03,26.85]);
  this.supportTable('missionRadio',-500,44,2.4,1.1);this.radioLED={material:{color:new T.Color('#b8b47d')}};this.lamp(-500,2.7,43,'#e2cc9f',17,'base');
  this.supportCounter('trader',-510,9,9,1.0,'trade','Mikhail · quartermaster');this.lamp(-510,2.6,10,'#e6c184',24,'base');this.chair(-510,7.2);
  const wireGroup=this.group(),wire=[];for(let x=-514.5;x<-505.4;x+=.27)for(const s of [-1,1]){const end=x+s*1.55;if(end<-515||end>-505)continue;wire.push(new T.Vector3(x,1.15,8.45),new T.Vector3(end,2.95,8.45));}wireGroup.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(wire),new T.LineBasicMaterial({color:'#809083',transparent:true,opacity:.52})));for(const x of [-515,-505])this.box(.075,3,.08,x,1.5,8.45,this.mat.metal);
  this.supportCounter('canteen',-512,24,5,1.1,'canteen','Nadia · meals and water');this.lamp(-512,2.65,25,'#d8d7ae',25,'base');this.chair(-512,22.5);
  this.supportCounter('bar',-488,9,5,1.1,'bar','Vera · drinks and gossip');this.lamp(-488,2.65,10,'#dbac79',23,'base');this.chair(-488,7.5);
  this.supportTable('dining',-508,27,2.4,1.2);this.supportTable('barTable',-490,14,2.4,1.2);this.supportTable('musicRadio',-486,14,1.7,.9);this.lamp(-486.5,2.7,14,'#d7ae7e',17,'base');
  this.baseRadioPosition={x:-486,y:1.35,z:14};
  for(const[cx,z,yaw]of [[-516.6,37,Math.PI/2],[-514,6.36,0],[-488.8,5.4,0],[-486,31.62,Math.PI],[-513,20.38,0]])this.supportShelf('shelf'+Object.keys(this.supports).length,cx,1.9,z,2.15,.40,yaw);
  const barSign=this.label('THE LAST LIGHT',3.0,.48,'#dfaabd','#382a35');barSign.position.set(-489,2.65,5.18);barSign.userData.zone='base';this.scene.add(barSign);
  for(const c of DATA.containers.filter(c=>c.zone==='base'))this.container(c);
  this.buildUnderground('cave');this.buildUnderground('bunker');
 }
 supportTable(id,x,z,w,d,y=0){const table=this.table(x,z,w,d,y);this.supports[id]={id,x,z,w,d,y:y+.985,yaw:0};return table;}
 supportCounter(id,x,z,w,d,type,name){const m=this.box(w,1.03,d,x,.515,z,this.mat.wood,this.scene,true);this.box(w+.10,.07,d+.10,x,1.065,z,this.mat.wood);this.supports[id]={id,x,z,w,d,y:1.10,yaw:0};this.addInteract(m,type,id,name,[x,1.1,z+d/2+.1]);return m;}
 supportShelf(id,x,y,z,w,d,yaw){const g=this.group();g.position.set(x,y,z);g.rotation.y=yaw;this.box(w,.07,d,0,0,0,this.mat.wood,g);for(const xx of [-w*.35,w*.35])this.beam([xx,-.3,-.14],[xx,-.035,.15],.018,this.mat.metal,g);this.supports[id]={id,x,y:y+.035,z,w,d,yaw};return g;}
 buildBaseServices(){
  // Continuous services replace the earlier pipes and floating supports.
  const g=this.group();for(const z of [5,15,23,32,43])for(const x of [-502.68,-497.32]){const c=this.cylinder(.085,.085,1.9,x,1.83,z,this.mat.metal,g);for(const y of [1.08,2.58]){const hoop=new T.Mesh(new T.TorusGeometry(.10,.015,6,12),this.mat.black);hoop.rotation.x=Math.PI/2;hoop.position.set(x,y,z);g.add(hoop);}}
  for(const x of [-502.5,-497.5])for(const z of [9,29]){const curve=new T.CatmullRomCurve3([new T.Vector3(x,2.7,z-3),new T.Vector3(x,2.48,z-1),new T.Vector3(x,2.43,z+1),new T.Vector3(x,2.7,z+3)]);g.add(new T.Mesh(new T.TubeGeometry(curve,24,.016,6,false),this.mat.black));}
 }
 buildLockers(){const g=this.group();for(let i=0;i<3;i++){const x=-484.0,z=23.65+i*.68,root=new T.Group();root.position.set(x,0,z);root.rotation.y=-Math.PI/2;g.add(root);this.box(.59,1.90,.47,0,.95,0,this.mat.metal,root);this.box(.53,1.78,.025,0,.96,.251,this.mat.metal,root);for(let j=0;j<5;j++)this.box(.36,.018,.012,0,1.54+j*.05,.269,this.mat.black,root);this.box(.03,.15,.05,.18,1,.275,this.mat.brass,root);this.colliders.push({x,z,w:.5,d:.62,minY:0,maxY:1.9,zone:'base'});}}
 buildFixtureVisuals(){this.fixtureBindings=[];const g=this.group();for(const l of this.lamps){l.fixtureID='lamp-'+this.lamps.indexOf(l);l.v7Level=1;if(l.zone==='base'&&Math.abs(l.position.x+500)<.01&&l.position.y>2.9){const f=new T.Group();f.position.set(l.position.x,3.22,l.position.z);g.add(f);this.box(1.8,.09,.34,0,.04,0,this.mat.metal,f);const mat=new T.MeshStandardMaterial({color:'#d4e2d7',emissive:'#c8dfd1',emissiveIntensity:1.25,roughness:.5});for(const z of [-.09,.09]){const t=this.cylinder(.032,.032,1.57,0,-.025,z,mat,f,12);t.rotation.z=Math.PI/2;}for(let x=-.85;x<=.85;x+=.21)this.beam([x,-.10,-.19],[x,-.10,.19],.009,this.mat.black,f);l.v7Material=mat;l.ballast=true;this.fixtureBindings.push(l);}}}
 makeShadowLight(){this.contactSpot=null;this.roomShadowSpots=[];for(const r of DATA.rooms){const light=new T.SpotLight(r.id==='workshop'?'#d0dccc':'#edc995',0,15,1.0,.8,1.5);light.position.set(r.x,3.2,r.z);light.target.position.set(r.x,0,r.z);light.castShadow=false;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0005;light.shadow.normalBias=.035;light.shadow.camera.near=.2;light.shadow.camera.far=15;light.userData.global=true;light.target.userData.global=true;this.scene.add(light,light.target);this.roomShadowSpots.push({room:r,light});}}
 updateLightField(p,zone){
  if(!this.lightAssignments)this.lightAssignments=[];this.fixtureStates=[];const now=this.time,list=[];
  for(const l of this.lamps){const period=18+(l.seed||0)*2,phase=(now+(l.seed||0)*5)%period;let level=l.flicker&&!this.reducedMotion&&!this.renderSettings?.quietLights?(phase<.13?.62:1):1;l.v7Level=level;if(l.v7Material)l.v7Material.emissiveIntensity=1.35*level;if(l.zone===zone){const d=l.position.distanceToSquared(this.camera.position);list.push({l,d});if(d<230)this.fixtureStates.push({id:l.fixtureID||'lamp-'+this.lamps.indexOf(l),x:l.position.x,y:l.position.y,z:l.position.z,level,ballast:!!l.ballast,fault:level<.8});}}
  list.sort((a,b)=>a.d-b.d);const desired=list.slice(0,4).filter(q=>q.d<240).map(q=>q.l),used=new Set();
  for(let i=0;i<this.lightPool.length;i++){const light=this.lightPool[i];let current=this.lightAssignments[i];if(current&&!desired.includes(current)&&light.intensity>.12){light.intensity*=.78;used.add(current);continue;}if(!current||!desired.includes(current)){current=desired.find(l=>!this.lightAssignments.includes(l)&&!used.has(l))||null;this.lightAssignments[i]=current;light.intensity=0;}if(!current){light.intensity=0;continue;}used.add(current);light.position.copy(current.position);light.color.set(current.colour);const distance=current.position.distanceTo(this.camera.position),target=current.intensity*current.v7Level*clamp((15-distance)/4);light.intensity+=(target-light.intensity)*.12;light.distance=12;}
  for(const {room,light}of this.roomShadowSpots||[]){const inside=zone==='base'&&Math.abs(p.x-room.x)<room.w/2&&Math.abs(p.z-room.z)<room.d/2;const active=inside&&this.quality!=='low'&&this.renderSettings?.shadows!==false;light.castShadow=active;light.intensity+=(active?6-light.intensity:-light.intensity)*.12;}
 }
 buildWatcher(){const all=DATA.enemies;DATA.enemies=all.filter(e=>e.kind!=='skitter');try{super.buildWatcher()}finally{DATA.enemies=all}}
 async loadAssets(){
  await new Promise(r=>setTimeout(r,0));this.placementAudit=[];this.placements=[];try{const resp=await fetch('./assets/v7/surfaces.json');this.surfaceImages=await resp.json();await this.upgradeSurfaces();this.addSignsAndRugs();await this.cleanConcrete();}catch(e){this.assetErrors.push(e.message);}
  const jobs=[],place=(id,s)=>jobs.push(this.placeChecked(id,s));
  for(const z of [8,18,30,42])place('power_box_01',{x:-502.62,z,y:1.45,height:.72,yaw:Math.PI/2,mount:'wall'});
  for(let z=2;z<44;z+=3){for(const x of [-502.62,-497.38])place('modular_industrial_pipes_01',{parts:['modular_industrial_pipes_01_pipe02'],x,y:3.04,z,dim:[.19,2.99,.19],pivot:'centre',rotation:[Math.PI/2,0,0],mount:'ceiling'});place('modular_airduct_rectangular_01',{parts:['modular_airduct_rectangular_01_tripple_01'],x:-499.04,y:3.1,z,dim:[.55,.31,2.99],pivot:'centre',mount:'ceiling'});place('modular_electric_cables',{parts:['cable_double_alt_long'],x:-502.48,y:2.72,z,dim:[.055,2.99,.035],pivot:'centre',rotation:[Math.PI/2,0,0],mount:'wall'});}
  for(const[x,z,yaw]of [[-502.73,16,Math.PI/2],[-497.27,32,-Math.PI/2],[-516.67,40,Math.PI/2],[-483.33,29,-Math.PI/2]])place('modular_airduct_rectangular_01',{parts:['modular_airduct_rectangular_01_vent_01'],x,y:2.25,z,width:.82,yaw,mount:'wall'});
  for(const[x,z,yaw]of [[-502.7,21,Math.PI/2],[-497.3,36,-Math.PI/2],[-516.65,41,Math.PI/2]])place('industrial_wall_lamp',{x,y:2.05,z,height:.4,yaw,mount:'wall'});
  place('desk_lamp_arm_01',{support:'desk',local:[-.55,0],height:.59,yaw:.3});place('desk_lamp_arm_01',{support:'workbench',local:[1.05,0],height:.64,yaw:-.2});place('desk_lamp_arm_01',{support:'trader',local:[2.5,0],height:.6});
  place('vintage_radio_transceiver',{support:'musicRadio',width:1.1,yaw:0,interact:{type:'music-radio',id:'base_music_radio',name:'The Last Light radio · on / off',y:.3}});place('vintage_radio_transceiver',{support:'missionRadio',width:1.1,yaw:Math.PI,interact:{type:'radio',id:'radio',name:'Relay radio · contracts',y:.3}});
  for(const support of ['desk','dining','barTable'])place('metal_jug',{support,local:[.55,.08],height:.23});
  place('vintage_oil_lamp',{support:'barTable',local:[-.6,-.05],height:.4});place('vintage_oil_lamp',{support:'dining',local:[-.62,.05],height:.40});
  for(const[x,z,yaw]of [[-508.75,28.25,Math.PI],[-507.2,28.25,Math.PI],[-490.7,15.15,Math.PI],[-489.2,15.15,Math.PI],[-513.7,37.8,Math.PI/2]])place('painted_wooden_chair_01',{x,z,height:.90,yaw,mount:'floor'});
  place('wooden_bookshelf_worn',{x:-516.50,z:11,height:2.2,yaw:Math.PI/2,mount:'floor'});place('wooden_bookshelf_worn',{x:-483.5,z:10,height:2.15,yaw:-Math.PI/2,mount:'floor'});place('painted_wooden_cabinet_02',{x:-507,z:33.55,height:2.15,mount:'floor'});
  const shelfKeys=Object.keys(this.supports).filter(k=>k.startsWith('shelf')),books=[1,2,3,4].map(i=>'book_encyclopedia_set_01_book0'+i);
  place('book_encyclopedia_set_01',{support:shelfKeys[0],parts:books,local:[-.4,0],height:.27});place('book_encyclopedia_set_01',{support:shelfKeys[1],parts:books,local:[.25,0],height:.29});
  for(const key of [shelfKeys[2],shelfKeys[4]]){place('russian_food_cans_01',{support:key,local:[-.45,0],height:.18});place('russian_food_cans_01',{support:key,local:[.4,0],height:.18});}
  place('can_rusted',{support:shelfKeys[3],local:[.45,0],height:.15});place('metal_toolbox',{support:shelfKeys[3],local:[-.45,0],width:.63});
  place('metal_toolbox',{support:'workbench',local:[-.92,.24],width:.5});
  for(const[x,z,yaw]of [[-515.9,14.2,0],[-484.3,30.8,0],[-505.3,43.7,0]])place('old_military_crate',{x,z,width:1.05,yaw,mount:'floor'});
  for(const[x,z]of [[-516,33.8],[-484.4,22.75],[-494.8,5.9]])place('cardboard_box_01',{x,z,size:.55,mount:'floor'});
  for(const[x,z]of [[-515.8,21.0],[-483.8,28.7]])place('metal_jerrycan',{x,z,height:.55,mount:'floor'});place('propane_tank',{x:-515.7,z:22.0,height:.93,mount:'floor'});
  for(const[x,z]of [[-149,-264],[-137,-262],[-116,-84],[-104,-84],[-107,-179],[-83,-138]]){place('old_military_crate',{x,z,width:1.05,zone:'field',mount:'ground'});place('metal_jerrycan',{x:x+.85,z:z+.25,height:.55,zone:'field',mount:'ground'});}
  await Promise.all(jobs);this.detailsReady=true;this.scene.updateMatrixWorld(true);this.setZone(this.currentZone);this.attachSoftShadows();this.auditScene();this.enhanceMaterials();return {families:this.library.loaded.size,instances:this.importedProps.length,errors:this.assetErrors};
 }
 async placeChecked(id,s){
  const spec={...s};let support=null;
  if(spec.support){support=this.supports[spec.support];if(!support){this.assetErrors.push('Missing support '+spec.support);return null}const[a,b]=spec.local||[0,0],c=Math.cos(support.yaw),si=Math.sin(support.yaw);spec.x=support.x+a*c+b*si;spec.z=support.z-a*si+b*c;spec.y=support.y+.003;spec.yaw=(spec.yaw||0)+support.yaw;spec.mount='support';}
  if(spec.mount==='ground')spec.y=terrainHeight(spec.x,spec.z)+.008;else if(spec.mount==='floor')spec.y=.008;
  const root=await this.library.place(this,id,spec);if(!root)return null;root.name='v8:'+id+':'+this.importedProps.length;root.userData.mount=spec.mount;root.userData.support=spec.support||null;root.userData.supportY=spec.y||0;
  if(['support','floor','ground'].includes(spec.mount)){let b=new T.Box3().setFromObject(root);root.position.y+=(spec.y||0)-b.min.y;root.updateMatrixWorld(true);}
  if(support){const inv=new T.Matrix4().compose(new T.Vector3(support.x,support.y,support.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),support.yaw),new T.Vector3(1,1,1)).invert();root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root).applyMatrix4(inv);const fit=b.min.x>=-support.w/2-.025&&b.max.x<=support.w/2+.025&&b.min.z>=-support.d/2-.025&&b.max.z<=support.d/2+.025;
   if(!fit){const maxx=Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),maxz=Math.max(Math.abs(b.min.z),Math.abs(b.max.z));const factor=Math.min(1,(support.w*.47)/maxx,(support.d*.47)/maxz);root.scale.multiplyScalar(factor);root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root);root.position.y+=support.y+.003-box.min.y;root.updateMatrixWorld(true);}root.userData.surfaceBound=true;
  }
  if(id==='power_box_01'&&root.userData.zone==='base'&&this.surfaceImages['warning-voltage']){const b=new T.Box3().setFromObject(root),tx=this.loader.load(this.surfaceImages['warning-voltage']);tx.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(.22,.29),new T.MeshStandardMaterial({map:tx,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));sign.position.set(b.max.x+.003,(b.min.y+b.max.y)/2,spec.z);sign.rotation.y=Math.PI/2;sign.userData={zone:'base',centre:[spec.x,spec.z],cull:20};this.scene.add(sign);}
  this.placements.push({id,root,spec});return root;
 }
 addSignsAndRugs(){const before=new Set(this.scene.children);super.addSignsAndRugs();for(const g of this.scene.children)if(!before.has(g)&&g.isGroup){for(const o of [...g.children])if(o.geometry?.parameters?.width===.26&&o.geometry?.parameters?.height===.34)g.remove(o);}}
 addContactShadows(){} // Replaced with support-aware, separated receiver patches.
 attachSoftShadows(){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),grad=g.createRadialGradient(32,32,6,32,32,31);grad.addColorStop(0,'rgba(0,0,0,.20)');grad.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=grad;g.fillRect(0,0,64,64);const tx=new T.CanvasTexture(c);
  for(const {root,spec}of this.placements){if(!['floor','support'].includes(spec.mount))continue;const b=new T.Box3().setFromObject(root),size=b.getSize(new T.Vector3()),pos=b.getCenter(new T.Vector3()),m=new T.Mesh(new T.PlaneGeometry(size.x*1.18,size.z*1.18),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,opacity:.48,polygonOffset:true,polygonOffsetFactor:-1}));m.rotation.x=-Math.PI/2;m.position.set(pos.x,(spec.y||0)+.002,pos.z);m.userData={zone:root.userData.zone,softShadow:true,centre:[pos.x,pos.z],cull:18};m.renderOrder=2;this.scene.add(m);}
 }
 upgradeWorldGeometry(){
  for(const terrain of this.terrainChunks){const g=terrain.geometry,uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/3.2/14,p.getZ(i)/3.2/14);uv.needsUpdate=true;terrain.receiveShadow=true;}
  this.scene.traverse(o=>{if(o.material?.alphaTest){o.material.alphaToCoverage=true;o.material.transparent=false;o.material.depthWrite=true;}if(o.isMesh&&o.material?.transparent)o.castShadow=false;});
  // Thin legacy overlay planes use a consistent small separation, never coplanar.
  this.scene.traverse(o=>{if(o.isMesh&&o.geometry?.type==='PlaneGeometry'&&Math.abs(o.rotation.x+Math.PI/2)<.01&&o.position.y>=-.03&&o.position.y<.02&&!o.userData.softShadow){o.position.y=.024;o.material.depthWrite=true;}});
 }
 enhanceMaterials(){for(const m of Object.values(this.materials)){if(m.map){m.map.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());m.map.minFilter=T.LinearMipmapLinearFilter;m.map.magFilter=T.LinearFilter;}if(m.normalScale)m.normalScale.set(.32,.32);}
  this.scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m?.map){m.map.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());m.map.minFilter=T.LinearMipmapLinearFilter;}if(m?.alphaTest)m.alphaToCoverage=true;}});
 }
 addVillageDetails(){
  const g=this.group('field'),frame=new T.MeshStandardMaterial({color:'#535c54',roughness:.8,metalness:.3}),glass=new T.MeshStandardMaterial({color:'#405451',roughness:.38,metalness:.18});
  for(const b of DATA.buildings){if(b.w<7||b.kind==='pier')continue;for(const side of [-1,1]){const x=b.x+side*b.w*.31,z=b.z+b.d/2+.155;this.box(1.15,1.05,.045,x,1.85,z,frame,g);this.box(.96,.86,.025,x,1.85,z+.027,glass,g);this.box(.04,.90,.035,x,1.85,z+.045,this.mat.wood,g);this.box(.98,.04,.035,x,1.85,z+.045,this.mat.wood,g);this.box(1.24,.09,.24,x,1.29,z+.10,this.mat.concrete,g);}
   const gutter=this.box(b.w+.18,.10,.12,b.x,3.02,b.z+b.d/2+.16,this.mat.metal,g);this.beam([b.x-b.w/2+.12,3.0,b.z+b.d/2+.17],[b.x-b.w/2+.12,.1,b.z+b.d/2+.17],.055,this.mat.metal,g);
  }
  // Village kerbs and pavements are coherent strips, not individual overlapping slabs.
  for(const side of [-1,1]){this.box(81,.10,1.45,-3,.03,-179+side*3.65,this.mat.concrete,g);this.box(81,.12,.15,-3,.055,-179+side*2.85,this.mat.concrete,g);}
 }
 addAmbientDetails(){
  this.dustLayers=[];for(const r of DATA.rooms){const arr=new Float32Array(90*3);let seed=87+r.z;for(let i=0;i<90;i++){seed=(seed*1664525+1013904223)>>>0;arr[i*3]=r.x+(seed/4294967296-.5)*(r.w-2);seed=(seed*1664525+1013904223)>>>0;arr[i*3+1]=.5+seed/4294967296*2.5;seed=(seed*1664525+1013904223)>>>0;arr[i*3+2]=r.z+(seed/4294967296-.5)*(r.d-1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(arr,3));const mat=new T.PointsMaterial({color:'#c8bb96',size:.018,transparent:true,opacity:.15,depthWrite:false});const pts=new T.Points(geo,mat);pts.userData={zone:'base',keep:true};this.scene.add(pts);this.dustLayers.push(pts);}
 }
 visibility8(p,zone){
  if(this.time-(this.cullAt||0)<.15&&this.cullZone===zone)return;this.cullAt=this.time;this.cullZone=zone;const max=this.quality==='low'?80:this.quality==='high'?165:125,enemyRoots=new Set(Object.values(this.enemyMeshes).map(m=>m.group)),pickupRoots=new Set(Object.values(this.pickups)),bottleRoots=new Set(this.bottleMeshes||[]);
  for(const root of this.scene.children){if(root===this.camera||root.isLight||root.userData.global||enemyRoots.has(root)||pickupRoots.has(root)||bottleRoots.has(root)||root===this.bagMesh)continue;const same=(root.userData.zone||'field')===zone;if(!same){root.visible=false;continue;}if(root.userData.centre){const[x,z]=root.userData.centre,dist=Math.hypot(p.x-x,p.z-z),limit=root.userData.terrain?300:Math.min(max,root.userData.cull||max);root.visible=dist<limit+(root.visible?9:0);}else root.visible=true;}
  for(let i=0;i<(this.bottleMeshes||[]).length;i++)this.bottleMeshes[i].visible=!!this.state?.bottles[i]&&zone==='field';
  if(this.renderSettings?.vegetation===false)for(const g of this.foliageChunks)g.visible=false;
  for(const c of Object.values(this.containerMeshes)){const same=c.group.userData.zone===zone,d=Math.hypot(p.x-c.group.position.x,p.z-c.group.position.z);c.group.visible=same&&d<(c.group.visible?112:100);}
  for(const[id,m]of Object.entries(this.enemyMeshes)){const e=this.state?.enemies.find(e=>e.id===id);m.group.visible=!!e&&e.health>0&&e.zone===zone;}
 }
 beforeRender8(p,dt){
  const zone=zoneAt(p.x,p.z),far=zone==='base'?68:zone==='field'?360:90;if(this.camera.far!==far){this.camera.far=far;this.camera.updateProjectionMatrix();}
  const settings=this.renderSettings||{},baseFOV=settings.fov||74,fov=baseFOV-this.aim*19;if(Math.abs(this.camera.fov-fov)>.02){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
  const target=(settings.exposure||1.08)*(zone==='field'?1:1.06);this.renderer.toneMappingExposure=target;
  if(this.performanceStats){const n=performance.now(),ms=this._measureAt?Math.min(250,n-this._measureAt):16;this._measureAt=n;this.performanceStats.ms=this.performanceStats.ms*.94+ms*.06;this.performanceStats.fps=Math.round(1000/(this.performanceStats.ms||16));this.performanceStats.draws=this.renderer.info.render.calls;this.performanceStats.triangles=this.renderer.info.render.triangles;}
  if(this.dustLayers&&!this.reducedMotion)for(const g of this.dustLayers)g.position.y=Math.sin(this.time*.13)*.035;
 }
 rounded(w,h,d,x,y,z,mat,radius=.04){const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,3,radius),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData={zone:zoneAt(x,z),keep:true};this.scene.add(m);return m;}
 async cleanConcrete(){try{const r=await fetch('./assets/v8/surfaces.json'),j=await r.json();if(!j.colour)return;const colour=await this.loader.loadAsync(j.colour),normal=j.normal?await this.loader.loadAsync(j.normal):null;colour.colorSpace=T.SRGBColorSpace;
  for(const m of this.baseSurfaceMaterials||[]){const repeat=m.map?.repeat||new T.Vector2(2,2);const clone=t=>{let n=t.clone();n.wrapS=n.wrapT=T.RepeatWrapping;n.repeat.copy(repeat);n.anisotropy=8;n.needsUpdate=true;return n;};m.userData.surfaceLocked=true;m.map=clone(colour);if(normal){m.normalMap=clone(normal);m.normalScale.set(.28,.28);}m.roughness=.88;m.needsUpdate=true;}
 }catch(e){this.assetErrors.push('Concrete: '+e.message)}}
  updateState(state,loot){super.updateState(state,loot);for(const [id,c]of Object.entries(this.containerMeshes)){const entry=state.containers[id],ref=DATA.containers.find(x=>x.id===id),it=c.group.userData.interact;if(!it||!ref)continue;const n=entry?Object.values(entry.items).reduce((a,b)=>a+b,0):null;it.name=ref.name+(entry?(n?' · searched, loot remains':' · empty'):' · unsearched');}}
  auditScene(){
  const records=[];for(const {id,root,spec}of this.placements){root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root);let supported=!['support','floor','ground'].includes(spec.mount)||Math.abs(b.min.y-(spec.y||0))<.025;records.push({asset:id,mount:spec.mount||'fixed',support:spec.support||null,baseY:+b.min.y.toFixed(4),expected:+(spec.y||0).toFixed(4),supported});}
  this.placementAudit=records;this.auditSummary={placed:records.length,unsupported:records.filter(x=>!x.supported),wallSegments:DATA.interiorWalls.base.length,duplicateGhostsRemoved:DATA.enemies.filter(e=>e.kind==='skitter').length};return this.auditSummary;
 }
 info(){return {...super.info(),build:'Stillwater 8.0',placements:this.auditSummary,antialias:this.renderer.getContext().getContextAttributes()?.antialias,depthRange:[this.camera.near,this.camera.far],performance:this.performanceStats};}
}
