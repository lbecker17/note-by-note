// Tests for the family account: the merge rules (js/sync.js), the Supabase client (js/cloud.js)
// and the profile sync (js/family.js), against an in-memory mock of the family's project
// (tests/mock-supabase.mjs). Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeState, clean, sameState, planSongs, summary, canon } from '../js/sync.js';
import { createCloud, CloudError } from '../js/cloud.js';
import { createMock } from './mock-supabase.mjs';

const URL0 = 'https://example.supabase.co';
const KEY = 'sb_publishable_JYVHwF_c7W_k9unUwjVI2A_A42Cn_kp';
const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};

// ---------- Merge rules ----------

test('merge: best and runs take the max, last comes from the newer side', () => {
  const a = { progress: { scale: { best: 0.9, runs: 3, last: 0.5, at: '2026-09-30', t: 1000 } } };
  const b = { progress: { scale: { best: 0.7, runs: 5, last: 0.7, at: '2026-10-01', t: 2000 } } };
  const m = mergeState(a, b);
  assert.deepEqual(m.progress.scale, { best: 0.9, runs: 5, last: 0.7, at: '2026-10-01', t: 2000 });
  // Same answer whichever side is "local".
  assert.deepEqual(mergeState(b, a).progress.scale, m.progress.scale);
  // One side only: kept as it is.
  const c = mergeState({ progress: { hold: { best: 0.4, runs: 1 } } }, b);
  assert.deepEqual(Object.keys(c.progress).sort(), ['hold', 'scale']);
  // Entries from before "t" existed fall back to their day.
  const d = mergeState({ progress: { x: { best: 0.2, runs: 1, last: 0.2, at: '2026-09-01' } } }, { progress: { x: { best: 0.1, runs: 2, last: 0.1, at: '2026-09-05' } } });
  assert.equal(d.progress.x.last, 0.1);
  assert.equal(d.progress.x.best, 0.2);
});

