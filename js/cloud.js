// A small client for the family's Supabase project: email and password sign-in (GoTrue) and the
// PostgREST tables. Plain fetch, no library, so the app stays small and works offline from its
// own files. The publishable key is meant to be in client code; every table is closed to anyone
// who isn't a signed-in member of the family (row-level security on the server).
// The session (access and refresh tokens) is kept in localStorage. Tokens are refreshed a minute
// before they expire, and a 401 is answered by refreshing once and trying again.

export const SUPABASE_URL = 'https://vqpahwynbmwjmhasukad.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_JYVHwF_c7W_k9unUwjVI2A_A42Cn_kp';
export const SESSION_KEY = 'note-by-note:session';

export class CloudError extends Error {
  // code: 'offline' (no network) | 'auth' (signed out or the session ended) | 'bad' (the server
  // said no: wrong code, a rule) | 'busy' (too many tries) | 'server' (anything else)
  constructor(message, code, status = 0, detail = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch (e) {
    /* blocked */
  }
  return memoryStorage();
}

export function createCloud({ url = SUPABASE_URL, key = SUPABASE_KEY, fetchFn, storage, now = () => Date.now(), sessionKey = SESSION_KEY } = {}) {
  const doFetch = fetchFn || ((...a) => fetch(...a));
  const store = storage || defaultStorage();
  let session = readSession();
  let refreshing = null;

  function readSession() {
    try {
      const s = JSON.parse(store.getItem(sessionKey) || 'null');
      if (s && typeof s.access_token === 'string' && typeof s.refresh_token === 'string' && s.user && typeof s.user.id === 'string') return s;
    } catch (e) {
      /* damaged: signed out */
    }
    return null;
  }
  function writeSession(s) {
    session = s;
    try {
      if (s) store.setItem(sessionKey, JSON.stringify(s));
      else store.removeItem(sessionKey);
    } catch (e) {
      /* this session only */
    }
  }
  function fromAuth(body) {
    if (!body || typeof body.access_token !== 'string' || typeof body.refresh_token !== 'string') throw new CloudError('I couldn’t sign in. Try again.', 'server');
    const u = body.user || {};
    const secs = Number(body.expires_in) > 0 ? Number(body.expires_in) : 3600;
    return {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: now() + secs * 1000,
      user: { id: String(u.id || (session && session.user.id) || ''), email: String(u.email || (session && session.user.email) || '') },
    };
  }

  async function raw(path, { method = 'GET', body, token = null, headers = {} } = {}) {
    const h = { apikey: key, ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (token) h.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await doFetch(url + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
    } catch (e) {
      throw new CloudError('I can’t reach the family account right now.', 'offline');
    }
    let data = null;
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
    }
    return { status: res.status, ok: res.ok, data };
  }

  function fail(r, fallback) {
    if (r.status === 429) return new CloudError('Too many tries. Wait a minute, then try again.', 'busy', r.status, r.data);
    if (r.status === 401 || r.status === 403) return new CloudError(fallback, 'auth', r.status, r.data);
    if (r.status >= 400 && r.status < 500) return new CloudError(fallback, 'bad', r.status, r.data);
    return new CloudError(fallback, 'server', r.status, r.data);
  }

  function saveSignIn(body, email) {
    const s = fromAuth(body);
    if (!s.user.email) s.user.email = email;
    if (!s.user.id) throw new CloudError('I couldn’t sign in. Try again.', 'server');
    writeSession(s);
    return s;
  }

  // GoTrue's errors, as kind words. kind: 'signup' | 'signin'.
  function authFail(r, kind) {
    const d = r.data || {};
    const what = String(d.error_code || d.code || d.error || '') + ' ' + String(d.msg || d.message || d.error_description || '');
    if (r.status === 429 || /rate.?limit/i.test(what)) return new CloudError('Too many tries. Wait a minute, then try again.', 'busy', r.status, d);
    // The project only lets the family's own emails sign up. The database refuses the others,
    // which the auth server reports as "Database error saving new user".
    if (/not allowed to sign ?up/i.test(what) || (kind === 'signup' && /database error saving new user/i.test(what))) return new CloudError('That email isn’t on this family’s list. Ask the grown-up who set this up.', 'notallowed', r.status, d);
    if (r.status >= 500) return new CloudError('The family account isn’t answering. Try again in a minute.', 'server', r.status, d);
    if (/already.?(registered|exists)/i.test(what)) return new CloudError('There’s already a family account with this email. Sign in instead.', 'exists', r.status, d);
    if (/weak.?password|password should/i.test(what)) return new CloudError('Choose a longer password: at least 8 characters.', 'weak', r.status, d);
    if (/email.?not.?confirmed/i.test(what)) return new CloudError('This account needs its email confirmed first.', 'confirm', r.status, d);
    if (/signup.?disabled|signups not allowed/i.test(what)) return new CloudError('New accounts are turned off for this family. Sign in instead.', 'bad', r.status, d);
    if (/invalid.?email|validate email/i.test(what)) return new CloudError('That email doesn’t look right. Check it and try again.', 'bad', r.status, d);
    if (kind === 'signin') return new CloudError('That email and password don’t match. Check them and try again.', 'bad', r.status, d);
    return new CloudError('I couldn’t create the account. Check the email and try again.', 'bad', r.status, d);
  }

  async function refresh() {
    if (!session) throw new CloudError('Sign in first.', 'auth');
    if (refreshing) return refreshing;
    const rt = session.refresh_token;
    refreshing = (async () => {
      const r = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: rt } });
      if (!r.ok) {
        const e = fail(r, 'Sign in again to keep syncing.');
        // A refresh token the server no longer accepts: this device has to sign in again.
        if (e.code === 'bad' || e.code === 'auth') {
          if (session) writeSession({ ...session, access_token: '', expires_at: 0, expired: true });
          throw new CloudError('Sign in again to keep syncing.', 'auth', r.status);
        }
        throw e;
      }
      writeSession(fromAuth(r.data));
      return session;
    })();
    try {
      return await refreshing;
    } finally {
      refreshing = null;
    }
  }

  async function token() {
    if (!session) throw new CloudError('Sign in first.', 'auth');
    if (session.expired) throw new CloudError('Sign in again to keep syncing.', 'auth');
    if (!session.access_token || session.expires_at - now() < 60000) await refresh();
    return session.access_token;
  }

  // An authorised request. A 401 refreshes the token once and tries again.
  async function request(path, opts = {}, fallback = 'Something went wrong. I’ll try again later.') {
    let r = await raw(path, { ...opts, token: await token() });
    if (r.status === 401) {
      await refresh();
      r = await raw(path, { ...opts, token: session.access_token });
    }
    if (!r.ok) throw fail(r, fallback);
    return r.data;
  }

  const q = (params) =>
    Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

  const api = {
    get session() {
      return session;
    },
    signedIn: () => !!session,
    expired: () => !!(session && session.expired),
    email: () => (session ? session.user.email : ''),
    userId: () => (session ? session.user.id : ''),
    reload() {
      session = readSession();
      return session;
    },

    // A new grown-up account. Allowed emails are confirmed by the project as they sign up, but
    // with "Confirm email" still on the answer has no session: then sign in with the same
    // password straight away. Only if that is refused too is it 'confirm'.
    async signUp(email, password) {
      const r = await raw('/auth/v1/signup', { method: 'POST', body: { email, password } });
      if (!r.ok) throw authFail(r, 'signup');
      if (r.data && typeof r.data.access_token === 'string') return saveSignIn(r.data, email);
      return api.signIn(email, password);
    },
    async signIn(email, password) {
      const r = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
      if (!r.ok) throw authFail(r, 'signin');
      return saveSignIn(r.data, email);
    },
    refresh,
    async signOut() {
      const s = session;
      writeSession(null);
      if (s && s.access_token && !s.expired) await raw('/auth/v1/logout?scope=local', { method: 'POST', token: s.access_token }).catch(() => {});
    },

    rpc: (fn, args) => request(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args }),
    // GET /rest/v1/<table>?<params>
    select: (table, params = {}) => request(`/rest/v1/${table}?${q(params)}`),
    // Insert rows. upsert: 'merge' | 'ignore' (on onConflict). Returns the saved rows.
    insert: (table, rows, { upsert = null, onConflict = null } = {}) =>
      request(`/rest/v1/${table}${onConflict ? `?${q({ on_conflict: onConflict })}` : ''}`, {
        method: 'POST',
        body: rows,
        headers: { Prefer: ['return=representation', upsert ? `resolution=${upsert === 'ignore' ? 'ignore' : 'merge'}-duplicates` : null].filter(Boolean).join(',') },
      }),
    // PATCH the rows matching filters (e.g. { id: 'eq.…' }). Returns the changed rows ([] when none matched).
    update: (table, filters, patch) => request(`/rest/v1/${table}?${q(filters)}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } }),
    remove: (table, filters) => request(`/rest/v1/${table}?${q(filters)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }),
  };
  return api;
}
