// The grown-up PIN: four digits, kept in the app's saved data as a salted SHA-256 hash, never
// as the digits themselves. It guards adding, sending and deleting family songs, and the
// warm-up switch. Four digits are a "not by accident" lock for children, not real security:
// anyone with the phone's storage could try all 10,000. Resetting a forgotten PIN deletes the
// family songs (in app.js), so it isn't a way around anything.

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const PIN_LENGTH = 4;
export const isPinShape = (s) => typeof s === 'string' && /^\d{4}$/.test(s);
export const pinSupported = () => !!(globalThis.crypto && crypto.subtle && crypto.getRandomValues);

async function digest(salt, pin) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(`note-by-note-pin:${salt}:${pin}`)));
}

// -> { v: 1, salt, hash }
export async function makePin(pin) {
  if (!isPinShape(pin)) throw new Error('A PIN is four digits.');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { v: 1, salt, hash: await digest(salt, pin) };
}

export async function checkPin(saved, pin) {
  if (!saved || typeof saved.salt !== 'string' || typeof saved.hash !== 'string' || !isPinShape(pin)) return false;
  const h = await digest(saved.salt, pin);
  // Same length hex strings; compare every character.
  let diff = h.length ^ saved.hash.length;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ saved.hash.charCodeAt(i);
  return diff === 0;
}
