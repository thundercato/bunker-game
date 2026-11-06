import * as T from './vendor/three.js';
import {AssetLibrary} from './asset-library.js';
import {geometryPieces} from './layout-core.js';
import {createSearchProp,getSearchProp} from './search-props.js';
export const PROP_LIBRARY=[
 ['painted_wooden_table','Wooden table',[2.1,.985,1.25],'Furniture'],['painted_wooden_chair_01','Wooden chair',[.55,.95,.55],'Furniture'],['painted_wooden_cabinet','Wall cupboard',[.9,1.05,.56],'Furniture'],['painted_wooden_cabinet_02','Tall cupboard',[1.1,2,.62],'Furniture'],['vintage_wooden_drawer_01','Chest of drawers',[1.05,.85,.6],'Furniture'],['old_bed_frame','Bed frame',[1.5,1.1,2.3],'Furniture'],['painted_wooden_nightstand','Bedside cabinet',[.6,.65,.48],'Furniture'],['wooden_bookshelf_worn','Bookshelf',[1.2,2,.4],'Furniture'],['worn_metal_rack','Metal shelving',[1.6,2,.5],'Furniture'],['wooden_picnic_table','Picnic table',[2.4,1.2,1.6],'Furniture'],
 ['old_military_crate','Military crate',[1.1,.65,.6],'Storage'],['wooden_crate_01','Wooden crate',[.9,.7,.7],'Storage'],['cardboard_box_01','Cardboard box',[.6,.45,.5],'Storage'],['plastic_crate_01','Plastic crate',[.55,.35,.4],'Storage'],['metal_toolbox','Toolbox',[.5,.25,.23],'Storage'],['medical_box','Medical case',[.3,.2,.24],'Storage'],
 ['desk_lamp_arm_01','Desk lamp',[.3,.62,.35],'Details'],['industrial_wall_lamp','Wall lamp',[.3,.4,.22],'Details'],['vintage_oil_lamp','Oil lamp',[.22,.42,.22],'Details'],['power_box_01','Electrical box',[.55,.8,.2],'Details'],['metal_jug','Metal jug',[.2,.23,.2],'Details'],['russian_food_cans_01','Food tins',[.2,.18,.2],'Details'],['metal_jerrycan','Jerrycan',[.35,.55,.17],'Details'],['propane_tank','Gas cylinder',[.38,.95,.38],'Details'],['can_rusted','Rusty can',[.16,.2,.16],'Details'],['binder_notebook','Notebook',[.23,.035,.3],'Details'],['plastic_thermos','Water flask',[.12,.26,.12],'Details'],['portable_cassette_player','Cassette recorder',[.24,.15,.12],'Details'],['vintage_radio_transceiver','Mission radio prop',[.7,.45,.3],'Details'],['small_oil_can_01','Oil can',[.18,.22,.12],'Details'],['metal_trash_can','Bin',[.5,.85,.5],'Storage']
].map(([id,name,size,category])=>({id,name,size,category}));
export async function createLayoutLibrary(){const lib=new AssetLibrary();await lib.ready;for(const path of ['assets/v10/model-manifest.json','assets/v11/models.json','assets/campaign/registry.json']){const data=await(await fetch(path)).json(),rows=Array.isArray(data)?data:data.assets;lib.files={...lib.files,...Object.fromEntries(rows.filter(x=>x.path).map(x=>[x.id,x.path]))};}return lib;}
export async function createMaterials(){
 const palette={plaster:'#a3b3ad',brick:'#927d6b',wood:'#ac9775',concrete:'#858e8b',metal:'#586e69',roof:'#53645f'},mats={};const tl=new T.TextureLoader();for(const[k,c]of Object.entries(palette))mats[k]=new T.MeshStandardMaterial({color:c,roughness:.86,metalness:k==='metal'?.4:0});
 try{const rows=await(await fetch('assets/v11/surfaces.json')).json();await Promise.all(rows.map(async row=>{const k=row.role==='rust'?'metal':row.role;if(!mats[k]||!row.files.colour)return;const t=await tl.loadAsync(row.files.colour);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;mats[k].map=t;mats[k].color.set('#cdd4cb');mats[k].needsUpdate=true;}));}catch(e){console.warn('Editor textured material fallback:',e.message)}return mats;
}
function uvMetres(g){const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;for(let i=0;i<p.count;i++){const ny=Math.abs(n.getY(i)),nx=Math.abs(n.getX(i));u.setXY(i,(ny>.7?p.getX(i):nx>.7?p.getZ(i):p.getX(i))/2,(ny>.7?p.getZ(i):p.getY(i))/2);}u.needsUpdate=true;}
export async function createObject(doc,o,{library,materials,editor=false}={}){
 const root=new T.Group();root.name=o.name;root.position.fromArray(o.position);root.rotation.y=o.yaw;root.userData={layoutId:o.id,layoutType:o.type};const mat=materials[o.material]||materials.plaster;
 const box=(p,size,m=mat)=>{const g=new T.BoxGeometry(...size);uvMetres(g);const mesh=new T.Mesh(g,m);mesh.position.fromArray(p);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
 if(o.type==='prop'){
  try{let obj,dim;if(o.asset.startsWith('search_')){obj=await createSearchProp(o.asset,{library});dim=(await getSearchProp(o.asset)).dimensions;root.userData.searchPropModel=obj;}else{const template=await library.template(o.asset);obj=template.clone(true);dim=template.userData.dimensions;}obj.scale.set(...o.size.map((n,i)=>n/Math.max(.001,dim[i])));root.add(obj);}catch(e){root.userData.error=e.message;box([0,o.size[1]/2,0],o.size,new T.MeshStandardMaterial({color:'#a4494e',wireframe:true}));}
 }else if(o.type==='stairs'){
  const n=Math.max(4,Math.ceil(o.size[1]/.18));for(let i=0;i<n;i++)box([0,(i+1)*o.size[1]/n-.055,o.size[2]/2-(i+.5)*o.size[2]/n],[o.size[0],.11,o.size[2]/n+.012],mat);
  // Sloping stringers and side railings are part of the same movable assembly.
  for(const x of [-o.size[0]/2,o.size[0]/2]){const start=new T.Vector3(x,.9,o.size[2]/2),end=new T.Vector3(x,o.size[1]+.9,-o.size[2]/2),delta=end.clone().sub(start),rail=new T.Mesh(new T.CylinderGeometry(.025,.025,delta.length(),8),materials.metal);rail.position.copy(start.add(end).multiplyScalar(.5));rail.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());root.add(rail);for(let i=0;i<=6;i++)box([x,i/6*o.size[1]+.43,o.size[2]/2-i/6*o.size[2]],[.035,.86,.035],materials.metal);}
 }else if(o.type==='light'){
  const bulb=new T.Mesh(new T.SphereGeometry(.08,12,8),new T.MeshStandardMaterial({color:o.colour,emissive:o.colour,emissiveIntensity:1}));root.add(bulb);const light=new T.PointLight(o.colour,o.intensity,14,2);root.add(light);
 }else if(o.type==='spawn'){
  if(editor){const m=new T.Mesh(new T.CapsuleGeometry(.23,1.18,4,12),new T.MeshBasicMaterial({color:'#72c7d7',wireframe:true}));m.position.y=.82;root.add(m);const arrow=new T.ArrowHelper(new T.Vector3(0,0,-1),new T.Vector3(0,.2,0),1.3,0x72c7d7,.22,.13);root.add(arrow);}
 }else{
  for(const p of geometryPieces(doc,o))box(p.position,p.size);
  if(o.type==='doorway'){
   const pivot=new T.Group();pivot.position.set(-o.opening.width/2,0,.055);root.add(pivot);const door=new T.Mesh(new T.BoxGeometry(o.opening.width-.05,o.opening.height-.035,.08),materials.wood);door.position.set(o.opening.width/2,o.opening.height/2,0);pivot.add(door);const handle=new T.Mesh(new T.BoxGeometry(.08,.16,.07),materials.metal);handle.position.set(o.opening.width-.18,1.08,.075);pivot.add(handle);root.userData.doorPivot=pivot;root.userData.doorId=o.doorId||o.id;
  }else if(o.type==='window'){
   const glass=new T.Mesh(new T.BoxGeometry(o.opening.width,o.opening.height,.035),new T.MeshStandardMaterial({color:'#749b9b',transparent:true,opacity:.28,roughness:.25,depthWrite:false}));glass.position.y=o.opening.sill+o.opening.height/2;root.add(glass);
  }
 }
 root.traverse(m=>{m.userData.layoutId=o.id;m.userData.layoutType=o.type;});return root;
}
export class LayoutScene{
 constructor(options){this.options=options;this.group=new T.Group();this.objects=new Map();this.generation=0;this.errors=[];}
 async load(doc){const token=++this.generation,items=await Promise.all(doc.objects.map(async o=>({o,node:await createObject(doc,o,this.options)})));if(token!==this.generation){for(const {node,o}of items)this.dispose(node,o);return false;}for(const o of this.doc?.objects||[])this.dispose(this.objects.get(o.id),o);this.group.clear();this.objects.clear();this.errors=[];for(const{node,o}of items){this.group.add(node);this.objects.set(o.id,node);if(node.userData.error)this.errors.push(node.userData.error);}this.doc=doc;return true;}
 dispose(root,o){if(!root||o.type==='prop')return;const shared=new Set(Object.values(this.options.materials));root.traverse(n=>{n.geometry?.dispose();if(n.material&&!shared.has(n.material))n.material.dispose();});}
 openDoors(open=true){for(const o of this.objects.values())if(o.userData.doorPivot)o.userData.doorPivot.rotation.y=open?-Math.PI/2:0;}
 view({hideRoof=true,floor='all',cutaway=false,playing=false,hidden=new Set()}={}){for(const o of this.doc?.objects||[]){const n=this.objects.get(o.id);if(!n)continue;n.visible=!hidden.has(o.id)&&!(hideRoof&&o.type==='roof')&&!(playing&&o.type==='spawn')&&(floor==='all'||o.position[1]<Number(floor)+2.95&&o.position[1]+o.size[1]>Number(floor)-.1);if(cutaway&&!playing&&['wall','window','doorway'].includes(o.type)&&o.position[1]<.1){n.visible=n.visible&&o.position[2]<this.doc.bounds[1]/2-.15&&o.position[0]<this.doc.bounds[0]/2-.15;}}}
}
