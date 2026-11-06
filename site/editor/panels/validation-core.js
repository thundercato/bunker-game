// Cross-workspace review over existing contracts. No gameplay evaluator lives here.
import {validateWorldDocument,compileBuilding} from '../../world-document.js';
import {validateSpatial} from '../../layout-core.js';
import {interiorDiagnostics} from '../tools/interior-core.js';
import {worldWarnings} from '../world-core.js';
import {regionOf} from '../tools/world-authoring.js';
import {validateProposal as validateLoot,tableIssues} from './loot-core.js';
import {validateProposal as validateMissions,missionIssues} from './missions-core.js';
export function reviewDigest(value) {
 let hash=2166136261;for(const c of JSON.stringify(value)){hash=Math.imul(hash^c.charCodeAt(0),16777619);}
 return (hash>>>0).toString(16).padStart(8,'0');
}
export function reviewWorld({source,sourceRevision,document,assets=null,loot=null,missions=null}) {
 const issues=[],regions={},push=(level,scope,message,href=null,repair='')=>issues.push({level,scope,message,href,repair});
 const context={source,sourceRevision,assets},assetIds=assets?new Set(assets.map(a=>a.id)):null;
 let checked;
 try{checked=validateWorldDocument(document,{...context,assets:assetIds});}
 catch(e){push('error','World document',e.message,null,'Repair or import a valid canonical world document; your stored drafts were not changed.');}
 if(checked){
  for(const warning of worldWarnings(checked.authoring,source))push('warning','Terrain / paths',warning.text,'editor/world.html?select='+encodeURIComponent(warning.id),'Inspect foundation corners or reduce the path slope. World geometry remains authoring only.');
  for(const f of checked.authoring.foliage){const r=regionOf(f.z);regions[r]??={foliage:0,buildings:0,lights:0};regions[r].foliage++;}
  for(const b of checked.authoring.buildings){const r=regionOf(b.z);regions[r]??={foliage:0,buildings:0,lights:0};regions[r].buildings++;}
  const seenAssets=new Set();
  for(const layout of checked.interiors){
   const link=id=>'editor/?building='+encodeURIComponent(layout.buildingId)+(id?'&select='+encodeURIComponent(id):'');
   for(const q of [...validateSpatial(layout),...interiorDiagnostics(layout,{reachability:false})])push(q.level,'Building '+layout.buildingId,q.message,link(q.id),'Focus the object, enable collisions and check its floor, supports and door/stair clearance.');
   try{
    const building=compileBuilding(checked,layout.buildingId,{...context,assets:assetIds});
    const entrance=building.interactions.find(i=>i.type==='door'&&i.id===layout.buildingId);
    if(entrance){
     const [x,y,z]=entrance.position;
     const levels=[checked.authoring.waterLevel,...checked.authoring.water.filter(w=>Math.hypot(w.x-x,w.z-z)<=w.radius).map(w=>w.level)];
     const surface=Math.max(...levels);
     if(surface>y-.8)push('warning','Water / '+layout.buildingId,'An authored water surface intersects the entrance approach.',link('entrance'),'Lower the water or raise the approach. This checks visual surfaces, not runtime drowning or underground exclusion rules.');
    }
   }catch(e){push('error','Building '+layout.buildingId,e.message,link(),'Repair the canonical layout or its parent transform before preview.');}
   const placement=checked.authoring.buildings.find(b=>b.id===layout.buildingId),r=regionOf(placement.z);
   regions[r]??={foliage:0,buildings:0,lights:0};regions[r].lights+=layout.objects.filter(o=>o.type==='light'&&o.intensity>0).length;
   for(const o of layout.objects.filter(o=>o.type==='prop')){
    if(seenAssets.has(o.asset)||!assets)continue;seenAssets.add(o.asset);const asset=assets.find(a=>a.id===o.asset);
    if(!asset?.licence||!asset?.source)push('warning','Asset '+o.asset,'Asset licence/source provenance is incomplete.',link(o.id),'Inspect the shared model library and request missing provenance from the asset owner.');
   }
  }
  for(const [r,count]of Object.entries(regions)){
   if(count.foliage>500)push('warning','Performance / '+r,count.foliage+' explicit foliage proxy instances in this region.','editor/world.html','Reduce density or use the runtime instancing/LOD contract before high-density authoring. Counts are not a device benchmark.');
   if(count.lights>16)push('warning','Performance / '+r,count.lights+' authored active lights across loaded interiors.','editor/world.html','Review simultaneous light visibility and shadow budgets in actual preview.');
  }
 }
 if(loot)try{
  const proposal=validateLoot(loot,source);
  for(const [group,tables]of Object.entries({defaults:proposal.defaults,overrides:proposal.overrides}))for(const [id,table]of Object.entries(tables))for(const q of tableIssues(table,source.catalogue))push(q.level,'Loot '+group+'/'+id,q.message,'editor/loot.html'+(group==='overrides'?'?container='+encodeURIComponent(id):''),'Repair the table in Loot; capacity remains an authoring proposal limit.');
 }catch(e){push('error','Loot proposal',e.message,'editor/loot.html','Repair or recover the proposal. Legacy game loot has not been changed.');}
 if(missions)try{
  const proposal=validateMissions(missions,source);
  for(const m of proposal.missions)for(const q of missionIssues(m,source,proposal.missions))if(q.level!=='notice')push(q.level,'Mission '+m.id,q.message,'editor/missions.html?mission='+encodeURIComponent(m.id),'Review typed connections, prerequisites and policy fields. Graph execution is not installed in the game.');
 }catch(e){push('error','Mission proposal',e.message,'editor/missions.html','Recover or repair the proposal; actual game missions are unchanged.');}
 const digest=reviewDigest({document,loot,missions,sourceRevision});
 return {format:'field-signal-editor-validation-report/1',digest,sourceRevision,issues,regions,coverage:{interiors:checked?.interiors.length||0,buildings:source.buildings.length,unchecked:source.buildings.length-(checked?.interiors.length||0)},counts:{errors:issues.filter(i=>i.level==='error').length,warnings:issues.filter(i=>i.level==='warning').length},status:'Review only; no publication or runtime approval'};
}
