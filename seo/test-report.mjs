#!/usr/bin/env node
/* Checks the SEO report summary on made-up Search Console rows (no network): language by page folder, targets,
   page-2 opportunities, low CTR, the markdown, and the service-account token request (signed JWT). */
import crypto from 'node:crypto';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('✗ ' + m); } };
const S = 'https://shakaboom55566.github.io/mafia-pro/';
process.env.SITE_URL = S; // the report reads its address when loaded: test with a fixed one, whatever seo/site-url.txt says
const { summarize, markdown, googleToken, langOf } = await import('./report.mjs');
ok(langOf(S + 'uk/roles/don/') === 'uk' && langOf(S) === 'app' && langOf(S + 'hy/') === 'hy', 'language by folder');
const rows = [
  { query: 'роли в мафии', page: S + 'ru/roles/', country: 'ukr', clicks: 3, impressions: 120, ctr: 0.025, position: 12.4 },
  { query: 'роли в мафии', page: S + 'ru/roles/', country: 'kaz', clicks: 1, impressions: 30, ctr: 0.03, position: 14 },
  { query: 'mafia pro мафия', page: S + 'ru/', country: 'ukr', clicks: 0, impressions: 40, ctr: 0, position: 2.1 },
  { query: 'մաֆիայի դերեր', page: S + 'hy/roles/', country: 'arm', clicks: 5, impressions: 25, ctr: 0.2, position: 3 },
  { query: 'zasady gry w mafię', page: S + 'pl/rules/', country: 'pol', clicks: 0, impressions: 8, ctr: 0, position: 31 }
];
const s = summarize({ rows, prevQueries: [{ query: 'роли в мафии', page: S + 'ru/roles/', position: 18 }] });
ok(s.ru.impressions === 190 && s.ru.clicks === 4, 'ru totals');
ok(s.ru.striking.length === 1 && Math.abs(s.ru.striking[0].position - 12.72) < 0.01 && s.ru.striking[0].prevPosition === 18, 'page-2 opportunity with the weighted position and the previous one');
ok(s.ru.lowCtr.length === 1 && s.ru.lowCtr[0].query === 'mafia pro мафия', 'low CTR on page 1');
ok(s.ru.targets.find(t => t.q === 'роли в мафии').position > 12 && s.ru.targets.find(t => t.q === 'мафия в телеграм').position === null, 'targets');
ok(s.hy.position === 3 && s.pl.striking.length === 0 && s.en.impressions === 0, 'other languages');
const md = markdown({ date: '2026-10-19', site: S, notes: ['x'], gsc: { inspect: [{ url: S + 'ru/', verdict: 'PASS' }, { url: S + 'pl/', verdict: 'NEUTRAL', coverage: 'Discovered - currently not indexed' }] }, summary: s, psi: [{ url: S + 'ru/', performance: 98, seo: 100, accessibility: 95, lcp: '1.2 s', cls: '0', fails: [] }], live: [{ url: S, status: 200, canonicalOk: true }], bing: null });
ok(/Проиндексировано 1 из 2/.test(md) && /Discovered/.test(md) && /Вторая страница/.test(md) && /CTR 0\.0 %/.test(md) && /скорость 98/.test(md), 'markdown');
/* the token request: a JWT signed with the service account's key */
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const real = globalThis.fetch; let seen;
globalThis.fetch = async (u, o) => { seen = { u, body: String(o.body) }; return { ok: true, status: 200, text: async () => '{"access_token":"t0k"}' }; };
const t = await googleToken({ client_email: 'seo@x.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }, 'scope-x');
globalThis.fetch = real;
const jwt = new URLSearchParams(seen.body).get('assertion').split('.');
ok(t === 't0k' && seen.u === 'https://oauth2.googleapis.com/token', 'token endpoint');
ok(crypto.createVerify('RSA-SHA256').update(jwt[0] + '.' + jwt[1]).verify(publicKey, Buffer.from(jwt[2], 'base64url')) && JSON.parse(Buffer.from(jwt[1], 'base64url')).scope === 'scope-x', 'JWT signature and claims');
console.log(`seo report: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
