// IDs are validated against shipped manifests; imported JSON never supplies URLs.
export async function loadAssetIds(){
 const ids=new Set();
 for(const path of ['assets/v7/asset-manifest.json','assets/v10/model-manifest.json','assets/v11/models.json','assets/campaign/registry.json']){
  const response=await fetch(path);if(!response.ok)throw Error('Asset manifest unavailable: '+path);
  const data=await response.json();for(const a of Array.isArray(data)?data:data.assets)ids.add(a.id);
 }
 const props=await(await fetch('search-props.json')).json();for(const p of props.props)ids.add(p.id);
 return ids;
}
