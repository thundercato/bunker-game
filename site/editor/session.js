/* Editor persistence/history around the existing canonical world document.
   The checkpoint wrapper is UI metadata, never a second world/export schema. */
import {clone, seedLayout, validateLayout} from '../layout-core.js';
import {createWorldDocument, validateWorldDocument} from '../world-document.js';
import {checkDocument} from './tools/world-authoring.js';

export const SESSION_KEY = 'field-signal-editor-world-session-v1';
export const WORLD_DRAFT_KEY = 'field-signal-world-v2-draft';
export const LAYOUT_DRAFT_PREFIX = 'field-signal-editor-v1:';
export const TRUSTED_SOURCE = '6b4f9fb9401398a65eee576f40b2d80805ef6c76';
const LIMIT = 30;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Change detection for legacy mirrors, not an authenticity or security check.
function fingerprint(raw) {
  if (raw === null) return null;
  let value = 2166136261;
  for (let i = 0; i < raw.length; i++) value = Math.imul(value ^ raw.charCodeAt(i), 16777619);
  return raw.length + ':' + (value >>> 0);
}

export class EditorSession {
  constructor({source, sourceRevision, assets = null, storage = globalThis.localStorage}) {
    this.context = {source, sourceRevision, assets};
    this.storage = storage;
    this.document = createWorldDocument({source, sourceRevision});
    this.past = []; this.future = []; this.views = {}; this.mirrors = {};
    this.rejected = new Map(); this.issues = []; this.pendingMirrors = {}; this.checkpointFingerprint=null;
  }
  checked(value) {
    const result = validateWorldDocument(value, this.context);
    result.authoring = checkDocument(result.authoring, this.context.source);
    return result;
  }
  read(key) {
    try { return this.storage?.getItem(key) ?? null; }
    catch (error) { this.issues.push('Browser storage is unavailable: ' + error.message); return null; }
  }
  load() {
    this.document = createWorldDocument({source:this.context.source,sourceRevision:this.context.sourceRevision});
    this.past=[];this.future=[];this.views={};this.mirrors={};this.pendingMirrors={};this.rejected=new Map();this.issues=[];
    const checkpoint = this.read(SESSION_KEY);this.checkpointFingerprint=fingerprint(checkpoint);
    if (checkpoint !== null) {
      try {
        const state = JSON.parse(checkpoint);
        if (state.version !== 1) throw Error('Unknown editor checkpoint version.');
        const checked=this.checked(state.document),past=(state.past||[]).slice(-LIMIT).map(d=>this.checked(d)),future=(state.future||[]).slice(-LIMIT).map(d=>this.checked(d));
        this.document = checked;
        this.views = state.views && typeof state.views === 'object' && !Array.isArray(state.views) ? clone(state.views) : {};
        this.mirrors = state.mirrors && typeof state.mirrors === 'object' ? state.mirrors : {};
        this.past=past;this.future=future;
        this.pendingMirrors=state.pendingMirrors&&typeof state.pendingMirrors==='object'?state.pendingMirrors:{};
      } catch (error) {
        this.rejected.set(SESSION_KEY, checkpoint);
        this.issues.push('Connected checkpoint needs recovery: ' + error.message);
        this.past = []; this.future = [];
      }
    }
    // Adopt old workspace keys only when they changed since our last mirror.
    // Nothing is overwritten during loading, including rejected raw drafts.
    const adopt = (key, apply) => {
      const raw = this.read(key);
      if (raw === null || fingerprint(raw) === this.mirrors[key] || fingerprint(raw) === this.pendingMirrors[key]) return;
      try { apply(JSON.parse(raw)); }
      catch (error) { this.rejected.set(key, raw); this.issues.push(key + ': ' + error.message); }
    };
    adopt(WORLD_DRAFT_KEY, value => { this.document.authoring = checkDocument(value, this.context.source); });
    for (const building of this.context.source.buildings) {
      adopt(LAYOUT_DRAFT_PREFIX + building.id, value => {
        const layout = validateLayout(value, {world: this.context.source, assets: this.context.assets});
        if (layout.buildingId !== building.id) throw Error('Draft belongs to another building.');
        this.putLayout(layout);
      });
    }
    this.document = this.checked(this.document);
    return this;
  }
  getDocument() { return clone(this.document); }
  getAuthoring() { return clone(this.document.authoring); }
  getLayout(id) { const layout = this.document.interiors.find(d => d.buildingId === id); return layout ? clone(layout) : null; }
  ensureLayout(id) {
    if (!this.getLayout(id)) this.putLayout(validateLayout(seedLayout(this.context.source, id), {world: this.context.source, assets: this.context.assets}));
    return this.getLayout(id);
  }
  putLayout(layout) {
    const index = this.document.interiors.findIndex(d => d.buildingId === layout.buildingId);
    if (index < 0) this.document.interiors.push(clone(layout)); else this.document.interiors[index] = clone(layout);
  }
  replaceDocument(value, {record = true} = {}) {
    const next = this.checked(value);
    if (equal(next, this.document)) return false;
    if (record) { this.past.push(this.getDocument()); this.past = this.past.slice(-LIMIT); this.future = []; }
    this.document = next;
    return true;
  }
  setAuthoring(value, options) {
    const next = this.getDocument(); next.authoring = checkDocument(value, this.context.source);
    return this.replaceDocument(next, options);
  }
  setLayout(value, options) {
    const next = this.getDocument(), layout = validateLayout(value, {world: this.context.source, assets: this.context.assets});
    const index = next.interiors.findIndex(d => d.buildingId === layout.buildingId);
    if (index < 0) next.interiors.push(layout); else next.interiors[index] = layout;
    return this.replaceDocument(next, options);
  }
  undo() {
    if (!this.past.length) return false;
    this.future.push(this.getDocument()); this.document = this.past.pop(); return true;
  }
  redo() {
    if (!this.future.length) return false;
    this.past.push(this.getDocument()); this.document = this.future.pop(); return true;
  }
  history() { return {undo: this.past.length, redo: this.future.length}; }
  getView(name) { return this.views[name] ? clone(this.views[name]) : null; }
  setView(name, value) { this.views[name] = clone(value); }
  saveView() {
    // Navigation records camera/selection without replacing legacy draft bytes.
    // In particular, reload must not erase an externally changed/rejected draft.
    if(this.rejected.has(SESSION_KEY)||fingerprint(this.read(SESSION_KEY))!==this.checkpointFingerprint)return false;
    const raw=JSON.stringify({version:1,document:this.document,past:this.past,future:this.future,views:this.views,mirrors:this.mirrors,pendingMirrors:this.pendingMirrors});
    this.storage?.setItem(SESSION_KEY,raw);this.checkpointFingerprint=fingerprint(raw);
    return true;
  }
  save() {
    if (!this.storage) throw Error('Browser storage is unavailable; export a backup.');
    const external=this.read(SESSION_KEY);if(external!==null&&fingerprint(external)!==this.checkpointFingerprint)this.rejected.set(SESSION_KEY,external);
    // Back up rejected bytes before replacing any key. Quota failures keep the
    // original key and pending recovery entry, so the next attempt can recover.
    for (const [key, raw] of this.rejected) {
      this.storage.setItem(key + ':recovery:' + Date.now() + '-' + this.rejected.size, raw);
      this.rejected.delete(key);
    }
    const mirrors = {...this.mirrors}, legacy = [[WORLD_DRAFT_KEY, JSON.stringify(this.document.authoring)],
      ...this.document.interiors.map(layout => [LAYOUT_DRAFT_PREFIX + layout.buildingId, JSON.stringify(layout)])];
    for (const [key, raw] of legacy) mirrors[key] = fingerprint(raw);
    // The canonical checkpoint is committed first. Legacy mirrors are retained
    // for older builds and may be retried if browser storage rejects a write.
    const pendingMirrors=Object.fromEntries(legacy.map(([key])=>[key,fingerprint(this.read(key))]));
    const checkpoint={version:1,document:this.document,past:this.past,future:this.future,views:this.views,mirrors,pendingMirrors};
    const rawCheckpoint=JSON.stringify(checkpoint);this.storage.setItem(SESSION_KEY,rawCheckpoint);this.checkpointFingerprint=fingerprint(rawCheckpoint);
    this.mirrors = mirrors;this.pendingMirrors=pendingMirrors;
    for (const [key, raw] of legacy) this.storage.setItem(key, raw);
    // Seal the transaction only after every mirror write succeeded. A partial
    // write leaves known old hashes, which loading must never adopt over the
    // newer canonical checkpoint. No campaign/settings keys are involved.
    checkpoint.pendingMirrors={};const sealed=JSON.stringify(checkpoint);this.storage.setItem(SESSION_KEY,sealed);this.checkpointFingerprint=fingerprint(sealed);this.pendingMirrors={};
    return true;
  }
}
