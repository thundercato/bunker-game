/* Network-fresh entry for the editor suite. Only the public runtime cache changes;
   campaigns, legacy drafts and proposal keys are never removed or rewritten. */
export const EXPECTED_EDITOR_CACHE='field-signal-overgrowth-v11-editor2.1.1';
export async function editorRuntimeCurrent() {
 const worker=navigator.serviceWorker?.controller;
 if(!worker)return false;
 return new Promise(resolve=>{
  const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(false);},1000);
  channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.cache===EXPECTED_EDITOR_CACHE);};
  worker.postMessage({type:'editor-version'},[channel.port2]);
 });
}
export async function startEditorWorkspace(modulePath) {
 try {
  if(!/^editor\/[\w/-]+\.js$/.test(modulePath))throw Error('Unsupported editor workspace module.');
  if('serviceWorker' in navigator&&isSecureContext&&!await editorRuntimeCurrent()){
   const registration=await navigator.serviceWorker.register(new URL('sw.js',document.baseURI),{scope:new URL('./',document.baseURI).pathname,updateViaCache:'none'});
   await registration.update();
   let current=false;
   for(let i=0;i<24;i++){
    if(await editorRuntimeCurrent()){current=true;break;}
    await new Promise(resolve=>setTimeout(resolve,250));
   }
   if(!current)throw Error('The offline runtime could not update. Reconnect and reload; your drafts and campaign are preserved.');
  }
  await import(new URL(modulePath,document.baseURI).href);
 }catch(error){
  const message='Editor could not start: '+error.message;
  const host=document.querySelector('#status,#save-state');if(host)host.textContent=message;
  const loading=document.querySelector('#loading,#world-loading');
  if(loading){loading.hidden=false;loading.textContent=message;}
  console.error(error);
 }
}
const entry=document.querySelector('script[data-editor-module]');
if(entry)startEditorWorkspace(entry.dataset.editorModule);
