// Recovery reads a strict editor-key allowlist. Campaign, settings and journals
// are never candidates or destinations. Original bytes remain downloadable.
import {EditorSession, SESSION_KEY, WORLD_DRAFT_KEY, LAYOUT_DRAFT_PREFIX} from '../session.js';
import {validateLayout} from '../../layout-core.js';
import {checkDocument} from '../tools/world-authoring.js';
import {STORAGE as LOOT_KEY, validateProposal as validateLoot} from './loot-core.js';
import {validateProposal as validateMissions} from './missions-core.js';
export const MISSION_KEY = 'field-signal-editor-mission-proposals-v1';
const TEMPLATE_KEY = 'field-signal-editor-object-templates-v1';

function destination(key) {
  if (key === SESSION_KEY) return 'connected world';
  if (key === WORLD_DRAFT_KEY) return 'world authoring';
  if (key === LOOT_KEY) return 'loot proposal';
  if (key === MISSION_KEY) return 'mission proposal';
  if (key === TEMPLATE_KEY) return 'template library';
  if (key.startsWith(LAYOUT_DRAFT_PREFIX) && /^[\w-]{1,80}$/.test(key.slice(LAYOUT_DRAFT_PREFIX.length))) return 'building layout';
  return null;
}
export function recoveryTarget(key) {
  if (typeof key !== 'string') return null;
  const match = /^(.*):(?:recovery|rejected):[\w.-]{1,180}$/.exec(key);
  return match && destination(match[1]) ? match[1] : null;
}
export function recoveryEntries({storage, session}) {
  const entries = new Map();
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i), target = recoveryTarget(key);
    if (!target) continue;
    const raw = storage.getItem(key);
    if (raw !== null) entries.set(key, {key, target, raw, rejected:false});
  }
  for (const [key, raw] of session?.rejected || []) {
    if (destination(key)) entries.set(key, {key, target:key, raw, rejected:true});
  }
  return [...entries.values()].sort((a,b) => b.key.localeCompare(a.key));
}
export function validateRecovery(entry, {context}) {
  try {
    if (!entry || !(recoveryTarget(entry.key) === entry.target || entry.rejected && entry.key === entry.target && destination(entry.target))) throw Error('Not an allowed editor recovery key.');
    if (typeof entry.raw !== 'string' || entry.raw.length > 4_000_000) throw Error('Recovery validation limit is 4 MB; download the original bytes for review.');
    const kind = destination(entry.target);
    if (kind === 'template library') throw Error('Template libraries are download-only here. Import reviewed individual templates through Interior tools.');
    const input = JSON.parse(entry.raw), probe = new EditorSession({...context, storage:null});
    let value;
    if (kind === 'connected world') {
      if (input.format === 'field-signal-world-document') value = probe.checked(input);
      else if (input.version === 1 && input.document) value = probe.checked(input.document);
      else throw Error('Not a supported connected checkpoint or canonical world document.');
    } else if (kind === 'building layout') {
      value = validateLayout(input, {world:context.source, assets:context.assets});
      if (value.buildingId !== entry.target.slice(LAYOUT_DRAFT_PREFIX.length)) throw Error('Layout building ID does not match its recovery destination.');
    } else if (kind === 'world authoring') value = checkDocument(input, context.source);
    else if (kind === 'loot proposal') value = validateLoot(input, context.source);
    else if (kind === 'mission proposal') value = validateMissions(input, context.source);
    return {restorable:true, kind, value, error:null};
  } catch (error) { return {restorable:false, kind:destination(entry?.target || ''), error:error.message}; }
}
export function restoreRecovery(entry, {session, storage=session.storage, activeProposals={}}) {
  const checked = validateRecovery(entry, session);
  if (!checked.restorable) throw Error(checked.error);
  if (storage.getItem(entry.key) !== entry.raw) throw Error('The recovery entry changed. Refresh the list before restoring.');
  // Reloading must not discard an active unsaved design after a quota failure.
  // Validate all active snapshots before writes, then back up their exact design
  // JSON first. A backup failure aborts before any primary key is overwritten.
  const activeDocument = session.checked(session.getDocument());
  const snapshots = [[SESSION_KEY, JSON.stringify(activeDocument)]];
  if (activeProposals.loot) snapshots.push([LOOT_KEY, JSON.stringify(validateLoot(activeProposals.loot, session.context.source))]);
  if (activeProposals.missions) snapshots.push([MISSION_KEY, JSON.stringify(validateMissions(activeProposals.missions, session.context.source))]);
  const backup = (key, raw) => storage.setItem(key + ':recovery:' + Date.now() + '-' + crypto.randomUUID(), raw);
  for (const [key, raw] of snapshots) backup(key, raw);
  if (checked.kind.endsWith('proposal')) {
    const current = storage.getItem(entry.target);
    if (current !== null) backup(entry.target, current);
    storage.setItem(entry.target, JSON.stringify(checked.value));
  } else {
    // Work on a freshly loaded session. A failed recovery cannot silently mutate
    // the active editor's in-memory design. Session.save owns crash-safe mirrors.
    const working = new EditorSession({...session.context, storage}).load();
    working.replaceDocument(activeDocument);
    if (checked.kind === 'connected world') working.replaceDocument(checked.value);
    else if (checked.kind === 'building layout') working.setLayout(checked.value);
    else working.setAuthoring(checked.value);
    working.save();
  }
  return checked.kind;
}
