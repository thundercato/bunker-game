import{validateLayout,compiledWorld,geometryPieces}from'./layout-core.js';
export async function applyEditorPreview(source){
 const id=new URL(location.href).searchParams.get('editorPreview');if(!id)return source;
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid editor preview ID. Open a preview from the World Editor.');
 const raw=localStorage.getItem('field-signal-editor-preview:'+id);if(!raw)throw Error('This layout preview is not available in this browser. Open it from the editor, or import the JSON there.');
 if(raw.length>1500000)throw Error('Layout preview exceeds size limit.');
 const names=new Set();for(const p of ['assets/v7/asset-manifest.json','assets/v10/model-manifest.json','assets/v11/models.json']){const arr=await(await fetch(p)).json();for(const a of arr)names.add(a.id);}
 const doc=validateLayout(JSON.parse(raw),{world:source,assets:names}),world=compiledWorld(doc,source);
 world.editorFloors=doc.objects.filter(o=>o.type==='floor').map(o=>({...o,pieces:geometryPieces(doc,o)}));world.editorPreviewId=id;
 return world;
}
