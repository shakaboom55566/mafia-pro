/* Deploy fallback (backend.yml): removes optional parts of wrangler.toml when the Cloudflare account refuses them, so the API
   still deploys. "ratelimits" drops the rate-limit binding only; "all" also drops the api.mafiapro.app custom domain. */
const fs = require('fs');
const file = process.argv[2] || 'wrangler.toml'; const mode = process.argv[3] || 'all';
let s = fs.readFileSync(file, 'utf8');
s = s.replace(/^\[\[ratelimits\]\][\s\S]*?(?=^\[(?!ratelimits\.)|(?![\s\S]))/m, '');
if (mode === 'all') s = s.replace(/^routes = \[[\s\S]*?^\]\n/m, '');
fs.writeFileSync(file, s);
console.log(mode === 'all' ? 'wrangler.toml without the custom domain and the rate-limit binding' : 'wrangler.toml without the rate-limit binding');
