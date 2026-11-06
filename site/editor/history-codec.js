/* Lossless editor-checkpoint history only. World exports and live history remain
   canonical documents; adjacent JSON splices avoid persisting thirty copies of
   every unchanged forest, building and interior. */
export const HISTORY_FORMAT = 'field-signal-editor-history/1';
// Older checkpoints accepted thirty states on each side of the current frame.
// Undo/redo may move all sixty onto one stack; preserve every accepted frame.
export const HISTORY_LIMIT = 60;
export const MAX_FRAME_CHARS = 4_000_000;
const MAX_DECODED_CHARS = 120_000_000;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function serialise(value) {
  const text = JSON.stringify(value);
  if (typeof text !== 'string') throw Error('Editor history requires JSON documents.');
  if (text.length > MAX_FRAME_CHARS) throw Error('Editor history frame exceeds the 4 million character safety limit; export the design.');
  return text;
}
function stacks(past, future) {
  if (!Array.isArray(past) || !Array.isArray(future) || past.length > HISTORY_LIMIT || future.length > HISTORY_LIMIT || past.length + future.length > HISTORY_LIMIT) {
    throw Error('Editor history exceeds sixty accepted undo/redo states.');
  }
}
function splice(previous, next) {
  let prefix = 0, suffix = 0;
  const shorter = Math.min(previous.length, next.length);
  while (prefix < shorter && previous.charCodeAt(prefix) === next.charCodeAt(prefix)) prefix++;
  while (suffix < shorter - prefix && previous.charCodeAt(previous.length - suffix - 1) === next.charCodeAt(next.length - suffix - 1)) suffix++;
  return [prefix, suffix, next.slice(prefix, next.length - suffix)];
}
function apply(previous, delta) {
  if (!Array.isArray(delta) || delta.length !== 3) throw Error('Invalid editor history splice.');
  const [prefix, suffix, insert] = delta;
  if (!Number.isSafeInteger(prefix) || !Number.isSafeInteger(suffix) || prefix < 0 || suffix < 0 || prefix + suffix > previous.length || typeof insert !== 'string') {
    throw Error('Invalid editor history splice bounds.');
  }
  if (prefix + suffix + insert.length > MAX_FRAME_CHARS) throw Error('Editor history frame exceeds the safety limit.');
  return previous.slice(0, prefix) + insert + (suffix ? previous.slice(-suffix) : '');
}

// Each chain starts at the current document and stores the nearest undo/redo
// state first. Decoding reverses it back to the existing in-memory stack order.
export function packHistory(document, past = [], future = []) {
  stacks(past, future);
  const current = serialise(document);
  let decodedChars = 0;
  const encode = frames => {
    let previous = current;
    return [...frames].reverse().map(frame => {
      const next = serialise(frame);
      decodedChars += next.length;
      if (decodedChars > MAX_DECODED_CHARS) throw Error('Editor history exceeds the decoded safety limit.');
      const delta = splice(previous, next);
      previous = next;
      return delta;
    });
  };
  return {format:HISTORY_FORMAT, past:encode(past), future:encode(future)};
}
export function unpackHistory(document, history) {
  if (!history || typeof history !== 'object' || Array.isArray(history) || history.format !== HISTORY_FORMAT || !own(history, 'past') || !own(history, 'future')) {
    throw Error('Unsupported editor history encoding.');
  }
  stacks(history.past, history.future);
  const current = serialise(document);
  let decodedChars = 0;
  const decode = deltas => {
    let previous = current;
    return deltas.map(delta => {
      const next = apply(previous, delta);
      decodedChars += next.length;
      if (decodedChars > MAX_DECODED_CHARS) throw Error('Editor history exceeds the decoded safety limit.');
      const value = JSON.parse(next);
      previous = next;
      return value;
    }).reverse();
  };
  return {past:decode(history.past), future:decode(history.future)};
}
