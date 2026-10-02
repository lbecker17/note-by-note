// An in-memory stand-in for the family's Supabase project: just the endpoints Note by Note uses
// (GoTrue email + password sign-up and sign-in, token refresh, PostgREST select / insert / upsert / update / delete with
// eq filters, and the ensure_family rpc), with the same row-level rules: only signed-in members
// of a family see or change its rows. Used by the Node tests (as a fetch) and by the browser
// checks (through Playwright's page.route), so both test against the same behaviour.

export const MOCK_KEY = 'sb_publishable_JYVHwF_c7W_k9unUwjVI2A_A42Cn_kp';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'apikey, authorization, content-type, prefer, x-client-info',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

const SONG_ID = /^fam-[A-Za-z0-9_-]{1,64}$/;

// allowList: the only emails that may sign up (null: anyone). confirmEmail: the project's
// "Confirm email" setting; allowed emails are confirmed as they sign up (autoConfirm), so with it
// on, sign-up answers without a session but signing in with the password works.
export function createMock({ tokenTTL = 3600, now = () => Date.now(), allowList = null, confirmEmail = false, autoConfirm = true } = {}) {
  let n = 0;
  const uuid = () => {
    n++;
    const h = (n + 0x1000).toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${h.slice(-12)}`;
  };
  // Microsecond timestamps with +00:00, like Postgres, so clients must encode them in filters.
  let lastTs = 0;
  const ts = () => {
    let t = now() * 1000;
    if (t <= lastTs) t = lastTs + 1;
    lastTs = t;
    const ms = Math.floor(t / 1000);
    const us = String(t % 1000).padStart(3, '0');
    return new Date(ms).toISOString().replace('Z', '') + us + '+00:00';
  };

  const db = {
    users: new Map(), // email -> { id, email }
    access: new Map(), // token -> { userId, exp }
    refresh: new Map(), // token -> userId
    families: [],
    family_members: [],
    profiles: [],
    profile_state: [],
    family_songs: [],
  };
  const log = [];
  const state = { offline: false, failNext: 0, confirmEmail, autoConfirm, allowList: allowList && allowList.map((e) => e.toLowerCase()) };

  const json = (status, body, headers = {}) => ({ status, headers: { 'content-type': 'application/json', ...CORS, ...headers }, body: body === undefined ? '' : JSON.stringify(body) });
  const err = (status, message, code = 'PGRST') => json(status, { code, message });

  function issue(user) {
    const access = 'at-' + Math.random().toString(36).slice(2) + n++;
    const refresh = 'rt-' + Math.random().toString(36).slice(2) + n++;
    db.access.set(access, { userId: user.id, exp: now() + tokenTTL * 1000 });
    db.refresh.set(refresh, user.id);
    return { access_token: access, token_type: 'bearer', expires_in: tokenTTL, expires_at: Math.floor(now() / 1000) + tokenTTL, refresh_token: refresh, user: { id: user.id, email: user.email, aud: 'authenticated' } };
  }

  function authUser(headers) {
    const a = headers.authorization || headers.Authorization || '';
    const m = /^Bearer (.+)$/.exec(a);
    if (!m) return null;
    const t = db.access.get(m[1]);
    if (!t || t.exp <= now()) return 'expired';
    return t.userId;
  }

  const familiesOf = (uid) => db.family_members.filter((m) => m.user_id === uid).map((m) => m.family_id);

  function parseFilters(params) {
    const f = [];
    for (const [k, v] of params) {
      if (['select', 'order', 'on_conflict', 'limit'].includes(k)) continue;
      const m = /^(eq|neq|in)\.(.*)$/.exec(v);
      if (!m) throw new Error('bad filter ' + k + '=' + v);
      f.push({ col: k, op: m[1], val: m[2] });
    }
    return f;
  }
  const matches = (row, filters) =>
    filters.every(({ col, op, val }) => {
      const v = row[col] == null ? 'null' : String(row[col]);
      if (op === 'eq') return v === val;
      if (op === 'neq') return v !== val;
      if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').includes(v);
      return false;
    });

  function project(rows, select) {
    if (!select || select === '*') return rows.map((r) => ({ ...r }));
    const cols = select.split(',');
    return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c] === undefined ? null : r[c]])));
  }
  function order(rows, spec) {
    if (!spec) return rows;
    const parts = spec.split(',').map((p) => p.split('.'));
    return [...rows].sort((a, b) => {
      for (const [col, dir] of parts) {
        const x = a[col], y = b[col];
        if (x === y) continue;
        const c = x < y ? -1 : 1;
        return dir === 'desc' ? -c : c;
      }
      return 0;
    });
  }

  const PK = { profiles: ['id'], profile_state: ['profile_id'], family_songs: ['family_id', 'id'], families: ['id'] };

  function check(table, row, uid) {
    const fams = familiesOf(uid);
    if (!fams.includes(row.family_id)) return 'new row violates row-level security policy';
    if (table === 'profiles') {
      if (typeof row.name !== 'string' || row.name.length < 1 || row.name.length > 40) return 'name length';
      if (row.avatar != null && (typeof row.avatar !== 'string' || row.avatar.length > 40)) return 'avatar length';
    }
    if (table === 'profile_state') {
      const p = db.profiles.find((x) => x.id === row.profile_id);
      if (!p) return 'insert or update on table "profile_state" violates foreign key constraint';
      if (p.family_id !== row.family_id) return 'family mismatch';
      if (JSON.stringify(row.data || null).length >= 500 * 1024) return 'data too big';
    }
    if (table === 'family_songs') {
      if (!SONG_ID.test(String(row.id))) return 'id format';
      if (typeof row.title !== 'string' || row.title.length < 1 || row.title.length > 120) return 'title length';
    }
    return null;
  }

  function withDefaults(table, row, uid) {
    const t = ts();
    if (table === 'profiles') return { id: row.id || uuid(), family_id: row.family_id, name: row.name, avatar: row.avatar ?? null, pin_hash: row.pin_hash ?? null, sort: row.sort ?? 0, created_at: t, updated_at: t };
    if (table === 'profile_state') return { profile_id: row.profile_id, family_id: row.family_id, data: row.data ?? {}, updated_at: t };
    if (table === 'family_songs') return { family_id: row.family_id, id: row.id, title: row.title, song: row.song ?? null, source: row.source ?? null, added_by: row.added_by ?? uid, added_at: row.added_at ?? t, updated_at: t };
    return row;
  }

  function rest(method, table, params, headers, body, uid) {
    if (!PK[table] && table !== 'family_members') return err(404, 'relation does not exist', '42P01');
    const visible = (r) => familiesOf(uid).includes(table === 'families' ? r.id : r.family_id);
    const rows = db[table];
    const filters = parseFilters(params);
    const prefer = String(headers.prefer || headers.Prefer || '');
    const ret = /return=representation/.test(prefer);
    if (method === 'GET') {
      const out = order(rows.filter(visible).filter((r) => matches(r, filters)), params.get('order'));
      return json(200, project(out, params.get('select')));
    }
    if (table === 'family_members' || table === 'families') return err(403, 'permission denied', '42501');
    if (method === 'POST') {
      const list = Array.isArray(body) ? body : [body];
      const merge = /resolution=merge-duplicates/.test(prefer);
      const ignore = /resolution=ignore-duplicates/.test(prefer);
      const keys = params.get('on_conflict') ? params.get('on_conflict').split(',') : PK[table];
      const saved = [];
      const staged = [];
      for (const r of list) {
        const problem = check(table, r, uid);
        if (problem) return err(problem.includes('security') ? 403 : 400, problem, problem.includes('security') ? '42501' : '23514');
        const existing = rows.find((x) => keys.every((k) => r[k] != null && String(x[k]) === String(r[k])));
        if (existing) {
          if (!visible(existing)) return err(403, 'new row violates row-level security policy', '42501');
          if (ignore) continue;
          if (!merge) return err(409, 'duplicate key value violates unique constraint', '23505');
          staged.push(() => {
            Object.assign(existing, r, { updated_at: ts() });
            saved.push({ ...existing });
          });
        } else {
          staged.push(() => {
            const row = withDefaults(table, r, uid);
            rows.push(row);
            saved.push({ ...row });
          });
        }
      }
      staged.forEach((f) => f());
      return ret ? json(201, saved) : json(201, undefined);
    }
    if (method === 'PATCH') {
      const hit = rows.filter(visible).filter((r) => matches(r, filters));
      for (const r of hit) {
        const next = { ...r, ...body, updated_at: ts() };
        const problem = check(table, next, uid);
        if (problem) return err(400, problem, '23514');
      }
      for (const r of hit) Object.assign(r, body, { updated_at: ts() });
      return ret ? json(200, hit.map((r) => ({ ...r }))) : json(204, undefined);
    }
    if (method === 'DELETE') {
      if (!filters.length) return err(400, 'DELETE requires a WHERE clause', '21000');
      const hit = rows.filter(visible).filter((r) => matches(r, filters));
      if (table === 'profiles' && hit.some((p) => db.profile_state.some((s) => s.profile_id === p.id))) {
        return err(409, 'update or delete on table "profiles" violates foreign key constraint', '23503');
      }
      db[table] = rows.filter((r) => !hit.includes(r));
      return ret ? json(200, hit) : json(204, undefined);
    }
    return err(405, 'method not allowed');
  }

  // One request -> { status, headers, body (string) }.
  function handle({ method, url, headers = {}, body = null }) {
    const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    const u = new URL(url);
    let parsed = null;
    if (body) {
      try {
        parsed = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (e) {
        return err(400, 'bad json');
      }
    }
    log.push({ method, path: u.pathname + u.search });
    if (method === 'OPTIONS') return { status: 204, headers: { ...CORS }, body: '' };
    if (h.apikey !== MOCK_KEY) return json(401, { message: 'Invalid API key' });
    if (state.failNext > 0) {
      state.failNext--;
      return err(503, 'unavailable');
    }
    const p = u.pathname;
    if (p === '/auth/v1/signup' && method === 'POST') {
      const email = String((parsed && parsed.email) || '').trim().toLowerCase();
      const password = String((parsed && parsed.password) || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { code: 400, error_code: 'validation_failed', msg: 'Unable to validate email address: invalid format' });
      if (password.length < 6) return json(422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters.' });
      if (state.allowList && !state.allowList.includes(email)) return json(500, { code: 500, error_code: 'unexpected_failure', msg: `Database error saving new user: ${email} is not allowed to sign up` });
      if (db.users.has(email)) return json(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
      const user = { id: uuid(), email, password, confirmed: !state.confirmEmail || state.autoConfirm };
      db.users.set(email, user);
      // With "Confirm email" on, GoTrue answers with the user and no session.
      if (state.confirmEmail) return json(200, { id: user.id, email, aud: 'authenticated', confirmation_sent_at: new Date(now()).toISOString() });
      return json(200, issue(user));
    }
    if (p === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password' && method === 'POST') {
      const email = String((parsed && parsed.email) || '').trim().toLowerCase();
      const user = db.users.get(email);
      if (!user || user.password !== String((parsed && parsed.password) || '')) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      if (!user.confirmed) return json(400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
      return json(200, issue(user));
    }
    if (p === '/auth/v1/token' && u.searchParams.get('grant_type') === 'refresh_token' && method === 'POST') {
      const uid = db.refresh.get(parsed && parsed.refresh_token);
      if (!uid) return json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
      db.refresh.delete(parsed.refresh_token); // single use, like GoTrue's rotation
      const user = [...db.users.values()].find((x) => x.id === uid);
      return json(200, issue(user));
    }
    if (p === '/auth/v1/logout' && method === 'POST') return { status: 204, headers: { ...CORS }, body: '' };

    const uid = authUser(h);
    if (uid === 'expired') return json(401, { code: 'PGRST301', message: 'JWT expired' });
    if (!uid) return err(401, 'permission denied for anon', '42501');

    if (p === '/rest/v1/rpc/ensure_family' && method === 'POST') {
      const fams = familiesOf(uid);
      if (fams.length) return json(200, fams[0]);
      // One family per project: a second grown-up joins the one that's there.
      if (db.families.length) {
        db.family_members.push({ family_id: db.families[0].id, user_id: uid, role: 'grown-up', created_at: ts() });
        return json(200, db.families[0].id);
      }
      const id = uuid();
      db.families.push({ id, name: String((parsed && parsed.family_name) || 'Family').slice(0, 80), created_at: ts() });
      db.family_members.push({ family_id: id, user_id: uid, role: 'grown-up', created_at: ts() });
      return json(200, id);
    }
    const m = /^\/rest\/v1\/([a-z_]+)$/.exec(p);
    if (!m) return err(404, 'not found');
    try {
      return rest(method, m[1], u.searchParams, h, parsed, uid);
    } catch (e) {
      return err(400, String(e.message || e));
    }
  }

  // A fetch() for Node tests.
  async function fetchFn(url, init = {}) {
    if (state.offline) throw new TypeError('Failed to fetch');
    const r = handle({ method: init.method || 'GET', url, headers: init.headers || {}, body: init.body || null });
    return new Response(r.status === 204 ? null : r.body, { status: r.status, headers: r.headers });
  }

  return {
    db,
    log,
    state,
    handle,
    fetch: fetchFn,
    // Expire every access token (the next request gets a 401 and has to refresh).
    expireTokens() {
      for (const t of db.access.values()) t.exp = 0;
    },
  };
}
