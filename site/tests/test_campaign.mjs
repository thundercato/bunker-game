import fs from 'node:fs';import assert from 'node:assert/strict';
import {applyCampaignSource,compileDistricts,campaignSurface,resolveMovement} from '../campaign-core.js';
import {createCampaignInteriors} from '../campaign-interiors.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const source=read('world.json'),options={districts:read('districts.json'),props:read('search-props.json'),routes:read('campaign-routes.json'),interiors:createCampaignInteriors(source),sourceRevision:read('world-source.json').revision};
const original=JSON.stringify(source),world=applyCampaignSource(source,options);
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS',name);};
check('Original source and authored data stay unchanged and repeat compilation agrees',()=>{assert.equal(JSON.stringify(source),original);assert.deepEqual(applyCampaignSource(source,options),world);});
check('All existing IDs, guarantees, mission rewards and save content references survive',()=>{
 for(const kind of ['buildings','missions','enemies'])assert.deepEqual(world[kind].map(o=>o.id),source[kind].map(o=>o.id));for(const c of source.containers)assert.ok(world.containers.some(q=>q.id===c.id));assert.equal(world.containers.length,source.containers.length+4);
 for(const c of source.containers){const q=world.containers.find(q=>q.id===c.id);assert.equal(q.profile,c.profile);assert.deepEqual(q.guaranteed,c.guaranteed);}
 for(const m of source.missions)assert.equal(world.missions.find(q=>q.id===m.id).reward,m.reward);
});
check('At least 50 meaningful searchable visual variants are actually placed',()=>{assert.equal(world.campaign.bindingStats.catalogue,69);assert.ok(world.campaign.bindingStats.placed>=50);});
check('Field mission markers track containers while underground markers retain entrances',()=>{
 for(const m of world.missions){const c=world.containers.find(c=>c.id===m.container),old=source.missions.find(q=>q.id===m.id);if(c?.zone==='field')assert.deepEqual([m.x,m.z],[c.x,c.z]);else assert.deepEqual([m.x,m.z],[old.x,old.z]);}
});
check('Pier deck is sampled at visible deck height instead of river bed',()=>assert.equal(campaignSurface(world,110,-151,0,-1),0));
check('Crane has bidirectional routes, external waypoints and safe selectable landings',()=>{
 const r=world.campaignGeometry.climbs;assert.equal(r.length,6);
 for(const up of r.filter(r=>r.to.y>r.from.y)){const down=r.find(q=>q.id===up.id.replace(':up',':down'));assert.deepEqual(up.from,down.to);assert.deepEqual(up.to,down.from);assert.deepEqual(up.via,[...down.via].reverse());assert.equal(campaignSurface(world,up.to.x,up.to.z,up.to.y,0),up.to.y);assert.ok(up.via.length>=2);}
});
check('Deck rail collision blocks walking through barriers and prevents falling through gate',()=>{
 const p={x:113,y:12,z:-151};const q=resolveMovement(p,0,4,{colliders:world.campaignGeometry.colliders,valid:()=>true,height:(x,z,y)=>campaignSurface(world,x,z,y,0),zone:'field'});assert.ok(q.z<-149);
 const edge=resolveMovement({x:110.4,y:12,z:-151},-2,0,{colliders:[],valid:()=>true,height:(x,z,y)=>campaignSurface(world,x,z,y,0),zone:'field'});assert.equal(edge.x,110.4);
});
check('Malformed or duplicated world objects are rejected before mutation',()=>{
 const d=structuredClone(options.districts);d.districts[0].objects.push(structuredClone(d.districts[0].objects[0]));assert.throws(()=>compileDistricts(d),/Duplicate/);
 const bad=structuredClone(options.districts);bad.districts[0].objects[0].transform.x=NaN;assert.throws(()=>compileDistricts(bad),/transform/);
});
check('Legacy layout preview source remains explicit and unmodified by candidate compiler',()=>{const preview={...source,editorLayout:{buildingId:'hut'}};assert.equal(applyCampaignSource(preview,options),preview);});
console.log(`${count} campaign integration checks passed`);
