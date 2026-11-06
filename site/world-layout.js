import * as T from './vendor/three.js';
import {World as OvergrowthWorld, DATA} from './world-v11.js';
import {LayoutScene, createMaterials} from './layout-renderer.js';
import {toWorld} from './world-document.js';
import {bindingAnchor} from './layout-core.js';
import {previewBuilding, insidePreview, moveInPreview} from './world-preview.js';
import {validLand} from './terrain.js';
export {DATA};
export class World extends OvergrowthWorld {
 constructor(canvas, quality) {
  super(canvas, quality);
  if (DATA.editorLayout) this.v11Ready = this.v11Ready.then(() => this.mountEditedLayout());
 }
 async mountEditedLayout() {return this.mountBuildingScene(previewBuilding(DATA));}
 async mountBuildingScene(building) {
  const doc = building.layout;
  // An isolated authored-home preview also needs its licensed model paths.
  // Register files only; never import normal campaign rules or saved state here.
  if (doc.objects.some(o => o.asset?.startsWith('campaign_')) && !this.library.files.campaign_chair) {
   const response = await fetch('assets/campaign/registry.json');
   if (!response.ok) throw Error('Campaign asset registry unavailable');
   const registry = await response.json();
   this.library.files = {...this.library.files, ...Object.fromEntries(registry.assets.map(a => [a.id, a.path]))};
  }
  const compiled = new LayoutScene({library: this.library, materials: await createMaterials(), editor: false});
  await compiled.load(doc);
  if (compiled.errors.length) throw Error('Preview model failed: ' + compiled.errors.join('; '));
  this.layoutPreview = compiled;
  for (const o of doc.objects) {
   const root = compiled.objects.get(o.id), position = toWorld(building.transform, o.position);
   root.position.fromArray(position); root.rotation.y = building.transform.yaw + o.yaw;
   root.userData = {...root.userData, zone: 'field', keep: true, centre: [position[0], position[2]], cull: 155};
   this.scene.add(root);
   root.traverse(n => {n.userData.zone = 'field'; if (n.isMesh && !n.material?.transparent) this.occluders.push(n);});
   if (o.type === 'light') {
    for (const n of [...root.children]) if (n.isLight) root.remove(n);
    this.lamp(...position, o.colour, o.intensity, 'field', false);
   }
   if (o.binding?.type === 'container') {
    const anchor = toWorld(building.transform, bindingAnchor(o));
    const it = this.addInteract(root, 'container', o.binding.id, o.name, anchor); it.zone = 'field';
    this.containerMeshes[o.binding.id] = {group: root, hinge: new T.Group(), angle: 0};
   }
   if (o.type === 'doorway') {
    const pivot = root.userData.doorPivot, key = o.doorId || o.id;
    if (!o.doorId) {pivot.rotation.y = -Math.PI/2; continue;}
    const anchor = toWorld(building.transform, [o.position[0], o.position[1] + 1.3, o.position[2]]);
    const it = this.addInteract(pivot, 'door', key, o.name, anchor); it.zone = 'field';
    this.doors[key] = {root, pivot, closedMesh: pivot.children[0], collider: {off: false, zone: 'field'}, angle: 0};
   }
  }
  // A raised preview has an explicit support platform, matching the surface helper's
  // 2.5 m apron. This is preview support, not whole-map terrain compilation.
  if (building.transform.position[1] > 0) {
   const pad = new T.Mesh(new T.BoxGeometry(building.bounds[0]+5, .2, building.bounds[1]+5),
    new T.MeshStandardMaterial({color: '#737970', roughness: 1}));
   pad.position.fromArray(building.transform.position); pad.position.y -= .1;
   pad.rotation.y = building.transform.yaw; pad.userData = {zone: 'field', keep: true};
   this.scene.add(pad);
  }
  this.scene.updateMatrixWorld(true); this.setZone(this.state?.zone || 'field');
  if (this.state) this.updateState(this.state, this.state.loose);
  return this.info();
 }
 movePlayer(p, dx, dz) {
  const building = previewBuilding(DATA);
  if (building && (insidePreview(building, p.x, p.z, 2.5) || insidePreview(building, p.x+dx, p.z+dz, 2.5))) {
   const openDoors = {...Object.fromEntries(building.layout.objects.filter(o => o.type === 'doorway' && !o.doorId).map(o => [o.id, true])), ...this.state?.doors};
   const q = moveInPreview(building, p, dx, dz, {doorsOpen: false, openDoors});
   return validLand(q.x, q.z) ? q : p;
  }
  return super.movePlayer(p, dx, dz);
 }
 info() {
  return {...super.info(), editorPreview: DATA.editorLayout ? {
   building: DATA.editorLayout.buildingId, objects: DATA.editorLayout.objects.length,
   transform: previewBuilding(DATA).transform, versioned: !!DATA.editorBuilding,
   errors: this.layoutPreview?.errors || [],
  } : null};
 }
}
