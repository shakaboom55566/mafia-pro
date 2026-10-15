/* ============================================================
   v59 GUIDE — «Правила и инструкция» for the role game: a screen with two parts (for every player, for the host), chapters
   with steps, screenshots of the app itself and recommendations. Texts — src/02x-i18n-guide.js (window.GUIDE_TEXTS);
   pictures — test/guide-shots.js, published by the Pages workflow to mafiapro.app/guide/<lang>/<id>.jpg.
   Entry points: the setup screen of the role game, the bottom row of the host's game screen, the player's waiting room.
   ============================================================ */
const GUIDE_BASE = (() => { try { return /(^|\.)mafiapro\.app$/.test(location.hostname) ? '/guide/' : 'https://mafiapro.app/guide/'; } catch (e) { return 'https://mafiapro.app/guide/'; } })();
const GUIDE_LANGS = ['ru', 'uk', 'en', 'pl', 'hy'];
function guideT() { const G = window.GUIDE_TEXTS || {}; return G[L.code] || G.ru || null; }
function guideImg(id) { const l = GUIDE_LANGS.includes(L.code) ? L.code : 'ru'; return `${GUIDE_BASE}${l}/${id}.jpg`; }
/* text markup: {key} → «the app's own label» in bold, **x** → bold */
function guideLabel(key) { const u = U(); let v = u[key]; if (typeof v !== 'string') return null; v = v.replace(/<[^>]+>/g, '').replace(/\{\w+\}/g, '…').replace(/\s*·\s*…$/, '').trim(); return v; }
function guideTxt(s) {
  return String(s || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\{(\w+)\}/g, (m, k) => { const v = guideLabel(k); return v === null ? m : `<b>«${esc(v)}»</b>`; });
}
function guideTab() { return S.ui.guideTab === 'host' ? 'host' : 'player'; }
function guideChapters() { const g = guideT(); return g ? (g[guideTab()] || []) : []; }
function guideOpenSet() { const o = S.ui.guideOpen; return Array.isArray(o) ? o : [0]; }
function guideChapterHTML(c, i, open, total) {
  const g = guideT(); const u = U();
  const head = `<button class="gd-head" data-a="guide-toggle" data-i="${i}" aria-expanded="${open ? 'true' : 'false'}"><span class="gd-n">${i + 1}</span><span class="gd-t">${esc(c.t)}</span><span class="gd-chev ${open ? 'open' : ''}">${I.chev}</span></button>`;
  if (!open) return `<div class="gd-ch">${head}</div>`;
  const paras = (c.p || []).map(x => `<p>${guideTxt(x)}</p>`).join('');
  const steps = c.s && c.s.length ? `<div class="gd-sub">${esc(g.steps)}</div><ol class="gd-steps">${c.s.map(x => `<li>${guideTxt(x)}</li>`).join('')}</ol>` : '';
  const imgs = c.i && c.i.length ? `<div class="gd-figs">${c.i.map(([id, cap]) => `<figure class="gd-fig" data-a="guide-img" data-id="${esc(id)}" role="button" tabindex="0"><div class="gd-img"><img src="${guideImg(id)}" alt="${esc(cap)}" loading="lazy" decoding="async"><span class="gd-nf">${esc(g.imgFail)}</span></div><figcaption>${esc(cap)}<small>${esc(g.imgHint)}</small></figcaption></figure>`).join('')}</div>` : '';
  const tips = c.r && c.r.length ? `<div class="gd-tips"><div class="gd-sub">${esc(g.tips)}</div><ul>${c.r.map(x => `<li>${guideTxt(x)}</li>`).join('')}</ul></div>` : '';
  const nav = `<div class="btn-row gd-nav">${i > 0 ? `<button class="btn ghost sm" data-a="guide-go" data-i="${i - 1}">${I.back} ${esc(g.prev)}</button>` : ''}${i + 1 < total ? `<button class="btn primary sm grow" data-a="guide-go" data-i="${i + 1}">${esc(g.next)} ${I.chev}</button>` : `<button class="btn ghost sm grow" data-a="guide-tab" data-id="${guideTab() === 'player' ? 'host' : 'player'}">${esc(guideTab() === 'player' ? g.tabHost : g.tabPlayer)} ${I.chev}</button>`}</div>`;
  return `<div class="gd-ch open">${head}<div class="gd-body"><div class="hint gd-of">${esc(tt(g.chapterOf, { i: i + 1, n: total }))}</div>${paras}${steps}${imgs}${tips}${nav}</div></div>`;
}
function guideScreen() {
  const g = guideT(); const u = U(); if (!g) return `${topbar('…', '')}`;
  const tab = guideTab(); const list = guideChapters(); const open = guideOpenSet();
  const seg = `<div class="segment n2 gd-tabs">${[['player', g.tabPlayer], ['host', g.tabHost]].map(([id, l]) => `<button class="${tab === id ? 'active' : ''}" data-a="guide-tab" data-id="${id}">${esc(l)}</button>`).join('')}</div>`;
  const allOpen = open.length >= list.length;
  return `${topbar(g.title, g.sub)}
  <div class="stack gd">
    ${seg}
    <p class="hint gd-lead">${esc(tab === 'player' ? g.leadPlayer : g.leadHost)}</p>
    <div class="row"><div class="grow"></div><button class="btn xs ghost" data-a="guide-all" data-v="${allOpen ? 'close' : 'open'}">${esc(allOpen ? g.closeAll : g.openAll)}</button></div>
    <div class="gd-list">${list.map((c, i) => guideChapterHTML(c, i, open.includes(i), list.length)).join('')}</div>
  </div>`;
}
/* the button on the setup screen of the role game and the small one at the bottom of the host's game screen */
function guideButtonHTML(kind) {
  const g = guideT(); if (!g) return '';
  if (kind === 'small') return `<button class="btn ghost sm gd-small" data-a="guide" data-id="host" aria-label="${esc(g.title)}" title="${esc(g.title)}">📖</button>`;
  if (kind === 'player') return `<button class="btn ghost sm" data-a="guide" data-id="player">📖 ${esc(g.btnPlayer)}</button>`;
  return `<button class="menu-item gd-entry" data-a="guide" data-id="host"><div class="ico">📖</div><div><div class="t">${esc(g.btn)}</div><div class="d">${esc(g.btnD)}</div></div><span class="chev">${I.chev}</span></button>`;
}
(function () {
  const origSetup = setupScreen;
  setupScreen = function () {
    const html = origSetup(); if (S.setup.scenario) return html; // the classic and the small table have their own rules
    const i = html.indexOf('<div class="stack">'); return i < 0 ? html : html.slice(0, i + 19) + guideButtonHTML('entry') + html.slice(i + 19);
  };
  const origGame = gameScreen;
  gameScreen = function () {
    const html = origGame(); const g = S.game; if (!g || isClassic(g) || (g.mods && (g.mods.bombHunt || g.mods.corruption))) return html;
    const row = '<div class="btn-row"><button class="btn ghost sm" data-a="sheet" data-id="players">'; const i = html.lastIndexOf(row); if (i < 0) return html;
    const k = html.indexOf('</div>', i); return k < 0 ? html : html.slice(0, i) + row.replace('btn-row', 'btn-row gd-row') + html.slice(i + row.length, k) + guideButtonHTML('small') + html.slice(k);
  };
  const origSheet = sheetHTML;
  sheetHTML = function (enter) {
    const sh = S.ui.sheet;
    if (sh && sh.type === 'guideImg') {
      const g = guideT(); const u = U(); const c = guideChapters().reduce((f, ch) => f || (ch.i || []).find(x => x[0] === sh.id), null);
      const body = `<div class="gd-zoom"><img src="${guideImg(sh.id)}" alt="${esc(c ? c[1] : '')}"><div class="hint" style="margin-top:8px;text-align:center">${esc(c ? c[1] : '')}</div></div>`;
      return `<div class="sheet-bg ${enter ? 'enter' : ''}" data-a="sheet-close"><div class="sheet gd-sheet" data-stop="1"><div class="grab"></div>${body}<button class="btn ghost" style="margin-top:14px" data-a="sheet-close">${u.close}</button></div></div>`;
    }
    return origSheet.apply(this, arguments);
  };
  const origBack = ACT.back;
  ACT.back = function (el) {
    if (S.screen === 'guide') { const to = S.ui.guideFrom; S.ui.guideFrom = null; if (to && to !== 'guide' && (to !== 'game' || gameLive()) && to !== 'deal') S.screen = to; else goGameOrHome(); if (to === 'setup' || to === 'game') S.tab = 'game'; window.scrollTo(0, 0); render(); return; }
    return origBack.apply(this, arguments);
  };
  /* a picture that did not load: show the note instead of a broken image (img errors do not bubble — capture phase) */
  try { document.addEventListener('error', e => { const el = e.target; if (el && el.tagName === 'IMG' && el.closest && el.closest('.gd-img')) el.closest('.gd-img').classList.add('nf'); }, true); } catch (e) {}
})();
Object.assign(ACT, {
  guide(el) { const tab = el && el.dataset && el.dataset.id === 'host' ? 'host' : 'player'; if (S.screen !== 'guide') S.ui.guideFrom = S.screen; S.ui.guideTab = tab; S.ui.guideOpen = [0]; S.ui.sheet = null; go('guide'); },
  'guide-tab'(el) { S.ui.guideTab = el.dataset.id === 'host' ? 'host' : 'player'; S.ui.guideOpen = [0]; window.scrollTo(0, 0); render(); },
  'guide-toggle'(el) { const i = +el.dataset.i; const o = guideOpenSet().slice(); const k = o.indexOf(i); if (k >= 0) o.splice(k, 1); else o.push(i); S.ui.guideOpen = o; render(); },
  'guide-go'(el) { const i = +el.dataset.i; S.ui.guideOpen = [i]; render(); try { const h = document.querySelectorAll('.gd-ch')[i]; if (h) window.scrollTo(0, Math.max(0, h.getBoundingClientRect().top + window.scrollY - 70)); } catch (e) {} },
  'guide-all'(el) { S.ui.guideOpen = el.dataset.v === 'open' ? guideChapters().map((c, i) => i) : [0]; render(); },
  'guide-img'(el) { S.ui.sheet = { type: 'guideImg', id: el.dataset.id }; render(); }
});
