// Editor selection sets, not scene parents. Canonical child coordinates stay flat.
export function selectedObjects(doc, ids) { const set=new Set(ids); return doc.objects.filter(o=>set.has(o.id)); }
export function translateSelection(doc, ids, delta) {
 if(!Array.isArray(delta)||delta.length!==3||!delta.every(Number.isFinite))throw Error('Enter three finite offsets in metres.');
 const objects=selectedObjects(doc,ids);
 if(!objects.length)throw Error('Choose objects in the selection set.');
 if(objects.some(o=>o.locked))throw Error('Unlock every selected object before moving the set.');
 for(const o of objects)o.position=o.position.map((v,i)=>v+delta[i]);
}
export function validateCollections(value,doc) {
 if(!value||value.format!=='field-signal-editor-selection-sets'||value.version!==1||value.buildingId!==doc.buildingId||!Array.isArray(value.sets)||value.sets.length>80)throw Error('Not selection sets for this building.');
 const known=new Set(doc.objects.map(o=>o.id)), names=new Set();
 return {format:value.format,version:1,buildingId:doc.buildingId,sets:value.sets.map(s=>{
  if(typeof s.name!=='string'||!s.name.trim()||s.name.length>80||names.has(s.name)||!Array.isArray(s.ids)||s.ids.length>800||s.ids.some(id=>!known.has(id))||new Set(s.ids).size!==s.ids.length)throw Error('Invalid, duplicate or missing selection-set reference.');
  names.add(s.name);return {name:s.name,ids:[...s.ids]};
 })};
}
