/* Network-fresh entry for the editor suite. Only the public runtime cache changes;
   campaigns, legacy drafts and proposal keys are never removed or rewritten. */
export const EXPECTED_EDITOR_CACHE='field-signal-11.1-editor2.1.3';
export async function editorRuntimeCurrent() {
 const worker=navigator.serviceWorker?.controller;
 if(!worker)return false;
 return new Promise((resolve,reject)=>{
  const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(false);},1000);
  channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.cache===EXPECTED_EDITOR_CACHE);};
  try{worker.postMessage({type:'editor-version'},[channel.port2]);}
  catch(error){
   clearTimeout(timer);channel.port1.close();
   // A controller captured just before handoff can become redundant. Recheck
   // through the normal update/cache gate; never grant readiness on this race.
   if(error.name==='InvalidStateError')resolve(false);else reject(error);
  }
 });
}
export async function ensureEditorRuntime() {
 if(!('serviceWorker' in navigator)||!isSecureContext||await editorRuntimeCurrent())return;
 const registration=await navigator.serviceWorker.register(new URL('sw.js',document.baseURI),{scope:new URL('./',document.baseURI).pathname,updateViaCache:'none'});
 // register() can already be installing the replacement. A second update may
 // reject with InvalidStateError while that job changes state; let it finish.
 // Neither an installing worker nor that exception proves it is our runtime.
 if(!registration.installing&&!registration.waiting){
  try{await registration.update();}
  catch(error){if(error.name!=='InvalidStateError')throw error;}
 }
 let current=false;
 for(let i=0;i<24;i++){
  if(await editorRuntimeCurrent()){current=true;break;}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 if(!current)throw Error('The offline runtime could not update. Reconnect and reload; your drafts and campaign are preserved.');
}
// Real user action: cache the explicit public manifest without touching drafts.
// Keeping this separate from save/status text prevents cache progress hiding errors.
function mountOfflinePreparation(){
 if(document.querySelector('#prepare-offline')||!navigator.serviceWorker?.controller)return;
 const button=document.createElement('button');button.id='prepare-offline';button.type='button';
 button.textContent='Prepare editor for offline';button.dataset.state='unchecked';
 button.title='Downloads the explicit game/editor package. Drafts remain in this browser; no saved data is cleared.';
 button.style.cssText='font-size:10px;max-width:190px;white-space:normal';
 (document.querySelector('.left-foot,.file-actions')||document.querySelector('header')||document.body).append(button);
 navigator.serviceWorker.addEventListener('message',event=>{
  if(button.dataset.state!=='working')return;const message=event.data;
  if(message?.type==='cache-progress')button.textContent='Offline files '+message.done+' / '+message.total;
  if(message?.type==='cache-ready'){button.dataset.state='ready';button.disabled=false;button.textContent='Editor ready offline';}
  if(message?.type==='cache-error'){button.dataset.state='error';button.disabled=false;button.textContent='Offline incomplete · retry';button.title=message.error;}
 });
 button.onclick=()=>{const worker=navigator.serviceWorker.controller;if(!worker)return;
  button.dataset.state='working';button.disabled=true;button.textContent='Preparing offline files…';worker.postMessage({type:'cache-all'});
 };
}
export async function startEditorWorkspace(modulePath) {
 try {
  if(!/^editor\/[\w/-]+\.js$/.test(modulePath))throw Error('Unsupported editor workspace module.');
  await ensureEditorRuntime();
  await import(new URL(modulePath,document.baseURI).href);
  mountOfflinePreparation();
  const {mountRecovery}=await import('./panels/recovery.js');
  mountRecovery();
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
