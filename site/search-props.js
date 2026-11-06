import * as T from './vendor/three.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

/** Searchable visual catalogue. Loot and saved search state belong to the existing container. */
export const SEARCH_PROP_CATALOGUE_URL = new URL('./search-props.json', import.meta.url);
const profiles = new Set(['cupboard','drawers','locker','medical','crate','chest','workshop','vehicle']);
const kinds = new Set(['cabinet','drawers','wardrobe','desk','kitchen','sink','cooker','fridge','freezer','microwave','medical','mirror','hamper','trolley','locker','trunk','safe','files','pigeonhole','map','workbench','toolchest','toolbox','electrical','bins','crate','shipping','drum','suitcase','bag','cooler','shelf']);
const palettes = {
 oak: [0x5a4834,0x766048,0x9b805a,0x252724,0x3b3025],
 cream: [0x767968,0xb4b09a,0x929885,0x252e2c,0x575d53],
 white: [0x919d96,0xd0d5c5,0xa4b4ac,0x273130,0x69776d],
 olive: [0x485041,0x69735b,0x87907a,0x202823,0x313a30],
 blue: [0x354c52,0x58727a,0x8b9b98,0x1e2a2c,0x293b40],
 red: [0x633d35,0x8c5140,0xa17b5e,0x292827,0x4d332e],
 stainless: [0x707f7c,0x9daaa3,0xc0c9bc,0x243230,0x516360],
 plastic: [0x435b5e,0x668482,0xb9bba4,0x27312e,0x394c4b],
 canvas: [0x5c5942,0x848069,0xa8a183,0x292c25,0x444735],
};
const templateCache = new Map(), materialCache = new Map(), importedCaches = new WeakMap();
const compositeMaterial = new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.8,metalness:.15});
let cataloguePromise;

export function validateSearchPropCatalogue(data) {
 if (data?.schema !== 'field-signal-search-props' || data.version !== 1 || !Array.isArray(data.props)) throw Error('Unsupported searchable prop catalogue');
 const ids = new Set();
 for (const p of data.props) {
  if (!/^search_[a-z][a-z0-9_]*$/.test(p.id) || ids.has(p.id)) throw Error('Invalid or duplicate searchable prop ID: '+p.id);
  ids.add(p.id);
  if (!p.name || !profiles.has(p.profile) || !kinds.has(p.recipe?.kind) || !palettes[p.materials?.palette]) throw Error('Invalid searchable prop recipe: '+p.id);
  if (!Array.isArray(p.dimensions) || p.dimensions.length!==3 || p.dimensions.some(n=>!Number.isFinite(n)||n<=0||n>6)) throw Error('Invalid prop dimensions: '+p.id);
  if (!['floor','wall'].includes(p.mount) || p.front!=='+Z' || !Array.isArray(p.rooms) || !p.rooms.length || p.rooms.some(room=>typeof room!=='string'||!room) || !p.category) throw Error('Invalid prop placement: '+p.id);
  for(const [key,min,max]of [['doors',1,4],['rows',1,12],['columns',1,8],['shelves',0,8],['drawers',1,4],['slats',1,12],['ribs',1,24],['vents',0,3],['bands',0,4],['basins',1,2],['compartments',1,2],['pedestals',0,2]]){
   if(p.recipe[key]!=null&&(!Number.isInteger(p.recipe[key])||p.recipe[key]<min||p.recipe[key]>max))throw Error('Invalid prop recipe '+key+': '+p.id);
  }
  if (p.interaction?.binding!=='container' || !Number.isFinite(p.interaction.reach) || p.interaction.reach<=0 || p.interaction.anchor?.length!==3 || p.interaction.anchor.some(n=>!Number.isFinite(n))) throw Error('Invalid prop interaction: '+p.id);
  if (p.collision?.type!=='box' || !p.collision.size?.every((n,i)=>n===p.dimensions[i]) || p.collision.size.length!==3 || p.collision.offset?.length!==3 || p.collision.offset.some((n,i)=>n!==(i===1?p.dimensions[1]/2:0))) throw Error('Prop collider does not match dimensions: '+p.id);
  if (!['slide','lid','hinge'].includes(p.opening) || !p.provenance?.author || !p.provenance.source || !p.provenance.licence) throw Error('Missing prop provenance or opening: '+p.id);
  if(p.editor?.asset!==p.id||p.editor.bindingType!=='container'||p.editor.requiresExistingContainerId!==true)throw Error('Invalid prop editor binding: '+p.id);
  if (p.licensedAsset && (!/^[a-z0-9_]+$/.test(p.licensedAsset.id) || !/^assets\/v10\/models\/[a-z0-9_]+\.glb$/.test(p.licensedAsset.path) || !p.licensedAsset.movingParts?.length)) throw Error('Invalid licensed prop source: '+p.id);
 }
 return data;
}

