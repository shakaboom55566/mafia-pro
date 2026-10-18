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

## Мифическая живая карта (v69, «Неуловимая» — Ниндзя)
- Рамка — рубин и чёрное золото, плашка MYTHICAL, персонаж в полный рост (ему предстоит выйти из карты). Номер копии в картинку не рисуется — приложение кладёт табличку «№ 000001» сверху на рамку.
- Тем же чатом Gemini: (1) карта; (2) та же карта **без персонажа** — пустая сцена; (3) персонаж в той же позе на чистом #00FF00, совпадающий с картой; (4, 5) позы для анимации на #00FF00 (сальто, низкий присед), тот же костюм и масштаб.
- Обработка: карта — `prepare_skin.py <id> card.jpg auto …`; сцена — тот же кроп рамки и 800×1200 → `<id>-scene.webp`; поза «stand» — пиксели **самой карты** с маской из зелёного ключа (3), ноги на фоне тёмной крыши ключ не отделяет — контур ног обведён по точкам; позы (4, 5) — зелёный ключ с подавлением зелёной каймы, масштаб — по расстоянию между зрачками (у всех ≈ одинаковый). Где каждая вырезка стоит и где центр тела — `MYTH_ART` в `src/17-mythic.js`.
- Ролик для поста: `NODE_PATH=$(npm root -g) node skins/tools/myth-video.js mafia-pro.html skins <кадры> <id> 1`, затем ffmpeg (команда в начале скрипта) → `skins/<id>.mp4`.

