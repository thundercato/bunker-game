// Editor proposals only. This adapter does not replace world.json or execute missions.
export const FORMAT='field-signal-editor-mission-proposals';
export const VERSION=1;
export const clone=value=>JSON.parse(JSON.stringify(value));
const flow=label=>({label,type:'flow'}),item=label=>({label,type:'item'});
export const NODE_TYPES={
 offer:{label:'Voluntary offer',inputs:{},outputs:{accept:flow('Accepted')}},
 condition:{label:'All / any condition',inputs:{start:flow('Check')},outputs:{pass:flow('Met'),fail:flow('Not met')}},
 retrieve:{label:'Retrieve fixed item',inputs:{start:flow('Start')},outputs:{complete:flow('Collected'),failed:flow('Failed'),item:item('Item')}},
 collect:{label:'Collect ordinary items',inputs:{start:flow('Start')},outputs:{complete:flow('Collected'),failed:flow('Failed'),item:item('Items')}},
 deliver:{label:'Deliver to source',inputs:{start:flow('Start'),item:item('Owned item')},outputs:{complete:flow('Delivered'),failed:flow('Failed')}},
 reach:{label:'Reach world object',inputs:{start:flow('Start')},outputs:{complete:flow('Reached'),failed:flow('Failed')}},
 interact:{label:'Interact with object',inputs:{start:flow('Start')},outputs:{complete:flow('Interacted'),failed:flow('Failed')}},
 reward:{label:'Reward proposal',inputs:{start:flow('Grant once')},outputs:{complete:flow('Recorded')}},
 success:{label:'Success',inputs:{start:flow('Complete')},outputs:{}},
 failure:{label:'Failure / abandon',inputs:{start:flow('Fail')},outputs:{}}
};
export const UNSUPPORTED_TYPES=['Persisted random location','Repair / activate APR','Rescue / escort','Eliminate / clear','Defend / protect','Survive / timed wait','Stealth','Communicate / track','Craft / build','Surge reset action'];
const edge=(from,out,to,input='start')=>({id:`${from}-${out}-${to}-${input}`,from,out,to,input});
export function seedMissionGraph(mission){const objective=mission.container?'retrieve':'collect';return {nodes:[
 {id:'offer',kind:'offer',x:30,y:120,label:'Voluntary offer'},
 {id:'objective',kind:objective,x:300,y:120,label:mission.container?'Retrieve '+mission.item:'Collect '+mission.count+' × '+mission.item},
 {id:'deliver',kind:'deliver',x:570,y:120,label:'Return to '+mission.source},
 {id:'reward',kind:'reward',x:840,y:120,label:'Reward '+mission.reward},
 {id:'success',kind:'success',x:1110,y:120,label:'Complete once'},
 {id:'failure',kind:'failure',x:570,y:380,label:'Failure / abandonment proposal'}
 ],edges:[edge('offer','accept','objective'),edge('objective','complete','deliver'),edge('objective','item','deliver','item'),edge('deliver','complete','reward'),edge('reward','complete','success'),edge('objective','failed','failure'),edge('deliver','failed','failure')]};}
