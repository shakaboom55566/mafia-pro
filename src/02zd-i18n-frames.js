/* ============================================================
   v74 avatar frames — texts (screens: 19-frames.js; the catalog: FRAMES in 12-skins.js)
   ============================================================ */
(function () {
  const N = { // name / a line about it
    ru: {
      hw_pumpkin_patch: ['Тыквенная грядка', 'Пять тыкв ухмыляются из колючих лоз — в эту ночь они тоже играют.'],
      hw_vampire_count: ['Граф-вампир', 'Крылья летучей мыши, рубин и свечи, что плачут красным воском.'],
      hw_witch_brew: ['Ведьмино зелье', 'Шляпы, метла и котёл, в котором булькает что-то зелёное. Не пробуйте.'],
      hw_spider_queen: ['Королева пауков', 'Серебряная паутина в росе и чёрная вдова, которая всё видит.'],
      hw_bone_crown: ['Костяная корона', 'Черепа, кости и свечи — корона для того, кто пережил не одну ночь.'],
      hw_ghost_parade: ['Парад призраков', 'Весёлые привидения с фонариками кружат вокруг — им тоже интересно, кто мафия.'],
      hw_werewolf_moon: ['Луна оборотня', 'Мех, следы когтей и полная луна. В полнолуние доверять никому.'],
      hw_grim_reaper: ['Жнец', 'Капюшон, две косы и песочные часы. Время на исходе — голосуйте.']
    },
    uk: {
      hw_pumpkin_patch: ['Гарбузова грядка', 'П’ять гарбузів шкіряться з колючих лоз — цієї ночі вони теж грають.'],
      hw_vampire_count: ['Граф-вампір', 'Крила кажана, рубін і свічки, що плачуть червоним воском.'],
      hw_witch_brew: ['Відьмине зілля', 'Капелюхи, мітла й казан, у якому булькає щось зелене. Не куштуйте.'],
      hw_spider_queen: ['Королева павуків', 'Срібне павутиння в росі й чорна вдова, яка все бачить.'],
      hw_bone_crown: ['Кістяна корона', 'Черепи, кістки й свічки — корона для того, хто пережив не одну ніч.'],
      hw_ghost_parade: ['Парад привидів', 'Веселі привиди з ліхтариками кружляють довкола — їм теж цікаво, хто мафія.'],
      hw_werewolf_moon: ['Місяць перевертня', 'Хутро, сліди кігтів і повний місяць. У повню не довіряйте нікому.'],
      hw_grim_reaper: ['Жнець', 'Каптур, дві коси й пісочний годинник. Час спливає — голосуйте.']
    },
    en: {
      hw_pumpkin_patch: ['Pumpkin Patch', 'Five pumpkins grin out of thorny vines — tonight they play too.'],
      hw_vampire_count: ['Vampire Count', 'Bat wings, a ruby and candles weeping red wax.'],
      hw_witch_brew: ['Witch’s Brew', 'Hats, a broom and a cauldron bubbling with something green. Don’t taste it.'],
      hw_spider_queen: ['Spider Queen', 'A silver web in the dew and a black widow who sees everything.'],
      hw_bone_crown: ['Bone Crown', 'Skulls, bones and candles — a crown for one who has lived through many nights.'],
      hw_ghost_parade: ['Ghost Parade', 'Cheerful ghosts with lanterns circle around — they want to know who the mafia is too.'],
      hw_werewolf_moon: ['Werewolf Moon', 'Fur, claw marks and a full moon. Trust no one at full moon.'],
      hw_grim_reaper: ['Grim Reaper', 'A hood, two scythes and an hourglass. Time is running out — vote.']
    },
    pl: {
      hw_pumpkin_patch: ['Dyniowa grządka', 'Pięć dyń szczerzy się z kolczastych pnączy — tej nocy one też grają.'],
      hw_vampire_count: ['Hrabia wampir', 'Skrzydła nietoperza, rubin i świece płaczące czerwonym woskiem.'],
      hw_witch_brew: ['Wiedźmi wywar', 'Kapelusze, miotła i kocioł, w którym bulgocze coś zielonego. Nie próbuj.'],
      hw_spider_queen: ['Królowa pająków', 'Srebrna pajęczyna w rosie i czarna wdowa, która widzi wszystko.'],
      hw_bone_crown: ['Kościana korona', 'Czaszki, kości i świece — korona dla tego, kto przeżył niejedną noc.'],
      hw_ghost_parade: ['Parada duchów', 'Wesołe duszki z latarenkami krążą wokół — też chcą wiedzieć, kto jest mafią.'],
      hw_werewolf_moon: ['Księżyc wilkołaka', 'Futro, ślady pazurów i pełnia. W pełnię nie ufaj nikomu.'],
      hw_grim_reaper: ['Żniwiarz', 'Kaptur, dwie kosy i klepsydra. Czas ucieka — głosuj.']
    },
    hy: {
      hw_pumpkin_patch: ['Դդմի մարգ', 'Հինգ դդում քմծիծաղում են փշոտ որթերի միջից․ այս գիշեր նրանք էլ են խաղում։'],
      hw_vampire_count: ['Կոմս-վամպիր', 'Չղջիկի թևեր, սուտակ և կարմիր մոմով լացող մոմեր։'],
      hw_witch_brew: ['Կախարդի եփուկ', 'Գլխարկներ, ավել և կաթսա, որում ինչ-որ կանաչ բան է եռում։ Մի՛ համտեսեք։'],
      hw_spider_queen: ['Սարդերի թագուհի', 'Արծաթե սարդոստայն ցողի մեջ և սև այրի, որն ամեն ինչ տեսնում է։'],
      hw_bone_crown: ['Ոսկրե թագ', 'Գանգեր, ոսկորներ և մոմեր՝ թագ նրա համար, ով շատ գիշերներ է վերապրել։'],
      hw_ghost_parade: ['Ուրվականների շքերթ', 'Զվարթ ուրվականները լապտերներով պտտվում են շուրջը․ նրանք էլ են ուզում իմանալ, թե ով է մաֆիան։'],
      hw_werewolf_moon: ['Գայլամարդու լուսին', 'Մորթի, ճանկերի հետքեր և լիալուսին։ Լիալուսնին ոչ մեկին մի՛ վստահեք։'],
      hw_grim_reaper: ['Մահվան հնձվոր', 'Գլխանոց, երկու գերանդի և ավազի ժամացույց։ Ժամանակը սպառվում է՝ քվեարկե՛ք։']
    }
  };
  const UI = {
    ru: { afTitle: 'Рамки аватарки · Хэллоуин', afHint: 'Рамка вокруг вашей аватарки: её видят все за столом и в вашем профиле.', afLabel: 'Рамка', afOn: 'надета', afWear: 'Надеть', afOff: 'Снять рамку', afSet: '«{name}» — теперь ваша рамка', afOffToast: 'Рамка снята', afPreview: 'Так вас увидят за столом', afHow: 'Купить рамку можно в Telegram-версии: откройте приложение через бота.' },
    uk: { afTitle: 'Рамки аватарки · Гелловін', afHint: 'Рамка навколо вашої аватарки: її бачать усі за столом і у вашому профілі.', afLabel: 'Рамка', afOn: 'вдягнена', afWear: 'Вдягнути', afOff: 'Зняти рамку', afSet: '«{name}» — тепер ваша рамка', afOffToast: 'Рамку знято', afPreview: 'Так вас побачать за столом', afHow: 'Купити рамку можна в Telegram-версії: відкрийте застосунок через бота.' },
    en: { afTitle: 'Avatar frames · Halloween', afHint: 'A frame around your avatar: everyone sees it at the table and in your profile.', afLabel: 'Frame', afOn: 'on', afWear: 'Put on', afOff: 'Take off the frame', afSet: '«{name}» is your frame now', afOffToast: 'Frame off', afPreview: 'This is how the table sees you', afHow: 'Frames are bought in the Telegram version: open the app through the bot.' },
    pl: { afTitle: 'Ramki awatara · Halloween', afHint: 'Ramka wokół Twojego awatara: widzą ją wszyscy przy stole i w Twoim profilu.', afLabel: 'Ramka', afOn: 'założona', afWear: 'Załóż', afOff: 'Zdejmij ramkę', afSet: '„{name}” — teraz Twoja ramka', afOffToast: 'Ramka zdjęta', afPreview: 'Tak zobaczą Cię przy stole', afHow: 'Ramkę kupisz w wersji Telegram: otwórz aplikację przez bota.' },
    hy: { afTitle: 'Ավատարի շրջանակներ · Հելոուին', afHint: 'Շրջանակ ձեր ավատարի շուրջ․ այն տեսնում են բոլորը սեղանի շուրջ և ձեր պրոֆիլում։', afLabel: 'Շրջանակ', afOn: 'դրված է', afWear: 'Դնել', afOff: 'Հանել շրջանակը', afSet: '«{name}»՝ այժմ ձեր շրջանակն է', afOffToast: 'Շրջանակը հանվեց', afPreview: 'Այսպես ձեզ կտեսնեն սեղանի շուրջ', afHow: 'Շրջանակը կարելի է գնել Telegram-տարբերակում․ բացեք հավելվածը բոտի միջոցով։' }
  };
  Object.keys(UI).forEach(code => {
    const p = I18N[code]; if (!p) return; p.skins = p.skins || {};
    Object.entries(N[code]).forEach(([id, [name, lore]]) => { p.skins[id] = { name, lore }; });
    Object.assign(p.ui, UI[code]);
  });
})();
/* v76: the Skins tab's categories, the favourite card on the profile; the rooms are now «room backgrounds» (the table's own look is a category of its own) */
(function () {
  const UI = {
    ru: { skCatLooks: 'Облики', skCatRooms: 'Фоны комнаты', skCatTables: 'Фон стола', skCatFrames: 'Рамки', skTablesSoon: 'Скоро здесь появятся скины самого стола: сукно, мрамор, дерево, золото. Стол останется круглым, а вокруг — ваш фон комнаты.',
      rmTitle: 'Фоны комнаты', rmLabel: 'Фон комнаты', rmOn: 'стоит', rmSetBtn: 'Сделать фоном комнаты', rmOffBtn: 'Убрать фон', rmNoneHint: 'обычный тёмный фон', rmSet: '«{name}» — теперь фон вашей комнаты', rmOff: 'Фон убран — снова обычный тёмный', rmPick: 'Фон вашей комнаты',
      favTitle: 'Любимая карта', favPick: 'Выбрать любимую карту', favChange: 'Сменить', favBest: 'Показывать лучшую карту', favSheetHint: 'Её увидят все в вашем профиле вместо лучшей карты.', favSet: '«{name}» — ваша любимая карта', favOff: 'В профиле снова лучшая карта' },
    uk: { skCatLooks: 'Образи', skCatRooms: 'Фони кімнати', skCatTables: 'Фон столу', skCatFrames: 'Рамки', skTablesSoon: 'Незабаром тут з’являться скіни самого столу: сукно, мармур, дерево, золото. Стіл залишиться круглим, а довкола — ваш фон кімнати.',
      rmTitle: 'Фони кімнати', rmLabel: 'Фон кімнати', rmOn: 'стоїть', rmSetBtn: 'Зробити фоном кімнати', rmOffBtn: 'Прибрати фон', rmNoneHint: 'звичайний темний фон', rmSet: '«{name}» — тепер фон вашої кімнати', rmOff: 'Фон прибрано — знову звичайний темний', rmPick: 'Фон вашої кімнати',
      favTitle: 'Улюблена карта', favPick: 'Обрати улюблену карту', favChange: 'Змінити', favBest: 'Показувати найкращу карту', favSheetHint: 'Її побачать усі у вашому профілі замість найкращої карти.', favSet: '«{name}» — ваша улюблена карта', favOff: 'У профілі знову найкраща карта' },
    en: { skCatLooks: 'Looks', skCatRooms: 'Room backgrounds', skCatTables: 'Table', skCatFrames: 'Frames', skTablesSoon: 'Skins for the table itself are coming soon: cloth, marble, wood, gold. The table stays round, with your room background around it.',
      rmTitle: 'Room backgrounds', rmLabel: 'Room background', rmOn: 'up', rmSetBtn: 'Make it my room', rmOffBtn: 'Take the background down', rmNoneHint: 'the plain dark background', rmSet: '«{name}» is your room now', rmOff: 'Background down — the plain dark one again', rmPick: 'Your room’s background',
      favTitle: 'Favourite card', favPick: 'Choose a favourite card', favChange: 'Change', favBest: 'Show my best card', favSheetHint: 'Everyone will see it on your profile instead of your best card.', favSet: '«{name}» is your favourite card', favOff: 'Your profile shows your best card again' },
    pl: { skCatLooks: 'Wygląd', skCatRooms: 'Tła pokoju', skCatTables: 'Stół', skCatFrames: 'Ramki', skTablesSoon: 'Wkrótce pojawią się tu skórki samego stołu: sukno, marmur, drewno, złoto. Stół zostanie okrągły, a wokół — Twoje tło pokoju.',
      rmTitle: 'Tła pokoju', rmLabel: 'Tło pokoju', rmOn: 'ustawione', rmSetBtn: 'Ustaw jako tło pokoju', rmOffBtn: 'Zdejmij tło', rmNoneHint: 'zwykłe ciemne tło', rmSet: '„{name}” — teraz tło Twojego pokoju', rmOff: 'Tło zdjęte — znów zwykłe ciemne', rmPick: 'Tło Twojego pokoju',
      favTitle: 'Ulubiona karta', favPick: 'Wybierz ulubioną kartę', favChange: 'Zmień', favBest: 'Pokazuj najlepszą kartę', favSheetHint: 'Wszyscy zobaczą ją w Twoim profilu zamiast najlepszej karty.', favSet: '„{name}” — Twoja ulubiona karta', favOff: 'W profilu znów najlepsza karta' },
    hy: { skCatLooks: 'Կերպարներ', skCatRooms: 'Սենյակի ֆոներ', skCatTables: 'Սեղան', skCatFrames: 'Շրջանակներ', skTablesSoon: 'Շուտով այստեղ կհայտնվեն հենց սեղանի սքինները՝ մահուդ, մարմար, փայտ, ոսկի։ Սեղանը կմնա կլոր, իսկ շուրջը՝ ձեր սենյակի ֆոնը։',
      rmTitle: 'Սենյակի ֆոներ', rmLabel: 'Սենյակի ֆոն', rmOn: 'դրված է', rmSetBtn: 'Դարձնել սենյակի ֆոն', rmOffBtn: 'Հանել ֆոնը', rmNoneHint: 'սովորական մուգ ֆոն', rmSet: '«{name}»՝ այժմ ձեր սենյակի ֆոնն է', rmOff: 'Ֆոնը հանվեց՝ կրկին սովորական մուգ', rmPick: 'Ձեր սենյակի ֆոնը',
      favTitle: 'Սիրելի քարտ', favPick: 'Ընտրել սիրելի քարտը', favChange: 'Փոխել', favBest: 'Ցույց տալ լավագույն քարտը', favSheetHint: 'Բոլորը այն կտեսնեն ձեր պրոֆիլում լավագույն քարտի փոխարեն։', favSet: '«{name}»՝ ձեր սիրելի քարտն է', favOff: 'Պրոֆիլում կրկին լավագույն քարտն է' }
  };
  Object.keys(UI).forEach(code => { const p = I18N[code]; if (p) Object.assign(p.ui, UI[code]); });
})();
/* v78: the frame in the profile form */
(function () {
  const UI = {
    ru: { afPick: 'Рамка аватарки', afStd: 'Стандартная', afMore: 'Ещё рамки' },
    uk: { afPick: 'Рамка аватарки', afStd: 'Стандартна', afMore: 'Більше рамок' },
    en: { afPick: 'Avatar frame', afStd: 'Standard', afMore: 'More frames' },
    pl: { afPick: 'Ramka awatara', afStd: 'Standardowa', afMore: 'Więcej ramek' },
    hy: { afPick: 'Ավատարի շրջանակ', afStd: 'Ստանդարտ', afMore: 'Այլ շրջանակներ' }
  };
  Object.keys(UI).forEach(code => { const p = I18N[code]; if (p) Object.assign(p.ui, UI[code]); });
})();
