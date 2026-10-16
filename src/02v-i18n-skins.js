/* ============================================================
   v56 SKINS: card skins — names and stories of the skins, the «Скины» tab of the Cards screen, the season 1 reward with its skin.
   ============================================================ */
(function () {
  const R = {
    ru: {
      skins: { amethyst_don: { name: 'Аметистовый Дон', lore: 'Кастельмар, 1931. В ту ночь, когда семья Корвино забрала порт, Дон надел аметистовый перстень — и больше его не снимал.' } },
      ui: {
        skSegCards: 'Карты', skSegSkins: 'Скины', skTitle: 'Скины карт',
        skHint: 'Скин меняет вид вашей карты, правила роли остаются прежними. Надетый скин видят все за столом: при раздаче, в онлайн-игре, в итогах партии и в вашем профиле.',
        skWear: 'Надеть', skTakeOff: 'Снять', skWorn: 'Надет', skOwned: 'Ваш', skLocked: 'Не получен', skFor: 'Карта: {role}',
        skHowSeason: 'Награда сезона {n}: всем, кто закончит сезон с рангом «{rank}». Сезон идёт до {date}.', skHowSeasonDone: 'Награда сезона {n}: получили все, кто закончил сезон с рангом «{rank}».',
        skYourRank: 'Ваш ранг сейчас', skTgOnly: 'Скины привязаны к аккаунту Telegram: откройте игру в Telegram, чтобы надеть скин.',
        skWornToast: 'Скин «{name}» надет на карту «{role}»', skOffToast: 'Скин снят: карта «{role}» снова обычная', skErr: 'Не получилось — проверьте связь и попробуйте ещё раз',
        skForRole: 'Скины этой карты', skAll: 'Все скины', skStandard: 'Обычная карта',
        ssRewardSkin: 'Награда сезона {n}: Epic-скин «{skin}»', ssRewardSkinText: 'Все, кто достигнет ранга «{rank}» и сохранит его до конца сезона {n} ({date}), получат скин «{skin}» для карты Дона — он сразу наденется.', ssRewardSkinDone: 'Сезон {n} завершён: все, кто закончил его в ранге «{rank}», получили скин «{skin}».', ssRewardSee: 'Посмотреть скин'
      }
    },
    uk: {
      skins: { amethyst_don: { name: 'Аметистовий Дон', lore: 'Кастельмар, 1931. Тієї ночі, коли родина Корвіно забрала порт, Дон надів аметистовий перстень — і більше його не знімав.' } },
      ui: {
        skSegCards: 'Карти', skSegSkins: 'Скіни', skTitle: 'Скіни карт',
        skHint: 'Скін змінює вигляд вашої карти, правила ролі лишаються тими самими. Вдягнений скін бачать усі за столом: під час роздачі, в онлайн-грі, у підсумках партії та у вашому профілі.',
        skWear: 'Вдягнути', skTakeOff: 'Зняти', skWorn: 'Вдягнений', skOwned: 'Ваш', skLocked: 'Не отримано', skFor: 'Карта: {role}',
        skHowSeason: 'Нагорода сезону {n}: усім, хто завершить сезон із рангом «{rank}». Сезон триває до {date}.', skHowSeasonDone: 'Нагорода сезону {n}: отримали всі, хто завершив сезон із рангом «{rank}».',
        skYourRank: 'Ваш ранг зараз', skTgOnly: 'Скіни прив’язані до акаунта Telegram: відкрийте гру в Telegram, щоб вдягнути скін.',
        skWornToast: 'Скін «{name}» вдягнено на карту «{role}»', skOffToast: 'Скін знято: карта «{role}» знову звичайна', skErr: 'Не вийшло — перевірте зв’язок і спробуйте ще раз',
        skForRole: 'Скіни цієї карти', skAll: 'Усі скіни', skStandard: 'Звичайна карта',
        ssRewardSkin: 'Нагорода сезону {n}: Epic-скін «{skin}»', ssRewardSkinText: 'Усі, хто досягне рангу «{rank}» і збереже його до кінця сезону {n} ({date}), отримають скін «{skin}» для карти Дона — він одразу вдягнеться.', ssRewardSkinDone: 'Сезон {n} завершено: усі, хто закінчив його в ранзі «{rank}», отримали скін «{skin}».', ssRewardSee: 'Подивитися скін'
      }
    },
    en: {
      skins: { amethyst_don: { name: 'Amethyst Don', lore: 'Castelmar, 1931. The night the Corvino family took the port, the Don put on an amethyst ring — and never took it off again.' } },
      ui: {
        skSegCards: 'Cards', skSegSkins: 'Skins', skTitle: 'Card skins',
        skHint: 'A skin changes how your card looks; the rules of the role stay the same. Everyone at the table sees the skin you wear: at the deal, in online games, in the results and in your profile.',
        skWear: 'Put on', skTakeOff: 'Take off', skWorn: 'Worn', skOwned: 'Yours', skLocked: 'Not earned', skFor: 'Card: {role}',
        skHowSeason: 'Season {n} reward: for everyone who ends the season as «{rank}». The season runs until {date}.', skHowSeasonDone: 'Season {n} reward: given to everyone who ended the season as «{rank}».',
        skYourRank: 'Your rank now', skTgOnly: 'Skins belong to your Telegram account: open the game in Telegram to put a skin on.',
        skWornToast: 'The “{name}” skin is on your «{role}» card', skOffToast: 'Skin taken off: your «{role}» card is plain again', skErr: 'That did not work — check the connection and try again',
        skForRole: 'Skins of this card', skAll: 'All skins', skStandard: 'Plain card',
        ssRewardSkin: 'Season {n} reward: the Epic skin “{skin}”', ssRewardSkinText: 'Everyone who reaches «{rank}» and keeps it until the end of season {n} ({date}) gets the “{skin}” skin for the Don card — it goes on at once.', ssRewardSkinDone: 'Season {n} is over: everyone who finished it as «{rank}» got the “{skin}” skin.', ssRewardSee: 'See the skin'
      }
    },
    pl: {
      skins: { amethyst_don: { name: 'Ametystowy Don', lore: 'Castelmar, 1931. Tej nocy, gdy rodzina Corvino przejęła port, Don założył ametystowy sygnet — i nigdy go już nie zdjął.' } },
      ui: {
        skSegCards: 'Karty', skSegSkins: 'Skórki', skTitle: 'Skórki kart',
        skHint: 'Skórka zmienia wygląd twojej karty, zasady roli zostają te same. Założoną skórkę widzą wszyscy przy stole: przy rozdaniu, w grze online, w wynikach partii i w twoim profilu.',
        skWear: 'Załóż', skTakeOff: 'Zdejmij', skWorn: 'Założona', skOwned: 'Twoja', skLocked: 'Niezdobyta', skFor: 'Karta: {role}',
        skHowSeason: 'Nagroda sezonu {n}: dla wszystkich, którzy skończą sezon z rangą «{rank}». Sezon trwa do {date}.', skHowSeasonDone: 'Nagroda sezonu {n}: dostali ją wszyscy, którzy skończyli sezon z rangą «{rank}».',
        skYourRank: 'Twoja ranga teraz', skTgOnly: 'Skórki są przypisane do konta Telegram: otwórz grę w Telegramie, aby założyć skórkę.',
        skWornToast: 'Skórka „{name}” założona na kartę «{role}»', skOffToast: 'Skórka zdjęta: karta «{role}» znów jest zwykła', skErr: 'Nie udało się — sprawdź połączenie i spróbuj ponownie',
        skForRole: 'Skórki tej karty', skAll: 'Wszystkie skórki', skStandard: 'Zwykła karta',
        ssRewardSkin: 'Nagroda sezonu {n}: skórka Epic „{skin}”', ssRewardSkinText: 'Wszyscy, którzy zdobędą rangę «{rank}» i utrzymają ją do końca sezonu {n} ({date}), dostaną skórkę „{skin}” do karty Dona — zostanie od razu założona.', ssRewardSkinDone: 'Sezon {n} zakończony: wszyscy, którzy skończyli go z rangą «{rank}», dostali skórkę „{skin}”.', ssRewardSee: 'Zobacz skórkę'
      }
    },
    hy: {
      skins: { amethyst_don: { name: 'Ամեթիստե Դոն', lore: 'Կաստելմար, 1931։ Այն գիշերը, երբ Կորվինոների ընտանիքը վերցրեց նավահանգիստը, Դոնը դրեց ամեթիստե մատանին և այլևս երբեք չհանեց։' } },
      ui: {
        skSegCards: 'Քարտեր', skSegSkins: 'Սքիններ', skTitle: 'Քարտերի սքիններ',
        skHint: 'Սքինը փոխում է ձեր քարտի տեսքը, դերի կանոնները մնում են նույնը։ Հագցրած սքինը տեսնում են սեղանի բոլոր խաղացողները՝ բաժանման ժամանակ, առցանց խաղում, խաղի արդյունքներում և ձեր պրոֆիլում։',
        skWear: 'Հագցնել', skTakeOff: 'Հանել', skWorn: 'Հագցված է', skOwned: 'Ձերն է', skLocked: 'Ստացված չէ', skFor: 'Քարտ՝ {role}',
        skHowSeason: 'Սեզոն {n}-ի պարգև՝ բոլոր նրանց, ովքեր սեզոնը կավարտեն «{rank}» կոչմամբ։ Սեզոնը տևում է մինչև {date}։', skHowSeasonDone: 'Սեզոն {n}-ի պարգև՝ ստացան բոլոր նրանք, ովքեր սեզոնն ավարտեցին «{rank}» կոչմամբ։',
        skYourRank: 'Ձեր կոչումը հիմա', skTgOnly: 'Սքինները կապված են Telegram հաշվին․ բացեք խաղը Telegram-ում՝ սքին հագցնելու համար։',
        skWornToast: '«{name}» սքինը հագցված է «{role}» քարտին', skOffToast: 'Սքինը հանված է․ «{role}» քարտը կրկին սովորական է', skErr: 'Չստացվեց․ ստուգեք կապը և նորից փորձեք',
        skForRole: 'Այս քարտի սքինները', skAll: 'Բոլոր սքինները', skStandard: 'Սովորական քարտ',
        ssRewardSkin: 'Սեզոն {n}-ի պարգևը՝ Epic սքին «{skin}»', ssRewardSkinText: 'Բոլոր նրանք, ովքեր կհասնեն «{rank}» կոչմանը և կպահեն այն մինչև սեզոն {n}-ի ավարտը ({date}), կստանան «{skin}» սքինը Դոնի քարտի համար՝ այն անմիջապես կհագցվի։', ssRewardSkinDone: 'Սեզոն {n}-ն ավարտվեց․ բոլոր նրանք, ովքեր այն ավարտեցին «{rank}» կոչմամբ, ստացան «{skin}» սքինը։', ssRewardSee: 'Տեսնել սքինը'
      }
    }
  };
  Object.keys(R).forEach(code => { const p = I18N[code]; if (!p) return; p.skins = Object.assign(p.skins || {}, R[code].skins); Object.assign(p.ui, R[code].ui); });
})();
/* v68: an admin gives a player skins */
(function () {
  const R = {
    ru: { askLoading: 'Загружаю скины игрока…', askBtn: 'Скины игрока', askTitle: 'Скины игрока', askHint: 'Нажмите на скин без отметки — подарите его; на подарок 🎁 — заберёте. Купленный или выигранный скин не забирается.', askCount: 'Есть {n} из {all}', askAll: 'Подарить все', askGift: 'подарок', askOwn: 'есть', askWorn: 'надет', askGave: 'Подарено «{name}» — игрок получил сообщение', askGaveAll: 'Подарено скинов: {n}', askTook: 'Подарок «{name}» забран', askKeep: 'Этот скин куплен или выигран — его не забрать', askNone: 'Игрок не найден — он должен хоть раз открыть бота', askPanel: 'Скины игроку', askPanelHint: '@ник или Telegram id — откроется список скинов игрока', askOpen: 'Открыть' },
    uk: { askLoading: 'Завантажую скіни гравця…', askBtn: 'Скіни гравця', askTitle: 'Скіни гравця', askHint: 'Натисніть на скін без позначки — подаруєте його; на подарунок 🎁 — заберете. Куплений чи виграний скін не забирається.', askCount: 'Є {n} з {all}', askAll: 'Подарувати всі', askGift: 'подарунок', askOwn: 'є', askWorn: 'вдягнений', askGave: 'Подаровано «{name}» — гравець отримав повідомлення', askGaveAll: 'Подаровано скінів: {n}', askTook: 'Подарунок «{name}» забрано', askKeep: 'Цей скін куплений або виграний — його не забрати', askNone: 'Гравця не знайдено — він має хоч раз відкрити бота', askPanel: 'Скіни гравцеві', askPanelHint: '@нік або Telegram id — відкриється список скінів гравця', askOpen: 'Відкрити' },
    en: { askLoading: 'Loading the player’s skins…', askBtn: 'Player’s skins', askTitle: 'Player’s skins', askHint: 'Tap a skin with no mark to give it; tap a gift 🎁 to take it back. A skin bought or won stays.', askCount: '{n} of {all}', askAll: 'Give all', askGift: 'gift', askOwn: 'owned', askWorn: 'worn', askGave: '«{name}» given — the player got a message', askGaveAll: 'Skins given: {n}', askTook: 'The gift «{name}» is taken back', askKeep: 'This skin was bought or won — it stays', askNone: 'Player not found — he must open the bot at least once', askPanel: 'Skins for a player', askPanelHint: '@username or Telegram id — opens the player’s skins', askOpen: 'Open' },
    pl: { askLoading: 'Wczytuję skórki gracza…', askBtn: 'Skórki gracza', askTitle: 'Skórki gracza', askHint: 'Dotknij skórki bez znaczka — podarujesz ją; prezentu 🎁 — odbierzesz. Kupiona lub wygrana skórka zostaje.', askCount: 'Ma {n} z {all}', askAll: 'Podaruj wszystkie', askGift: 'prezent', askOwn: 'ma', askWorn: 'założona', askGave: 'Podarowano „{name}” — gracz dostał wiadomość', askGaveAll: 'Podarowano skórek: {n}', askTook: 'Prezent „{name}” odebrany', askKeep: 'Ta skórka jest kupiona lub wygrana — zostaje', askNone: 'Nie znaleziono gracza — musi choć raz otworzyć bota', askPanel: 'Skórki dla gracza', askPanelHint: '@nick lub Telegram id — otworzy listę skórek gracza', askOpen: 'Otwórz' },
    hy: { askLoading: 'Բեռնում եմ խաղացողի սքինները…', askBtn: 'Խաղացողի սքինները', askTitle: 'Խաղացողի սքինները', askHint: 'Սեղմեք առանց նշանի սքինին՝ կնվիրեք այն, նվերին 🎁՝ հետ կվերցնեք։ Գնված կամ շահած սքինը մնում է։', askCount: 'Կա {n}՝ {all}-ից', askAll: 'Նվիրել բոլորը', askGift: 'նվեր', askOwn: 'կա', askWorn: 'հագցված', askGave: '«{name}» նվիրվեց՝ խաղացողը հաղորդագրություն ստացավ', askGaveAll: 'Նվիրված սքիններ՝ {n}', askTook: '«{name}» նվերը հետ վերցվեց', askKeep: 'Այս սքինը գնված կամ շահած է՝ այն մնում է', askNone: 'Խաղացողը չի գտնվել՝ նա պետք է գոնե մեկ անգամ բացի բոտը', askPanel: 'Սքիններ խաղացողին', askPanelHint: '@անուն կամ Telegram id՝ կբացվի խաղացողի սքինների ցանկը', askOpen: 'Բացել' }
  };
  Object.keys(R).forEach(code => { const p = I18N[code]; if (p) Object.assign(p.ui, R[code]); });
})();
