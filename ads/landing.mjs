/* The landing pages of our paid ads in Instagram and Facebook (15.10.2026): one light page per campaign tag, written by seo/build-site.mjs.
   The ad links here (Meta adds ?fbclid=…, the ad's url_tags add &ad={{ad.id}}). On load the page asks the API for a token
   (POST /api/click, backend/src/ads.js) and turns every "play" button into t.me/<bot>?start=fb_<tag>_<token>; the bot ties the token
   to the player and tells Meta about new players (Conversions API). The Meta pixel id comes from the same answer, so the pixel is loaded
   only when the backend has it. If the API does not answer, the buttons keep the plain tagged link t.me/<bot>?start=fb_<tag>.
   Not in the sitemap (noindex): the page exists for the ads. Ukrainian: ads in Ukraine are in the state language. */
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const LANDINGS = [
  { tag: 'dnp', path: 'uk/dnipro/', lang: 'uk', city: 'Дніпро',
    title: 'Мафія з друзями в Дніпрі — грай у Telegram | Mafia Pro',
    desc: 'Мафія прямо в Telegram: ролі приходять на телефони, ніч і голосування веде застосунок. Збирай компанію в Дніпрі — за столом або онлайн.',
    h1: 'Мафія з друзями — прямо в Telegram',
    lead: 'Ролі приходять на телефони, ніч і голосування веде застосунок. Без карт і паперу: збирай компанію в Дніпрі — за столом, у кав’ярні чи онлайн.',
    cta: 'Грати в Telegram', ctaNote: 'Базова гра безкоштовна',
    features: [
      ['Ведучий на телефоні', 'Застосунок підказує кожен крок ночі, рахує голоси й нікого не плутає. Вести зможе будь-хто з компанії — навіть уперше.'],
      ['57 ролей і класика', 'Класична мафія на 10 гравців для турнірів і рольова гра з шерифом, доктором, маніяком та іншими.'],
      ['Від 5 до 24 гравців', 'Малий стіл на 5–6, звичайна компанія чи велика вечірка — склад підбирається під вас.']
    ],
    stepsH: 'Як почати за хвилину',
    steps: ['Відкрий бота @mafiaprof_bot у Telegram.', 'Створи стіл і надішли друзям код або посилання.', 'Кожен бачить свою роль у телефоні — грайте!'],
    cards: ['don', 'sheriff', 'doctor'],
    privacy: 'Конфіденційність', privacyNote: 'На цій сторінці працює піксель Meta: він рахує, скільки людей прийшло з реклами.' }
];

