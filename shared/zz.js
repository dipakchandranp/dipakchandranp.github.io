// zelo/zuno shared module: auth, profile, scores
// Guests: nothing is saved. Signed in: plays live in Firestore only; all writes go through the score Worker.
import { firebaseConfig, workerUrl } from './firebase-config.js?v=5';
const V = '10.14.1', B = `https://www.gstatic.com/firebasejs/${V}/`;
let fb = null, user = null, profile = null;
const subs = new Set();
const RE = /^[A-Za-z0-9]{3,16}$/;
export const validUsername = n => RE.test(n || '');
const logErr = (where, e) => console.error(`zz ${where}:`, e?.code || '', e?.message || e, e?.code === 'permission-denied' ? '(check Firestore rules are published)' : '');



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
// ---- score Worker client ----
export class ZZError extends Error { constructor(message, status = 0, code = '') { super(message); this.status = status; this.code = code; } }
const FRIENDLY = {
  rate_limited: 'Too many tries in a row. Wait a few seconds and try again.',
  unauthenticated: 'Please sign in again.',
  username_taken: 'Username taken',
  username_set: 'Username already set',
  bad_username: '3–16 letters or digits',
  round_expired: 'That round took too long. Start a new one.',
  round_used: 'That round was already counted.',
};
async function api(path, body) {
  if (!online()) throw new ZZError('Sign in to save scores', 0, 'signed_out');
  let tok;
  try { tok = await user.getIdToken(); } catch (e) { throw new ZZError(FRIENDLY.unauthenticated, 401, 'unauthenticated'); }
  let r;
  try { r = await fetch(workerUrl + path, { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch (e) { throw new ZZError('Can’t reach the score server. Check your connection.', 0, 'network'); }
  const j = await r.json().catch(() => ({}));
  if (r.ok) return j;
  const code = j.error?.code || '';
  const msg = FRIENDLY[code] || (r.status === 429 ? FRIENDLY.rate_limited : r.status >= 500 ? 'The score server is having trouble. Try again soon.' : j.error?.message || 'Something went wrong');
  if (r.status >= 500) logErr('worker ' + path, { code, message: j.error?.message });
  throw new ZZError(msg, r.status, code);
}
export async function setUsername(name) {
  if (!user) throw new Error('Not signed in');
  if (!validUsername(name)) throw new Error('3–16 letters or digits');
  const uid = user.uid;
  await api('/username', { name });
  if (user?.uid !== uid) return null;
  profile = { username: name };
  subs.forEach(cb => cb(user, profile));
  return profile;
}
// Ask the Worker for a question. The Worker owns the numbers and the clock.
export async function startRound(g) {
  const uid = user?.uid, j = await api('/start', { gameId: g });
  if (user?.uid !== uid) throw new ZZError('Signed out', 0, 'signed_out');
  return { a: j.question.a, b: j.question.b, token: j.roundToken, uid };
}
// Submit the answer; the Worker computes time + score and writes the play and leaderboard.
export async function submitAnswer(g, token, answer) { return api('/answer', { roundToken: token, answer: String(answer) }); }

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
