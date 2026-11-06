// Renderer-independent journal contract. Game state remains authoritative.
export const JOURNAL_FORMAT = 'field-signal-journal/1';
export const JOURNAL_LIMIT = 240;
export const JOURNAL_SEEN_LIMIT = 2048;
export const JOURNAL_SECTIONS = [
 ['active', 'Assignments'], ['archive', 'Archive'], ['observations', 'Observations'],
 ['communications', 'Communications'], ['reference', 'Reference'], ['personal', 'Personal log']
];
const categories = new Set(['mission', 'communications', 'observation', 'equipment', 'personal']);
const clipped = (s, n = 1600) => String(s ?? '').slice(0, n);
const clockOf = value => Number.isFinite(value) && value >= 0 ? Math.round(value * 1000) / 1000 : null;
export function stamp(clock) {
 if (clock == null || !Number.isFinite(clock)) return 'Time not recorded';
 return `Day ${Math.floor(clock / 1440) + 1} · ${String(Math.floor(clock / 60) % 24).padStart(2, '0')}:${String(Math.floor(clock) % 60).padStart(2, '0')}`;
}
// A hinged, flexible sheet in book coordinates; shared by the viewer and tests.
export function pagePoint(distance, height, progress, direction = 1) {
 const p = Math.max(0, Math.min(1, progress)), s = Math.max(0, Math.min(4, distance));
 const angle = p * Math.PI + Math.sin(p * Math.PI) * .23 * (s / 4);
 return {x: s === 0 ? 0 : direction * s * Math.cos(angle), y: height + Math.sin(Math.PI * s / 4) * Math.sin(p * Math.PI) * .055,
  z: .17 + s * Math.sin(angle) + Math.sin(Math.PI * s / 4) * Math.sin(p * Math.PI) * .12};
}
function canonical(value) {
 if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
 if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
 return JSON.stringify(value);
}
export function journalId(value) {
 const str = canonical(value); let hash = 2166136261;
 for (let i = 0; i < str.length; i++) { hash ^= str.charCodeAt(i); hash = Math.imul(hash, 16777619); }
 return (hash >>> 0).toString(36);
}
export function makeRecord({id, timestamp = null, category = 'personal', source = 'field', payload = {}, recordedAt = null}) {
 const clean = {};
 for (const [key, value] of Object.entries(payload).slice(0, 18)) {
  if (typeof value === 'string') clean[clipped(key, 60)] = clipped(value);
  else if (typeof value === 'boolean' || value === null || Number.isFinite(value)) clean[clipped(key, 60)] = value;
 }
 const record = {timestamp: clockOf(timestamp), category: categories.has(category) ? category : 'personal', source: clipped(source, 100), payload: clean};
 record.id = clipped(id || `event:${journalId(record)}`, 180);
 record.recordedAt = typeof recordedAt === 'string' ? clipped(recordedAt, 40) : null;
 return record;
}
export function categoryFor(event) {
 const text = event?.text || '';
 if (event?.category && categories.has(event.category)) return event.category;
 if (/transmission|radio|communications|conversation/i.test(text)) return 'communications';
 if (/contract|assignment|mission|Accepted:/i.test(text)) return 'mission';
 if (/interference|probe|anomal|artefact|skitter|drifter|wraith|stalker|storm|rain|mist|sky clears/i.test(text)) return 'observation';
 if (/found|picked|took |taken|searched|bought|purchased|equipped|recovered|weapon|torch|detector/i.test(text)) return 'equipment';
 return 'personal';
}
export function eventRecord(event, state) {
 if (!event || typeof event.text !== 'string' || !event.text.trim()) return null;
 // Keep meaningful observations; normal gun handling would bury the expedition log.
 if (/^(Cleaning:|Movement |Safety |Loaded |Chamber|The slide|Rifle action|A short hop|Torch:|Knife grip:|Weather:|Objective pinned|Accepted:|Contract accepted:|Contract complete:)/i.test(event.text) || event.fired || event.enemyShot) return null;
 const payload = {text: event.text, zone: state.zone || 'unknown'};
 if (event.level) payload.level = event.level;
 for (const key of ['missionId', 'itemId', 'locationId', 'aprId', 'surgeId']) if (typeof event[key] === 'string') payload[key] = event[key];
 return makeRecord({id: typeof event.id === 'string' ? `game:${event.id}` : undefined, timestamp: state.clock, category: categoryFor(event), source: event.source || (event.newMission ? 'radio' : 'field'), payload});
}
export function missionEntries(data, state, archived = false) {
 return (data.missions || []).filter(m => archived ? ['done', 'completed', 'failed', 'abandoned'].includes(state.missions?.[m.id]) : state.missions?.[m.id] === 'active').map(m => {
  const status = state.missions[m.id], log = state.missionLog?.[m.id] || {}, owner = data.missionSources?.[m.source || 'radio'];
  const recovered = (state.bag?.[m.item] || 0) >= (m.count || 1);
  return {mission: m, status, log, source: owner?.name || m.source || 'Relay command', recovered,
   destination: recovered ? owner?.name || 'Mission giver' : m.target || 'Marked destination',
   completion: log.completedAt ?? log.failedAt ?? log.abandonedAt ?? null,
   reward: log.reward ?? m.reward ?? null};
 });
}
function blank() { return {format: JOURNAL_FORMAT, events: [], seen: [], facts: [], notes: [], discarded: 0, legacyAdopted: false}; }
export class JournalStore {
 constructor({storage, storageKey, legacyKey, now = () => new Date().toISOString()} = {}) {
  if (!storageKey || storageKey === legacyKey) throw new Error('Journal requires a separate, explicit storage key.');
  this.storage = storage; this.storageKey = storageKey; this.legacyKey = legacyKey; this.now = now; this.data = blank(); this.error = ''; this.readOnly = false;
  try {
   const raw = storage?.getItem(storageKey);
   if (raw) {
    const saved = JSON.parse(raw);
    if (saved.format !== JOURNAL_FORMAT || !Array.isArray(saved.events)) throw Error('Unknown journal format');
    this.data.events = saved.events.slice(-JOURNAL_LIMIT).filter(e => e && typeof e.id === 'string' && e.payload && typeof e.payload === 'object').map(makeRecord);
    this.data.seen = [...new Set([...(Array.isArray(saved.seen) ? saved.seen : []), ...this.data.events.map(e => e.id)].filter(v => typeof v === 'string'))].slice(-JOURNAL_SEEN_LIMIT);
    this.data.facts = [...new Set((Array.isArray(saved.facts) ? saved.facts : []).filter(v => typeof v === 'string'))].slice(-512);
    this.data.notes = (Array.isArray(saved.notes) ? saved.notes : []).filter(n => n && typeof n.text === 'string').slice(-32).map(n => ({id: clipped(n.id, 100), text: clipped(n.text, 1200), timestamp: clockOf(n.timestamp)}));
    this.data.discarded = Math.max(0, Math.floor(Number(saved.discarded) || 0)); this.data.legacyAdopted = saved.legacyAdopted === true;
   }
  } catch { this.readOnly = true; this.error = 'Existing journal could not be read. It has been preserved; new entries stay in memory.'; }
  this.seen = new Set(this.data.seen); this.facts = new Set(this.data.facts);
 }
 save() {
  if (this.readOnly) return false;
  try { this.storage?.setItem(this.storageKey, JSON.stringify(this.data)); this.error = this.storage ? '' : 'Storage unavailable. Entries stay in memory.'; return !!this.storage; }
  catch { this.error = 'Journal storage is full or unavailable. New entries stay in memory.'; return false; }
 }
 append(record, fact = null) {
  if (!record || this.seen.has(record.id) || fact && this.facts.has(fact)) return false;
  if (!record.recordedAt) record = {...record, recordedAt: this.now()};
  this.data.events.push(record); this.seen.add(record.id); this.data.seen.push(record.id);
  if (fact) { this.facts.add(fact); this.data.facts.push(fact); if (this.data.facts.length > 512) this.facts.delete(this.data.facts.shift()); }
  while (this.data.events.length > JOURNAL_LIMIT) { this.data.events.shift(); this.data.discarded++; }
  while (this.data.seen.length > JOURNAL_SEEN_LIMIT) this.seen.delete(this.data.seen.shift());
  return true;
 }
 record(state, data) {
  if (!state) return false;
  let changed = false;
  const add = (r, fact) => { if (this.append(r, fact)) changed = true; };
  for (const event of state.events || []) add(eventRecord(event, state));
  for (const {mission: m, status, log, source} of [...missionEntries(data, state), ...missionEntries(data, state, true)]) {
   const at = status === 'active' ? log.acceptedAt : log.completedAt ?? log.failedAt ?? log.abandonedAt;
   const fact = `mission:${m.id}:${status}:${at ?? 'legacy'}`;
   add(makeRecord({id: fact, timestamp: at, category: 'mission', source: m.source || 'radio', payload: {text: `${m.title} · ${status === 'done' ? 'Completed' : status[0].toUpperCase() + status.slice(1)}`, missionId: m.id, status, sourceName: source, reward: log.reward ?? (status === 'done' ? m.reward : null)}}), fact);
  }
  // A read offer is a briefing actually encountered, not an invented conversation.
  for (const id of state.readOffers || []) {
   const m = data.missions?.find(m => m.id === id); if (!m) continue;
   const fact = `briefing:${id}`;
   add(makeRecord({id: fact, timestamp: null, category: 'communications', source: m.source || 'radio', payload: {text: m.description || m.desc || m.title, title: m.title, missionId: id, kind: 'Written briefing', sourceName: data.missionSources?.[m.source || 'radio']?.name || 'Relay command'}}), fact);
  }
  for (const id of state.revealed || []) {
   const a = data.anomalies?.find(a => a.id === id); if (!a) continue;
   const fact = `anomaly:${id}`;
   add(makeRecord({id: fact, timestamp: state.clock, category: 'observation', source: 'probe', payload: {text: `Probe revealed ${a.name || 'a hazardous field'}.`, locationId: id, x: a.x, z: a.z}}), fact);
  }
  // The state only exposes the currently entered building; never reveal the whole map.
  const building = data.buildings?.find(b => b.id === state.lastBuilding);
  if (building) {
   const fact = `location:${building.id}`;
   add(makeRecord({id: fact, timestamp: state.clock, category: 'observation', source: 'exploration', payload: {text: `Entered ${building.name || building.id}.`, locationId: building.id, x: building.x, z: building.z}}), fact);
  }
  for (const [id, count] of Object.entries(state.bag || {})) {
   if (!(count > 0) || !data.catalogue?.[id]) continue;
   const fact = `item:${id}`, item = data.catalogue[id];
   add(makeRecord({id: fact, timestamp: null, category: 'equipment', source: 'inventory', payload: {text: item.description || item.name, title: item.name, itemId: id, kind: 'Equipment encountered'}}), fact);
  }
  for (const key of ['deaths', 'expeditions']) if (state[key] > 0) {
   const n = Math.floor(state[key]), fact = `${key}:${n}`;
   add(makeRecord({id: fact, timestamp: state.clock, category: 'personal', source: 'campaign', payload: {text: key === 'deaths' ? `Campaign record: ${n} death${n === 1 ? '' : 's'}. Check the Atlas for your recoverable field pack.` : `Returned expeditions: ${n}.`, count: n}}), fact);
  }
  if (changed) this.save(); return changed;
 }
 legacyEntries() {
  if (this.data.legacyAdopted || !this.legacyKey) return [];
  try { const list = JSON.parse(this.storage?.getItem(this.legacyKey) || '[]'); return Array.isArray(list) ? list.slice(-60).filter(e => e && typeof e.text === 'string' && e.text.trim()) : []; } catch { return []; }
 }
 adoptLegacy() {
  const entries = this.legacyEntries(); if (!entries.length) return 0;
  let count = 0;
  for (const e of entries) {
   const r = makeRecord({id: `legacy:${journalId({text: e.text, time: e.time, zone: e.zone})}`, timestamp: e.time, category: categoryFor(e), source: 'legacy-v9', payload: {text: e.text, zone: e.zone || 'unknown', kind: 'Imported v9 entry'}});
   if (this.append(r)) count++;
  }
  this.data.legacyAdopted = true; this.save(); return count;
 }
 addNote(text, timestamp) {
  const value = clipped(text, 1200).trim(); if (!value) return false;
  this.data.notes.push({id: `note:${journalId([value, timestamp, this.now(), this.data.notes.length])}`, text: value, timestamp: clockOf(timestamp)});
  this.data.notes = this.data.notes.slice(-32); this.save(); return true;
 }
 info() { return {format: JOURNAL_FORMAT, events: this.data.events.length, notes: this.data.notes.length, discarded: this.data.discarded, legacyAvailable: this.legacyEntries().length, legacyAdopted: this.data.legacyAdopted, persistent: !!this.storage && !this.error && !this.readOnly, error: this.error}; }
}
