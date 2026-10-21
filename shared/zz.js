// zelo/zuno shared module: auth, profile, scores
// Guests: nothing is saved. Signed in: plays live in Firestore only.
import { firebaseConfig } from './firebase-config.js';
const V = '10.14.1', B = `https://www.gstatic.com/firebasejs/${V}/`;
let fb = null, user = null, profile = null;
const subs = new Set();
const RE = /^[A-Za-z0-9]{3,16}$/;
export const validUsername = n => RE.test(n || '');
const newId = () => (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12))).replace(/-/g, '');
const logErr = (where, e) => console.error(`zz ${where}:`, e?.code || '', e?.message || e, e?.code === 'permission-denied' ? '(check Firestore rules are published)' : '');


// one-time cleanup of storage keys written by earlier versions
export function cleanupLegacyStorage(st = globalThis.localStorage) {
  try { if (!st) return; const ks = []; for (let i = 0; i < st.length; i++) { const k = st.key(i); if (k && k.startsWith('zz:')) ks.push(k); } ks.forEach(k => st.removeItem(k)); } catch {}
}
cleanupLegacyStorage();

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
export function _test(backend, u, p) { fb = backend; user = u; profile = p; }

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

// Write one play (doc id = play id) and update aggregate in one transaction.
async function writePlay(g, uid, p) {
  const { doc, runTransaction, serverTimestamp, Timestamp } = fb.F;
  const gref = doc(fb.db, 'users', uid, 'games', g), pref = doc(fb.db, 'users', uid, 'games', g, 'plays', p.id);
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

// Saves only when signed in; returns the play, or null for guests.
export async function saveScore(g, score, extra = {}) {
  if (!online()) return null;
  const uid = user.uid, p = { id: newId(), score, ...extra, at: Date.now() };
  try { await writePlay(g, uid, p); } catch (e) { logErr('play write', e); throw e; }
  if (user?.uid === uid) await syncLeaderboard(g);
  return p;
}
// Firestore only; null when signed out.
export async function getMyHistory(g, n = 10) {
  if (!online()) return null;
  const uid = user.uid, { doc, getDoc, collection, query, orderBy, limit, getDocs } = fb.F;
  const gref = doc(fb.db, 'users', uid, 'games', g);
  try {
    const [s, q] = await Promise.all([getDoc(gref), getDocs(query(collection(gref, 'plays'), orderBy('at', 'desc'), limit(n)))]);
    const d = s.exists() ? s.data() : {};
    return { uid, best: d.best || 0, plays: d.plays || 0, recent: q.docs.map(x => ({ id: x.id, ...x.data(), at: x.data().at?.toMillis?.() })) };
  } catch (e) { logErr('history', e); throw e; }
}
export async function getLeaderboard(g, n = 10) {
  await init(); if (fb.offline) return [];
  const { collection, query, orderBy, limit, getDocs } = fb.F;
  try {
    const q = await getDocs(query(collection(fb.db, 'leaderboard', g, 'entries'), orderBy('best', 'desc'), limit(n)));
    return q.docs.map(d => ({ username: d.data().username, best: d.data().best }));
  } catch (e) { logErr('leaderboard read', e); throw e; }
}
