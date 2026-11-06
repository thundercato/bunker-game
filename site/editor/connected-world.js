/* Real local layout geometry in the full-map workspace. The canonical compiler
   supplies ONE parent transform; LayoutScene children remain building-local. */
import {compileBuilding} from '../world-document.js';
import {createLayoutLibrary,createMaterials,LayoutScene} from '../layout-renderer.js';
import {objectHeight} from './world-core.js';
import {cutawayWalls} from './tools/interior-core.js';

export class ConnectedBuildingView {
  constructor({scene,context,notice=()=>{}}) {
    this.scene=scene;this.context=context;this.notice=notice;this.layout=null;
    this.active=null;this.compiled=null;this.signature=null;this.generation=0;
    this.options={hideRoof:true,floor:'all',cutaway:true};this.floorMaterials=new Set();this.floorBias=new Map();
  }
  async show(document,buildingId,options={}) {
    this.active=buildingId;this.options={...this.options,...options};
    const token=++this.generation;
    this.compiled=compileBuilding(document,buildingId,this.context);
    if(!this.libraryPromise)this.libraryPromise=Promise.all([createLayoutLibrary(),createMaterials()]);
    const [library,materials]=await this.libraryPromise;if(token!==this.generation)return;
    if(!this.layout){this.layout=new LayoutScene({library,materials,editor:true});this.scene.add(this.layout.group);}
    const signature=JSON.stringify(this.compiled.layout);
    if(signature!==this.signature){for(const material of this.floorMaterials)material.dispose();this.floorMaterials.clear();this.floorBias.clear();await this.layout.load(this.compiled.layout);if(token!==this.generation)return;this.signature=signature;}
    this.biasFloorDepth();this.layout.group.visible=true;this.applyTransform(this.compiled.transform);
    for(const [id,node] of this.layout.objects)node.traverse(n=>{if(n.isMesh)n.userData={...n.userData,kind:'interior',id,buildingId};});
    this.layout.view(this.options);if(this.options.cutaway&&!this.options.playing)for(const id of cutawayWalls(this.compiled.layout)){const node=this.layout.objects.get(id);if(node)node.visible=false;}this.layout.openDoors(true);
    if(this.layout.errors.length)this.notice('Some interior assets failed to load: '+this.layout.errors.join(', '));
  }
  biasFloorDepth(){
    // The coarse terrain and ground-floor top can be coplanar. Depth bias keeps
    // the actual floor visible without lifting authored geometry or colliders.
    const biased=material=>{if(!material||this.floorMaterials.has(material))return material;
      if(!this.floorBias.has(material)){const copy=material.clone();copy.polygonOffset=true;copy.polygonOffsetFactor=-1;copy.polygonOffsetUnits=-1;this.floorMaterials.add(copy);this.floorBias.set(material,copy);}return this.floorBias.get(material);};
    for(const object of this.compiled.layout.objects.filter(o=>o.type==='floor'))this.layout.objects.get(object.id)?.traverse(mesh=>{if(!mesh.isMesh)return;mesh.renderOrder=2;mesh.material=Array.isArray(mesh.material)?mesh.material.map(biased):biased(mesh.material);});
  }
  applyTransform(transform){if(!this.layout)return;this.layout.group.position.fromArray(transform.position);this.layout.group.rotation.y=transform.yaw;this.layout.group.updateMatrixWorld(true);}
  movePlacement(authoring){if(!this.active||!this.layout)return;const placement=authoring.buildings.find(b=>b.id===this.active);if(placement)this.applyTransform({position:[placement.x,objectHeight(authoring,placement),placement.z],yaw:placement.yaw});}
  hide(){this.generation++;this.active=null;if(this.layout)this.layout.group.visible=false;}
  pickables(){if(!this.active||!this.layout)return[];const result=[];this.layout.group.traverse(n=>{if(!n.isMesh)return;let parent=n;while(parent){if(!parent.visible)return;parent=parent.parent;}result.push(n);});return result;}
  node(id){return this.layout?.objects.get(id)||null;}
  info(){return {buildingId:this.active,objects:this.layout?.objects.size||0,errors:this.layout?.errors||[],compiled:this.compiled};}
}
