// Read-only view over the shared manifests. This is not a second asset registry.
export function assetCatalogue(manifests, placements = []) {
  const merged = new Map();
  for (const manifest of manifests) for (const row of manifest) {
    if (typeof row.id !== 'string' || !row.id) continue;
    merged.set(row.id, {...merged.get(row.id), ...row});
  }
  const sizes = new Map(placements.map(row => [row.id, row]));
  return [...merged.values()].map(row => {
    const placement = sizes.get(row.id);
    return {...row, name: placement?.name || row.name || row.id,
      category: placement?.category || 'Inspection only', placement,
      runtimeTriangles: row.runtimeTriangles ?? null,
      sourceTriangles: row.sourceTriangles ?? row.triangles ?? null,
      runtimeBytes: row.runtimeBytes ?? row.bytes ?? null,
      thumbnail: placement ? `editor/thumbnails/${row.id}.webp` : null};
  }).sort((a,b) => a.name.localeCompare(b.name));
}
export function filterAssets(rows, {query = '', category = '', licence = '', maxTriangles = 0, placeable = false} = {}) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return rows.filter(row => (!category || row.category === category) && (!licence || row.licence === licence) &&
    (!placeable || row.placement) && (!maxTriangles || row.runtimeTriangles != null && row.runtimeTriangles <= maxTriangles) &&
    terms.every(term => [row.id,row.name,row.category,row.licence,row.source,Object.keys(row.authors || {}).join(' '),...(row.tags || [])].join(' ').toLowerCase().includes(term)));
}
export function safeSource(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
// Counts the rendered template, not the source scan. Texture memory is explicitly
// an RGBA8+mipmap estimate; compressed GPU formats and driver costs can differ.
export function modelCosts(root) {
  let triangles = 0, meshes = 0, drawCalls = 0, geometryBytes = 0;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(node => {
    if (!node.isMesh) return;
    meshes++;
    const geometry = node.geometry;
    triangles += (geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3;
    drawCalls += Math.max(1, geometry.groups?.length || 0);
    if (!geometries.has(geometry)) {
      geometries.add(geometry);
      for (const attribute of Object.values(geometry.attributes)) geometryBytes += attribute.array?.byteLength || 0;
      geometryBytes += geometry.index?.array?.byteLength || 0;
    }
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  let textureBytes = 0, unknownTextures = 0;
  for (const texture of textures) {
    const image = texture.source?.data || texture.image;
    if (image?.width && image?.height) textureBytes += image.width * image.height * 4 * (texture.generateMipmaps ? 4/3 : 1);
    else unknownTextures++;
  }
  return {triangles:Math.round(triangles),meshes,drawCalls,materials:materials.size,textures:textures.size,geometryBytes,textureBytes:Math.round(textureBytes),unknownTextures};
}
