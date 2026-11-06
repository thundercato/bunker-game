import {applyCampaignSource} from './campaign-core.js';
import {createCampaignInteriors} from './campaign-interiors.js';
export async function loadCampaignSource(source) {
 if(source.editorLayout)return source;
 const [districts,props,routes,metadata,spawns]=await Promise.all(['districts.json','search-props.json','campaign-routes.json','world-source.json','campaign-spawns.json'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error('Candidate data unavailable: '+path);return r.json();}));
 return applyCampaignSource(source,{districts,props,routes,interiors:createCampaignInteriors(source),sourceRevision:metadata.revision,spawns});
}