export function landingPage(L, { base = '/', api = 'https://api.mafiapro.app', bot = 'mafiaprof_bot' } = {}) {
  const plain = `https://t.me/${bot}?start=fb_${L.tag}`;
  const cfg = JSON.stringify({ api: api.replace(/\/$/, ''), bot, tag: L.tag }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${L.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(L.title)}</title>
<meta name="description" content="${esc(L.desc)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0b0a0e">
<meta property="og:title" content="${esc(L.title)}">
<meta property="og:description" content="${esc(L.desc)}">
<meta property="og:image" content="${base}og/${L.lang}.png">
<link rel="icon" href="${base}favicon.png">
<link rel="preconnect" href="${esc(api)}">
<style>
:root{--bg:#0b0a0e;--bg2:#15121a;--line:#2b2634;--fg:#f1e9da;--fg2:#cfc5b4;--mut:#958b80;--gold:#d8a94c;--gold2:#f0cd7a;--red:#c7423a;color-scheme:dark}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.55 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(120% 60% at 50% -10%,rgba(216,169,76,.14),transparent 60%),radial-gradient(80% 50% at 50% 110%,rgba(199,66,58,.12),transparent 60%)}
.wrap{max-width:620px;margin:0 auto;padding:0 16px 40px;position:relative}
.top{display:flex;align-items:center;justify-content:space-between;padding:16px 0}
.brand{font-weight:800;letter-spacing:.02em}.brand b{color:var(--gold)}.city{color:var(--mut);font-size:14px}
.cards{display:flex;justify-content:center;margin:8px 0 4px;height:210px}
.cards img{width:132px;height:198px;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.6);background:var(--bg2);object-fit:cover}
.cards img:nth-child(1){transform:rotate(-9deg) translate(30px,14px)}.cards img:nth-child(2){position:relative;z-index:2}.cards img:nth-child(3){transform:rotate(9deg) translate(-30px,14px)}
h1{font-size:clamp(28px,7.5vw,40px);line-height:1.12;margin:18px 0 12px;text-wrap:balance}
.lead{color:var(--fg2);margin:0 0 20px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:58px;padding:0 22px;border-radius:16px;background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1408;font-weight:800;font-size:19px;text-decoration:none;box-shadow:0 10px 30px rgba(216,169,76,.25)}
.btn:active{transform:translateY(1px)}.btn svg{width:22px;height:22px}
.note{text-align:center;color:var(--mut);font-size:14px;margin:8px 0 0}
.grid{display:grid;gap:10px;margin:30px 0}
.box{background:var(--bg2);border:1px solid var(--line);border-radius:16px;padding:14px 16px}.box h2{font-size:17px;margin:0 0 4px}.box p{margin:0;color:var(--fg2);font-size:15px}
h3{font-size:20px;margin:30px 0 10px}
ol{margin:0 0 24px;padding-left:22px;color:var(--fg2)}li{margin:6px 0}
.foot{margin-top:30px;color:var(--mut);font-size:13px;text-align:center}.foot a{color:var(--fg2)}
</style>
</head>
<body>
<main class="wrap">
  <div class="top"><span class="brand">Mafia <b>Pro</b></span><span class="city">${esc(L.city)}</span></div>
  <div class="cards">${L.cards.map(id => `<img src="${base}cards/${L.lang}/${id}.png" alt="" width="132" height="198" fetchpriority="high" onerror="this.style.visibility='hidden'">`).join('')}</div>
  <h1>${esc(L.h1)}</h1>
  <p class="lead">${esc(L.lead)}</p>
  <a class="btn" data-bot href="${plain}"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.9 4.6 18.8 19c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.6 12.8 1.9 11.3c-1-.3-1-1 .2-1.5L20.5 2.7c.9-.3 1.6.2 1.4 1.9z"/></svg>${esc(L.cta)}</a>
  <p class="note">${esc(L.ctaNote)}</p>
  <div class="grid">${L.features.map(([h, p]) => `<div class="box"><h2>${esc(h)}</h2><p>${esc(p)}</p></div>`).join('')}</div>
  <h3>${esc(L.stepsH)}</h3>
  <ol>${L.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
  <a class="btn" data-bot href="${plain}">${esc(L.cta)}</a>
  <p class="foot">${esc(L.privacyNote)} <a href="${base}${L.lang}/privacy/">${esc(L.privacy)}</a> · <a href="${base}${L.lang}/">mafiapro.app</a></p>
</main>
<script>
(function () {
  var C = ${cfg};
  var q = new URLSearchParams(location.search);
  var btns = [].slice.call(document.querySelectorAll('[data-bot]'));
  var set = function (u) { btns.forEach(function (b) { b.href = u; }); };
  var cookie = function (n) { var m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : ''; };
  var pixel = function (id) {
    if (!/^\\d{6,20}$/.test(id) || window.fbq) return;
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id); window.fbq('track', 'PageView');
  };
  btns.forEach(function (b) { b.addEventListener('click', function () { try { if (window.fbq) window.fbq('trackCustom', 'OpenBot', { tag: C.tag }); } catch (e) {} }); });
  try {
    fetch(C.api + '/api/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ src: C.tag, ad: q.get('ad') || '', fbclid: q.get('fbclid') || '', fbp: cookie('_fbp'), fbc: cookie('_fbc') }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.token) set('https://t.me/' + C.bot + '?start=fb_' + C.tag + '_' + d.token); if (d && d.pixel) pixel(d.pixel); })
      .catch(function () {});
  } catch (e) {}
})();
</script>
</body>
</html>
`;
}
