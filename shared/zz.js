// zelo/zuno shared module: auth, profile, scores
// Guests: nothing is saved. Signed in: plays live in Firestore only; all writes go through the score Worker.
import { firebaseConfig, workerUrl } from './firebase-config.js?v=9';
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
  round_gone: 'That round is no longer available. Start a new one.',
  day_locked: 'That day is not open yet.',
  date_out_of_range: 'That day is outside the daily calendar.',
  bad_clock: 'Your device date looks wrong. Check it and try again.',
  bad_timezone: 'Your device timezone looks wrong. Check it and try again.',
  busy: 'Busy right now. Try again.',
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
// match: the Worker builds the puzzle (cards only, no answers), times the round and judges every guess.
export async function matchStart(level, exclude = [], last = []) {
  const uid = user?.uid, j = await api('/start', { gameId: 'match', level, exclude: exclude.slice(-60), last: last.slice(0, 8) });
  if (user?.uid !== uid) throw new ZZError('Signed out', 0, 'signed_out');
  return { ...j, token: j.roundToken, uid };
}
// Daily challenge round: `date` is the day being played, `today` the device's own local date and `tzOffset` its UTC offset in minutes east of UTC.
// The Worker re-derives the player's local date from its own clock + that offset, so the device date alone never unlocks a day.
// ---- "now" comes from the server, not the device clock ----
// GET /time returns the Worker's UTC clock. We keep one in-memory anchor (server time + performance.now() at that moment), so later device-clock
// changes cannot move it. The player's local date = that instant seen in the device's IANA timezone. Nothing is stored. If the fetch fails
// (offline, blocked) we fall back to the device clock, and `timeSource()` says which one is in use.
let anchor = null;
export const timeSource = () => anchor ? 'server' : 'device';
export const nowMs = () => anchor ? anchor.server + (performance.now() - anchor.perf) : Date.now();
export const tzName = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
export async function syncTime(timeoutMs = 4000) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = ctl && setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const t0 = performance.now(), r = await fetch(workerUrl + '/time', { cache: 'no-store', signal: ctl?.signal });
    const j = r.ok ? await r.json() : null, t1 = performance.now();
    if (j && Number.isFinite(j.now)) anchor = { server: j.now + (t1 - t0) / 2, perf: t1 };   // assume the reply took half the round trip
  } catch (e) { /* keep the previous anchor, or the device clock */ }
  finally { if (to) clearTimeout(to); }
  return timeSource();
}
const pad2 = n => String(n).padStart(2, '0');
export function localISO(ms = nowMs()) {
  try {
    const o = {}; for (const p of new Intl.DateTimeFormat('en-US', { timeZone: tzName(), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ms)) o[p.type] = p.value;
    if (o.year && o.month && o.day) return `${o.year}-${o.month}-${o.day}`;
  } catch { /* fall through to the device's own local date */ }
  const d = new Date(ms); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export async function matchDailyStart(date, round) {
  const uid = user?.uid, j = await api('/start', { gameId: 'match', date, round, tz: tzName() });   // the Worker checks the date against ITS clock + this zone
  if (user?.uid !== uid) throw new ZZError('Signed out', 0, 'signed_out');
  return { ...j, token: j.roundToken, uid };
}
export const matchGuess = (token, pick) => api('/guess', { roundToken: token, pick });
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
// Leaderboard view: the top `n` players plus, for a signed-in player with an entry who is NOT in the top n, their own row with a REAL rank.
// Read-only. The rank is "players with a higher score + 1" (competition ranking: 1,2,2,4), computed with Firestore count() aggregations
// (no document downloads, ~1 read per 1000 index entries), so the whole collection is never fetched. Tied scores share one rank and are flagged `tied`.
// Returns { top:[{uid,username,best,rank,tied,me}], me:{uid,username,best,rank,tied,inTop}|null, uid }.
export async function getLeaderboardView(g, n = 10) {
  await init(); if (fb.offline) return { top: [], me: null, uid: null };
  const { collection, query, orderBy, limit, getDocs, doc, getDoc, where, getCountFromServer } = fb.F, uid = user?.uid || null;
  const col = collection(fb.db, 'leaderboard', g, 'entries');
  try {
    const [q, mine] = await Promise.all([getDocs(query(col, orderBy('best', 'desc'), limit(n))), uid ? getDoc(doc(col, uid)) : null]);
    const rows = q.docs.map(d => ({ uid: d.id, username: d.data().username, best: d.data().best }));
    let rank = 0;                                                    // competition ranking inside the list
    rows.forEach((r, i) => { r.rank = i && r.best === rows[i - 1].best ? rows[i - 1].rank : i + 1; });
    rows.forEach((r, i) => { r.tied = (i > 0 && r.best === rows[i - 1].best) || (i < rows.length - 1 && r.best === rows[i + 1].best); r.me = !!uid && r.uid === uid; });
    let me = null; const inTop = rows.find(r => r.me);
    if (inTop) me = { ...inTop, inTop: true };
    else if (mine && mine.exists() && typeof mine.data().best === 'number') {
      const best = mine.data().best, [hi, eq] = await Promise.all([getCountFromServer(query(col, where('best', '>', best))), getCountFromServer(query(col, where('best', '==', best)))]);
      rank = hi.data().count + 1; me = { uid, username: mine.data().username, best, rank, tied: eq.data().count > 1, inTop: false };
    }
    if (user?.uid !== uid) me = null;                                 // signed out / switched account while we were reading
    return { top: rows, me, uid };
  } catch (e) { logErr('leaderboard read', e); throw e; }
}
export async function getLeaderboard(g, n = 10) { return (await getLeaderboardView(g, n)).top.map(r => ({ username: r.username, best: r.best })); }   // kept for older callers
// HTML for the view above (theme classes live in each page): top rows, then a divider and the player's own row when they are outside the top.
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lbRow = (r, me) => `<div class="row lbr${me ? ' me' : ''}"${me ? ' aria-label="Your rank"' : ''}><span><span class="m rk">${r.tied ? '=' : ''}${r.rank}</span>&nbsp; ${esc(r.username)}${me ? ' <span class="you">You</span>' : ''}</span><b>${esc(r.best)}</b></div>`;
export function leaderboardHTML(v) {
  if (!v.top.length) return '';
  let h = v.top.map(r => lbRow(r, r.me)).join('');
  if (v.me && !v.me.inTop) h += `<div class="lbgap" role="separator" aria-label="Your position"><i></i><i></i><i></i></div>` + lbRow(v.me, true);
  return h;
}

// Daily calendar: per-day bests (users/{uid}/games/match/days/{YYYY-MM-DD}: r1..r4), read-only. Null when signed out.
export async function getMyDays(from, to) {
  if (!online()) return null;
  const uid = user.uid, { collection, query, where, documentId, getDocs } = fb.F;
  try {
    const q = await getDocs(query(collection(fb.db, 'users', uid, 'games', 'match', 'days'), where(documentId(), '>=', from), where(documentId(), '<=', to)));
    const days = {}; q.docs.forEach(d => { const x = d.data(); days[d.id] = [1, 2, 3, 4].map(i => typeof x['r' + i] === 'number' ? x['r' + i] : null); });
    return { uid, days };
  } catch (e) { logErr('days', e); throw e; }
}
export async function getMySeason() {
  if (!online()) return null;
  const uid = user.uid, { doc, getDoc } = fb.F;
  try { const s = await getDoc(doc(fb.db, 'users', uid, 'games', 'matchdaily')); const d = s.exists() ? s.data() : {}; return { uid, best: d.best || 0, plays: d.plays || 0 }; }
  catch (e) { logErr('season', e); throw e; }
}