## Живая карта (v70) — героиня из 3D-ролика Gemini на зелёном фоне, фон остаётся в карте
- gemini.google.com → «Видео», вертикальное 9:16, картинка-основа — **сама карта** (как референс персонажа). Промпт: «Use this card only as the reference for the character… CRITICAL: the ENTIRE background must be a flat, uniform, bright chroma-key GREEN (#00FF00) filling the whole frame edge to edge — no card, no frame, no border, no vignette, no moon, no rooftops, no fog, no petals, no floor, no shadow on the ground, no particles. Do not let any green light spill onto her… locked-off camera, no zoom, no cuts, she stays centered and her whole body is always fully inside the frame with margin. She starts standing in her exact pose from the card… a quick sidestep, a high backflip, a low slide with one hand on the ground, a fast spinning twist… At the end she lands back exactly in her starting pose». Ролик 10 с, 720×1280, ~15 минут. Gemini даёт мягко-зелёный (G ≈ 150–170), не #00FF00 — ключу всё равно. Скачивает владелец (Chrome не даёт) и присылает mp4.
- Вырезка: `python3 skins/tools/cutout_green.py <src.mp4> skins/<id>-hero.mp4 <json> 900 [от, с] [до, с]` — цветовой ключ (без нейросети) **по чистому фону**: для каждого пикселя берётся самый зелёный момент ролика (она и её тень его только уменьшают), прозрачность = какую долю этой зелени кадр ещё показывает. Так стена (зеленее на ~90) и светлый пол (только ~60) уходят одинаково чисто. Тень на полу (тот же зелёный, только темнее, дальше 8 px от сплошного тела) — фон. Despill, только силуэт, связный с телом.
- В `MYTH_ART.<id>.hero` из json: `size`, `dur`, `c0` = `track[0][0..1]`, `c1` = `track[-1][0..1]`, `body0` = `track[0][3] − track[0][2]`, `body1` — то же для последнего кадра.
- **Никаких масок по «минимуму за весь ролик»** (17.10, владелец обвёл потерянные стопу в подкате, руку с кунаем, руки по бокам, хвост волос): минимум по каналам смешивает её цвета с зелёным везде, где она хоть раз прошла, и стирал её в этих местах; там же в сальто терялись сапоги. Рамка карты в зелёном ролике не появляется — маска не нужна.
- **Проверка перед отправкой владельцу** (обязательно, не на глаз по паре кадров):
  1. кадры, где она в движении (подкат, сальто, разворот, руки в стороны), — исходник и вырезка рядом на пурпурном фоне: каждая стопа, кисть, кунай, хвост, шарф на месте;
  2. площадь маски по всем кадрам: провал > 4 % от соседей = подозрение на потерю — сверить с исходником (в сальто и развороте провалы настоящие: она сжимается / встаёт боком);
  3. показ в приложении в тех же моментах (`mythSeek`, как в `myth-video.js`) — тело целиком, пол не просвечивает пятном.
- **Чёрный фон не годится** (17.10, два подхода отклонены): чёрные складки плаща, волосы и маска того же цвета, что фон, — мягкий порог делает их прозрачными, жёсткий заливает чёрным карманы между рукой и телом. Инструмент `cutout_black.py` остался для истории.
- Фон карты без персонажа — отдельная картинка Gemini «та же карта без неё» → `<id>-scene.webp`; поверх неё приложение рисует лепестки, искры и дыхание луны само.
- Что владелец **отклонил** раньше: зелёный фон с плоской анимацией без камеры и 3D («сухая картинка двигается»); ролик на весь экран; ролик целиком в области карты (фон карты заменялся видео); вырезку нейросетью из ролика с фоном (теряла конечности). Нужно именно: объёмный 3D-персонаж один выходит из карты, карта с живым фоном остаётся на месте.

## Своя рубашка мифической карты (v79, «Неуловимая» — сезон S1)
- Gemini, модель Pro, «Создание изображений», к промпту приложено лицо карты (`skins/src/<id>.webp` → jpg). Промпт: «Create the BACK side of this exact collectible card (the attached image is its front…). Vertical 2:3 portrait, same size and the same frame shape as the front… FRAME: the same ornate Art Deco frame… CENTER EMBLEM: a large round medallion… a huge blood-red moon, and across the moon the black silhouette of a female ninja in mid-leap… Two kunai crossed behind the medallion… SEASON MARK: directly below the medallion, a faceted ruby gem shield… with the large engraved gold characters "S1"… BACKGROUND: deep black lacquer with a fine ruby Art Deco lattice… TEXT: only the two characters "S1" on the ruby shield. No other words…» (полностью — `skins/src/untouchable-back-prompt.txt`). Проверить, что «S1» без ошибок и других надписей нет.
- Gemini отдаёт квадрат 2048×2048 с белыми полями и белыми скруглёнными углами: обрезать по карте, белое за углами закрасить тёмным краем карты, затем `prepare_skin.py <id>-back <png> auto` (только `.webp`; миниатюру удалить).
- **Карту глубины рисовать слоями**, не Depth Anything: `python3 skins/tools/depth_layers.py skins/<id>-back.webp skins/src/<id>-back-layers.json skins/<id>-back-depth.png` — круги, ромбы, многоугольники, линии и «тёмный силуэт внутри фигуры» в пикселях лица 800×1200; рамка = 230 (стоит), то, что должно выступать над рамкой, — выше 230. Сверить наложением карты глубины на картинку.
- В каталоге `SKINS` (`src/12-skins.js`) — `back: 's1'`. Рубашка видна только на 3D-карте скина, не при раздаче (там она выдала бы роль).
- Ролик: `NODE_PATH=$(npm root -g) node skins/tools/back-video.js mafia-pro.html skins <кадры> <id> 1` → ffmpeg → `skins/<id>-back.mp4`.


## Скин стола (v84, «Стол Дона» — восьмиугольник)
Скин самого стола — картинка столешницы (покрытие, борт, форма) вместо тёмного диска приложения. Надписи в центре (Mafia PRO, ведущий, счёт игроков) рисует приложение, поэтому середина картинки — спокойная, без эмблем и букв. Форма может быть любой выпуклой: места игроков встают по контуру (`TABLES[].shape` в `src/12-skins.js`: `circle`, `octagon`; для новой формы — своя функция в `tableShapeR`, `src/22-tables.js`).
- Gemini, модель Pro, «Создание изображений», квадрат 1:1. Промпт: «Top-down view of an empty [octagonal / round / oval] mafia game table, centered on a flat solid pure black background (#000000), nothing else in the frame, square image 1:1, table fills about 85% of the width. Surface: [deep burgundy velvet]. Rim: [thick padded black leather rail trimmed with brass and glowing amethyst art-deco crystal, same style as a 1931 Castelmar collectible card frame]. The center of the surface stays calm and almost plain — no emblem, no text. No chairs, no cards, no chips, no hands, no readable text, no letters, no logos. Expensive stylized 3D render, Unreal Engine 5 look, warm golden key light, soft colored rim light, subtle reflections, camera straight above, perfectly symmetrical.» Борт тёмный (чёрная кожа, тёмное дерево) — фон всё равно чёрный годится: ключ режет по яркости, а «дырки» внутри стола заливаются; если борт светится синим/зелёным по всему краю — просить ярко-зелёный фон (`green`).
- `python3 skins/tools/prepare_table.py table-<id> picture.jpg [black|green]` → `skins/table-<id>.webp` (1024, прозрачный вокруг стола), `-thumb.webp` (360), исходник в `skins/src/`. Печатает геометрию: `fit` (картинка чуть шире стола — свечение борта) и радиус по углам: везде одинаковый — круг, в 22,5° больше на 8 % — восьмиугольник с плоскими сторонами.
- Каталог: `src/12-skins.js` `TABLES` (`shape`, `fit`) и `backend/src/skins.js` (`role: 'table'`, редкость, `SKIN_NAMES`); имя и история на 5 языках — `src/02zh-i18n-tables.js`. Награда или подарок админа (`/skin @ник don_table`), не продаётся и не выдаётся на турнир.
- В приложении: стол 70 % коробки (обычный диск — 66 %), места по контуру на 9 % дальше края; блик идёт по борту вслед за наклоном телефона (маска — сама картинка), столешница чуть наклоняется. Старые телефоны и «уменьшить движение» — неподвижная картинка. С фоном комнаты сочетается: стол стоит на ковре.
- Ролик для канала: `NODE_PATH=$(npm root -g) node skins/tools/table-video.js mafia-pro.html skins <кадры>` → ffmpeg → `skins/table-<id>.mp4` (в клубе «Кастельмар», 10 мест, один оборот блика за 5 с).
