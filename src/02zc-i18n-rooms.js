/* ============================================================
   v71 table backgrounds — texts (screens: 18-rooms.js; the catalog: ROOMS in 12-skins.js)
   ============================================================ */
(function () {
  const R = {
    ru: {
      skins: { castelmar_club: { name: 'Клуб «Кастельмар»', lore: 'Кастельмар, 1931. Подвал под портовой лавкой: бархат, латунь, рояль и бар, где не спрашивают имён. Здесь семьи делят город — за одним круглым столом.' } },
      ui: { rmTitle: 'Фон стола', rmHint: 'Комната вокруг круглого стола. Когда вы ведёте онлайн-игру, её видят все игроки за вашим столом.', rmLabel: 'Фон стола', rmOn: 'на столе', rmSetBtn: 'Поставить на мой стол', rmOffBtn: 'Убрать со стола', rmNone: 'Без фона', rmNoneHint: 'обычный тёмный стол', rmHow: 'Этот фон — награда: его дарит администрация Mafia Pro.', rmSet: '«{name}» — теперь фон вашего стола', rmOff: 'Фон убран — стол снова обычный', rmBtn: 'Фон', rmPick: 'Фон вашего стола', rmPickHint: 'Его увидят все игроки за вашим столом.', rmTilt: 'Наклоните телефон — комната оживёт', rmWho: 'Так ваш стол увидят игроки' }
    },
    uk: {
      skins: { castelmar_club: { name: 'Клуб «Кастельмар»', lore: 'Кастельмар, 1931. Підвал під портовою крамничкою: оксамит, латунь, рояль і бар, де не питають імен. Тут родини ділять місто — за одним круглим столом.' } },
      ui: { rmTitle: 'Фон столу', rmHint: 'Кімната навколо круглого столу. Коли ви ведете онлайн-гру, її бачать усі гравці за вашим столом.', rmLabel: 'Фон столу', rmOn: 'на столі', rmSetBtn: 'Поставити на мій стіл', rmOffBtn: 'Прибрати зі столу', rmNone: 'Без фону', rmNoneHint: 'звичайний темний стіл', rmHow: 'Цей фон — нагорода: його дарує адміністрація Mafia Pro.', rmSet: '«{name}» — тепер фон вашого столу', rmOff: 'Фон прибрано — стіл знову звичайний', rmBtn: 'Фон', rmPick: 'Фон вашого столу', rmPickHint: 'Його побачать усі гравці за вашим столом.', rmTilt: 'Нахиліть телефон — кімната оживе', rmWho: 'Так ваш стіл побачать гравці' }
    },
    en: {
      skins: { castelmar_club: { name: 'Castelmar Club', lore: 'Castelmar, 1931. A cellar under a harbor shop: velvet, brass, a grand piano and a bar where nobody asks for names. Here the families divide the city — at one round table.' } },
      ui: { rmTitle: 'Table background', rmHint: 'The room around the round table. When you host an online game, every player at your table sees it.', rmLabel: 'Table background', rmOn: 'on the table', rmSetBtn: 'Put it on my table', rmOffBtn: 'Take it off the table', rmNone: 'No background', rmNoneHint: 'the plain dark table', rmHow: 'This background is a reward: Mafia Pro’s admins give it.', rmSet: '«{name}» is now your table’s background', rmOff: 'Background off — the plain table again', rmBtn: 'Background', rmPick: 'Your table’s background', rmPickHint: 'Every player at your table will see it.', rmTilt: 'Tilt the phone — the room comes alive', rmWho: 'This is how players will see your table' }
    },
    pl: {
      skins: { castelmar_club: { name: 'Klub Castelmar', lore: 'Castelmar, 1931. Piwnica pod portowym sklepikiem: aksamit, mosiądz, fortepian i bar, w którym nikt nie pyta o imiona. Tu rodziny dzielą miasto — przy jednym okrągłym stole.' } },
      ui: { rmTitle: 'Tło stołu', rmHint: 'Pokój wokół okrągłego stołu. Gdy prowadzisz grę online, widzą go wszyscy gracze przy Twoim stole.', rmLabel: 'Tło stołu', rmOn: 'na stole', rmSetBtn: 'Ustaw na moim stole', rmOffBtn: 'Zdejmij ze stołu', rmNone: 'Bez tła', rmNoneHint: 'zwykły ciemny stół', rmHow: 'To tło jest nagrodą: przyznaje je administracja Mafia Pro.', rmSet: '„{name}” — teraz tło Twojego stołu', rmOff: 'Tło zdjęte — stół znów zwykły', rmBtn: 'Tło', rmPick: 'Tło Twojego stołu', rmPickHint: 'Zobaczą je wszyscy gracze przy Twoim stole.', rmTilt: 'Przechyl telefon — pokój ożyje', rmWho: 'Tak gracze zobaczą Twój stół' }
    },
    hy: {
      skins: { castelmar_club: { name: '«Կաստելմար» ակումբ', lore: 'Կաստելմար, 1931։ Նավահանգստի խանութի տակ գտնվող նկուղ՝ թավիշ, արույր, դաշնամուր և բար, որտեղ անուն չեն հարցնում։ Այստեղ ընտանիքները բաժանում են քաղաքը՝ մեկ կլոր սեղանի շուրջ։' } },
      ui: { rmTitle: 'Սեղանի ֆոն', rmHint: 'Սենյակը կլոր սեղանի շուրջ։ Երբ վարում եք առցանց խաղ, այն տեսնում են ձեր սեղանի բոլոր խաղացողները։', rmLabel: 'Սեղանի ֆոն', rmOn: 'սեղանին', rmSetBtn: 'Դնել իմ սեղանին', rmOffBtn: 'Հանել սեղանից', rmNone: 'Առանց ֆոնի', rmNoneHint: 'սովորական մուգ սեղան', rmHow: 'Այս ֆոնը պարգև է՝ այն նվիրում է Mafia Pro-ի ադմինիստրացիան։', rmSet: '«{name}»՝ այժմ ձեր սեղանի ֆոնն է', rmOff: 'Ֆոնը հանվեց՝ սեղանը կրկին սովորական է', rmBtn: 'Ֆոն', rmPick: 'Ձեր սեղանի ֆոնը', rmPickHint: 'Այն կտեսնեն ձեր սեղանի բոլոր խաղացողները։', rmTilt: 'Թեքեք հեռախոսը՝ սենյակը կկենդանանա', rmWho: 'Այսպես խաղացողները կտեսնեն ձեր սեղանը' }
    }
  };
  Object.keys(R).forEach(code => { const p = I18N[code]; if (!p) return; p.skins = Object.assign(p.skins || {}, R[code].skins); Object.assign(p.ui, R[code].ui); });
})();
