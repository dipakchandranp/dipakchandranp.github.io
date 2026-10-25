// Daily challenge rules shared by the page (guests) and the Worker (signed-in play). Pure functions only: no DOM, no storage.
// A day = 4 rounds; a round = one 16-word board (4 groups of 4). Day total = sum of 4 round scores, max 400.
export const ROUNDS = 4;
export const DAILY_LEVELS = [1, 2, 3, 5];          // round 1..4 -> puzzle level (easy -> hard)
export const DAILY_START = '2026-07-01', DAILY_END = '2027-04-30';   // 10 whole months pre-generated: 2026-07 .. 2027-04
export const OFFSET_MIN = -720, OFFSET_MAX = 840;   // real timezones run from UTC-12:00 to UTC+14:00 (minutes east of UTC)

// Normalised daily round score: every round is worth up to 100 (the round's level only changes how hard the board is).
//   100, minus 8 per mistake, minus 1 per 3 s after the first 30 s (at most 40); a solved round is worth at least 10; a lost round is 0.
export function scoreDaily({ mistakes, ms, solved }) {
  if (!solved) return 0;
  const slow = Math.min(40, Math.floor(Math.max(0, ms - 30000) / 3000));
  return Math.max(10, 100 - 8 * Math.max(0, mistakes) - slow);
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function validDate(s) {
  const m = DATE_RE.exec(s || ''); if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
export const inWindow = s => s >= DAILY_START && s <= DAILY_END;          // ISO dates compare as strings
export const localDateAt = (nowMs, offsetMin) => new Date(nowMs + offsetMin * 60000).toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---- timezones ----
// The player's timezone is an IANA name from the browser (Intl.DateTimeFormat().resolvedOptions().timeZone). The Worker validates it, then
// asks the runtime what the offset of that zone is AT THAT MOMENT (so daylight saving is handled by the tz database, not by us).
const TZ_RE = /^[A-Za-z][A-Za-z0-9_+\-]*(\/[A-Za-z0-9_+\-]+){0,2}$/;
const fmtCache = new Map();
function zoneFmt(tz) {
  let f = fmtCache.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); if (fmtCache.size > 200) fmtCache.clear(); fmtCache.set(tz, f); }
  return f;
}
function zoneParts(nowMs, tz) { const o = {}; for (const p of zoneFmt(tz).formatToParts(nowMs)) o[p.type] = p.value; return o; }
// offset of the zone at that instant, in minutes east of UTC; null when `tz` is not a real IANA zone
export function zoneOffsetMin(nowMs, tz) {
  if (typeof tz !== 'string' || tz.length > 64 || !TZ_RE.test(tz)) return null;
  try {
    const o = zoneParts(nowMs, tz);
    const asUtc = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute);
    const off = Math.round((asUtc - Math.floor(nowMs / 60000) * 60000) / 60000);
    return Number.isFinite(off) && off >= OFFSET_MIN && off <= OFFSET_MAX ? off : null;
  } catch { return null; }
}
export const validTz = tz => zoneOffsetMin(Date.now(), tz) !== null;
// the calendar date (YYYY-MM-DD) it is in `tz` at instant nowMs
export function localDateInZone(nowMs, tz) { const o = zoneParts(nowMs, tz); return `${o.year}-${o.month}-${o.day}`; }

// "Is this day open for a player in timezone `tz`?" The server calls this with ITS OWN clock (nowMs): the player's local "today" is the
// server's UTC time converted to that zone. A real zone is at most UTC+14, so a player's today is never more than one calendar day ahead of
// the server's UTC date. The device clock is not used at all. Returns { ok:true, today } or { ok:false, status, code, message }.
export function checkDay(nowMs, { date, tz }) {
  const bad = (status, code, message) => ({ ok: false, status, code, message });
  if (typeof date !== 'string' || !validDate(date)) return bad(400, 'bad_date', 'Pick a valid day');
  if (!inWindow(date)) return bad(400, 'date_out_of_range', 'That day is outside the daily calendar');
  const zone = tz === undefined ? 'UTC' : tz;
  if (zoneOffsetMin(nowMs, zone) === null) return bad(400, 'bad_timezone', 'Invalid timezone');
  const today = localDateInZone(nowMs, zone);                  // the player's local date according to the SERVER clock
  if (date > today) return bad(403, 'day_locked', 'That day is not open yet');
  return { ok: true, today };
}