export async function loadSearchPropCatalogue() {
 if (!cataloguePromise) cataloguePromise = fetch(SEARCH_PROP_CATALOGUE_URL).then(async r=>{
  if(!r.ok) throw Error('Searchable prop catalogue unavailable ('+r.status+')');
  return validateSearchPropCatalogue(await r.json());
 }).catch(e=>{cataloguePromise=null;throw e;});
 return cataloguePromise;
}

export async function getSearchProp(id,{catalogue}={}) {
 const data = catalogue || await loadSearchPropCatalogue();
 const p = data.props.find(p=>p.id===id);
 if (!p) throw Error('Unknown searchable prop: '+id);
 return p;
}

/** AABB of the same closed footprint used by the renderer. Use authored yaw for rotated collision tests. */
export function searchPropCollider(p,{x=0,y=0,z=0,yaw=0}={}) {
 const [w,h,d]=p.dimensions,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
 return {x,z,w:w*c+d*s,d:w*s+d*c,minY:y,maxY:y+h,searchProp:p.id};
}

function materialSet(p, overrides={}) {
 const palette=p.materials.palette;
 if (!Object.keys(overrides).length && materialCache.has(palette)) return materialCache.get(palette);
 const colours=palettes[palette],out={};
 for (const [i,key] of ['body','front','trim','dark','edge'].entries()) out[key]=overrides[key]||new T.MeshStandardMaterial({color:colours[i],roughness:.86,metalness:['blue','olive','red','stainless'].includes(palette)?.28:.03});
 Object.assign(out,{
  metal:overrides.metal||new T.MeshStandardMaterial({color:0x9b9d86,roughness:.48,metalness:.65}),
  paper:overrides.paper||new T.MeshStandardMaterial({color:0xb8b399,roughness:.95}),
  mark:overrides.mark||new T.MeshStandardMaterial({color:0xa34234,roughness:.85}),
  // Opaque smoky glazing keeps the small props cheap and avoids sorting artefacts.
  glass:overrides.glass||new T.MeshStandardMaterial({color:0x51635d,roughness:.28,metalness:.3}),
 });
 if(!Object.keys(overrides).length)materialCache.set(palette,out);
 return out;
}

function motion(group,mode,amount,axis) {
 group.userData.searchMotion={mode,amount,axis,rest:mode==='slide'?group.position[axis]:group.rotation[axis]};
 return group;
}

/** Stateless opening: use the existing once-searched flag; no new loot/save state is stored here. */
export function setSearchPropOpen(root,progress) {
 const value=Number.isFinite(progress)?T.MathUtils.clamp(progress,0,1):0;
 root.traverse(o=>{
  const m=o.userData.searchMotion;
  if(m)(m.mode==='slide'?o.position:o.rotation)[m.axis]=m.rest+m.amount*value;
 });
 root.userData.searchPropOpen=value;
 return root;
}

