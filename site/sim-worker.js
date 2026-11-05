/* Own-origin Python runtime. The UI never runs survival rules in a JS fallback. */
let ready=false, api;
self.onmessage=async({data})=>{
 try{
  if(!ready){
   importScripts('./vendor/pyodide/pyodide.js');
   const py=await loadPyodide({indexURL:'./vendor/pyodide/'});
   const response=await fetch('./engine.py'); if(!response.ok)throw Error('Python rules could not load.');
   py.globals.set('WORLD_JSON', data.worldOverride?JSON.stringify(data.worldOverride):await (await fetch('./world.json')).text());
   await py.runPythonAsync(await response.text()); api=py.globals.get('api'); ready=true;
  }
  const result=JSON.parse(api(JSON.stringify(data.action)));
  self.postMessage({id:data.id,...result});
 }catch(e){self.postMessage({id:data.id,error:String(e.message||e)})}
};
