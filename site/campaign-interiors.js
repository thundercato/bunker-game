import {seedLayout, validateLayout} from './layout-core.js';

/** Authored campaign rooms. All children remain v1 editor objects and retain their
 * source bindings. These visual choices never replace a container's loot profile. */
export const CAMPAIGN_INTERIOR_BUILDINGS = Object.freeze(['forester', 'v1', 'v2', 'v3']);

// Metres, bottom-centre. Search variants face +Z; the imported Kenney furniture
// is normalised to -Z. Keep the explicit authored sizes checked against registries.
const sizes = {
 search_double_wall_cupboard: [1.08,.8,.38],
 search_glazed_wall_cabinet: [.9,.94,.4],
 search_wall_cupboard: [.72,.85,.38],
 search_tool_workbench: [1.5,1.3,.66],
 search_writing_desk: [1.15,.79,.6],
 search_rolltop_desk: [1.2,1.14,.67],
 search_chest_drawers: [.85,1.05,.48],
 search_wardrobe_single: [.8,1.95,.6],
 search_kitchen_drawers: [.6,.9,.6],
 search_kitchen_base: [.9,.9,.6],
 search_travel_trunk: [.9,.55,.5],
 search_wide_dresser: [1.35,.9,.5],
 search_linen_hamper: [.5,.7,.46],
 search_mirror_cabinet: [.65,.78,.22],
 campaign_lounge_sofa: [1.917391,.9,.802174],
 campaign_lounge_chair: [.958696,.9,.802174],
 campaign_chair: [.382979,.9,.382979],
 campaign_chair_desk: [.551267,1,.517279],
 campaign_bed_single: [.989733,.65,1.95],
 campaign_bed_double: [1.657067,.65,1.95],
 campaign_cabinet_bed: [.661578,.58,.534734],
 campaign_bookcase_open: [.818182,1.8,.511364],
 campaign_bathroom_sink: [.516071,.85,.440179],
 campaign_toilet: [.540594,.78,.825337],
 campaign_shower: [1.052686,2.05,1.090162],
 campaign_kitchen_sink: [.789796,.9,.826531],
 campaign_kitchen_stove: [.86,.9,.9],
 campaign_kitchen_fridge: [.864674,1.85,.587041],
 campaign_lamp_square_table: [.198621,.48,.198621],
 campaign_radio: [.372714,.27,.115364],
};
const halfTurn = Math.PI, quarterTurn = Math.PI/2;

