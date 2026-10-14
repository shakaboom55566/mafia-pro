/* v40 — the move from shakaboom55566.github.io/mafia-pro/ to mafiapro.app. The player's saved data (profiles, settings, the game)
   lives in the browser storage of the address the app was opened at. The old address is now a bridge (seo/bridge.html): it reads
   that storage and opens the new address with the data in the hash (#…&mpm=<base64url JSON> or mpm=none).
   Opened at the new address inside Telegram (the menu button) with nothing saved here yet, the app asks the bridge once
   (?mpback=1) and comes back with the data. Search engines and site visitors outside Telegram never bounce. */
(function () {
  var KEY = 'mafiapro.v1', DONE = 'mafiapro.moved', OLD = 'https://shakaboom55566.github.io/mafia-pro/';
  var ls; try { ls = window.localStorage; ls.getItem(KEY); } catch (e) { return; }
  function clean(d) {
    if (!d || typeof d !== 'object') return null;
    var IMG = /^(data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+|https:\/\/[^\s"'<>]+)$/;
    function walk(v, depth, k) {
      if (v == null || typeof v === 'boolean') return v;
      if (typeof v === 'number') return isFinite(v) ? v : null;
      if (typeof v === 'string') { if (k === 'avatar' || k === 'photo') return IMG.test(v) ? v : null; return v.slice(0, 4000).replace(/</g, '‹').replace(/>/g, '›').replace(/"/g, '”'); }
      if (depth > 8) return null;
      if (Object.prototype.toString.call(v) === '[object Array]') { var a = []; for (var i = 0; i < v.length && i < 2000; i++) a.push(walk(v[i], depth + 1, k)); return a; }
      if (typeof v === 'object') { var o = {}; for (var key in v) { if (!Object.prototype.hasOwnProperty.call(v, key) || key === '__proto__' || key === 'constructor' || key === 'prototype') continue; o[key] = walk(v[key], depth + 1, key); } return o; }
      return null;
    }
    var out = {}; var keep = ['settings', 'setup', 'game', 'profiles', 'meId', 'demoSeeded', 'owned', 'lobby'];
    for (var i = 0; i < keep.length; i++) if (d[keep[i]] != null) out[keep[i]] = walk(d[keep[i]], 0, keep[i]);
    return out;
  }
  var h = location.hash || '';
  var parts = h.replace(/^#/, '').split('&').filter(Boolean);
  var mpm = null; var rest = parts.filter(function (p) { if (p.indexOf('mpm=') === 0) { mpm = p.slice(4); return false; } return true; });
  if (mpm !== null) {
    try {
      // v44: a link is not trusted — taken only from the old address (when the browser tells the referrer), without the Telegram
      // user (that comes from Telegram itself); strings cannot carry markup, pictures only data: or https
      var ref = document.referrer || '';
      if (mpm && mpm !== 'none' && !ls.getItem(KEY) && (!ref || ref.indexOf('https://shakaboom55566.github.io/') === 0)) {
        var s = decodeURIComponent(escape(atob(mpm.replace(/-/g, '+').replace(/_/g, '/'))));
        var c = clean(JSON.parse(s)); if (c) ls.setItem(KEY, JSON.stringify(c));
      }
    } catch (e) {}
    try { ls.setItem(DONE, '1'); } catch (e) {}
    try { history.replaceState(history.state, '', location.pathname + location.search + (rest.length ? '#' + rest.join('&') : '')); } catch (e) {}
    return;
  }
  if (location.hostname !== 'mafiapro.app' || ls.getItem(DONE) || ls.getItem(KEY)) return;
  var tg = window.Telegram && window.Telegram.WebApp;
  if (!tg || !tg.initData) return;
  try { ls.setItem(DONE, '1'); } catch (e) { return; } // set before leaving: a bridge that does not answer can never make a loop
  window.MP_MOVING = true;
  location.replace(OLD + (location.search ? location.search + '&' : '?') + 'mpback=1' + h);
})();
