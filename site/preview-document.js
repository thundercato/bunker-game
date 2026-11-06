import {createWorldDocument} from './world-document.js';
import {seedLayout} from './layout-core.js';

export async function previewContext(source, sourceJSON = null) {
  const metadata = await (await fetch('world-source.json')).json();
  if (metadata.id !== 'overgrowth-v11' || !/^[a-f0-9]{40}$/.test(metadata.revision)) throw Error('Unsupported preview source metadata.');
  if (sourceJSON !== null) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sourceJSON));
    const digest = [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
    if (digest !== metadata.sha256) throw Error('Preview source files do not match. Reconnect and refresh to update the offline runtime.');
  }
  return {source, sourceRevision: metadata.revision};
}

export function sampleDocument(context) {
  const doc = createWorldDocument({...context, layouts: [seedLayout(context.source, 'hut')]});
  Object.assign(doc.authoring.buildings.find(b => b.id === 'hut'), {
    x: 35, z: -48, y: 0, yaw: Math.PI / 2, foundation: 'manual',
  });
  return doc;
}