// Detail is authored as reusable solid pieces, then merged by material per moving assembly.
function builder(p,materials) {
 const root=new T.Group(),r=p.recipe,[w,h,d]=p.dimensions,m=materialSet(p,materials);
 let part=0,lastDoors=[];
 const box=(parent,key,x,y,z,sx,sy,sz,rot=0)=>{
  const g=new T.BoxGeometry(Math.max(.003,sx),Math.max(.003,sy),Math.max(.003,sz));
  const mesh=new T.Mesh(g,m[key]);mesh.position.set(x,y,z);mesh.rotation.z=rot;mesh.name='piece-'+part++;parent.add(mesh);return mesh;
 };
 const cyl=(parent,key,x,y,z,radius,height,axis='y',segments=10)=>{
  const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,height,segments,1),m[key]);
  mesh.position.set(x,y,z);if(axis==='z')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.z=Math.PI/2;parent.add(mesh);return mesh;
 };
 const handle=(parent,x,y,z,wide=.12)=>{
  box(parent,'metal',x-wide/2,y,z,.015,.018,.04);box(parent,'metal',x+wide/2,y,z,.015,.018,.04);box(parent,'metal',x,y,z+.023,wide+.015,.022,.018);
 };
 const label=(parent,x,y,z,width=.1)=>{
  box(parent,'metal',x,y,z,width,.042,.008);box(parent,'paper',x,y,z+.006,width-.013,.025,.006);box(parent,'dark',x,y,z+.011,width*.52,.004,.002);
 };
 const feet=(height=.08,wheels=false)=>{
  for(const x of [-w*.4,w*.4])for(const z of [-d*.35,d*.35]){
   if(wheels){box(root,'metal',x,height*.8,z,.025,height,.035);cyl(root,'dark',x,height*.4,z,height*.35,.038,'x');}
   else box(root,'edge',x,height/2,z,.055,height,.055);
  }
 };
 const frame=(bottom=.06,top=h,depth=d)=>{
  const th=.025;
  box(root,'body',-w/2+th/2,(top+bottom)/2,0,th,top-bottom,depth);
  box(root,'body',w/2-th/2,(top+bottom)/2,0,th,top-bottom,depth);
  box(root,'edge',0,(top+bottom)/2,-depth/2+.012,w,top-bottom,.024);
  box(root,'body',0,bottom,0,w,.035,depth);box(root,'trim',0,top-.02,0,w+.015,.04,depth+.012);
  if(r.plinth)box(root,'dark',0,bottom/2,0,w*.93,bottom,depth*.93);
  if(r.feet)feet(bottom);
 };
 const shelves=(count=2,bottom=.06,top=h,depth=d)=>{
  for(let i=1;i<=count;i++)box(root,'body',0,bottom+(top-bottom)*i/(count+1),-.015,w-.05,.018,depth-.06);
 };
 const doors=(columns=1,bottom=.09,top=h-.06,depth=d,options={})=>{
  lastDoors=[];
  const rows=r.stacked?2:1;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const ww=(w-.055)/columns,hh=(top-bottom)/rows-.012,x=-w/2+.03+col*ww,y=bottom+row*(top-bottom)/rows;
   const pivot=new T.Group();pivot.position.set(x,y,depth/2-.015);root.add(pivot);motion(pivot,'hinge',-1.08,'y');lastDoors.push(pivot);
   box(pivot,'front',ww/2,hh/2,0,ww-.012,hh,.03);
   if(r.glazed||r.mesh||r.kind==='mirror'){
    box(pivot,r.kind==='mirror'||r.glazed?'glass':'dark',ww/2,hh*.54,.02,ww*.75,hh*.73,.012);
    if(r.mesh)for(let i=1;i<7;i++){box(pivot,'trim',ww*i/7,hh*.53,.029,.008,hh*.72,.007);box(pivot,'trim',ww/2,hh*.16+i*hh*.1,.031,ww*.74,.008,.007);}
   }else{
    box(pivot,'edge',ww/2,hh*.5,.019,ww*.8,hh*.81,.009);box(pivot,'front',ww/2,hh*.5,.026,ww*.77,hh*.77,.008);
   }
   handle(pivot,ww*.83,hh*.5,.045,Math.min(.09,ww*.25));
   for(const yy of [hh*.18,hh*.8])box(pivot,'metal',.012,yy,.025,.025,.05,.018);
   if(r.louvres)for(let i=0;i<10;i++)box(pivot,'trim',ww/2,hh*.16+i*hh*.066,.034,ww*.72,.018,.018);
   if(r.vents)for(let k=0;k<r.vents;k++)for(let i=0;i<4;i++)box(pivot,'dark',ww/2,hh*(.18+k*.55)+i*.021,.037,ww*.46,.008,.006);
   if(r.kind==='locker'||r.labels)label(pivot,ww*.5,hh*.8,.043);
   if(options.cross){box(pivot,'mark',ww*.5,hh*.55,.04,ww*.42,.06,.01);box(pivot,'mark',ww*.5,hh*.55,.043,.06,hh*.4,.01);}
  }
  return lastDoors;
 };
 const onDoor=(group,door=lastDoors[0])=>{root.updateMatrixWorld(true);door.attach(group);};
 const drawers=(rows,columns=1,bottom=.08,top=h-.06,left=-w/2+.025,width=w-.05,depth=d)=>{
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const ww=width/columns-.012,hh=(top-bottom)/rows-.014,x=left+(col+.5)*width/columns,y=bottom+(row+.5)*(top-bottom)/rows;
   // Opening the primary drawer is enough to communicate search state. Other fronts
   // stay in the static batch, especially the 24 small apothecary drawers.
   const group=row===rows-1&&col===0?new T.Group():root;
   if(group!==root){root.add(group);motion(group,'slide',Math.min(.34,depth*.55),'z');}
   box(group,'front',x,y,depth/2,ww,hh,.032);
   box(group,'dark',x,y-hh*.42,0,ww-.025,.018,depth-.05);
   for(const side of [-1,1])box(group,'body',x+side*(ww/2-.018),y,.02,.024,hh*.8,depth-.07);
   box(group,'body',x,y,-depth/2+.03,ww,.8*hh,.02);
   handle(group,x,y,depth/2+.032,Math.min(.16,ww*.35));
   if(r.labels)label(group,x,y+hh*.25,depth/2+.022,Math.min(.11,ww*.6));
  }
 };
 const lid=(height=h,depth=d)=>{
  const pivot=new T.Group();pivot.position.set(0,height-.025,-depth/2);root.add(pivot);motion(pivot,'lid',-1.15,'x');
  box(pivot,'front',0,0,depth/2,w,.045,depth);handle(pivot,0,.035,depth*.78,Math.min(.18,w*.4));
  for(const x of [-w*.3,w*.3])box(pivot,'metal',x,-.01,depth-.012,.045,.09,.028);
  return pivot;
 };
 const top=(y=h)=>box(root,'trim',0,y-.022,0,w+.025,.045,d+.025);
 const ring=(parent,key,x,y,z,rad,th=.015)=>{
  const mesh=new T.Mesh(new T.TorusGeometry(rad,th,4,12),m[key]);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);
 };
 switch(r.kind){
 case 'cabinet':case 'kitchen':case 'wardrobe':case 'medical':case 'mirror':case 'locker':case 'electrical': {
  if(r.corner){
   box(root,'body',-w/2+.015,h*.5,0,.03,h,d);box(root,'body',0,h*.5,-d/2+.015,w,h,.03);
   const shape=new T.Shape();shape.moveTo(-w/2,-d/2);shape.lineTo(w/2,-d/2);shape.lineTo(-w/2,d/2);shape.closePath();
   for(const y of [.03,h*.5,h]){const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false}),m.trim);mesh.rotation.x=Math.PI/2;mesh.position.y=y;root.add(mesh);}
   const pivot=new T.Group();pivot.position.set(-w/2,.04,d/2);pivot.rotation.y=Math.atan2(d,w);root.add(pivot);motion(pivot,'hinge',-1.05,'y');const diagonal=Math.hypot(w,d);box(pivot,'front',diagonal/2,h*.46,0,diagonal-.018,h*.9,.035);handle(pivot,diagonal*.83,h*.45,.035,.09);break;
  }
  const bottom=r.feet?.11:.055,upper=r.drawers?h*.72:h-.04;
  frame(bottom);shelves(r.shelves||1,bottom,upper);
  doors(r.doors||1,bottom+.03,upper,d,{cross:r.cross});
  if(r.drawers)drawers(1,r.drawers,upper+.015,h-.065);
  if(r.counter)top();
  if(r.crown){box(root,'trim',0,h-.005,-.015,w+.05,.04,d+.035);box(root,'edge',0,h-.07,-d/2,w,.12,.025);}
  if(r.rail)cyl(root,'metal',0,h*.81,0,.014,w*.82,'x');
  if(r.topShelf)box(root,'body',0,h*.87,0,w*.92,.023,d*.9);
  if(r.divider)box(root,'body',w*.22,h*.48,0,.025,h*.84,d*.89);
  if(r.pegboard)for(let i=0;i<5;i++)for(let j=0;j<3;j++)box(root,'dark',-w*.35+i*w*.17,h*.2+j*h*.22,-d/2+.03,.015,.015,.008);
  if(r.warning){const detail=new T.Group();root.add(detail);box(detail,'paper',0,h*.7,d/2+.04,w*.3,h*.16,.012);box(detail,'mark',0,h*.7,d/2+.05,.04,h*.12,.01);box(detail,'dark',0,h*.9,d/2+.04,w*.5,.028,.012);onDoor(detail);}
  break;
 }
 case 'drawers':case 'files':case 'map':case 'toolchest':
  frame(r.wheels?.12:.08);drawers(r.rows||3,r.columns||1,r.wheels?.15:.09,h-.07);if(r.counter)top();if(r.wheels)feet(.12,true);
  if(r.kind==='toolchest'){box(root,'dark',0,h-.03,0,w*.87,.025,d*.8);for(const x of [-w/2,w/2])handle(root,x,h*.8,0,.12);}
  break;
 case 'desk':case 'workbench': {
  const surface=r.rolltop?h*.68:h;top(surface);
  for(const x of [-w*.44,w*.44])for(const z of [-d*.4,d*.4])box(root,'body',x,surface/2,z,.055,surface,.055);
  box(root,'edge',0,surface*.78,-d*.4,w*.92,.13,.025);
  const n=r.pedestals??1;
  if(n===0)drawers(1,1,surface*.7,surface-.065,-w*.42,w*.84);
  else for(let i=0;i<n;i++){const left=i===0?-w*.46:w*.2,width=w*(n===2?.26:.31);drawers(r.rows||3,1,.1,surface-.07,left,width);box(root,'body',left+width/2,surface*.5,-d*.45,width,surface*.83,.03);}
  if(r.rolltop){box(root,'body',0,h*.82,-d*.42,w*.97,h*.36,.04);for(const x of [-w*.47,w*.47])box(root,'body',x,h*.82,-d*.08,.035,h*.36,d*.77);for(let i=0;i<10;i++)box(root,'trim',0,h*.69+i*h*.029,d*.23-i*d*.033,w*.9,.027,.03);}
  if(r.pegboard){box(root,'body',0,h*1.18,-d*.45,w*.95,h*.42,.03);for(let i=0;i<10;i++)for(let j=0;j<3;j++)box(root,'dark',-w*.4+i*w*.088,h*1.04+j*h*.11,-d*.43,.012,.012,.008);for(let i=0;i<3;i++){box(root,'metal',-w*.28+i*w*.2,h*1.13,-d*.4,.025,.13,.03);cyl(root,'metal',-w*.28+i*w*.2,h*1.22,-d*.4,.026,.025,'z',6);}}
  break;
 }
 case 'sink': {
  frame(.08,h*.88);doors(r.doors||2,.1,h*.84);top(h*.9);
  const n=r.basins||1,bw=w*(n===2?.36:r.drainer?.46:.7),cx=n===1&&r.drainer?-w*.16:0;
  for(let i=0;i<n;i++){const x=n===1?cx:(i-.5)*w*.44;box(root,'dark',x,h*.914,0,bw,.02,d*.62);for(const z of [-d*.31,d*.31])box(root,'metal',x,h*.936,z,bw+.025,.04,.025);for(const side of [-1,1])box(root,'metal',x+side*bw/2,h*.936,0,.025,.04,d*.65);box(root,'glass',x,h*.925,0,bw*.8,.015,d*.47);cyl(root,'dark',x,h*.937,0,.023,.01);}
  cyl(root,'metal',0,h*.975,-d*.32,.018,h*.13);cyl(root,'metal',0,h*1.036,-d*.24,.016,d*.17,'z');
  for(const side of [-1,1])cyl(root,'metal',side*w*.12,h*.94,-d*.32,.022,.04);
  if(r.drainer)for(let i=0;i<6;i++)box(root,'metal',w*.26+i*w*.025,h*.93,0,.009,.008,d*.56);
  break;
 }
 case 'cooker': {
  frame(.06,h*.91);doors(1,.14,h*.73,d);const window=new T.Group();root.add(window);box(window,'glass',0,h*.43,d/2+.026,w*.71,h*.36,.012);onDoor(window);
  box(root,'front',0,h*.82,d/2,w*.96,h*.13,.045);
  for(let i=0;i<4;i++)cyl(root,'dark',(-1.5+i)*w*.2,h*.82,d/2+.04,w*.035,.025,'z');
  top(h*.94);for(const x of [-w*.24,w*.24])for(const z of [-d*.23,d*.23]){cyl(root,'dark',x,h*.97,z,w*.14,.02);if(r.gas){box(root,'metal',x,h*.99,z,w*.32,.016,.018);box(root,'metal',x,h*.99,z,.018,.016,d*.3);}else ring(root,'metal',x,h*.99,z,w*.105,.007);}
  box(root,'front',0,h-.025,-d*.46,w,.09,.04);break;
 }
 case 'fridge':
  frame(.03);shelves(3,.08,h-.07);for(let i=0;i<(r.compartments||1);i++){const g=new T.Group(),bottom=i===0?.05:h*.72,hh=(r.compartments===2?(i===0?h*.65:h*.22):h*.9);g.position.set(-w/2+.025,bottom,d/2);root.add(g);motion(g,'hinge',-1.12,'y');box(g,'front',w/2-.025,hh/2,0,w-.05,hh,.055);handle(g,w*.83,hh*.5,.05,.08);box(g,'edge',w/2,hh*.12,-.03,w*.78,.065,.04);}for(let i=0;i<5;i++)box(root,'dark',0,.065+i*.013,d/2+.034,w*.75,.006,.006);break;
 case 'microwave':
  {frame(.025);doors(1,.055,h-.055,d*.77);const window=new T.Group();root.add(window);box(window,'glass',-w*.09,h*.5,d*.385+.035,w*.58,h*.6,.018);onDoor(window);box(root,'dark',w*.36,h*.57,d*.4,w*.15,h*.27,.02);for(let j=0;j<3;j++)for(let i=0;i<2;i++)box(root,'paper',w*(.33+i*.06),h*(.28+j*.065),d*.414,.018,.018,.008);cyl(root,'trim',0,.06,0,w*.3,.016,'y',16);for(let i=0;i<5;i++)box(root,'dark',-w*.3+i*w*.08,h*.88,-d*.3,.018,.008,d*.2);break;}
 case 'freezer':case 'trunk':case 'suitcase':case 'cooler':case 'toolbox':case 'hamper': {
  frame(.04,h-.06);box(root,'body',0,.04+(h-.085)/2,d/2,w,h-.085,.035);const l=lid();
  for(let i=0;i<(r.bands||0);i++){const x=(i-(r.bands-1)/2)*w*.55/(r.bands===1?1:r.bands-1);box(root,'metal',x,h*.45,d/2+.017,.045,h*.8,.015);box(l,'metal',x,.026,d/2,.045,.012,d*.95);}
  if(r.stencil)for(let i=0;i<3;i++)box(root,'paper',w*.14+i*.06,h*.44,d/2+.03,.036,.09,.009);
  if(r.cash){cyl(root,'dark',0,h*.57,d/2+.03,.014,.02,'z');box(root,'metal',0,h*.57,d/2+.015,.055,.045,.01);}
  if(r.cross){box(l,'mark',0,.03,d*.5,w*.5,.012,d*.15);box(l,'mark',0,.031,d*.5,w*.12,.012,d*.6);}
  if(r.curved)for(let i=0;i<7;i++)box(l,'trim',0,.03+Math.sin(i*Math.PI/6)*h*.1,d*i/6,w,.03,d/6);
  if(r.kind==='cooler')for(const x of [-w/2,w/2])box(root,'trim',x,h*.63,0,.025,.08,d*.42);
  if(r.weave)for(let i=0;i<12;i++)box(root,'trim',0,h*.08+i*h*.07,d/2+.015,w*.91,.018,.013);
  if(r.cantilever){for(const side of [-1,1]){box(l,'trim',side*w*.24,.065,d*.5,w*.43,.1,d*.9);box(root,'metal',side*w*.42,h*.7,d/2+.025,.02,h*.32,.015,side*.35);}handle(l,0,.12,d*.5,w*.4);}
  if(r.kind==='freezer'){box(root,'dark',w*.35,h*.3,d/2+.025,.055,.035,.015);for(let i=0;i<4;i++)box(root,'edge',-w*.25+i*.035,h*.16,d/2+.016,.01,.09,.01);}
  break;
 }
 case 'trolley':
  feet(.12,true);frame(.15,h*.78);drawers(r.rows||2,1,h*.38,h*.77);top(h*.87);for(const x of [-w*.44,w*.44])box(root,'metal',x,h*.94,-d*.3,.025,h*.12,.025);box(root,'metal',0,h,-d*.3,w*.9,.025,.025);box(root,'dark',0,h*.27,0,w*.82,.025,d*.8);break;
 case 'safe': {
  frame(.025);doors(1,.055,h-.055);const detail=new T.Group();root.add(detail);box(detail,'edge',0,h*.5,d/2+.049,w*.7,h*.67,.018);
  if(r.dial){cyl(detail,'metal',-w*.12,h*.58,d/2+.077,w*.095,.025,'z',16);cyl(detail,'dark',-w*.12,h*.58,d/2+.1,w*.065,.025,'z',16);for(const a of [0,Math.PI*2/3,Math.PI*4/3]){const mesh=box(detail,'metal',w*.14+Math.cos(a)*w*.1,h*.45+Math.sin(a)*w*.1,d/2+.09,w*.14,.025,.024);mesh.rotation.z=a;}}
  if(r.keypad){box(detail,'dark',0,h*.6,d/2+.07,w*.3,h*.26,.016);for(let i=0;i<3;i++)for(let j=0;j<3;j++)box(detail,'paper',(i-1)*w*.07,h*.56+j*h*.055,d/2+.085,w*.034,h*.025,.008);}
  onDoor(detail);
  break;
 }
 case 'pigeonhole':case 'bins':case 'shelf': {
  frame(.04);const rows=r.rows||3,cols=r.columns||3;for(let j=0;j<rows;j++){const yy=(j+.5)*(h-.1)/rows+.05;box(root,'body',0,yy-(h-.1)/rows/2,0,w-.04,.018,d*.95);for(let i=0;i<cols;i++){const xx=(i+.5)*w/cols-w/2;if(r.kind==='pigeonhole'){box(root,'body',xx+w/cols/2,yy,0,.016,(h-.1)/rows,d*.9);box(root,'paper',xx,yy-h/rows*.25,d*.15,w/cols*.8,.018,d*.4);}else{const group=j===rows-1&&i===0?new T.Group():root;if(group!==root){root.add(group);motion(group,'slide',d*.45,'z');}box(group,r.kind==='bins'?'front':'paper',xx,yy,0,w/cols*.86,(h-.1)/rows*.7,d*.78);box(group,'dark',xx,yy+((h-.1)/rows)*.36,0,w/cols*.65,.012,d*.56);label(group,xx,yy,d*.4,w/cols*.35);}}}
  if(r.kind==='pigeonhole'){const flap=new T.Group();flap.position.set(-w/2,.04,d/2);root.add(flap);motion(flap,'hinge',-1,'y');box(flap,'front',w/2,.025,.02,w,.05,.03);handle(flap,w*.88,.025,.045,.07);}
  break;
 }
 case 'crate': {
  frame(.04,h-.06);for(const side of [-1,1]){for(let i=0;i<(r.slats||4);i++)box(root,'front',0,(i+.5)*(h-.07)/(r.slats||4),side*d/2,w,(h-.07)/(r.slats||4)*.82,.028);for(const x of [-w*.43,w*.43])box(root,'trim',x,h*.5,side*(d/2+.014),.065,h,.033);}
  if(r.diagonal)box(root,'trim',0,h*.5,d/2+.04,w*.95,.065,.035,Math.atan2(h*.7,w*.8));lid();break;
 }
 case 'shipping': {
  frame(.04);const leaves=doors(2,.07,h-.04);for(const side of [-1,1])for(let i=0;i<r.ribs;i++)box(root,'trim',side*w/2,h*.5,-d/2+(i+.5)*d/r.ribs,.035,h*.92,.055);for(const x of [-w*.48,w*.48])for(const z of [-d*.48,d*.48])box(root,'dark',x,h*.5,z,.1,h,.1);for(const [i,x]of [-w*.25,w*.25].entries()){const rods=new T.Group();root.add(rods);box(rods,'metal',x,h*.5,d/2+.065,.027,h*.87,.025);handle(rods,x,h*.42,d/2+.09,.11);onDoor(rods,leaves[i]);}break;
 }
 case 'drum': {
  const rad=w*.48;cyl(root,'body',0,h*.49,0,rad,h*.96,'y',16);for(let i=0;i<(r.bands||2);i++)ring(root,'trim',0,h*(.18+i*.62),0,rad,.022);
  const g=new T.Group();g.position.set(0,h,-d*.4);root.add(g);motion(g,'lid',-.85,'x');cyl(g,'front',0,-.02,d*.4,rad,.035,'y',16);ring(g,'metal',0,0,d*.4,rad,.009);cyl(g,'dark',w*.2,.008,d*.3,.026,.02);
  if(r.spigot){cyl(root,'metal',0,h*.2,d*.49,.022,.09,'z');box(root,'trim',0,h*.23,d*.54,.08,.02,.018);box(root,'paper',0,h*.55,d*.485,w*.4,h*.2,.012);}break;
 }
 case 'bag': {
  box(root,'body',0,h*.43,0,w*.92,h*.73,d*.88);for(const x of [-w*.4,w*.4])box(root,'front',x,h*.43,0,w*.16,h*.72,d*.98);for(const x of [-w*.23,w*.23]){box(root,'trim',x,h*.43,d*.47,.035,h*.68,.02);box(root,'trim',x,h*.8,0,.035,.025,d*.9);}const g=new T.Group();g.position.set(-w*.45,h*.82,0);root.add(g);motion(g,'lid',-.8,'z');box(g,'front',w*.45,0,0,w*.88,.025,d*.86);box(g,'metal',w*.45,.018,0,w*.8,.008,.012);handle(g,w*.45,.035,0,w*.24);break;
 }
 default: throw Error('Unimplemented searchable prop recipe: '+r.kind);
 }
 root.name=p.id;return root;
}

