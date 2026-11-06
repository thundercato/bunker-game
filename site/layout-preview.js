import{validateLayout,compiledWorld,geometryPieces}from'./layout-core.js';
import {compilePreviewWorld} from './world-preview.js';
import {previewContext, sampleDocument} from './preview-document.js';
import {loadAssetIds} from './asset-ids.js';
export async function applyEditorPreview(source,sourceJSON=null){
 const params=new URL(location.href).searchParams;
 const id=params.get('editorPreview'),worldId=params.get('worldPreview'),sample=params.get('buildingPreview');
 if(!id&&!worldId&&!sample)return source;
 if([id,worldId,sample].filter(Boolean).length!==1)throw Error('Open one preview at a time.');
 if(worldId||sample){
  const context=await previewContext(source,sourceJSON);
  let doc,buildingId,previewId;
  if(sample){if(sample!=='hut')throw Error('Unknown building preview.');doc=sampleDocument(context);buildingId='hut';previewId='world-sample-hut-v1';}
  else{
   if(!/^[a-f0-9-]{36}$/.test(worldId))throw Error('Invalid world preview ID.');
   const raw=localStorage.getItem('field-signal-world-preview:'+worldId);
   if(!raw||raw.length>2000000)throw Error('World preview missing or too large. Open a fresh test from the world editor.');
   const payload=JSON.parse(raw);
   if(payload.format!=='field-signal-preview/1')throw Error('Unsupported preview payload.');
   doc=payload.document;buildingId=payload.buildingId;previewId='world-'+worldId;
  }
  const assets=await loadAssetIds();
  const world=compilePreviewWorld(doc,buildingId,{...context,assets});
  world.editorPreviewId=previewId;world.editorReturn='editor/world.html';
  return world;
 }
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid editor preview ID. Open a preview from the World Editor.');
 const raw=localStorage.getItem('field-signal-editor-preview:'+id);if(!raw)throw Error('This layout preview is not available in this browser. Open it from the editor, or import the JSON there.');
 if(raw.length>1500000)throw Error('Layout preview exceeds size limit.');
 const names=await loadAssetIds();
 const doc=validateLayout(JSON.parse(raw),{world:source,assets:names}),world=compiledWorld(doc,source);
 world.editorFloors=doc.objects.filter(o=>o.type==='floor').map(o=>({...o,pieces:geometryPieces(doc,o)}));world.editorPreviewId=id;
 return world;
}