function author(source, buildingId) {
 const doc = seedLayout(source, buildingId), upper = doc.objects.some(o=>o.id==='upper');
 if(doc.bounds[0]!==10||doc.bounds[1]!==9)throw Error('Campaign room plan needs its reviewed 10 × 9 m footprint: '+buildingId);
 const find = id => {
  const object = doc.objects.find(o=>o.id===id);
  if (!object) throw Error('Campaign interior source object missing: '+buildingId+'/'+id);
  return object;
 };
 const add = (id,name,type,position,size,extra={}) => {
  const object = {id,name,type,position:[...position],size:[...size],yaw:0,
   material:'wood',solid:true,locked:false,...extra};
  doc.objects.push(object); return object;
 };
 const prop = (id,name,asset,position,yaw=0) => {
  if (!sizes[asset]) throw Error('Campaign interior size missing: '+asset);
  return add(id,name,'prop',position,sizes[asset],{asset,yaw});
 };
 const bound = (suffix,asset,position,yaw) => {
  const o=find('container-'+buildingId+'_'+suffix);
  Object.assign(o,{asset,position:[...position],size:[...sizes[asset]],yaw});
  o.binding.floor=source.containers.find(c=>c.id===o.binding.id).floor||0;
 };
 const wall = (id,name,position,size,yaw=0) => add(id,name,'wall',position,size,{material:'plaster',yaw});
 const opening = (id,name,position,size,yaw=0,width=1.15) => add(id,name,'doorway',position,size,
  {material:'plaster',yaw,doorId:null,opening:{width,height:2.55,sill:0}});
 const light = (id,name,position,intensity,colour='#efd9ae') => add(id,name,'light',position,[.14,.12,.14],
  {intensity,colour,solid:false,material:'metal'});

 // Replace each opaque shell section with its own window wall. No intact wall
 // remains behind the glazing. Ground and upper windows are independent objects.
 const windowWall = (o,name,position,size,yaw,width=1.8,sill=1.12) => Object.assign(o,
  {name,type:'window',position,size,yaw,opening:{width,height:1.24,sill},material:'plaster'});
 windowWall(find('wall-north'),'Kitchen rear window',[0,0,-4.5],[10,3.2,.22],0,2.3);
 windowWall(find('wall-west'),'Kitchen west window',[-5,0,-2.1],[4.8,3.2,.22],quarterTurn,1.55);
 windowWall(add('wall-west-front','Living room west window','wall',[-5,0,2.4],[4.2,3.2,.22]),
  'Living room west window',[-5,0,2.4],[4.2,3.2,.22],quarterTurn,1.7);
 windowWall(find('wall-east'),'East window',[5,0,0],[9,3.2,.22],quarterTurn,1.7);
 find('entrance').size[1]=3.2;
 find('entrance').name='Front entrance';
 // The retained roof object owns its ceiling, pitched panels and gable trim.
 // A 35 cm overhang clears the wall faces; the sealed loft adds no playable floor.
 Object.assign(find('roof'),{name:'Pitched roof / sealed ceiling',size:[10.7,.18,9.7],roofRise:upper?2.1:1.9});
 if (upper) {
  for (const [id,name,pos,size,yaw,width] of [
   ['upper-wall-north','Upper landing rear window',[0,3.2,-4.5],[10,3.2,.22],0,1.65],
   ['upper-wall-west','Bedroom west window',[-5,3.2,0],[9,3.2,.22],quarterTurn,2],
   ['upper-wall-east','Stairwell east window',[5,3.2,0],[9,3.2,.22],quarterTurn,1.8],
   ['upper-wall-front','Bedroom front window',[0,3.2,4.5],[10,3.2,.22],0,1.7],
  ]) windowWall(add(id,name,'wall',pos,size),name,pos,size,yaw,width);
  // 1.6 m clear stair width, 5.8 m run: the 3.2 m rise is retained. Its shared
  // floor cutout leaves 1.29 m landings instead of the seed's 0.69 m strips.
  find('stairs-main').size=[1.6,3.2,5.8];
 }

 // Join existing partition pieces exactly; keep the existing internal door ID.
 const partitionId=buildingId+'_inner';
 Object.assign(find('partition-'+partitionId+'-0'),{position:[-2.995,0,.25],size:[3.79,3.2,.16]});
 Object.assign(find('partition-'+partitionId+'-1'),upper
  ? {position:[1.75,0,.25],size:[1.3,3.2,.16]}
  : {position:[2.995,0,.25],size:[3.79,3.2,.16]});
 find('partition-door-'+partitionId).size[1]=3.2;
 find('partition-door-'+partitionId).name='Kitchen passage';

 // Retained search targets get purposeful furniture. The former east drawer sat
 // under the stair run; the former locker crossed the partition at z=.25.
 const cupboard=buildingId==='v1'?'search_glazed_wall_cabinet':buildingId==='v2'?'search_wall_cupboard':'search_double_wall_cupboard';
 bound('c0',cupboard,[-4.69,1.38,-3.4],quarterTurn);
 bound('c2','search_wardrobe_single',[-4.55,0,1.05],quarterTurn);
 bound('kitchen','search_kitchen_drawers',[upper?1.3:-.8,0,-4.0],0);
 if (upper) {
  const desk=buildingId==='forester'?'search_tool_workbench':buildingId==='v2'?'search_rolltop_desk':'search_writing_desk';
  bound('c1',desk,[-2.4,0,-.25],halfTurn);
  if(buildingId==='v2') bound('chest','search_travel_trunk',[-4.5,3.2,-3],quarterTurn);
 } else bound('c1','search_chest_drawers',[4.65,0,-3.4],-quarterTurn);

 // Complete kitchen run: imported cooker, sink and refrigerator, plus a base
 // beneath the retained wall cupboard. Front -Z imports turn towards the room.
 prop('kitchen-base','Cupboard worktop','search_kitchen_base',[-4.55,0,-3.4],quarterTurn);
 prop('kitchen-cooker','Gas cooker','campaign_kitchen_stove',[-2.9,0,-3.92],halfTurn);
 prop('kitchen-sink','Sink below rear window','campaign_kitchen_sink',[-1.7,0,-3.92],halfTurn);
 prop('kitchen-fridge','Refrigerator','campaign_kitchen_fridge',[-4.55,0,-1.85],-quarterTurn);
 const table=find('surface-'+buildingId+'_table');
 table.name='Dining table • physical loot surface';
 table.position=[-2.3,.015,2.45]; table.size=[1.6,.985,.9];
 prop('dining-chair-north','Dining chair','campaign_chair',[-2.3,0,1.55],halfTurn);
 prop('dining-chair-south','Dining chair','campaign_chair',[-2.3,0,3.35]);
 prop('living-sofa','Sofa by the west window','campaign_lounge_sofa',[-4.1,0,2.75],-quarterTurn);
 // Small radios and lamps sit on actual supports, rather than on loose loot.
 prop('hall-radio-table','Hall radio stand','campaign_cabinet_bed',[1.65,0,1.4],halfTurn);
 prop('hall-radio','Household radio','campaign_radio',[1.65,.58,1.4],halfTurn);
 find('light-0').position=[-.4,2.65,2.1]; find('light-0').intensity=22;
 light('light-kitchen','Kitchen light',[-1.8,2.65,-2.2],24);

 if (upper) {
  // A full-height wall protects the west edge of the automatic stair opening.
  // The route leaves the top towards the rear, then turns west across a landing.
  wall('stairwell-guard','Stairwell wall and upper guard',[2.48,3.2,0],[5.65,2.8,.12],quarterTurn);
  wall('bedroom-wall-rear','Bedroom rear partition',[0,3.2,-3.425],[1.85,3.2,.14],quarterTurn);
  opening('bedroom-door','Bedroom doorway',[0,3.2,-1.7],[1.6,3.2,.14],quarterTurn,1.2);
  wall('bedroom-wall-front','Bedroom front partition',[0,3.2,1.725],[5.25,3.2,.14],quarterTurn);
  opening('bathroom-door','Bathroom doorway',[1.24,3.2,.45],[2.48,3.2,.14],0,1.1);
  const bedAsset=buildingId==='v1'?'campaign_bed_single':'campaign_bed_double';
  prop('bedroom-bed','Made bed',bedAsset,[-2.8,3.2,-.9],halfTurn);
  prop('bedroom-nightstand','Bedside stand','campaign_cabinet_bed',[-1.25,3.2,-1.5]);
  prop('bedroom-lamp','Bedside reading lamp','campaign_lamp_square_table',[-1.25,3.78,-1.5]);
  prop('bedroom-dresser','Bedroom dresser','search_wide_dresser',[-4.55,3.2,2.45],quarterTurn);
  prop('bedroom-bookcase','Bedroom books','campaign_bookcase_open',[-2.4,3.2,4.0]);
  if(buildingId==='v1') prop('bedroom-second-bed','Second single bed','campaign_bed_single',[-1.45,3.2,2.05]);
  else prop('bedroom-reading-chair','Reading chair','campaign_lounge_chair',[-1.25,3.2,2.15]);
  prop('bathroom-basin','Bathroom washbasin','campaign_bathroom_sink',[1.9,3.2,3.95]);
  prop('bathroom-mirror','Wall mirror cabinet','search_mirror_cabinet',[1.9,4.42,4.23],halfTurn);
  prop('bathroom-toilet','Toilet','campaign_toilet',[.65,3.2,3.85]);
  prop('bathroom-shower','Shower tray and screen','campaign_shower',[1.85,3.2,2.15],halfTurn);
  prop('bathroom-hamper','Linen hamper','search_linen_hamper',[.4,3.2,2.5]);
  find('light-1').position=[-2.4,5.85,.6]; find('light-1').intensity=19;
  light('light-upper-landing','Stair landing light',[1.25,5.85,-2.9],15,'#d4e0d8');
  light('light-bathroom','Bathroom light',[1.25,5.85,2.55],14,'#d4e0d8');
 } else {
  // Grey gable keeps its single-storey plan: a rear bedroom and front bathroom
  // flank the retained kitchen door. Neither invents an upstairs save location.
  wall('bedroom-wall-rear','Bedroom rear partition',[1.1,0,-3.495],[1.79,3.2,.14],quarterTurn);
  opening('bedroom-door','Bedroom doorway',[1.1,0,-1.8],[1.6,3.2,.14],quarterTurn,1.15);
  wall('bedroom-wall-front','Bedroom front partition',[1.1,0,-.375],[1.25,3.2,.14],quarterTurn);
  wall('bathroom-wall-rear','Bathroom rear side wall',[1.9,0,.875],[1.25,3.2,.14],quarterTurn);
  opening('bathroom-door','Bathroom doorway',[1.9,0,2.3],[1.6,3.2,.14],quarterTurn,1.1);
  wall('bathroom-wall-front','Bathroom front side wall',[1.9,0,3.745],[1.29,3.2,.14],quarterTurn);
  prop('bedroom-bed','Single bed','campaign_bed_single',[3.05,0,-1.65],halfTurn);
  prop('bedroom-nightstand','Bedside stand','campaign_cabinet_bed',[4.35,0,-1.15],halfTurn);
  prop('bedroom-lamp','Bedside reading lamp','campaign_lamp_square_table',[4.35,.58,-1.15]);
  prop('bathroom-basin','Bathroom washbasin','campaign_bathroom_sink',[4.6,0,2.2],quarterTurn);
  prop('bathroom-mirror','Wall mirror cabinet','search_mirror_cabinet',[4.73,1.22,2.2],-quarterTurn);
  prop('bathroom-toilet','Toilet','campaign_toilet',[4.15,0,1.05],halfTurn);
  prop('bathroom-shower','Shower tray and screen','campaign_shower',[4.15,0,3.8]);
  prop('bathroom-hamper','Linen hamper','search_linen_hamper',[2.55,0,3.75]);
  // The single-storey bathroom replaces the upper-house radio corner.
  doc.objects=doc.objects.filter(o=>!['hall-radio-table','hall-radio'].includes(o.id));
  light('light-bedroom','Bedroom light',[3.25,2.65,-1.65],16);
  light('light-bathroom','Bathroom light',[3.45,2.65,2.5],14,'#d4e0d8');
 }
 return validateLayout(doc,{world:source});
}

/** A pure, deterministic factory. The source world is never mutated. */
export function createCampaignInteriors(source) {
 return CAMPAIGN_INTERIOR_BUILDINGS.map(id=>author(source,id));
}
