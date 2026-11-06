/* Consume the accepted runtime source/compiler and asset registry. This adapter
   adds no world schema and never reads or writes campaign/editor storage. */
import {loadCampaignSource} from '../campaign-loader.js';
import {previewContext} from '../preview-document.js';
import {loadAssetIds} from '../asset-ids.js';
import {clone, seedLayout} from '../layout-core.js';

export async function loadEditorSource() {
  const response = await fetch('world.json');
  if (!response.ok) throw Error('Editor source unavailable (' + response.status + '). Reconnect and reload; stored drafts are unchanged.');
  const raw = await response.text();
  const metadataResponse = await fetch('editor/source-context.json');
  if (!metadataResponse.ok) throw Error('Editor source metadata unavailable. Reconnect and reload; stored drafts are unchanged.');
  const capabilities = await metadataResponse.json();
  // The runtime independently verifies the shipped source digest/revision. An
  // imported document cannot authorise a different source or preview capability.
  const context = await previewContext(JSON.parse(raw), raw);
  if (capabilities.sourceId !== 'overgrowth-v11' || capabilities.sourceRevision !== context.sourceRevision || typeof capabilities.worldPreview !== 'boolean') {
    throw Error('Editor and runtime source metadata do not match. Reconnect and reload; stored drafts are unchanged.');
  }
  const [source, assets] = await Promise.all([loadCampaignSource(context.source), loadAssetIds()]);
  return {...context, source, assets, capabilities};
}

// Existing explicit or recovered drafts take precedence in EditorSession. Only
// an absent interior starts from the actual authored campaign scene, if present.
export function initialEditorLayout(source, buildingId) {
  const authored = source.campaignScenes?.find(scene => scene.id === buildingId || scene.layout?.buildingId === buildingId)?.layout;
  return clone(authored || seedLayout(source, buildingId));
}
