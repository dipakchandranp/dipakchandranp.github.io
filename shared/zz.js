// zelo/zuno shared module: auth, profile, scores
// Data model:
//  - Guest plays: localStorage zz:{g}:plays (only when signed out).
//  - On ANY sign-in, current guest plays are merged into that account (idempotent by
//    play id), then deleted locally, so they can never be merged into a second account.
//  - Signed in: plays go to Firestore only (doc id = stable play id => idempotent).
//    Failed writes queue in zz:{g}:pending:{uid} and retry later (never displayed, never guest).
import { firebaseConfig } from './firebase-config.js';
const V = '10.14.1', B = `https://www.gstatic.com/firebasejs/${V}/`;
let fb = null, user = null, profile = null;
const subs = new Set();
const RE = /^[A-Za-z0-9]{3,16}$/;
const guestKey = g => `zz:${g}:plays`;
const pendKey = (g, uid) => `zz:${g}:pending:${uid}`;
export const validUsername = n => RE.test(n || '');
const newId = () => (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12))).replace(/-/g, '');
const logErr = (where, e) => console.error(`zz ${where}:`, e?.code || '', e?.message || e, e?.code === 'permission-denied' ? '(check Firestore rules are published)' : '');

let ls = globalThis.localStorage;
const rd = k => { try { return JSON.parse(ls.getItem(k)) || []; } catch { return []; } };
const wr = (k, a) => { try { a.length ? ls.setItem(k, JSON.stringify(a.slice(-200))) : ls.removeItem(k); } catch {} };

export async function init() {
  if (fb) return fb;
  try {
    const [app, auth, fs] = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js'), import(B + 'firebase-firestore.js')]);
    const a = app.initializeApp(firebaseConfig);
    fb = { auth: auth.getAuth(a), db: fs.getFirestore(a), A: auth, F: fs };
    auth.getRedirectResult(fb.auth).catch(e => logErr('redirect', e));
    auth.onAuthStateChanged(fb.auth, async u => {
      user = u; profile = null;
      if (u) { try { profile = await getProfile(); } catch (e) { logErr('profile', e); } }
      subs.forEach(cb => cb(user, profile));
    });
  } catch (e) { console.warn('zz: firebase unavailable, offline mode', e); fb = { offline: true }; subs.forEach(cb => cb(null, null)); }
  return fb;
}
// test hook
export function _test(backend, u, p, storage) { fb = backend; user = u; profile = p; if (storage) ls = storage; }

export function onUser(cb) { subs.add(cb); if (fb) cb(user, profile); return () => subs.delete(cb); }
export const currentUser = () => user;
export const currentProfile = () => profile;
const online = () => !!(user && fb && !fb.offline);

export async function signInWithGoogle() {
  await init(); if (fb.offline) throw new Error('offline');
  const p = new fb.A.GoogleAuthProvider();
  try { await fb.A.signInWithPopup(fb.auth, p); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code) || /Mobi|Android/i.test(navigator.userAgent) && e.code !== 'auth/popup-closed-by-user')
      return fb.A.signInWithRedirect(fb.auth, p);
    throw e;
  }
}
export async function signOut() {
  await init(); if (fb.offline) return;
  await fb.A.signOut(fb.auth);
  user = null; profile = null; // listeners get (null,null) => guest view
}

export async function getProfile() {
  if (!user) return null; const { doc, getDoc } = fb.F;
  const s = await getDoc(doc(fb.db, 'users', user.uid));
  return profile = s.exists() ? s.data() : null;
}
export async function setUsername(name) {
  if (!user) throw new Error('Not signed in');
  if (!validUsername(name)) throw new Error('3–16 letters or digits');
  const { doc, runTransaction, serverTimestamp } = fb.F, low = name.toLowerCase();
  try {
    await runTransaction(fb.db, async t => {
      const nref = doc(fb.db, 'usernames', low), uref = doc(fb.db, 'users', user.uid);
      const n = await t.get(nref), u = await t.get(uref);
      if (n.exists() && n.data().uid !== user.uid) throw new Error('Username taken');
      if (u.exists() && u.data().username) throw new Error('Username already set');
      if (!n.exists()) t.set(nref, { uid: user.uid });
      t.set(uref, { username: name, createdAt: serverTimestamp() });
    });
  } catch (e) { if (!/taken|already/.test(e.message)) logErr('setUsername', e); throw e; }
  profile = { username: name };
  subs.forEach(cb => cb(user, profile));
  return profile;
}

