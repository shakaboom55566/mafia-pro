/* ============================================================
   v88 texts: who opens the introductions (25-intro.js), «Написать» only for friends (08-telegram.js),
   results that reach the server (08-telegram.js), an admin changes a player's rating (26-admin-rating.js)
   ============================================================ */
(function () {
  const R = {
    ru: {
      ifTitle: 'Знакомство начинает', ifSeat: '№ {seat}', ifRandom: 'Случайный номер', ifPicked: 'Знакомство начнёт № {seat}', ifHead: 'с № {seat}',
      ifHint: 'Минутки знакомства пойдут по кругу: {order}… Первый день начнёт следующий — № {next}.',
      frMsgFriends: 'Написать игроку можно, когда вы станете друзьями.',
      tgUnseatedWarn: 'Без номера за столом: {n}. Им не придёт карта, и партия им не засчитается — выберите им номер в списке выше.',
      rsPending: 'Итоги партии пока не дошли до сервера — отправлю сам, как только будет связь. Рейтинг игроков не потеряется.',
      rsSent: 'Итоги прошлых партий засчитаны: {n}', rsSession: 'Сессия Telegram устарела: закройте и снова откройте приложение — итоги партии дойдут сами.',
      arBtn: 'Рейтинг', arTitle: 'Рейтинг игрока', arNow: 'Сейчас: {rating} · партий: {games}', arAmount: 'Сколько', arReason: 'Причина — увидит игрок (необязательно)',
      arAdd: 'Начислить', arTake: 'Снять', arHint: 'Рейтинг изменится сразу, игрок получит сообщение от бота.', arDone: '{name}: {delta} → {rating}',
      arLog: 'Последние изменения', arNoLog: 'Администратор ещё не менял рейтинг этого игрока.', arBad: 'Укажите число от 1 до 1000', arTooLow: 'Рейтинг не может стать меньше нуля',
      arLoading: 'Загружаю…', arNone: 'Игрок не найден', arPanel: 'Рейтинг игрока', arPanelHint: 'Найдите игрока по @нику или id — и начислите или снимите рейтинг.', arOpen: 'Открыть'
    },
    uk: {
      ifTitle: 'Знайомство починає', ifSeat: '№ {seat}', ifRandom: 'Випадковий номер', ifPicked: 'Знайомство почне № {seat}', ifHead: 'з № {seat}',
      ifHint: 'Хвилинки знайомства підуть по колу: {order}… Перший день почне наступний — № {next}.',
      frMsgFriends: 'Написати гравцеві можна, коли ви станете друзями.',
      tgUnseatedWarn: 'Без номера за столом: {n}. Їм не прийде карта, і партію їм не зарахують — виберіть їм номер у списку вище.',
      rsPending: 'Підсумки партії поки не дійшли до сервера — надішлю сам, щойно буде зв’язок. Рейтинг гравців не загубиться.',
      rsSent: 'Підсумки минулих партій зараховано: {n}', rsSession: 'Сесія Telegram застаріла: закрийте й знову відкрийте застосунок — підсумки партії дійдуть самі.',
      arBtn: 'Рейтинг', arTitle: 'Рейтинг гравця', arNow: 'Зараз: {rating} · партій: {games}', arAmount: 'Скільки', arReason: 'Причина — побачить гравець (необов’язково)',
      arAdd: 'Нарахувати', arTake: 'Зняти', arHint: 'Рейтинг зміниться одразу, гравець отримає повідомлення від бота.', arDone: '{name}: {delta} → {rating}',
      arLog: 'Останні зміни', arNoLog: 'Адміністратор ще не змінював рейтинг цього гравця.', arBad: 'Вкажіть число від 1 до 1000', arTooLow: 'Рейтинг не може стати меншим за нуль',
      arLoading: 'Завантажую…', arNone: 'Гравця не знайдено', arPanel: 'Рейтинг гравця', arPanelHint: 'Знайдіть гравця за @ніком або id — і нарахуйте чи зніміть рейтинг.', arOpen: 'Відкрити'
    },
    en: {
      ifTitle: 'Introductions start with', ifSeat: 'Seat {seat}', ifRandom: 'Random seat', ifPicked: 'Seat {seat} opens the introductions', ifHead: 'from seat {seat}',
      ifHint: 'The introductions go round the table: {order}… Day 1 starts with the next one, seat {next}.',
      frMsgFriends: 'You can message this player once you are friends.',
      tgUnseatedWarn: 'At the table without a seat number: {n}. They will not get a card and the game will not count for them — pick their numbers in the list above.',
      rsPending: 'The game’s results have not reached the server yet — I will send them as soon as there is a connection. The players’ ratings are safe.',
      rsSent: 'Results of earlier games credited: {n}', rsSession: 'The Telegram session has expired: close the app and open it again — the results will go through by themselves.',
      arBtn: 'Rating', arTitle: 'Player rating', arNow: 'Now: {rating} · games: {games}', arAmount: 'How much', arReason: 'Reason — the player will see it (optional)',
      arAdd: 'Add', arTake: 'Take away', arHint: 'The rating changes at once and the player gets a message from the bot.', arDone: '{name}: {delta} → {rating}',
      arLog: 'Recent changes', arNoLog: 'No admin has changed this player’s rating yet.', arBad: 'Enter a number from 1 to 1000', arTooLow: 'The rating cannot go below zero',
      arLoading: 'Loading…', arNone: 'Player not found', arPanel: 'Player rating', arPanelHint: 'Find a player by @username or id — then add or take away rating points.', arOpen: 'Open'
    },
    pl: {
      ifTitle: 'Przedstawianie zaczyna', ifSeat: 'nr {seat}', ifRandom: 'Losowy numer', ifPicked: 'Przedstawianie zacznie nr {seat}', ifHead: 'od nr {seat}',
      ifHint: 'Minutki przedstawiania pójdą po kolei: {order}… Pierwszy dzień zacznie następny — nr {next}.',
      frMsgFriends: 'Napisać do gracza możesz, gdy zostaniecie znajomymi.',
      tgUnseatedWarn: 'Przy stole bez numeru: {n}. Nie dostaną karty, a gra nie zostanie im zaliczona — wybierz im numery na liście powyżej.',
      rsPending: 'Wyniki gry jeszcze nie dotarły na serwer — wyślę je sam, gdy tylko będzie połączenie. Ranking graczy nie przepadnie.',
      rsSent: 'Zaliczono wyniki wcześniejszych gier: {n}', rsSession: 'Sesja Telegrama wygasła: zamknij i ponownie otwórz aplikację — wyniki gry dotrą same.',
      arBtn: 'Ranking', arTitle: 'Ranking gracza', arNow: 'Teraz: {rating} · gier: {games}', arAmount: 'Ile', arReason: 'Powód — gracz go zobaczy (opcjonalnie)',
      arAdd: 'Dodaj', arTake: 'Odejmij', arHint: 'Ranking zmieni się od razu, gracz dostanie wiadomość od bota.', arDone: '{name}: {delta} → {rating}',
      arLog: 'Ostatnie zmiany', arNoLog: 'Administrator jeszcze nie zmieniał rankingu tego gracza.', arBad: 'Podaj liczbę od 1 do 1000', arTooLow: 'Ranking nie może spaść poniżej zera',
      arLoading: 'Ładuję…', arNone: 'Nie znaleziono gracza', arPanel: 'Ranking gracza', arPanelHint: 'Znajdź gracza po @nicku lub id — i dodaj lub odejmij punkty rankingu.', arOpen: 'Otwórz'
    },
    hy: {
      ifTitle: 'Ծանոթությունը սկսում է', ifSeat: '№ {seat}', ifRandom: 'Պատահական համար', ifPicked: 'Ծանոթությունը կսկսի № {seat}-ը', ifHead: '№ {seat}-ից',
      ifHint: 'Ծանոթության րոպեները կգնան շրջանով՝ {order}… Առաջին օրը կսկսի հաջորդը՝ № {next}-ը։',
      frMsgFriends: 'Խաղացողին գրել կարող եք, երբ ընկերներ դառնաք։',
      tgUnseatedWarn: 'Սեղանի շուրջ առանց համարի՝ {n}։ Նրանք քարտ չեն ստանա, և խաղը նրանց չի հաշվվի․ ընտրեք նրանց համարները վերևի ցուցակում։',
      rsPending: 'Խաղի արդյունքները դեռ չեն հասել սերվերին․ կուղարկեմ ինքս, հենց կապ լինի։ Խաղացողների վարկանիշը չի կորչի։',
      rsSent: 'Նախորդ խաղերի արդյունքները հաշվվեցին՝ {n}', rsSession: 'Telegram-ի սեսիան հնացել է․ փակեք և նորից բացեք հավելվածը, և արդյունքները կհասնեն ինքնըստինքյան։',
      arBtn: 'Վարկանիշ', arTitle: 'Խաղացողի վարկանիշը', arNow: 'Հիմա՝ {rating} · խաղեր՝ {games}', arAmount: 'Որքան', arReason: 'Պատճառ — խաղացողը կտեսնի (ըստ ցանկության)',
      arAdd: 'Ավելացնել', arTake: 'Հանել', arHint: 'Վարկանիշը կփոխվի անմիջապես, խաղացողը հաղորդագրություն կստանա բոտից։', arDone: '{name}՝ {delta} → {rating}',
      arLog: 'Վերջին փոփոխությունները', arNoLog: 'Ադմինիստրատորը դեռ չի փոխել այս խաղացողի վարկանիշը։', arBad: 'Նշեք թիվ 1-ից 1000', arTooLow: 'Վարկանիշը չի կարող զրոյից ցածր լինել',
      arLoading: 'Բեռնում եմ…', arNone: 'Խաղացողը չի գտնվել', arPanel: 'Խաղացողի վարկանիշը', arPanelHint: 'Գտեք խաղացողին @անունով կամ id-ով և ավելացրեք կամ հանեք վարկանիշ։', arOpen: 'Բացել'
    }
  };
  Object.keys(R).forEach(code => { const p = I18N[code]; if (p) Object.assign(p.ui, R[code]); });
})();