function mergeAssemblies(root,vertexColors=true) {
 // Recurse through animation groups; never merge a drawer/hinge into the static body.
 for(const child of [...root.children])if(!child.isMesh)mergeAssemblies(child,vertexColors);
 root.updateWorldMatrix(true,true);
 for(const child of [...root.children])if(!child.isMesh&&!child.userData.searchMotion&&child.children.every(o=>o.isMesh)){
  for(const mesh of [...child.children])root.attach(mesh);
  root.remove(child);
 }
 const groups=new Map();
 for(const mesh of [...root.children])if(mesh.isMesh){mesh.updateMatrix();const geom=mesh.geometry.clone();geom.applyMatrix4(mesh.matrix);const flat=geom.index?geom.toNonIndexed():geom;if(flat!==geom)geom.dispose();const material=vertexColors?compositeMaterial:mesh.material;if(vertexColors){const colors=new Float32Array(flat.attributes.position.count*3),c=mesh.material.color,existing=mesh.material.vertexColors?flat.attributes.color:null;for(let i=0;i<colors.length;i+=3){const vertex=i/3;colors[i]=c.r*(existing?existing.getX(vertex):1);colors[i+1]=c.g*(existing?existing.getY(vertex):1);colors[i+2]=c.b*(existing?existing.getZ(vertex):1);}flat.setAttribute('color',new T.BufferAttribute(colors,3));}const list=groups.get(material)||[];list.push(flat);groups.set(material,list);root.remove(mesh);mesh.geometry.dispose();}
 for(const [material,parts]of groups){const g=mergeGeometries(parts,false);for(const part of parts)part.dispose();if(!g)throw Error('Could not merge searchable prop');g.computeBoundingSphere();const mesh=new T.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
}

async function importedModel(p,library) {
 const source=await library.get(p.licensedAsset.id),root=source.clone(true);root.updateMatrixWorld(true);
 const matches=[];
 root.traverse(o=>{if(p.licensedAsset.movingParts.includes(o.name))matches.push(o);});
 if(matches.length!==p.licensedAsset.movingParts.length)throw Error('Licensed searchable part missing: '+p.id);
 if(p.licensedAsset.mode==='hinge'){
  for(const node of matches){const b=new T.Box3().setFromObject(node),pivot=new T.Group();pivot.position.set(b.min.x,b.min.y,b.min.z);root.add(pivot);pivot.updateMatrixWorld(true);pivot.attach(node);motion(pivot,'hinge',-1.05,'y');}
 }else{
  const bounds=new T.Box3().setFromObject(root),pivot=new T.Group(),mode=p.licensedAsset.mode;
  pivot.position.set(0,bounds.max.y,bounds.min.z);root.add(pivot);pivot.updateMatrixWorld(true);
  for(const node of matches)pivot.attach(node);
  motion(pivot,mode,mode==='slide'?(bounds.max.z-bounds.min.z)*.45:-1.1,mode==='slide'?'z':'x');
 }
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return root;
}

function normalise(root,p,source,error=null) {
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
 if(size.toArray().some(n=>!Number.isFinite(n)||n<=0))throw Error('Empty searchable prop geometry: '+p.id);
 const content=new T.Group();content.add(root);root.position.sub(new T.Vector3(centre.x,bounds.min.y,centre.z));
 content.scale.set(...p.dimensions.map((n,i)=>n/size.getComponent(i)));
 const holder=new T.Group();holder.name=p.id;holder.add(content);
 let meshes=0,triangles=0;holder.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
 holder.userData.searchProp={id:p.id,dimensions:[...p.dimensions],profile:p.profile,mount:p.mount,front:p.front,renderSource:source,sourceAsset:source==='licensed-model'?p.licensedAsset.id:null,meshes,triangles,...(error?{fallbackReason:error}:{} )};
 return holder;
}

/** Returns an independent Group, bottom-centred, metres, front +Z. Geometries/materials are shared. */
export async function createSearchProp(id,{library,materials={},catalogue}={}) {
 const p=await getSearchProp(id,{catalogue}),custom=Object.keys(materials).length>0;
 let cache=templateCache;
 if(p.licensedAsset&&library){if(!importedCaches.has(library))importedCaches.set(library,new Map());cache=importedCaches.get(library);}
 const key=p.id;
 if(!custom&&cache.has(key))return (await cache.get(key)).clone(true);
 const pending=(async()=>{
  let object,source='original-composite',error=null;
  if(p.licensedAsset&&library){try{object=await importedModel(p,library);source='licensed-model';}catch(e){error=e.message;}}
  if(!object){object=builder(p,materials);mergeAssemblies(object,!custom);if(p.licensedAsset)source='original-fallback';}
  return normalise(object,p,source,error);
 })();
 if(!custom)cache.set(key,pending);
 try{return (await pending).clone(true);}catch(e){if(!custom)cache.delete(key);throw e;}
}
