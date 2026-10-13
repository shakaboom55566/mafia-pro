#!/bin/bash
set -e
cd "$(dirname "$0")"
{
  cat src/01-head.html
  echo '<div id="app"></div>'
  echo '<script>'
  cat src/02-i18n.js src/02a-i18n-ru-roles.js src/02b-i18n-uk.js src/02c-i18n-en.js src/02d-i18n-pl.js src/02e-i18n-hy.js src/02g-i18n-profiles.js src/02h-i18n-premium.js src/02i-i18n-fixes.js src/02j-i18n-vote.js src/02k-i18n-review.js src/02l-i18n-classic.js src/02m-i18n-diplomacy.js src/02n-i18n-counters.js src/02o-i18n-cloud.js src/02p-i18n-online.js src/02q-i18n-discord.js src/02f-icons.js src/02-data.js src/03-engine.js src/04-ui.js src/05-profiles.js src/07-review.js src/08-telegram.js src/09-online.js src/10-discord.js src/06-shop.js
  echo '</script>'
} > mafia-pro.html
# syntax check of the script only
{ cat src/02-i18n.js src/02a-i18n-ru-roles.js src/02b-i18n-uk.js src/02c-i18n-en.js src/02d-i18n-pl.js src/02e-i18n-hy.js src/02g-i18n-profiles.js src/02h-i18n-premium.js src/02i-i18n-fixes.js src/02j-i18n-vote.js src/02k-i18n-review.js src/02l-i18n-classic.js src/02m-i18n-diplomacy.js src/02n-i18n-counters.js src/02o-i18n-cloud.js src/02p-i18n-online.js src/02q-i18n-discord.js src/02f-icons.js src/02-data.js src/03-engine.js src/04-ui.js src/05-profiles.js src/07-review.js src/08-telegram.js src/09-online.js src/10-discord.js src/06-shop.js; } > /tmp/mp-check.js
node --check /tmp/mp-check.js && echo "syntax ok"
wc -c mafia-pro.html
# deploy build: a complete HTML document with the Telegram Mini App SDK, for static hosting (GitHub/Cloudflare Pages)
mkdir -p deploy
{
  echo '<!doctype html>'
  echo '<html lang="ru">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<script src="https://telegram.org/js/telegram-web-app.js?59"></script>'
  # backend address: the Pages workflow replaces the placeholder with the MAFIA_API_URL repository variable (empty = no backend)
  echo '<meta name="mafia-api" content="__MAFIA_API__">'
  cat mafia-pro.html | sed '/<\/style>/,$!b;/<\/style>/{p;s/.*/<\/head><body>/;}' 
  echo '</body></html>'
} > deploy/index.html
wc -c deploy/index.html
# GitHub Pages serves the repository root: index.html + a 404 page that returns to the app keeping ?startapp= deep links
cp deploy/index.html index.html
cat > 404.html <<'EOF'
<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Mafia Pro</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0b0a0e">
<style>html,body{margin:0;height:100%;background:#0b0a0e;color:#e9dcc3;font:16px/1.4 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center}a{color:#d4a24c}</style>
<script>
(function(){var seg=location.pathname.split('/')[1];var root=seg==='mafia-pro'?'/mafia-pro/':'/';if(location.pathname!==root)location.replace(root+location.search+location.hash);})();
</script>
</head><body><p>Mafia Pro<br><a href="./">Открыть приложение</a></p></body></html>
EOF
cp 404.html deploy/404.html
