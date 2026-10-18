/* ============================================================
   v75 THE COUNTRY FROM THE NETWORK
   /api/me answers with `geo` — the country (ISO code) and the city Cloudflare sees for the phone's request. The player's
   own profile gets the country at once if it has none; the city is only suggested in the profile form, where both can be
   changed. The profile's city and country go to the server together (the flag at the seat, the public profile, /mydata).
   ============================================================ */
const GEO = { sent: '' };
const geoNow = () => (S.cloud && S.cloud.geo && typeof S.cloud.geo === 'object') ? S.cloud.geo : null;
const geoCountryOk = cc => /^[A-Z]{2}$/.test(String(cc || '')) && !['T1', 'XX'].includes(cc);
/* my profile without a country takes the network's one; true when it changed */
function geoApply() {
  const me = S.meId ? profById(S.meId) : null; const geo = geoNow(); if (!me || !geo) return false;
  if (!me.country && !me.noCountry && geoCountryOk(geo.country)) { me.country = geo.country; return true; } // noCountry: the player chose «no country» himself
  return false;
}
/* the server learns the profile's city and country whenever they differ from what it was last told in this session */
function geoSend() {
  const me = S.meId ? profById(S.meId) : null; if (!me || !TG.app || !apiBase() || !S.cloud || !S.cloud.user) return;
  const key = (me.city || '') + '|' + (me.country || ''); if (key === GEO.sent) return; GEO.sent = key;
  try { api('/api/me', { city: me.city || '', country: me.country || '' }).catch(() => {}); } catch (e) {}
}
(function () {
  ONL.citySent = true; // the city used to go alone once per session (09-online.js); now the pair goes through geoSend
  const origSync = cloudSync;
  cloudSync = async function () {
    await origSync(); const d = CLOUD.me; if (!d || !d.ok || !S.cloud) return;
    S.cloud.geo = d.geo && typeof d.geo === 'object' ? { country: String(d.geo.country || '').toUpperCase(), city: String(d.geo.city || '').slice(0, 48) } : null;
    if (geoApply()) { save(); if (S.screen === 'myprofile' || S.screen === 'profile') render(); }
    geoSend();
  };
  // the profile form: my new profile and my profile without a place get the network's country and city with a hint
  const origNew = ACT['prof-new'];
  const geoKind = (cc, city) => cc && city ? 'both' : cc ? 'country' : city ? 'city' : '';
  ACT['prof-new'] = function (el) { origNew.call(this, el); const geo = geoNow(); if (!(el && el.dataset && el.dataset.me && geo && S.ui.pf)) return; const cc = geoCountryOk(geo.country) ? geo.country : ''; if (cc) S.ui.pf.country = cc; if (geo.city) S.ui.pf.city = geo.city; const kind = geoKind(cc, geo.city); if (kind) { S.ui.pf.geo = kind; render(); } };
  const origEdit = ACT['prof-edit'];
  ACT['prof-edit'] = function (el) { origEdit.call(this, el); const pr = profById(el.dataset.id); const geo = geoNow(); if (!pr || pr.id !== S.meId || !geo || !S.ui.pf) return;
    const cc = !pr.country && !pr.noCountry && geoCountryOk(geo.country) ? geo.country : ''; const city = !pr.city && geo.city ? geo.city : '';
    if (cc) S.ui.pf.country = cc; if (city) S.ui.pf.city = city; const kind = geoKind(cc, city); if (kind) { S.ui.pf.geo = kind; render(); } };
  const origForm = profEditHTML;
  profEditHTML = function (id) {
    let html = origForm(id); const d = S.ui.pf || {}; const u = U();
    if (d.country && !COUNTRY_CODES.includes(d.country) && geoCountryOk(d.country)) { // a country outside the short list keeps its place in the picker
      const m = `<option value="">${u.noCountry}</option>`; const i = html.indexOf(m); if (i >= 0) html = html.slice(0, i + m.length) + `<option value="${d.country}" selected>${flagOf(d.country)} ${esc(countryName(d.country))}</option>` + html.slice(i + m.length);
    }
    if (d.geo) { const k = html.indexOf('</select></div>'); if (k >= 0) html = html.slice(0, k + 15) + `<div class="hint geo-hint">${d.geo === 'country' ? u.geoHintCountry : d.geo === 'city' ? u.geoHintCity : u.geoHint}</div>` + html.slice(k + 15); }
    return html;
  };
  const origSave = ACT['prof-save'];
  ACT['prof-save'] = function (el) { const d = S.ui.pf || {}; const r = origSave.call(this, el); try { const me = S.meId ? profById(S.meId) : null; if (me && d.me) { me.noCountry = !me.country && !!(geoNow() && geoNow().country); if (me.country) delete me.noCountry; } geoSend(); } catch (e) {} return r; }; // «no country» chosen on purpose stays
  const origPf = ACT.pf;
  ACT.pf = function (el) { origPf.call(this, el); if (S.ui.pf && S.ui.pf.geo && (el.dataset.k === 'city' || el.dataset.k === 'country')) { S.ui.pf.geo = ''; const h = document.querySelector('.geo-hint'); if (h) h.remove(); } }; // edited by hand — the hint is no longer true
})();
/* ============================================================
   v83 THE RATING BY COUNTRY FROM THE SERVER
   The «Country» tab of the ratings listed only the countries of the profiles saved on this phone. With the bot's server it lists
   every country players play from (with how many), opens on my country and shows that country's top
   (POST /api/leaderboard/country: the same points as the overall rating, the profile's country, cached 10 minutes on the server).
   The players saved on this phone stay below it under «On this phone».
   ============================================================ */
