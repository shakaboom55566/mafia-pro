#!/bin/bash
# Configures the Telegram bot through the Bot API: menu button → Mini App, name, about and description in 5 languages.
# Needs: BOT_TOKEN (from @BotFather), APP_URL (https address of the Mini App). Never commit the token — pass it via env/secrets.
set -euo pipefail
cd "$(dirname "$0")"
: "${BOT_TOKEN:?BOT_TOKEN is not set}"
APP_URL=${APP_URL:-https://shakaboom55566.github.io/mafia-pro/}

api() { # api <method> [curl args…] — prints the response and fails unless "ok":true
  local out
  out=$(curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/$1" "${@:2}")
  echo "$1 → ${out:0:160}"
  grep -q '"ok":true' <<<"$out" || { echo "::error::$1 failed: $out"; exit 1; }
  echo "$out"
}

ME=$(api getMe | tail -1)
USERNAME=$(python3 -c 'import sys,json; print(json.loads(sys.argv[1])["result"]["username"])' "$ME")
echo "bot: @$USERNAME"
echo "$USERNAME" > /tmp/bot_username.txt

api setChatMenuButton --data-urlencode "menu_button={\"type\":\"web_app\",\"text\":\"Играть · Play\",\"web_app\":{\"url\":\"${APP_URL}\"}}" >/dev/null
api setMyName --data-urlencode "name=Mafia Pro" >/dev/null

# ru is the default (no language_code); the rest are per-language variants
api setMyShortDescription --data-urlencode "short_description@texts/short.ru.txt" >/dev/null
api setMyDescription      --data-urlencode "description@texts/desc.ru.txt" >/dev/null
for L in uk en pl hy; do
  api setMyShortDescription --data-urlencode "language_code=$L" --data-urlencode "short_description@texts/short.$L.txt" >/dev/null
  api setMyDescription      --data-urlencode "language_code=$L" --data-urlencode "description@texts/desc.$L.txt" >/dev/null
done

echo
echo "done: https://t.me/$USERNAME — menu button opens $APP_URL"