// Write one play idempotently (play doc id = p.id) and update aggregate. Returns new best.
async function writePlay(g, p) {
  const { doc, runTransaction, serverTimestamp, Timestamp } = fb.F;
  const gref = doc(fb.db, 'users', user.uid, 'games', g), pref = doc(fb.db, 'users', user.uid, 'games', g, 'plays', p.id);
  return runTransaction(fb.db, async t => {
    const gs = await t.get(gref), ps = await t.get(pref);
    const cur = gs.exists() ? gs.data() : { best: 0, plays: 0 };
    if (ps.exists()) return cur.best || 0;
    const best = Math.max(cur.best || 0, p.score);
    t.set(pref, { score: p.score, timeMs: p.timeMs ?? null, a: p.a ?? null, b: p.b ?? null, at: Timestamp.fromMillis(p.at) });
    t.set(gref, { best, plays: (cur.plays || 0) + 1, lastPlayed: serverTimestamp() });
    return best;
  });
}
// Upsert public leaderboard entry from the user's Firestore best.
export async function syncLeaderboard(g) {
  if (!online() || !profile?.username) return;
  const { doc, getDoc, setDoc, serverTimestamp } = fb.F;
  try {
    const s = await getDoc(doc(fb.db, 'users', user.uid, 'games', g));
    const best = s.exists() ? (s.data().best || 0) : null;
    if (best === null) return;
    const lref = doc(fb.db, 'leaderboard', g, 'entries', user.uid), l = await getDoc(lref);
    if (l.exists() && l.data().best === best && l.data().username === profile.username) return;
    await setDoc(lref, { username: profile.username, best, updatedAt: serverTimestamp() });
  } catch (e) { logErr('leaderboard write', e); }
}

const locks = {};
const serial = (g, fn) => (locks[g] = (locks[g] || Promise.resolve()).catch(() => {}).then(fn));

// Flush per-uid pending queue + one-time guest merge. Safe to call repeatedly.
export function syncLocal(g) {
  return serial(g, async () => {
    if (!online()) return;
    const uid = user.uid, pk = pendKey(g, uid);
    const guest = rd(guestKey(g)).map(p => p.id ? p : { ...p, id: newId() });
    if (guest.length) wr(guestKey(g), guest); // persist ids before writing
    const pend = rd(pk);
    const todo = [...guest, ...pend];
    if (!todo.length) { await syncLeaderboard(g); return; }
    const failed = [];
    for (const p of todo) { try { await writePlay(g, p); } catch (e) { logErr('play write', e); failed.push(p); } }
    const gIds = new Set(guest.map(p => p.id));
    if (guest.length) wr(guestKey(g), failed.filter(p => gIds.has(p.id)));
    wr(pk, failed.filter(p => !gIds.has(p.id)));
    await syncLeaderboard(g);
  });
}

export async function saveScore(g, score, extra = {}) {
  const p = { id: newId(), score, ...extra, at: Date.now() };
  if (!online()) { const a = rd(guestKey(g)); a.push(p); wr(guestKey(g), a); return p; }
  const pk = pendKey(g, user.uid), a = rd(pk); a.push(p); wr(pk, a);
  await syncLocal(g);
  return p;
}

export async function getMyHistory(g, n = 10) {
  if (online()) {
    const pend = rd(pendKey(g, user.uid));
    try {
      const { doc, getDoc, collection, query, orderBy, limit, getDocs } = fb.F;
      const gref = doc(fb.db, 'users', user.uid, 'games', g);
      const [s, q] = await Promise.all([getDoc(gref), getDocs(query(collection(gref, 'plays'), orderBy('at', 'desc'), limit(n)))]);
      const d = s.exists() ? s.data() : {};
      return { best: d.best || 0, plays: d.plays || 0, recent: q.docs.map(x => ({ id: x.id, ...x.data(), at: x.data().at?.toMillis?.() })), pending: pend.length };
    } catch (e) { logErr('history', e); return { best: 0, plays: 0, recent: [], error: true }; }
  }
  const a = rd(guestKey(g));
  return { best: a.reduce((m, p) => Math.max(m, p.score), 0), plays: a.length, recent: a.slice(-n).reverse() };
}
export async function getLeaderboard(g, n = 10) {
  await init(); if (fb.offline) return [];
  const { collection, query, orderBy, limit, getDocs } = fb.F;
  try {
    const q = await getDocs(query(collection(fb.db, 'leaderboard', g, 'entries'), orderBy('best', 'desc'), limit(n)));
    return q.docs.map(d => ({ username: d.data().username, best: d.data().best }));
  } catch (e) { logErr('leaderboard read', e); throw e; }
}
