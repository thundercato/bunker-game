// Optional adapter consumer. This module never changes normal game state and does
// not claim the unmerged runtime adapter is bundled in the main editor build.
import {validateWorldDocument} from '../world-document.js';

export async function launchWorldPreview({document: input, buildingId, context,
  capabilities = {}, storage = globalThis.localStorage,
  open = (...args) => globalThis.open(...args),
  baseURI = globalThis.document?.baseURI,
  uuid = () => globalThis.crypto.randomUUID(),
  // Optional runtime module is resolved only after trusted capability metadata.
  importAdapter = () => import(new URL('../world-preview.js', import.meta.url).href),
} = {}) {
  if (capabilities.worldPreview !== true) {
    throw Error('Moved-building game preview is unavailable in this runtime. The connected design is saved and exportable; the reviewed runtime adapter must be integrated first.');
  }
  if (!context?.source || !context.sourceRevision || !baseURI) throw Error('A trusted runtime source context is required.');
  const document = validateWorldDocument(input, context);
  if (!document.interiors.some(layout => layout.buildingId === buildingId)) throw Error('Open this building interior before previewing it.');
  let adapter;
  try { adapter = await importAdapter(); }
  catch (error) {
    throw Error('The runtime declares building preview support, but its adapter could not load. Reconnect and reload the editor; your design is preserved. ' + error.message);
  }
  const {compilePreviewWorld} = adapter;
  if (typeof compilePreviewWorld !== 'function') throw Error('The installed runtime has no compatible building preview compiler.');
  const compiled = compilePreviewWorld(document, buildingId, context);
  const id = uuid();
  if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('Could not create an isolated preview identity.');
  const payload = JSON.stringify({format: 'field-signal-preview/1', buildingId, document});
  if (payload.length > 2000000) throw Error('World preview exceeds the runtime’s 2 MB limit. Export the design and reduce unrelated authored data.');
  // Write only after compilation succeeds. Storage failure cannot replace a draft
  // or an existing preview; every successful launch receives a fresh identity.
  storage.setItem('field-signal-world-preview:' + id, payload);
  const url = new URL('./?worldPreview=' + id, baseURI).href;
  const popup = open(url, '_blank', 'noopener');
  return {id, url, compiled, popup};
}