const GB = { list: null, mine: '', by: {}, busy: false };
const GB_EVERY = 2 * 60 * 1000;
function geoBoardOn() { return !!(TG.app && apiBase()); }
function geoBoardCountries() { if (!geoBoardOn()) return null; geoBoardPoll(''); return GB.list; }
function geoBoardMine() { return GB.mine || ''; }
function geoBoardPoll(cc) {
  if (!geoBoardOn() || GB.busy) return;
  const key = cc || ''; const have = GB.by[key];
  if (!key && GB.list) return; // the list of countries comes with every country's answer
  if (have && Date.now() - have.t < (have.fail ? 30000 : GB_EVERY)) return;
  GB.busy = true;
  setTimeout(async () => {
    let d = null; try { d = await api('/api/leaderboard/country', { country: key, limit: 30 }); } catch (e) { d = null; }
    GB.busy = false;
    if (d && d.ok) { GB.list = Array.isArray(d.countries) ? d.countries.filter(x => x && geoCountryOk(x.country)) : []; GB.mine = geoCountryOk(d.mine) ? d.mine : ''; if (geoCountryOk(d.country)) GB.by[d.country] = { top: Array.isArray(d.top) ? d.top : [], at: d.at || Date.now(), t: Date.now() }; }
    else GB.by[key] = Object.assign({}, GB.by[key] || {}, { fail: true, t: Date.now() });
    if (S.screen === 'ratings') render();
  }, 0);
}
/* the panel under the country picker: that country's players on the server */
function geoBoardHTML(cc) {
  if (!geoBoardOn()) return '';
  const u = U(); if (cc) geoBoardPoll(cc);
  const b = cc ? GB.by[cc] : null; const name = cc ? `${flagOf(cc)} ${esc(countryName(cc))}` : '';
  const rows = b && b.top ? (b.top.length ? `<div class="stack-s" style="margin-top:10px">${b.top.map(topRowHTML).join('')}</div>` : `<div class="hint" style="margin-top:8px">${u.geoTopEmpty}</div>`)
    : `<div class="hint" style="margin-top:8px">${b && b.fail ? u.tgTopFail : u.tgTopLoading}</div>`;
  return `<div class="panel geo-top"><div class="eyebrow">${cc ? tt(u.geoTopTitle, { country: name }) : u.geoTopAny}</div><div class="hint" style="margin-top:4px">${u.geoTopHint}</div>${rows}</div>`;
}
