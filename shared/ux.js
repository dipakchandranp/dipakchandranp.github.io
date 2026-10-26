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
