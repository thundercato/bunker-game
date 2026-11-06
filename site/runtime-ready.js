// A new HTML entry must not import cached application modules from an old worker.
export const RUNTIME_CACHE = 'field-signal-overgrowth-v11-building-preview-1';
export async function ensureRuntime() {
 if (!('serviceWorker' in navigator) || !isSecureContext) return;
 const current = () => new Promise(resolve => {
  const worker = navigator.serviceWorker.controller;
  if (!worker) return resolve(false);
  const channel = new MessageChannel();
  const timer = setTimeout(() => {channel.port1.close(); resolve(false);}, 1000);
  channel.port1.onmessage = e => {clearTimeout(timer); channel.port1.close(); resolve(e.data?.cache === RUNTIME_CACHE);};
  worker.postMessage({type: 'editor-version'}, [channel.port2]);
 });
 if (await current()) return;
 const root = new URL('./', document.baseURI);
 let registration;
 try {registration = await navigator.serviceWorker.register(new URL('sw.js', root), {scope: root.pathname, updateViaCache: 'none'});}
 catch (error) {
  // Without a controlling worker, online modules cannot come from an old cache.
  // Keep online play available when a browser declines offline storage.
  if (!navigator.serviceWorker.controller) return;
  throw error;
 }
 await registration.update();
 for (let i = 0; i < 20; i++) {
  if (await current()) return;
  await new Promise(resolve => setTimeout(resolve, 250));
 }
 throw Error('The offline runtime could not update. Reconnect and refresh. Your saves and drafts have not been changed.');
}
