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
  Object.keys(R).forEach(l => { if (I18N[l] && I18N[l].ui) Object.assign(I18N[l].ui, R[l]); });
})();
