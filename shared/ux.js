// zelo/zuno shared UI helpers: Share (navigator.share, else clipboard) and the feedback sheet. In-memory only: no cookies / localStorage / sessionStorage.
import * as zz from './zz.js?v=12';

// ---- share ----
// Returns 'shared' | 'copied' | 'cancelled' | 'failed'. The text already contains the link, so only `text` is passed to the share sheet.
export async function shareText(text) {
  if (typeof navigator.share === 'function') {
    try { await navigator.share({ text }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; /* share sheet unavailable: fall through to copy */ }
  }
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return 'copied'; } } catch (e) { /* try the old way */ }
  try {
    const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length); const ok = document.execCommand('copy'); t.remove();
    return ok ? 'copied' : 'failed';
  } catch (e) { return 'failed'; }
}
// ---- share card: one PNG (brand header + result card + footer) drawn on a <canvas>, no libraries, nothing stored ----
// spec: { game:'match'|'gap', title, right, tiles:[{label,value}], file }  (brand header, glyph and tagline come from BRANDS)
const BRANDS = {
  match: { name: 'Connection', glyph: 'ബ', sub: 'connection', tagline: 'Group 16 Malayalam words into 4 groups' },
  gap: { name: 'Filling', glyph: 'പൂ', sub: 'filling', tagline: 'Fill the missing Malayalam letters' },
};
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter','Helvetica Neue',Arial,'Noto Sans Malayalam','Kartika','Nirmala UI',sans-serif";
const MLFONT = "'Noto Sans Malayalam','Kartika','Nirmala UI','Noto Sans','Segoe UI',sans-serif";
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function wrap(c, text, maxW) { const out = []; let line = ''; for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (line && c.measureText(t).width > maxW) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
function drawCard(spec) {
  const B = BRANDS[spec.game], W = 1080, PAD = 48, tiles = spec.tiles || [], n = Math.max(1, tiles.length), brandH = 450, panelY = brandH + 20, tileH = n === 1 ? 170 : 150, panelH = 118 + tileH + 36, H = panelY + panelH + 36 + 84;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  // soft blue glow at the top drawn as flat concentric bands (keeps the PNG small; a smooth gradient is ~5x larger)
  for (let i = 0; i < 36; i++) { const t = i / 35, r = 640 * (1 - t); c.fillStyle = `rgb(${Math.round(22 * t * t)},${Math.round(46 * t * t)},${Math.round(92 * t * t)})`; c.beginPath(); c.ellipse(W * .5, 0, r * 1.15, r, 0, 0, Math.PI); c.fill(); }
  c.textBaseline = 'alphabetic';
  // wordmark zelo/zuno
  c.font = '700 54px ' + FONT; c.textAlign = 'left'; const x0 = 64, wy = 92; c.fillStyle = '#f5f5f7'; c.fillText('zelo', x0, wy); let ww = c.measureText('zelo').width; c.fillStyle = '#6e6e73'; c.fillText('/', x0 + ww, wy); ww += c.measureText('/').width; c.fillStyle = '#f5f5f7'; c.fillText('zuno', x0 + ww, wy);
  // tile with the game glyph + sub label
  const tx = 64, ty = 140, ts = 280; rr(c, tx, ty, ts, ts, 62); c.fillStyle = '#111113'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#2a2a2d'; c.stroke();
  c.textAlign = 'center'; c.fillStyle = '#f5f5f7'; c.font = '700 124px ' + MLFONT; c.fillText(B.glyph, tx + ts / 2, ty + 160);
  c.fillStyle = '#86868b'; c.font = '500 34px ' + FONT; try { c.letterSpacing = '3px'; } catch (e) { /* optional */ } c.fillText(B.sub, tx + ts / 2 + 1, ty + 240); try { c.letterSpacing = '0px'; } catch (e) { /* optional */ }
  // title + tagline
  const bx = 448, bw = W - bx - 56; let fs = 130; c.textAlign = 'left'; do { c.font = '700 ' + fs + 'px ' + FONT; fs -= 2; } while (c.measureText(B.name).width > bw && fs > 50);
  const tg = c.createLinearGradient(0, 160, 0, 300); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#9d9da3'); c.fillStyle = tg; c.fillText(B.name, bx, 284);
  c.fillStyle = '#d1d1d6'; c.font = '500 40px ' + FONT; wrap(c, B.tagline, bw).forEach((l, i) => c.fillText(l, bx, 374 + i * 52));
  // result panel
  const px = PAD, pw = W - PAD * 2; rr(c, px, panelY, pw, panelH, 38); c.fillStyle = '#0d0d0f'; c.fill(); c.strokeStyle = '#222225'; c.lineWidth = 2; c.stroke();
  c.textAlign = 'left'; c.fillStyle = '#f5f5f7'; c.font = '600 54px ' + FONT; c.fillText(spec.title || '', px + 36, panelY + 76);
  c.textAlign = 'right'; c.fillStyle = '#86868b'; c.font = '400 38px ' + FONT; if (spec.right) c.fillText(spec.right, px + pw - 36, panelY + 74);
  const gap = 20, tw = (pw - 72 - gap * (n - 1)) / n, tyy = panelY + 108;
  tiles.forEach((t, i) => { const x = px + 36 + i * (tw + gap); rr(c, x, tyy, tw, tileH, 28); c.fillStyle = '#111113'; c.fill(); c.strokeStyle = '#222225'; c.lineWidth = 2; c.stroke();
    const miss = t.value == null || t.value === ''; c.textAlign = 'center'; c.fillStyle = '#6e6e73'; c.font = '500 34px ' + FONT; c.fillText(t.label, x + tw / 2, tyy + (n === 1 ? 58 : 52));
    c.fillStyle = miss ? '#48484a' : '#f5f5f7'; c.font = '700 ' + (n === 1 ? 92 : 68) + 'px ' + FONT; c.fillText(miss ? '–' : String(t.value), x + tw / 2, tyy + (n === 1 ? 152 : 120)); });
  // footer
  c.textAlign = 'center'; c.fillStyle = '#6e6e73'; c.font = '500 32px ' + FONT; try { c.letterSpacing = '1px'; } catch (e) { /* optional */ } c.fillText('zelozuno.com · ' + B.name, W / 2, H - 38);
  return cv;
}
let cardKey = '', cardP = null, lastSpec = null;
// Starts (or reuses) the render so the blob is ready before the user taps Share. Resolves to a PNG Blob, or null when canvas is unavailable.
export function cardBlob(spec) {
  const key = JSON.stringify(spec); lastSpec = spec;
  if (key === cardKey && cardP) return cardP;
  cardKey = key;
  cardP = new Promise(res => { try { const cv = drawCard(spec); if (cv.toBlob) cv.toBlob(b => res(b || null), 'image/png'); else res(null); } catch (e) { res(null); } });
  return cardP;
}
export const lastCardSpec = () => lastSpec;
// Share the image + text where the browser can attach files (navigator.canShare({files})); otherwise (or if that fails) the text share/clipboard. Cancel is silent.
export async function shareCard(text, spec) {
  let blob = null; try { blob = await cardBlob(spec); } catch (e) { /* text only */ }
  if (blob && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    try {
      const file = new File([blob], spec.file || 'zelozuno.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'zelozuno' }); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; /* file share refused: fall back to the text */ }
  }
  return shareText(text);
}

export const SHARE_MSG = { shared: '', copied: 'Copied ✓', failed: 'Could not copy. Select the text instead.', cancelled: '' };

// ---- feedback sheet ----
const CSS = `
.fbk{background:none;border:0;padding:6px 8px;margin:0;font:inherit;font-size:.7rem;color:#6e6e73;text-decoration:underline;text-underline-offset:2px;cursor:pointer;min-height:32px;-webkit-tap-highlight-color:transparent}
.fbk:hover,.fbk:focus-visible{color:#aeaeb2}
.fbsheet{position:fixed;inset:0;z-index:30;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:0 10px calc(env(safe-area-inset-bottom) + 10px)}
.fbsheet.show{display:flex}
.fbbox{position:relative;width:100%;max-width:420px;background:#1c1c1e;border:1px solid #2c2c2e;border-radius:20px;padding:16px 16px 14px;display:grid;gap:10px;color:#f5f5f7;font-family:inherit;max-height:calc(100dvh - 20px);overflow:auto}
.fbbox h2{margin:0;font-size:1.05rem;font-weight:600;text-align:center}
.fbbox .fbx{position:absolute;right:10px;top:8px;background:none;border:0;color:#8e8e93;font-size:1.1rem;width:44px;height:44px;cursor:pointer}
.fbwrap{position:relative;width:100%;max-width:420px}
.fbbox textarea,.fbbox input{width:100%;box-sizing:border-box;background:#0b0b0c;border:1px solid #3a3a3c;border-radius:12px;color:#f5f5f7;font:inherit;font-size:16px;padding:10px 12px;resize:none}
.fbbox textarea{min-height:110px}
.fbbox textarea:focus,.fbbox input:focus{outline:none;border-color:#8e8e93}
.fbmeta{display:flex;justify-content:space-between;gap:8px;font-size:.7rem;color:#6e6e73;min-height:1em}
.fbmeta .err{color:#ff6b6b}.fbmeta .ok{color:#30d158}
.fbbox .fbsend{background:#f5f5f7;color:#000;border:0;border-radius:14px;height:46px;font:inherit;font-weight:600;font-size:1rem;cursor:pointer}
.fbbox .fbsend:disabled{opacity:.5;cursor:default}
.fbpriv{font-size:.68rem;line-height:1.35;color:#6e6e73;text-align:center;margin:0}
`;
let sheet = null, last = null, openerGame = 'home', busy = false, closeT = null;
function build() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  sheet = document.createElement('div'); sheet.className = 'fbsheet'; sheet.id = 'fbsheet';
  sheet.innerHTML = `<div class="fbwrap"><form class="fbbox" id="fbform" role="dialog" aria-modal="true" aria-labelledby="fbT" novalidate>
    <button type="button" class="fbx" id="fbclose" aria-label="Close">✕</button>
    <h2 id="fbT">Feedback</h2>
    <textarea id="fbtext" maxlength="1000" rows="5" placeholder="What would make zelozuno better? A bug, a word we got wrong, an idea…" aria-label="Your feedback" required></textarea>
    <input id="fbcontact" maxlength="120" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="email or handle, optional" aria-label="Contact, optional">
    <div class="fbmeta"><span id="fbmsg" role="status" aria-live="polite"></span><span id="fbcnt">0/1000</span></div>
    <button class="fbsend" id="fbsend" type="submit">Send</button>
    <p class="fbpriv">We store your Google display name/username and scores; feedback is read only by the site owner.</p>
  </form></div>`;
  document.body.appendChild(sheet);
  const $ = id => sheet.querySelector('#' + id);
  const msg = (t, cls) => { const m = $('fbmsg'); m.textContent = t || ''; m.className = cls || ''; };
  $('fbtext').addEventListener('input', () => { $('fbcnt').textContent = $('fbtext').value.length + '/1000'; if (!busy) msg(''); });
  $('fbclose').onclick = close;
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
  sheet.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  $('fbform').onsubmit = async e => {
    e.preventDefault(); if (busy) return;
    const text = $('fbtext').value.trim(); if (!text) { msg('Please write a message', 'err'); $('fbtext').focus(); return; }
    busy = true; $('fbsend').disabled = true; $('fbsend').textContent = 'Sending…'; msg('');
    try {
      await zz.sendFeedback(text, $('fbcontact').value.trim(), openerGame);
      $('fbtext').value = ''; $('fbcontact').value = ''; $('fbcnt').textContent = '0/1000'; msg('Thank you! Sent ✓', 'ok');
      clearTimeout(closeT); closeT = setTimeout(close, 1400);
    } catch (err) { msg(err.message || 'Could not send. Try again.', 'err'); }
    busy = false; $('fbsend').disabled = false; $('fbsend').textContent = 'Send';
  };
}
export function openFeedback(game, opener) {
  if (!sheet) build();
  openerGame = game || 'home'; last = opener || document.activeElement; clearTimeout(closeT);
  sheet.querySelector('#fbmsg').textContent = ''; sheet.classList.add('show'); document.body.dataset.fb = '1';
  setTimeout(() => sheet.querySelector('#fbtext').focus(), 30);
}
export function close() { if (!sheet) return; clearTimeout(closeT); sheet.classList.remove('show'); delete document.body.dataset.fb; try { last && last.focus && last.focus(); } catch (e) { } }
// Wire every <button class="fbk" data-game="match"> on the page. The styles are injected with the first call.
export function mountFeedback(game) {
  if (!document.getElementById('fbk-style')) { const st = document.createElement('style'); st.id = 'fbk-style'; st.textContent = CSS.split('.fbsheet{')[0]; document.head.appendChild(st); }
  document.querySelectorAll('.fbk').forEach(b => { if (b.dataset.on) return; b.dataset.on = '1'; b.addEventListener('click', e => { e.preventDefault(); openFeedback(b.dataset.game || game, b); }); });
}
