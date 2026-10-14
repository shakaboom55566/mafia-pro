/* v40 — the move from shakaboom55566.github.io/mafia-pro/ to mafiapro.app. The player's saved data (profiles, settings, the game)
   lives in the browser storage of the address the app was opened at. The old address is now a bridge (seo/bridge.html): it reads
   that storage and opens the new address with the data in the hash (#…&mpm=<base64url JSON> or mpm=none).
   Opened at the new address inside Telegram (the menu button) with nothing saved here yet, the app asks the bridge once
   (?mpback=1) and comes back with the data. Search engines and site visitors outside Telegram never bounce. */
(function () {
  var KEY = 'mafiapro.v1', DONE = 'mafiapro.moved', OLD = 'https://shakaboom55566.github.io/mafia-pro/';
  var ls; try { ls = window.localStorage; ls.getItem(KEY); } catch (e) { return; }
  var h = location.hash || '';
  var parts = h.replace(/^#/, '').split('&').filter(Boolean);
  var mpm = null; var rest = parts.filter(function (p) { if (p.indexOf('mpm=') === 0) { mpm = p.slice(4); return false; } return true; });
  if (mpm !== null) {
    try {
      if (mpm && mpm !== 'none' && !ls.getItem(KEY)) {
        var s = decodeURIComponent(escape(atob(mpm.replace(/-/g, '+').replace(/_/g, '/'))));
        JSON.parse(s); ls.setItem(KEY, s);
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
