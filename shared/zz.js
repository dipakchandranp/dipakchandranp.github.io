// zelo/zuno shared module: auth, profile, scores
import { firebaseConfig } from './firebase-config.js';
const V = '10.14.1', B = `https://www.gstatic.com/firebasejs/${V}/`;
let fb = null, user = null, profile = null;
const subs = new Set();
const RE = /^[A-Za-z0-9]{3,16}$/;
const lsKey = g => `zz:${g}:plays`;
export const validUsername = n => RE.test(n || '');

export async function init() {
  if (fb) return fb;
  try {
    const [app, auth, fs] = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js'), import(B + 'firebase-firestore.js')]);
    const a = app.initializeApp(firebaseConfig);
    fb = { auth: auth.getAuth(a), db: fs.getFirestore(a), A: auth, F: fs };
    auth.getRedirectResult(fb.auth).catch(() => {});
    auth.onAuthStateChanged(fb.auth, async u => {
      user = u; profile = null;
      if (u) { try { profile = await getProfile(); } catch (e) { console.warn(e); } }
      subs.forEach(cb => cb(user, profile));
    });
  } catch (e) { console.warn('zz: firebase unavailable, offline mode', e); fb = { offline: true }; subs.forEach(cb => cb(null, null)); }
  return fb;
}
export function onUser(cb) { subs.add(cb); if (fb) cb(user, profile); return () => subs.delete(cb); }
export const currentUser = () => user;
export const currentProfile = () => profile;

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
export async function signOut() { await init(); if (!fb.offline) await fb.A.signOut(fb.auth); }

export async function getProfile() {
  if (!user) return null; const { doc, getDoc } = fb.F;
  const s = await getDoc(doc(fb.db, 'users', user.uid));
  return profile = s.exists() ? s.data() : null;
}
export async function setUsername(name) {
  if (!user) throw new Error('Not signed in');
  if (!validUsername(name)) throw new Error('3–16 letters or digits');
  const { doc, runTransaction, serverTimestamp } = fb.F, low = name.toLowerCase();
  await runTransaction(fb.db, async t => {
    const nref = doc(fb.db, 'usernames', low), uref = doc(fb.db, 'users', user.uid);
    const [n, u] = [await t.get(nref), await t.get(uref)];
    if (n.exists() && n.data().uid !== user.uid) throw new Error('Username taken');
    if (u.exists() && u.data().username) throw new Error('Username already set');
    if (!n.exists()) t.set(nref, { uid: user.uid });
    t.set(uref, { username: name, createdAt: serverTimestamp() });
  });
  profile = { username: name };
  subs.forEach(cb => cb(user, profile));
  return profile;
}

function local(g) { try { return JSON.parse(localStorage.getItem(lsKey(g))) || []; } catch { return []; } }
function setLocal(g, a) { try { localStorage.setItem(lsKey(g), JSON.stringify(a.slice(-200))); } catch {} }

async function writeRemote(g, plays) {
  const { doc, collection, writeBatch, getDoc, serverTimestamp, Timestamp } = fb.F;
  const gref = doc(fb.db, 'users', user.uid, 'games', g);
  const cur = (await getDoc(gref)).data() || { best: 0, plays: 0 };
  let best = cur.best || 0; const b = writeBatch(fb.db);
  for (const p of plays) {
    best = Math.max(best, p.score);
    b.set(doc(collection(gref, 'plays')), { score: p.score, timeMs: p.timeMs ?? null, a: p.a ?? null, b: p.b ?? null, at: Timestamp.fromMillis(p.at) });
  }
  b.set(gref, { best, plays: (cur.plays || 0) + plays.length, lastPlayed: serverTimestamp() });
  if (profile?.username) b.set(doc(fb.db, 'leaderboard', g, 'entries', user.uid), { username: profile.username, best, updatedAt: serverTimestamp() });
  await b.commit();
}
// merge local history not yet synced for this user
export async function syncLocal(g) {
  if (!user || fb.offline) return;
  const k = `zz:${g}:synced:${user.uid}`, a = local(g), from = +localStorage.getItem(k) || 0;
  const todo = a.filter(p => p.at > from);
  if (!todo.length) return;
  for (let i = 0; i < todo.length; i += 400) await writeRemote(g, todo.slice(i, i + 400));
  localStorage.setItem(k, String(Math.max(...todo.map(p => p.at))));
}
export async function saveScore(g, score, extra = {}) {
  const p = { score, ...extra, at: Date.now() }, a = local(g); a.push(p); setLocal(g, a);
  if (user && fb && !fb.offline) { try { await syncLocal(g); } catch (e) { console.warn('zz save', e); } }
  return p;
}
export async function getMyHistory(g, n = 10) {
  if (user && fb && !fb.offline) {
    try {
      const { doc, getDoc, collection, query, orderBy, limit, getDocs } = fb.F;
      const gref = doc(fb.db, 'users', user.uid, 'games', g);
      const [s, q] = await Promise.all([getDoc(gref), getDocs(query(collection(gref, 'plays'), orderBy('at', 'desc'), limit(n)))]);
      return { best: s.data()?.best || 0, plays: s.data()?.plays || 0, recent: q.docs.map(d => ({ ...d.data(), at: d.data().at?.toMillis?.() })) };
    } catch (e) { console.warn(e); }
  }
  const a = local(g);
  return { best: a.reduce((m, p) => Math.max(m, p.score), 0), plays: a.length, recent: a.slice(-n).reverse() };
}
export async function getLeaderboard(g, n = 10) {
  await init(); if (fb.offline) return [];
  const { collection, query, orderBy, limit, getDocs } = fb.F;
  const q = await getDocs(query(collection(fb.db, 'leaderboard', g, 'entries'), orderBy('best', 'desc'), limit(n)));
  return q.docs.map(d => ({ username: d.data().username, best: d.data().best }));
}
