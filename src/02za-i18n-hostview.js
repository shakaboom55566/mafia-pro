/* ============================================================
   v66 the host sees the table and the chat — texts (screens: 16-host-view.js)
   ============================================================ */
(function () {
  const R = {
    ru: {
      hvTable: 'Стол', hvHostTag: 'ведущий', hvChatPh: 'Написать игрокам…', hvFold: 'Свернуть', hvUnfold: 'Развернуть', hvNew: 'новых: {n}', hvWait: 'ждём ответа',
      hvAll: 'Сейчас пишут все', hvSpeaker: 'Пишет только №{seat} — пока идёт речь', hvLast: 'Последнее слово — пишет №{seat}', hvClosed: 'Игрокам чат сейчас закрыт', hvYou: 'ведущий пишет всегда',
      hvLegend: 'Зелёная рамка — говорит · красная — выставлен · →3 — голос за 3 · … — ждём ответ в приложении', hvOffChat: 'Чат стола работает только в онлайн-игре'
    },
    uk: {
      hvTable: 'Стіл', hvHostTag: 'ведучий', hvChatPh: 'Написати гравцям…', hvFold: 'Згорнути', hvUnfold: 'Розгорнути', hvNew: 'нових: {n}', hvWait: 'чекаємо відповіді',
      hvAll: 'Зараз пишуть усі', hvSpeaker: 'Пише лише №{seat} — поки триває промова', hvLast: 'Останнє слово — пише №{seat}', hvClosed: 'Для гравців чат зараз закритий', hvYou: 'ведучий пише завжди',
      hvLegend: 'Зелена рамка — говорить · червона — виставлений · →3 — голос за 3 · … — чекаємо відповідь у застосунку', hvOffChat: 'Чат столу працює лише в онлайн-грі'
    },
    en: {
      hvTable: 'Table', hvHostTag: 'host', hvChatPh: 'Message the players…', hvFold: 'Fold', hvUnfold: 'Unfold', hvNew: '{n} new', hvWait: 'waiting for the answer',
      hvAll: 'Everyone may write now', hvSpeaker: 'Only No. {seat} writes — during their speech', hvLast: 'Last words — No. {seat} writes', hvClosed: 'The chat is closed for the players now', hvYou: 'the host writes at any time',
      hvLegend: 'Green ring — speaking · red — nominated · →3 — a vote for 3 · … — waiting for the answer in the app', hvOffChat: 'The table chat works in an online game only'
    },
    pl: {
      hvTable: 'Stół', hvHostTag: 'prowadzący', hvChatPh: 'Napisz do graczy…', hvFold: 'Zwiń', hvUnfold: 'Rozwiń', hvNew: 'nowe: {n}', hvWait: 'czekamy na odpowiedź',
      hvAll: 'Teraz piszą wszyscy', hvSpeaker: 'Pisze tylko nr {seat} — w czasie przemowy', hvLast: 'Ostatnie słowo — pisze nr {seat}', hvClosed: 'Czat jest teraz zamknięty dla graczy', hvYou: 'prowadzący pisze zawsze',
      hvLegend: 'Zielona ramka — mówi · czerwona — wystawiony · →3 — głos na 3 · … — czekamy na odpowiedź w aplikacji', hvOffChat: 'Czat stołu działa tylko w grze online'
    },
    hy: {
      hvTable: 'Սեղան', hvHostTag: 'վարող', hvChatPh: 'Գրել խաղացողներին…', hvFold: 'Ծալել', hvUnfold: 'Բացել', hvNew: 'նոր՝ {n}', hvWait: 'սպասում ենք պատասխանի',
      hvAll: 'Հիմա գրում են բոլորը', hvSpeaker: 'Գրում է միայն №{seat}՝ ելույթի ընթացքում', hvLast: 'Վերջին խոսք՝ գրում է №{seat}', hvClosed: 'Չատը հիմա փակ է խաղացողների համար', hvYou: 'վարողը միշտ կարող է գրել',
      hvLegend: 'Կանաչ շրջանակ՝ խոսում է · կարմիր՝ առաջադրված · →3՝ ձայն 3-ին · …՝ սպասում ենք պատասխանի հավելվածում', hvOffChat: 'Սեղանի չատն աշխատում է միայն առցանց խաղում'
    }
  };
  Object.keys(R).forEach(l => { if (I18N[l] && I18N[l].ui) Object.assign(I18N[l].ui, R[l]); });
})();