// Keep untouched generated captions aligned with form values; preserve user captions.
export function syncMissionCaptions(mission,before){
 const oldNodes=seedMissionGraph(before).nodes,newNodes=seedMissionGraph(mission).nodes;
 for(const n of mission.graph.nodes){const old=oldNodes.find(q=>q.id===n.id),next=newNodes.find(q=>q.id===n.id);if(old&&next&&n.label===old.label&&n.kind===old.kind){n.label=next.label;n.kind=next.kind;}}
}
export function createMissionProposals(world){return {format:FORMAT,version:VERSION,sourceVersion:world.version,missions:world.missions.map(m=>({id:m.id,title:m.title,description:m.description||'',source:m.source,item:m.item,count:m.count||1,container:m.container||null,reward:m.reward||0,requires:[...(m.requires||[])],prerequisiteMode:'all',classification:'unclassified',rules:{death:'unreviewed',retry:'unreviewed',abandon:'failure',surge:'shared-contract-required'},graph:seedMissionGraph(m)}))};}
const fail=m=>{throw Error(m)};
function safeString(v,name,max=200){if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))fail('Invalid '+name);return v;}
function safeId(v){safeString(v,'ID',100);if(!/^[\w-]+$/.test(v))fail('Unsafe ID');return v;}
// Strict structural import; semantic mistakes remain visible and repairable in validation.
export function validateProposal(input,world){
 if(!input||input.format!==FORMAT||input.version!==VERSION)fail('Expected an editor mission proposal v1; campaign and world files are different.');
 if(input.sourceVersion!==world.version)fail('Mission source version differs; review against the current world before import.');
 if(!Array.isArray(input.missions)||input.missions.length!==world.missions.length)fail('Keep all existing mission identities.');
 const ids=new Set(),missions=input.missions.map(m=>{
  const id=safeId(m.id);if(ids.has(id)||!world.missions.some(q=>q.id===id))fail('Unknown or duplicate mission ID: '+id);ids.add(id);
  const q={id,title:safeString(m.title,'title',160),description:safeString(m.description,'description',4000),source:safeString(m.source,'source',100),item:safeString(m.item,'item',100),count:m.count,container:m.container===null?null:safeString(m.container,'container',100),reward:m.reward,requires:[],prerequisiteMode:m.prerequisiteMode,classification:m.classification,rules:{}};
  if(!q.title.trim()||!Number.isInteger(q.count)||q.count<1||q.count>999||!Number.isFinite(q.reward)||q.reward<0||q.reward>10000000)fail('Invalid mission quantities: '+id);
  if(!['all','any'].includes(q.prerequisiteMode)||!['unclassified','main','side'].includes(q.classification))fail('Invalid prerequisite mode or classification.');
  if(!Array.isArray(m.requires)||m.requires.length>100)fail('Invalid prerequisites.');q.requires=m.requires.map(safeId);
  for(const [key,values]of Object.entries({death:['unreviewed','preserve','restart','fail'],retry:['unreviewed','allowed','never'],abandon:['failure'],surge:['shared-contract-required']})){if(!values.includes(m.rules?.[key]))fail('Invalid '+key+' policy.');q.rules[key]=m.rules[key];}
  if(!m.graph||!Array.isArray(m.graph.nodes)||m.graph.nodes.length>100||!Array.isArray(m.graph.edges)||m.graph.edges.length>300)fail('Graph limit exceeded.');
  const nodeIds=new Set();q.graph={nodes:m.graph.nodes.map(n=>{const nid=safeId(n.id);if(nodeIds.has(nid))fail('Duplicate graph node ID.');nodeIds.add(nid);if(!Object.hasOwn(NODE_TYPES,n.kind)||![n.x,n.y].every(Number.isFinite)||Math.abs(n.x)>10000||Math.abs(n.y)>10000)fail('Invalid graph node.');return{id:nid,kind:n.kind,x:n.x,y:n.y,label:safeString(n.label,'node label',180)};}),edges:[]};
  const edgeIds=new Set();q.graph.edges=m.graph.edges.map(e=>{const eid=safeId(e.id);if(edgeIds.has(eid))fail('Duplicate graph edge ID.');edgeIds.add(eid);return{id:eid,from:safeId(e.from),out:safeId(e.out),to:safeId(e.to),input:safeId(e.input)};});return q;
 });return{format:FORMAT,version:VERSION,sourceVersion:world.version,missions};
}
export function checkConnection(graph,connection,{ignoreEdge=null}={}){
 const a=graph.nodes.find(n=>n.id===connection.from),b=graph.nodes.find(n=>n.id===connection.to);if(!a||!b)return'Missing node reference.';
 const out=NODE_TYPES[a.kind]?.outputs[connection.out],input=NODE_TYPES[b.kind]?.inputs[connection.input];if(!out||!input)return'Choose existing input and output ports.';
 if(out.type!==input.type)return'Port types differ: '+out.type+' → '+input.type+'.';if(a.id===b.id)return'A node cannot connect to itself.';
 if(graph.edges.some(e=>e.id!==ignoreEdge&&e.from===connection.from&&e.out===connection.out&&e.to===connection.to&&e.input===connection.input))return'This connection already exists.';return null;
}
export function missionIssues(m,world,all){
 const issues=[],add=(level,message,node=null)=>issues.push({level,message,node});
 if(!Object.hasOwn(world.missionSources,m.source))add('error','Unknown source: '+m.source);
 else if(!Object.hasOwn(world.stations,world.missionSources[m.source].station))add('error','Source station is missing.');
 if(!Object.hasOwn(world.catalogue,m.item))add('error','Unknown item: '+m.item);
 if(m.container&&!world.containers.some(c=>c.id===m.container))add('error','Unknown target container: '+m.container);
 for(const id of m.requires)if(!all.some(x=>x.id===id)||id===m.id)add('error','Invalid prerequisite: '+id);
 const byId=new Map(all.map(q=>[q.id,q])),visiting=new Set(),visited=new Set();
 const visitPrereq=id=>{if(visiting.has(id))return true;if(visited.has(id))return false;const next=byId.get(id);if(!next)return false;visiting.add(id);for(const p of next.requires)if(visitPrereq(p))return true;visiting.delete(id);visited.add(id);return false;};
 if(visitPrereq(m.id))add('error','Prerequisite cycle prevents progression.');
 for(const id of m.requires){const p=all.find(q=>q.id===id);if(p?.rules.retry==='never')add('warning','Prerequisite '+id+' can permanently fail; review the progression softlock.');}
 const {nodes,edges}=m.graph;for(const e of edges){const error=checkConnection(m.graph,e,{ignoreEdge:e.id});if(error)add('error',error,e.to);}
 const offers=nodes.filter(n=>n.kind==='offer');if(offers.length!==1)add('error','Keep exactly one voluntary offer node.');
 for(const kind of ['success','failure'])if(!nodes.some(n=>n.kind===kind))add('error','Missing '+kind+' outcome.');
 const outgoing=id=>edges.filter(e=>e.from===id&&nodes.some(n=>n.id===e.to)&&NODE_TYPES[nodes.find(n=>n.id===id)?.kind]?.outputs[e.out]?.type==='flow');
 const reached=new Set();function walk(id,path=new Set()){if(path.has(id)){add('error','Unintended graph cycle.',id);return;}if(reached.has(id))return;reached.add(id);for(const e of outgoing(id))walk(e.to,new Set([...path,id]));}if(offers[0])walk(offers[0].id);
 for(const n of nodes){if(!reached.has(n.id))add('error','Node is unreachable: '+n.label,n.id);if(['retrieve','collect','deliver','reach','interact'].includes(n.kind))for(const port of ['complete','failed'])if(!edges.some(e=>e.from===n.id&&e.out===port))add('error','Missing '+port+' branch: '+n.label,n.id);if(n.kind==='deliver'&&!edges.some(e=>e.to===n.id&&e.input==='item'))add('error','Delivery needs an explicit owned-item connection.',n.id);}
 if(nodes.some(n=>['reach','interact','condition'].includes(n.kind)))add('warning','These graph nodes have no agreed game adapter. They remain authoring proposals.');
 if(m.rules.death==='unreviewed'||m.rules.retry==='unreviewed')add('warning','Death / retry policy awaits review.');
 add('notice','Graph, reward and rule edits are authoring-only. No runtime adapter is installed.');return issues;
}
export function targetReference(m,world){const c=world.containers.find(c=>c.id===m.container);if(!c)return null;const building=world.buildings.find(b=>b.id===c.building);return{id:c.id,name:c.name,building:building?.id||null,buildingName:building?.name||c.zone||'Local scene',object:'container-'+c.id,href:building?'editor/?building='+encodeURIComponent(building.id)+'&select='+encodeURIComponent('container-'+c.id):null};}
export function connect(graph,connection,id){const problem=checkConnection(graph,connection);if(problem)fail(problem);graph.edges.push({id:safeId(id),...connection});}
