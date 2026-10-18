/* ============================================================
   v75 the country from the network at the first open — texts (logic: 19-geo.js)
   ============================================================ */
(function () {
  const R = {
    ru: { geoHint: 'Страна и город определены по сети — поправьте, если не так.', geoHintCountry: 'Страна определена по сети — поправьте, если не так.', geoHintCity: 'Город определён по сети — поправьте, если не так.' },
    uk: { geoHint: 'Країну й місто визначено за мережею — виправте, якщо не так.', geoHintCountry: 'Країну визначено за мережею — виправте, якщо не так.', geoHintCity: 'Місто визначено за мережею — виправте, якщо не так.' },
    en: { geoHint: 'Country and city detected from your network — change them if they are wrong.', geoHintCountry: 'Country detected from your network — change it if it is wrong.', geoHintCity: 'City detected from your network — change it if it is wrong.' },
    pl: { geoHint: 'Kraj i miasto rozpoznane po sieci — popraw, jeśli to nie tak.', geoHintCountry: 'Kraj rozpoznany po sieci — popraw, jeśli to nie tak.', geoHintCity: 'Miasto rozpoznane po sieci — popraw, jeśli to nie tak.' },
    hy: { geoHint: 'Երկիրն ու քաղաքը որոշվել են ցանցով․ ուղղեք, եթե սխալ է։', geoHintCountry: 'Երկիրը որոշվել է ցանցով․ ուղղեք, եթե սխալ է։', geoHintCity: 'Քաղաքը որոշվել է ցանցով․ ուղղեք, եթե սխալ է։' }
  };
  // v83: the rating by country from the server (20-geo.js)
  Object.assign(R.ru, { geoTopTitle: 'Рейтинг страны · {country}', geoTopAny: 'Рейтинг страны', geoTopHint: 'Игроки из этой страны, которые играют через Telegram. Очки — как в общем рейтинге; страна — из профиля игрока.', geoTopEmpty: 'Из этой страны пока никто не играл.', geoLocalTitle: 'На этом телефоне' });
  Object.assign(R.uk, { geoTopTitle: 'Рейтинг країни · {country}', geoTopAny: 'Рейтинг країни', geoTopHint: 'Гравці з цієї країни, які грають через Telegram. Очки — як у загальному рейтингу; країна — з профілю гравця.', geoTopEmpty: 'З цієї країни поки ніхто не грав.', geoLocalTitle: 'На цьому телефоні' });
  Object.assign(R.en, { geoTopTitle: 'Country rating · {country}', geoTopAny: 'Country rating', geoTopHint: 'Players from this country who play through Telegram. Points as in the overall rating; the country comes from the player’s profile.', geoTopEmpty: 'Nobody from this country has played yet.', geoLocalTitle: 'On this phone' });
  Object.assign(R.pl, { geoTopTitle: 'Ranking kraju · {country}', geoTopAny: 'Ranking kraju', geoTopHint: 'Gracze z tego kraju, którzy grają przez Telegram. Punkty jak w rankingu ogólnym; kraj pochodzi z profilu gracza.', geoTopEmpty: 'Z tego kraju nikt jeszcze nie grał.', geoLocalTitle: 'Na tym telefonie' });
  Object.assign(R.hy, { geoTopTitle: 'Երկրի վարկանիշ · {country}', geoTopAny: 'Երկրի վարկանիշ', geoTopHint: 'Այս երկրի խաղացողները, ովքեր խաղում են Telegram-ով։ Միավորները՝ ինչպես ընդհանուր վարկանիշում, երկիրը՝ խաղացողի պրոֆիլից։', geoTopEmpty: 'Այս երկրից դեռ ոչ ոք չի խաղացել։', geoLocalTitle: 'Այս հեռախոսում' });
  Object.keys(R).forEach(l => { if (I18N[l] && I18N[l].ui) Object.assign(I18N[l].ui, R[l]); });
})();