test('merge: practice days are a union of the newest 120', () => {
  const day = (i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
  const a = { days: Array.from({ length: 100 }, (_, i) => day(i * 2)) };
  const b = { days: Array.from({ length: 100 }, (_, i) => day(i * 2 + 1)) };
  const m = mergeState(a, b);
  assert.equal(m.days.length, 120);
  assert.equal(m.days[119], day(199));
  assert.deepEqual(m.days, [...m.days].sort());
  assert.deepEqual(mergeState({ days: ['2026-10-01', '2026-10-02'] }, { days: ['2026-10-02', '2026-10-03'] }).days, ['2026-10-01', '2026-10-02', '2026-10-03']);
});

test('merge: warm-up and songPass take the newer day', () => {
  const m = mergeState({ warm: { day: '2026-10-01', at: 5, heard: 0.8 }, songPass: { day: '2026-10-02' } }, { warm: { day: '2026-10-02', at: 1 }, songPass: { day: '2026-09-30' } });
  assert.equal(m.warm.day, '2026-10-02');
  assert.equal(m.songPass.day, '2026-10-02');
  // Same day: the later warm-up.
  assert.equal(mergeState({ warm: { day: '2026-10-02', at: 5 } }, { warm: { day: '2026-10-02', at: 9 } }).warm.at, 9);
  assert.equal(mergeState({ warm: null }, { warm: { day: '2026-10-02', at: 9 } }).warm.day, '2026-10-02');
});

test('merge: range and settings come from whichever side changed them last', () => {
  const a = { range: { low: 60, high: 72 }, rangeFrom: 'child', settings: { headphones: true, strict: 'relaxed' }, stamps: { range: 100, settings: 900 } };
  const b = { range: { low: 57, high: 74 }, rangeFrom: 'test', settings: { headphones: false, strict: 'strict' }, stamps: { range: 500, settings: 200 } };
  const m = mergeState(a, b);
  assert.deepEqual(m.range, { low: 57, high: 74 });
  assert.equal(m.rangeFrom, 'test');
  assert.equal(m.settings.headphones, true);
  assert.equal(m.settings.strict, 'relaxed');
  assert.deepEqual(m.stamps, { range: 500, settings: 900, reset: 0 });
  // No stamps (data from before the account): a range beats none.
  assert.deepEqual(mergeState({ range: null }, { range: { low: 50, high: 70 } }).range, { low: 50, high: 70 });
});

test('merge: a reset on one device is not undone by the other', () => {
  const resetAt = Date.parse('2026-10-02T09:00:00');
  const a = { progress: {}, days: [], stamps: { reset: resetAt } };
  const b = {
    progress: { old: { best: 0.9, runs: 4, t: resetAt - 1000 }, fresh: { best: 0.5, runs: 1, t: resetAt + 1000 } },
    days: ['2026-09-30', '2026-10-01', '2026-10-03'],
  };
  const m = mergeState(a, b);
  assert.deepEqual(Object.keys(m.progress), ['fresh']);
  assert.deepEqual(m.days, ['2026-10-03']);
  assert.equal(m.stamps.reset, resetAt);
});

test('merge: damaged data from the server is cleaned, not trusted', () => {
  const bad = {
    range: { low: 'x', high: 70 },
    settings: { headphones: 'yes', names: '<b>', strict: 'strict', extra: 1 },
    progress: { a: { best: 7, runs: 1 }, b: 'no', c: { best: 0.5, runs: -1, last: 'x' } },
    days: ['2026-10-01', '<img>', 5],
    warm: { day: 'today' },
    nudge: { range: '2026-10-01', x: 4 },
  };
  const c = clean(bad);
  assert.equal(c.range, null);
  assert.deepEqual(c.settings, { headphones: false, names: 'letters', strict: 'strict', warmupLock: true });
  assert.deepEqual(c.progress, { c: { best: 0.5, runs: 0 } });
  assert.deepEqual(c.days, ['2026-10-01']);
  assert.equal(c.warm, null);
  assert.deepEqual(c.nudge, { range: '2026-10-01' });
  for (const junk of [null, 5, 'x', [], { progress: [] }]) assert.doesNotThrow(() => mergeState(junk, junk));
  assert.ok(sameState({ a: 1 }, {}));
  assert.equal(canon({ b: 1, a: [1, { d: 2, c: 3 }] }), canon({ a: [1, { c: 3, d: 2 }], b: 1 }));
});

test('summary: days this week, lessons with a best score, last practice', () => {
  const now = new Date(2026, 9, 2, 12); // Friday 2 Oct 2026
  const s = summary({ days: ['2026-09-27', '2026-09-28', '2026-10-01', '2026-10-02'], progress: { scale: { best: 0.8, runs: 1 }, hold: { best: 0, runs: 1 }, 'song:x': { best: 0.9, runs: 1 } } }, ['scale', 'hold', 'leaps'], now);
  assert.deepEqual(s, { week: 3, lessons: 1, last: '2026-10-02' });
});

test('planSongs: pulls new and renamed songs, drops deleted ones, keeps pending changes', () => {
  const rec = (id, title) => ({ id, song: { id, title, melody: 'C4' } });
  const local = [rec('fam-a', 'A'), rec('fam-b', 'B'), rec('fam-c', 'C'), rec('fam-new', 'New here')];
  const remote = [rec('fam-a', 'A'), rec('fam-b', 'B renamed'), rec('fam-d', 'D'), rec('fam-p', 'P there')];
  const plan = planSongs(local, remote, { 'fam-new': 'put', 'fam-p': 'delete' });
  assert.deepEqual(plan.put.map((r) => r.id), ['fam-b', 'fam-d']);
  assert.deepEqual(plan.remove, ['fam-c']);
});

// ---------- The client ----------

function client(mock, storage = mem(), now) {
  return createCloud({ url: URL0, key: KEY, fetchFn: mock.fetch, storage, now });
}

test('client: create an account, sign in on another device, wrong password, family created once', async () => {
  const mock = createMock();
  const a = client(mock);
  await assert.rejects(a.signUp('bad-email', 'longenough'), (e) => e instanceof CloudError && e.code === 'bad');
  await assert.rejects(a.signUp('mum@example.com', 'short'), (e) => e.code === 'weak');
  const s = await a.signUp('mum@example.com', 'singing-1234');
  assert.ok(s.access_token && s.refresh_token && s.user.id);
  assert.equal(a.email(), 'mum@example.com');
  await assert.rejects(a.signUp('mum@example.com', 'singing-1234'), (e) => e.code === 'exists' && /Sign in instead/.test(e.message));
  const fid = await a.rpc('ensure_family', { family_name: 'Our family' });
  assert.match(fid, /^[0-9a-f-]{36}$/);

  const b = client(mock);
  await assert.rejects(b.signIn('mum@example.com', 'wrong-password'), (e) => e.code === 'bad' && /don’t match/.test(e.message));
  assert.equal(b.signedIn(), false);
  await b.signIn('Mum@example.com', 'singing-1234');
  assert.equal(await b.rpc('ensure_family', { family_name: 'Other' }), fid, 'the same family, not a new one');
  assert.equal(mock.db.families.length, 1);
});

test('client: with Confirm email on, sign-up signs in with the password straight away', async () => {
  const mock = createMock({ confirmEmail: true });
  const a = client(mock);
  const s = await a.signUp('dad@example.com', 'singing-1234');
  assert.ok(s.access_token);
  assert.equal(a.signedIn(), true);
  const paths = mock.log.map((l) => l.path);
  assert.deepEqual(paths, ['/auth/v1/signup', '/auth/v1/token?grant_type=password']);
  // Only if the project refuses that too does the app say so (no "check your email" step).
  const strict = createMock({ confirmEmail: true, autoConfirm: false });
  const b = client(strict);
  await assert.rejects(b.signUp('nan@example.com', 'singing-1234'), (e) => e.code === 'confirm');
  assert.equal(b.signedIn(), false);
});

test('client: an email that isn’t on the family’s list gets a kind message', async () => {
  const mock = createMock({ allowList: ['mum@example.com', 'dad@example.com', 'nan@example.com'] });
  const a = client(mock);
  await assert.rejects(a.signUp('stranger@example.com', 'singing-1234'), (e) => e.code === 'notallowed' && e.message === 'That email isn’t on this family’s list. Ask the grown-up who set this up.');
  assert.equal(a.signedIn(), false);
  await a.signUp('Nan@example.com', 'singing-1234');
  assert.equal(a.signedIn(), true);
});

test('client: offline and rate limits give kind errors', async () => {
  const mock = createMock();
  const a = client(mock);
  mock.state.offline = true;
  await assert.rejects(a.signIn('x@example.com', 'whatever-1'), (e) => e.code === 'offline');
  mock.state.offline = false;
  const fetch429 = async () => new Response(JSON.stringify({ code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' }), { status: 429 });
  const c = createCloud({ url: URL0, key: KEY, fetchFn: fetch429, storage: mem() });
  await assert.rejects(c.signIn('x@example.com', 'whatever-1'), (e) => e.code === 'busy' && /Wait a minute/.test(e.message));
});

test('client: refreshes before expiry and once after a 401, and keeps the session in storage', async () => {
  let clock = Date.parse('2026-10-02T10:00:00Z');
  const mock = createMock({ tokenTTL: 3600, now: () => clock });
  const storage = mem();
  const a = client(mock, storage, () => clock);
  await a.signUp('mum@example.com', 'singing-1234');
  await a.rpc('ensure_family', { family_name: 'F' });
  const first = a.session.access_token;
  assert.ok(JSON.parse(storage.getItem('note-by-note:session')).refresh_token);

  // Close to expiry: refreshed before the request.
  clock += 3590 * 1000;
  await a.select('profiles', { select: '*' });
  assert.notEqual(a.session.access_token, first);
  assert.ok(mock.log.some((l) => l.path.startsWith('/auth/v1/token?grant_type=refresh_token')));

  // The server says the token has expired: refresh once, then the request goes through.
  const before = mock.log.filter((l) => /refresh_token/.test(l.path)).length;
  mock.expireTokens();
  const rows = await a.select('profiles', { select: '*' });
  assert.deepEqual(rows, []);
  assert.equal(mock.log.filter((l) => /refresh_token/.test(l.path)).length, before + 1);

  // A new client on the same storage (the app reopened) is still signed in.
  const again = client(mock, storage, () => clock);
  assert.equal(again.signedIn(), true);
  assert.deepEqual(await again.select('profiles', {}), []);

  // A refresh token the server no longer knows: signed out of syncing, not an error wall.
  mock.db.refresh.clear();
  mock.expireTokens();
  await assert.rejects(again.select('profiles', {}), (e) => e.code === 'auth');
  assert.equal(again.expired(), true);
});

test('client: rows are private to the family; a second grown-up joins the same family', async () => {
  const mock = createMock();
  const a = client(mock);
  await a.signUp('mum@example.com', 'singing-1234');
  const fa = await a.rpc('ensure_family', { family_name: 'A' });
  await a.insert('profiles', [{ id: '11111111-1111-4111-8111-111111111111', family_id: fa, name: 'Mia', sort: 0 }]);
  // Signed in but not (yet) in the family: sees nothing, changes nothing.
  const b = client(mock);
  await b.signUp('dad@example.com', 'singing-1234');
  assert.equal((await b.select('profiles', {})).length, 0);
  await assert.rejects(b.insert('profiles', [{ family_id: fa, name: 'Sneaky' }]), (e) => e.code === 'auth');
  // Not signed in at all: the key alone opens nothing.
  const anon = await mock.fetch(`${URL0}/rest/v1/profiles?select=*`, { headers: { apikey: KEY } });
  assert.equal(anon.status, 401);
  // ensure_family: one family per project, so the second grown-up lands in it.
  assert.equal(await b.rpc('ensure_family', { family_name: 'B' }), fa);
  assert.equal(mock.db.families.length, 1);
  assert.deepEqual((await b.select('profiles', { select: 'name' })).map((p) => p.name), ['Mia']);
  await b.signOut();
  assert.equal(b.signedIn(), false);
});

// ---------- Profile sync (js/family.js) ----------

test('family: a singer’s state merges with changes made on another device', async () => {
  // js/family.js works on the browser's localStorage and fetch.
  const ls = mem();
  globalThis.localStorage = ls;
  const mock = createMock();
  globalThis.fetch = mock.fetch;
  const { family } = await import('../js/family.js');
  const { store } = await import('../js/store.js');
  family.start();

  const profiles = await family.signIn('mum@example.com', 'singing-1234', true);
  assert.deepEqual(profiles, []);
  const mia = await family.addProfile({ name: '  Mia‮ ', avatar: 'star.honey', data: { range: { low: 60, high: 72 }, progress: { scale: { best: 0.6, runs: 2, t: 1 } }, days: ['2026-09-30'] } });
  assert.equal(mia.name, 'Mia');
  family.dropLocal();
  await family.select(mia.id);
  assert.deepEqual(store.data.range, { low: 60, high: 72 });
  assert.equal(store.data.owner, mia.id);

  // Another device sings meanwhile: its row changes on the server.
  const row = mock.db.profile_state.find((r) => r.profile_id === mia.id);
  row.data = { ...row.data, progress: { scale: { best: 0.95, runs: 3, last: 0.95, t: 5 } }, days: ['2026-09-30', '2026-10-01'] };
  row.updated_at = '2026-10-02T00:00:00.000001+00:00';

  // And this device sings too.
  store.record('hold', 0.7);
  await family.sync();
  assert.equal(family.status, 'saved');
  const server = mock.db.profile_state.find((r) => r.profile_id === mia.id).data;
  assert.equal(server.progress.scale.best, 0.95);
  assert.equal(server.progress.hold.best, 0.7);
  assert.ok(server.days.includes('2026-10-01'));
  assert.equal(store.data.progress.scale.best, 0.95, 'the other device’s best arrived here');
  assert.equal(family.pending(), false);

  // A second singer keeps her own scores.
  const leo = await family.addProfile({ name: 'Leo', avatar: 'initial.sky' });
  await family.select(leo.id);
  assert.deepEqual(store.data.progress, {});
  store.record('scale', 0.3);
  await family.sync();
  await family.select(mia.id);
  assert.equal(store.data.progress.scale.best, 0.95);
  const leoRow = mock.db.profile_state.find((r) => r.profile_id === leo.id);
  assert.equal(leoRow.data.progress.scale.best, 0.3);

  const sums = await family.summaries(['scale', 'hold']);
  assert.equal(sums[mia.id].lessons, 2);
  assert.equal(sums[leo.id].lessons, 1);

  await family.deleteProfile(leo.id);
  assert.equal(mock.db.profiles.length, 1);
  assert.equal(mock.db.profile_state.length, 1);

  await family.signOut();
  assert.equal(family.signedIn(), false);
  assert.equal(ls.getItem('note-by-note:family'), null);
  store.onSave = null;
});
