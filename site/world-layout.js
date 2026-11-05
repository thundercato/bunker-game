import * as T from './vendor/three.js';
import {World as OvergrowthWorld,DATA} from './world-v11.js';
import{LayoutScene,createMaterials}from'./layout-renderer.js';
import{moveInLayout}from'./layout-core.js';
import{validLand}from'./terrain.js';
export{DATA};
export class World extends OvergrowthWorld{
 constructor(canvas,quality){super(canvas,quality);if(DATA.editorLayout)this.v11Ready=this.v11Ready.then(()=>this.mountEditedLayout());}
 async mountEditedLayout(){const doc=DATA.editorLayout,materials=await createMaterials(),compiled=new LayoutScene({library:this.library,materials,editor:false});await compiled.load(doc);if(compiled.errors.length)throw Error('Preview model failed: '+compiled.errors.join('; '));this.layoutPreview=compiled;
  for(const o of doc.objects){const root=compiled.objects.get(o.id);root.position.x+=doc.origin[0];root.position.z+=doc.origin[2];root.userData={...root.userData,zone:'field',keep:true,centre:[root.position.x,root.position.z],cull:155};this.scene.add(root);const x=root.position.x,z=root.position.z;
   root.traverse(n=>{n.userData.zone='field';if(n.isMesh&&!n.material?.transparent){this.occluders.push(n)}});
   if(o.type==='light'){for(const n of [...root.children])if(n.isLight)root.remove(n);this.lamp(x,o.position[1],z,o.colour,o.intensity,'field',false);}
   if(o.binding?.type==='container'){const it=this.addInteract(root,'container',o.binding.id,o.name,[x,o.position[1]+Math.min(.8,o.size[1]/2),z]);it.zone='field';this.containerMeshes[o.binding.id]={group:root,hinge:new T.Group(),angle:0};}
   if(o.type==='doorway'){const pivot=root.userData.doorPivot,key=o.doorId||o.id;if(!o.doorId){pivot.rotation.y=-Math.PI/2;continue;}const it=this.addInteract(pivot,'door',key,o.name,[x,o.position[1]+1.3,z]);it.zone='field';this.doors[key]={root,pivot,closedMesh:pivot.children[0],collider:{off:false,zone:'field'},angle:0};}
  }
  this.scene.updateMatrixWorld(true);this.setZone(this.state?.zone||'field');if(this.state)this.updateState(this.state,this.state.loose);return this.info();
 }
 movePlayer(p,dx,dz){const doc=DATA.editorLayout;if(doc){const x=p.x-doc.origin[0],z=p.z-doc.origin[2];if(Math.abs(x)<doc.bounds[0]/2+2.5&&Math.abs(z)<doc.bounds[1]/2+2.5){const q=moveInLayout(doc,{...p,x,z},dx,dz,{doorsOpen:false,openDoors:{...Object.fromEntries(doc.objects.filter(o=>o.type==='doorway'&&!o.doorId).map(o=>[o.id,true])),...(this.state?.doors||{})}});q.x+=doc.origin[0];q.z+=doc.origin[2];return validLand(q.x,q.z)?q:p;}}return super.movePlayer(p,dx,dz);}
 info(){return {...super.info(),editorPreview:DATA.editorLayout?{building:DATA.editorLayout.buildingId,objects:DATA.editorLayout.objects.length,errors:this.layoutPreview?.errors||[]}:null};}
}
