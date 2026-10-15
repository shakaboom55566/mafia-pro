# Скины карт Mafia Pro — стиль (утверждён владельцем 15.10.2026)

Эталон — **«Аметистовый Дон»** (Epic, Дон мафии): `skins/amethyst-don.webp`, исходники в `skins/src/`.
Владелец: «Всё отлично вышло, запомни этот стиль». Новые скины делаются так же.

## Что такое скин
Готовая лицевая сторона карты целиком: рамка редкости, табличка с названием скина сверху, табличка редкости снизу, персонаж внутри.
Карта в приложении 2:3; файл скина — 800×1200 (см. `tools/prepare_skin.py`). Скин меняет только вид карты: правила роли те же.

## Стиль
- **Рендер:** стилизованный 3D, как дорогие скины героев в Fortnite / Overwatch / Valorant, «Unreal Engine 5 look»: чистый читаемый силуэт, богатые материалы (шёлк, шерсть, золото, кристалл), малая глубина резкости.
- **Свет:** тёплый золотой ключевой спереди + сильный цветной контровой цвета редкости; объёмные лучи, искры, боке.
- **Персонаж:** по пояс, вполоборота, уверенная поза, смотрит на зрителя; узнаваемая деталь роли в руке (у Дона — сигара и перстень).
- **Фон:** ночной Кастельмар 1931 года — ар-деко, порт, мокрая брусчатка, неон, туман цвета редкости.
- **Палитра:** цвет редкости доминирует, золото — второй цвет, один тёплый акцент (огонёк, свет) для фокуса на лице.
- **Рамка:** ар-деко из светящегося кристалла цвета редкости + полированная золотая филигрань, гранёные камни в углах, лёгкий голографический отлив.
- **Надписи:** только латиницей и только две: название скина сверху (золотая табличка), редкость снизу. Никаких других текстов, водяных знаков, логотипов.

## Редкости (цвет рамки и подсветки)
Девять редкостей (владелец, 15.10.2026; порядок — как в фильтре приложения, `RARITIES` в `src/12-skins.js`):
| Редкость | Метка | Цвет | Надпись на плашке |
|---|---|---|---|
| Обыкновенные | C | серебристо-серый (сталь, графит) | COMMON |
| Редкие | R | синий (сапфир, лёд) | RARE |
| Уникальные | Uc | зелёный (изумруд) | UNIQUE |
| **Эпические** | **Ep** | **фиолетовый (аметист, золото)** | **EPIC** |
| Легендарные | L | золотой (янтарь, кремовый) | LEGENDARY |
| Супер редкие | SR | оранжевый (медь, огонь) | SR |
| Супер Супер редкие | SSR | розово-маджента (турмалин) | SSR |
| Уникально редкие | UR | призматический бирюзово-сиреневый | UR |
| Мифические | Mythical | алый (рубин, чёрное золото) | MYTHICAL |

Почему так: фиолетовый = Epic в большинстве популярных игр (WoW, Fortnite, Hearthstone, Brawl Stars), игроки читают редкость по цвету сразу; золото даёт «премиум»; тёплый акцент на фоне холодного цвета держит взгляд на лице.

## Серия (v57)
Epic-серия на все бесплатные карты — 32 карты тем же чатом Gemini, что и Дон: каждый промпт начинается с «Next card in the same collectible series. Use the first card in this chat (AMETHYST DON) as the exact template…» — так рамка выходит одинаковой. Полов поровну (16/16, Доктора — женщины), Бомба — живая бомба-персонаж. Промпты и описания персонажей — в коммите v57 (`skins/src/` хранит исходники в .webp).
Карту глубины для серии Gemini не рисовал: `prepare_skin.py <id> <card.jpg> auto <cx> <cy> <size>` считает её сам (Depth Anything, `tools/depth.py`). Лимит Plus — около 26 картинок в сутки.

## Как делать (Gemini)
1. gemini.google.com, аккаунт владельца **Harli Shi**, модель **Pro**, инструмент «Создание изображений». Без шаблонов стиля (Gemini может сам подставить «Световые лучи» — снять).
2. Промпт — шаблон ниже (подставить роль, название, редкость, цвет, деталь роли).
3. Тем же чатом: карта глубины (промпт ниже). Она совпадает с картинкой попиксельно — проверить наложением краёв.
4. Скачать обе в полном размере (1696×2528) и прогнать:
   `python3 skins/tools/prepare_skin.py <id> card.jpg depth.jpg <cx> <cy> <size>` — cx, cy, size: квадрат вокруг лица для круглой печати.
   Скрипт сам выравнивает рамку, табличку и плашку редкости в карте глубины в одну плоскость (230): в 3D они стоят, двигается только сцена в окне.
5. Добавить в `SKINS` (`src/12-skins.js` и `backend/src/skins.js`), тексты — `src/02v-i18n-skins.js`.
6. Гифка для поста в канал: картинка с прозрачными краями (дым над рамкой) и её карта глубины рядом с `tools/anim.html` как `card.webp` / `depth.png` (у Дона — `src/amethyst-don-anim*.`), затем
   `NODE_PATH=$(npm root -g) node skins/tools/anim.js <папка с anim.html> <папка кадров> 144` и
   `ffmpeg -framerate 30 -i <кадры>/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart -an skins/<файл>.mp4`. В посте — `image: skins/<файл>.mp4`.

### Промпт карты
```
Create a premium collectible game card, vertical 2:3 portrait format: an <RARITY>-rarity skin for the character "<ROLE>" in a mobile mafia game set in the fictional Art Deco port city of Castelmar, 1931. Skin name: <NAME>.
CHARACTER: <внешность, костюм в цвете редкости, деталь роли в руке>. Three-quarter view, waist-up, confident hero pose, looking at the viewer.
BACKGROUND: rainy night harbor of an Art Deco city, <color> fog, neon reflections on wet cobblestones, volumetric light rays, floating <color> sparks and bokeh.
STYLE: high-end stylized 3D render like premium hero skins in Fortnite, Overwatch and Valorant, Unreal Engine 5 look, cinematic lighting with a warm golden key light and a strong <color> rim light, subsurface skin, rich material detail (silk, wool, gold, crystal), shallow depth of field, very readable silhouette. <Color> and gold dominate, one warm orange accent from <источник света>.
FRAME: ornate Art Deco card frame made of glowing <gem>-<color> crystal and polished gold filigree, faceted gems in the corners, subtle holographic foil shimmer.
TEXT: at the top a gold banner reading "<NAME>"; at the bottom a <color>-and-gold plaque with the word "<RARITY>" in bold, clean capital letters. No other text, no watermark, no logos.
```

### Промпт карты глубины
```
Now turn this exact card image into a depth map for a 3D parallax effect. Keep exactly the same framing, size and composition, pixel-aligned with the original. Grayscale only: white = closest to the viewer, black = farthest. The frame, the top banner and the bottom plaque are the closest (near white); the character's raised hand is very close (light grey); the face, hat and clothes are mid-near (light-to-mid grey with smooth volume shading); the background is far (dark grey to black). Smooth gradients, no text, no colors, no texture noise.
```

## 3D-эффект в приложении
- Карта наклоняется (3D-карта профиля, раздача, итоги), рамка стоит, всё за ней сдвигается по карте глубины: персонаж чуть-чуть, фон сильнее — «окно в сцену» (WebGL, `src/12-skins.js`).
- По рамке бежит радужный отлив, за пальцем — световое пятно.
- На старых телефонах (`html.lite`) и без WebGL — просто картинка.
