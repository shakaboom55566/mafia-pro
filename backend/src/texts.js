/* Bot messages in the five app languages. Russian is the default; a user's Telegram language picks the rest. */
export const TEXTS = {
  ru: {
    friendAccepted: '✅ Вы и <b>{name}</b> теперь друзья в Mafia Pro. Друзей можно звать за стол одной кнопкой.',
    friendJoined: '<b>{name}</b> принял(а) ваше приглашение — теперь вы друзья.',
    friendSelf: 'Это ваша собственная ссылка 🙂 Отправьте её другу.',
    inviteNotFound: 'Приглашение не найдено — попросите друга прислать ссылку ещё раз.',
    friendInvite: '🎴 <b>{name}</b> зовёт вас за стол Mafia Pro <b>{code}</b>.\nНажмите кнопку — и ваша карта придёт сюда, как только ведущий раздаст.',
    btnJoin: 'Сесть за стол {code}',
    hostJoined: '👤 За столом <b>{code}</b> новый игрок: <b>{name}</b> (всего {n}).',
    play: '🎴 Играть',
    welcome: '<b>Mafia Pro</b> — стол ведущего для живой игры в мафию.\n\nНажмите «Играть», чтобы открыть приложение: раздача карт, ночь и день по шагам, голосование по правилам, разбор партии и рейтинги.\n\nКлассическая мафия на 10 — бесплатно. 55 ролей, пять языков.',
    help: 'Что умеет бот:\n• «Играть» — открыть приложение ведущего\n• Если ведущий прислал вам ссылку на стол — откройте её, и ваша карта придёт сюда в личные сообщения\n• Покупки оплачиваются Telegram Stars и сохраняются в вашем аккаунте',
    joined: '✅ Вы за столом <b>{code}</b>. Как только ведущий раздаст карты, ваша карта придёт сюда. Никому её не показывайте.',
    alreadyJoined: 'Вы уже за столом <b>{code}</b>. Ждите карту.',
    lobbyNotFound: 'Стол <b>{code}</b> не найден. Попросите у ведущего новую ссылку.',
    lobbyClosed: 'Стол <b>{code}</b> уже закрыт — карты розданы.',
    card: '🎴 <b>Ваша карта</b> · стол {code}, место {seat}\n\n{text}\n\n<i>Никому не показывайте это сообщение.</i>',
    paid: '✅ Оплата прошла, спасибо! Покупка привязана к вашему аккаунту Telegram — откройте приложение, она уже активна.',
    payFail: 'Счёт не найден или уже оплачен. Откройте магазин в приложении и попробуйте ещё раз.',
    unknown: 'Откройте приложение кнопкой «Играть» или через кнопку меню внизу.'
  },
  uk: {
    friendAccepted: '✅ Ви і <b>{name}</b> тепер друзі в Mafia Pro. Друзів можна кликати за стіл однією кнопкою.',
    friendJoined: '<b>{name}</b> прийняв(ла) ваше запрошення — тепер ви друзі.',
    friendSelf: 'Це ваше власне посилання 🙂 Надішліть його другові.',
    inviteNotFound: 'Запрошення не знайдено — попросіть друга надіслати посилання ще раз.',
    friendInvite: '🎴 <b>{name}</b> кличе вас за стіл Mafia Pro <b>{code}</b>.\nНатисніть кнопку — і ваша карта прийде сюди, щойно ведучий роздасть.',
    btnJoin: 'Сісти за стіл {code}',
    hostJoined: '👤 За столом <b>{code}</b> новий гравець: <b>{name}</b> (усього {n}).',
    play: '🎴 Грати',
    welcome: '<b>Mafia Pro</b> — стіл ведучого для живої гри в мафію.\n\nНатисніть «Грати», щоб відкрити застосунок: роздача карт, ніч і день покроково, голосування за правилами, розбір партії та рейтинги.\n\nКласична мафія на 10 — безкоштовно. 55 ролей, п’ять мов.',
    help: 'Що вміє бот:\n• «Грати» — відкрити застосунок ведучого\n• Якщо ведучий надіслав вам посилання на стіл — відкрийте його, і ваша карта прийде сюди в особисті повідомлення\n• Покупки оплачуються Telegram Stars і зберігаються у вашому акаунті',
    joined: '✅ Ви за столом <b>{code}</b>. Щойно ведучий роздасть карти, ваша карта прийде сюди. Нікому її не показуйте.',
    alreadyJoined: 'Ви вже за столом <b>{code}</b>. Чекайте на карту.',
    lobbyNotFound: 'Стіл <b>{code}</b> не знайдено. Попросіть у ведучого нове посилання.',
    lobbyClosed: 'Стіл <b>{code}</b> уже закрито — карти роздано.',
    card: '🎴 <b>Ваша карта</b> · стіл {code}, місце {seat}\n\n{text}\n\n<i>Нікому не показуйте це повідомлення.</i>',
    paid: '✅ Оплата пройшла, дякуємо! Покупка прив’язана до вашого акаунта Telegram — відкрийте застосунок, вона вже активна.',
    payFail: 'Рахунок не знайдено або вже оплачено. Відкрийте магазин у застосунку й спробуйте ще раз.',
    unknown: 'Відкрийте застосунок кнопкою «Грати» або через кнопку меню внизу.'
  },
  en: {
    friendAccepted: '✅ You and <b>{name}</b> are now friends in Mafia Pro. Friends can be invited to a table with one tap.',
    friendJoined: '<b>{name}</b> accepted your invitation — you are now friends.',
    friendSelf: 'That is your own link 🙂 Send it to a friend.',
    inviteNotFound: 'Invitation not found — ask your friend to send the link again.',
    friendInvite: '🎴 <b>{name}</b> invites you to Mafia Pro table <b>{code}</b>.\nTap the button — your card will arrive here as soon as the host deals.',
    btnJoin: 'Join table {code}',
    hostJoined: '👤 New player at table <b>{code}</b>: <b>{name}</b> ({n} total).',
    play: '🎴 Play',
    welcome: '<b>Mafia Pro</b> — the host’s table for live Mafia games.\n\nTap “Play” to open the app: card dealing, step-by-step night and day, rule-driven voting, post-game review and ratings.\n\nClassic 10-player Mafia is free. 55 roles, five languages.',
    help: 'What this bot does:\n• “Play” opens the host app\n• If a host sent you a table link, open it and your card will arrive here in a private message\n• Purchases are paid with Telegram Stars and stay with your account',
    joined: '✅ You are at table <b>{code}</b>. Your card will arrive here as soon as the host deals. Don’t show it to anyone.',
    alreadyJoined: 'You are already at table <b>{code}</b>. Wait for your card.',
    lobbyNotFound: 'Table <b>{code}</b> was not found. Ask the host for a new link.',
    lobbyClosed: 'Table <b>{code}</b> is already closed — the cards have been dealt.',
    card: '🎴 <b>Your card</b> · table {code}, seat {seat}\n\n{text}\n\n<i>Don’t show this message to anyone.</i>',
    paid: '✅ Payment received, thank you! The purchase is tied to your Telegram account — open the app, it is already active.',
    payFail: 'Invoice not found or already paid. Open the shop in the app and try again.',
    unknown: 'Open the app with the “Play” button or the menu button below.'
  },
  pl: {
    friendAccepted: '✅ Ty i <b>{name}</b> jesteście teraz znajomymi w Mafia Pro. Znajomych można zaprosić do stołu jednym dotknięciem.',
    friendJoined: '<b>{name}</b> przyjął(ęła) Twoje zaproszenie — jesteście teraz znajomymi.',
    friendSelf: 'To Twój własny link 🙂 Wyślij go znajomemu.',
    inviteNotFound: 'Nie znaleziono zaproszenia — poproś znajomego o ponowne wysłanie linku.',
    friendInvite: '🎴 <b>{name}</b> zaprasza Cię do stołu Mafia Pro <b>{code}</b>.\nNaciśnij przycisk — Twoja karta przyjdzie tutaj, gdy prowadzący rozda.',
    btnJoin: 'Dołącz do stołu {code}',
    hostJoined: '👤 Nowy gracz przy stole <b>{code}</b>: <b>{name}</b> (łącznie {n}).',
    play: '🎴 Graj',
    welcome: '<b>Mafia Pro</b> — stół prowadzącego do gry w mafię na żywo.\n\nNaciśnij „Graj”, aby otworzyć aplikację: rozdanie kart, noc i dzień krok po kroku, głosowanie według zasad, analiza partii i rankingi.\n\nKlasyczna mafia na 10 osób — bezpłatnie. 55 ról, pięć języków.',
    help: 'Co potrafi bot:\n• „Graj” — otwiera aplikację prowadzącego\n• Jeśli prowadzący wysłał Ci link do stołu, otwórz go, a Twoja karta przyjdzie tutaj w wiadomości prywatnej\n• Zakupy opłacasz Telegram Stars i pozostają na Twoim koncie',
    joined: '✅ Jesteś przy stole <b>{code}</b>. Gdy prowadzący rozda karty, Twoja karta przyjdzie tutaj. Nie pokazuj jej nikomu.',
    alreadyJoined: 'Już jesteś przy stole <b>{code}</b>. Czekaj na kartę.',
    lobbyNotFound: 'Stół <b>{code}</b> nie został znaleziony. Poproś prowadzącego o nowy link.',
    lobbyClosed: 'Stół <b>{code}</b> jest już zamknięty — karty rozdane.',
    card: '🎴 <b>Twoja karta</b> · stół {code}, miejsce {seat}\n\n{text}\n\n<i>Nie pokazuj tej wiadomości nikomu.</i>',
    paid: '✅ Płatność przyjęta, dziękujemy! Zakup jest powiązany z Twoim kontem Telegram — otwórz aplikację, już jest aktywny.',
    payFail: 'Nie znaleziono faktury lub została już opłacona. Otwórz sklep w aplikacji i spróbuj ponownie.',
    unknown: 'Otwórz aplikację przyciskiem „Graj” lub przyciskiem menu poniżej.'
  },
  hy: {
    friendAccepted: '✅ Դուք և <b>{name}</b> այժմ ընկերներ եք Mafia Pro-ում։ Ընկերներին կարելի է սեղանի մոտ կանչել մեկ սեղմումով։',
    friendJoined: '<b>{name}</b> ընդունել է ձեր հրավերը — այժմ ընկերներ եք։',
    friendSelf: 'Սա ձեր սեփական հղումն է 🙂 Ուղարկեք այն ընկերոջը։',
    inviteNotFound: 'Հրավերը չի գտնվել — խնդրեք ընկերոջը նորից ուղարկել հղումը։',
    friendInvite: '🎴 <b>{name}</b>-ը ձեզ հրավիրում է Mafia Pro <b>{code}</b> սեղանի մոտ։\nՍեղմեք կոճակը — ձեր քարտը կգա այստեղ, հենց վարողը բաժանի։',
    btnJoin: 'Նստել {code} սեղանի մոտ',
    hostJoined: '👤 <b>{code}</b> սեղանի մոտ նոր խաղացող՝ <b>{name}</b> (ընդամենը {n})։',
    play: '🎴 Խաղալ',
    welcome: '<b>Mafia Pro</b> — վարողի սեղան կենդանի մաֆիայի համար։\n\nՍեղմեք «Խաղալ»՝ հավելվածը բացելու համար՝ քարտերի բաժանում, գիշեր և օր քայլ առ քայլ, քվեարկություն կանոններով, խաղի վերլուծություն և վարկանիշներ։\n\nԴասական մաֆիա 10 հոգու համար՝ անվճար։ 55 դեր, հինգ լեզու։',
    help: 'Ինչ է անում բոտը․\n• «Խաղալ» — բացում է վարողի հավելվածը\n• Եթե վարողը ձեզ սեղանի հղում է ուղարկել, բացեք այն, և ձեր քարտը կգա այստեղ՝ անձնական նամակով\n• Գնումները վճարվում են Telegram Stars-ով և մնում են ձեր հաշվում',
    joined: '✅ Դուք <b>{code}</b> սեղանի մոտ եք։ Հենց վարողը բաժանի քարտերը, ձեր քարտը կգա այստեղ։ Ոչ մեկին մի ցույց տվեք։',
    alreadyJoined: 'Դուք արդեն <b>{code}</b> սեղանի մոտ եք։ Սպասեք քարտին։',
    lobbyNotFound: '<b>{code}</b> սեղանը չի գտնվել։ Վարողից նոր հղում խնդրեք։',
    lobbyClosed: '<b>{code}</b> սեղանն արդեն փակ է՝ քարտերը բաժանված են։',
    card: '🎴 <b>Ձեր քարտը</b> · սեղան {code}, տեղ {seat}\n\n{text}\n\n<i>Այս հաղորդագրությունը ոչ մեկին մի ցույց տվեք։</i>',
    paid: '✅ Վճարումն ընդունված է, շնորհակալություն։ Գնումը կապված է ձեր Telegram հաշվին — բացեք հավելվածը, այն արդեն ակտիվ է։',
    payFail: 'Հաշիվը չի գտնվել կամ արդեն վճարված է։ Բացեք խանութը հավելվածում և նորից փորձեք։',
    unknown: 'Բացեք հավելվածը «Խաղալ» կոճակով կամ ներքևի մենյուի կոճակով։'
  }
};
export function pickLang(code) {
  const c = String(code || '').toLowerCase().slice(0, 2);
  return TEXTS[c] ? c : (c === 'be' || c === 'kk' ? 'ru' : 'ru');
}
export function t(lang, key, vars = {}) {
  const s = (TEXTS[lang] || TEXTS.ru)[key] || TEXTS.ru[key] || key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}
