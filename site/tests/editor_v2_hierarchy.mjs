import assert from 'node:assert/strict';
import {translateSelection,validateCollections} from '../editor/panels/hierarchy-core.js';
const doc={buildingId:'hut',objects:[{id:'a',position:[1,2,3],locked:false},{id:'b',position:[2,3,4],locked:true}]};
assert.throws(()=>translateSelection(doc,['a','b'],[1,0,0]),/Unlock/);assert.deepEqual(doc.objects[0].position,[1,2,3]);
translateSelection(doc,['a'],[.125,0,-2]);assert.deepEqual(doc.objects[0].position,[1.125,2,1]);assert.deepEqual(doc.objects[1].position,[2,3,4]);
assert.throws(()=>translateSelection(doc,['a'],[NaN,0,0]),/finite/);
const data={format:'field-signal-editor-selection-sets',version:1,buildingId:'hut',sets:[{name:'walls',ids:['a']}]};assert.deepEqual(validateCollections(JSON.parse(JSON.stringify(data)),doc),data);
for(const sets of [[{name:'bad',ids:['x']}],[{name:'bad',ids:['a','a']}],[{name:'x',ids:[]},{name:'x',ids:[]}]])assert.throws(()=>validateCollections({...data,sets},doc));
assert.throws(()=>validateCollections({...data,buildingId:'other'},doc));console.log('PASS editor hierarchy: atomic lock rejection, local offsets, JSON and reference validation (9 assertions)');
