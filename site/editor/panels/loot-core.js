// Editor-only weighted-loot proposals. This is not a runtime loot generator or migration.
export const FORMAT = 'field-signal-editor-loot-proposal/1';
export const STORAGE = 'field-signal-editor-v2-loot-proposal';
export const copy = value => JSON.parse(JSON.stringify(value));
const integer = value => Number.isInteger(value);
export function emptyProposal() { return {format: FORMAT, defaults: {}, overrides: {}}; }
export function suggestedTable(source, profile) {
  if (!Object.hasOwn(source.profiles, profile)) throw Error('Unknown legacy profile');
  return {minDraws: 0, maxDraws: 3, entries: Object.entries(source.profiles[profile])
    .filter(([id, entry]) => entry.chance > 0 && Object.hasOwn(source.catalogue, id))
    .map(([item, entry]) => ({item, weight: entry.chance, min: entry.min, max: entry.max, repeat: false}))};
}
export function effectiveTable(proposal, container) {
  return proposal.overrides[container.id] || proposal.defaults[container.profile] || null;
}
export function tableIssues(table, catalogue) {
  const issues = [];
  const issue = (level, message) => issues.push({level, message});
  if (!table || typeof table !== 'object' || Array.isArray(table)) return [{level:'error',message:'Missing weighted table.'}];
  if (Object.keys(table).some(key => !['minDraws','maxDraws','entries','maxUnits','maxWeightKg'].includes(key))) issue('error', 'Unsupported weighted-table fields. Guarantees and runtime policies require an agreed contract.');
  if (!integer(table.minDraws) || !integer(table.maxDraws) || table.minDraws < 0 || table.maxDraws < table.minDraws || table.maxDraws > 100)
    issue('error', 'Selections must be whole numbers, 0 ≤ minimum ≤ maximum ≤ 100.');
  if (!Array.isArray(table.entries) || table.entries.length > 200) return [...issues, {level:'error',message:'Table must contain at most 200 entries.'}];
  const seen = new Set();
  for (const entry of table.entries) {
    if (!entry || typeof entry !== 'object') { issue('error','Invalid entry.'); continue; }
    if (Object.keys(entry).some(key => !['item','weight','min','max','repeat'].includes(key))) issue('error', 'Unsupported item entry fields.');
    if (!Object.hasOwn(catalogue, entry.item)) issue('error', `Missing catalogue item: ${entry.item}`);
    if (seen.has(entry.item)) issue('error', `Duplicate row for ${entry.item}; use Allow repeats instead.`);
    seen.add(entry.item);
    if (typeof entry.weight !== 'number' || !Number.isFinite(entry.weight) || entry.weight < 0 || entry.weight > 1e9) issue('error', `Invalid relative weight: ${entry.item}`);
    if (!integer(entry.min) || !integer(entry.max) || entry.min < 1 || entry.max < entry.min || entry.max > 1000) issue('error', `Quantity must be 1–1000 units per selection: ${entry.item}`);
    if (typeof entry.repeat !== 'boolean') issue('error', `Specify repeat permission: ${entry.item}`);
  }
  const eligible = table.entries.filter(entry => entry && entry.weight > 0);
  if (!eligible.length) issue('error', table.entries.length ? 'All weights are zero.' : 'The weighted pool is empty.');
  if (eligible.length && !eligible.some(entry => entry.repeat)) {
    if (table.minDraws > eligible.length) issue('error', 'Minimum cannot be met without forbidden repeats.');
    else if (table.maxDraws > eligible.length) issue('warning', 'Some requested draw counts exhaust the no-repeat pool; simulation stops and reports the shortfall.');
  }
  for (const key of ['maxUnits','maxWeightKg']) if (table[key] != null && (typeof table[key] !== 'number' || !Number.isFinite(table[key]) || table[key] <= 0)) issue('error', `${key} must be a positive number, or omitted.`);
  if (table.maxUnits != null && !integer(table.maxUnits)) issue('error', 'Unit capacity must be a whole number.');
  if (table.maxUnits != null && eligible.length && table.maxDraws * Math.max(...eligible.map(e => e.max)) > table.maxUnits)
    issue('warning','Possible unit-capacity conflict. The simulator reports overflow; it never drops items or rerolls.');
  if (table.maxWeightKg != null && eligible.length && table.maxDraws * Math.max(...eligible.map(e => (catalogue[e.item]?.weight || 0) * e.max)) > table.maxWeightKg)
    issue('warning','Possible weight-capacity conflict. Capacity is a proposal limit, not a known runtime container capacity.');
  return issues;
}
export function validateProposal(input, source) {
  const doc = copy(input);
  if (!doc || doc.format !== FORMAT || !doc.defaults || !doc.overrides || Array.isArray(doc.defaults) || Array.isArray(doc.overrides)) throw Error('Not an editor weighted-loot proposal.');
  if (Object.keys(doc).some(key => !['format','defaults','overrides'].includes(key))) throw Error('Unsupported proposal fields.');
  if (Object.keys(doc.defaults).length > 100 || Object.keys(doc.overrides).length > source.containers.length) throw Error('Too many tables.');
  for (const [kind, tables] of Object.entries({defaults:doc.defaults, overrides:doc.overrides})) for (const [id, table] of Object.entries(tables)) {
    if (kind === 'defaults' ? !Object.hasOwn(source.profiles, id) : !source.containers.some(c => c.id === id)) throw Error(`Unknown ${kind} reference: ${id}`);
    const errors = tableIssues(table, source.catalogue).filter(i => i.level === 'error');
    if (errors.length) throw Error(`${id}: ${errors.map(i => i.message).join(' ')}`);
  }
  return doc;
}
export function random(seed) {
  let state = Number(seed) >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function draw(table, catalogue, rand) {
  const requested = table.minDraws + Math.floor(rand() * (table.maxDraws - table.minDraws + 1));
  const pool = table.entries.filter(e => e.weight > 0).map(copy), selections = [], units = {};
  for (let i = 0; i < requested && pool.length; i++) {
    const sum = pool.reduce((total,e) => total + e.weight,0); let needle = rand() * sum;
    let index = pool.length - 1;
    for (let j = 0; j < pool.length; j++) { needle -= pool[j].weight; if (needle < 0) { index = j; break; } }
    const entry = pool[index], quantity = entry.min + Math.floor(rand() * (entry.max - entry.min + 1));
    selections.push({item:entry.item,quantity}); units[entry.item] = (units[entry.item] || 0) + quantity;
    if (!entry.repeat) pool.splice(index,1);
  }
  const totalUnits = Object.values(units).reduce((a,b) => a+b,0);
  const weightKg = Object.entries(units).reduce((total,[id,n]) => total + (catalogue[id]?.weight || 0)*n,0);
  return {requested, selections, units, totalUnits, distinctTypes:Object.keys(units).length, weightKg,
    shortfall:requested-selections.length,
    overflow: (table.maxUnits != null && totalUnits > table.maxUnits) || (table.maxWeightKg != null && weightKg > table.maxWeightKg)};
}
export function simulate(table, catalogue, seed=1, samples=1000) {
  const issues = tableIssues(table,catalogue), errors = issues.filter(i => i.level==='error');
  if (errors.length) throw Error(errors.map(i => i.message).join(' '));
  if (!integer(Number(seed)) || Number(seed) < 0 || Number(seed) > 4294967295) throw Error('Seed must be a whole number from 0 to 4294967295.');
  if (!integer(samples) || samples < 1 || samples > 5000) throw Error('Simulation samples must be 1–5000.');
  const rand=random(seed), inclusion={}, sum=table.entries.reduce((total,e) => total+e.weight,0);
  let first, shortfalls=0, overflows=0, selectionCount=0, unitCount=0;
  for (let i=0;i<samples;i++) {
    const result=draw(table,catalogue,rand); if (!i) first=result;
    if (result.shortfall) shortfalls++; if (result.overflow) overflows++;
    selectionCount+=result.selections.length; unitCount+=result.totalUnits;
    for (const item of Object.keys(result.units)) inclusion[item]=(inclusion[item]||0)+1;
  }
  return {seed:Number(seed)>>>0,samples,first,shortfalls,overflows,meanSelections:selectionCount/samples,meanUnits:unitCount/samples,
    probabilities:table.entries.map(e=>({item:e.item,firstDraw:e.weight/sum,inclusionEstimate:(inclusion[e.item]||0)/samples})),issues};
}
export function containerRows(source, query='') {
  const text=query.toLowerCase();
  return source.containers.map(c=>({...c,region:source.zones[c.zone]?.name || c.zone || 'Field',buildingName:source.buildings.find(b=>b.id===c.building)?.name || 'Local scene',room:c.floor ? `Level at ${c.floor} m` : 'Ground floor'}))
    .filter(c=>[c.id,c.name,c.profile,c.region,c.buildingName,c.room].some(v=>v.toLowerCase().includes(text)))
    .sort((a,b)=>`${a.region}/${a.buildingName}/${a.room}/${a.id}`.localeCompare(`${b.region}/${b.buildingName}/${b.room}/${b.id}`));
}
