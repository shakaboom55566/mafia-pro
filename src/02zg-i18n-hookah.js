/* ============================================================
   v82 HOOKAH MASTER — a free city card: at night he invites two guests and learns whether the mafia was among them
   (engine: hookahResult / hookahPairBanned in 03-engine.js) + his first skin, «Silver Smoke» (Common).
   ============================================================ */
(function () {
  const R = {
    ru: {
      role: { name: 'Кальянщик', mono: 'Кл', kind: 'Активная · ночь', short: 'Зовёт двоих на кальян и узнаёт, есть ли среди них мафия.',
        rules: ['Ночью показывает ведущему двух игроков — своих гостей.', 'Ведущий отвечает жестом: 👍 — среди гостей есть мафия, 👎 — компания чистая. Кто именно и сколько их, Кальянщик не узнаёт.', 'Себя не зовёт. Ту же пару нельзя звать две ночи подряд — хотя бы один гость должен смениться.', 'Гостя, которого запер Тюремщик, за кальяном не было: он не считается.', 'Мафия — те, кто чёрный для Шерифа: гость, перекрашенный Баламутом, виден с новым цветом, Маньяк и Оборотень — чистые.', 'Для проверок — красный.'],
        lore: 'В его кальянной за Портовой улицей дым густой, а языки длинные. После третьей чаши люди говорят то, чего не сказали бы и на исповеди. Он только слушает и подкладывает угли.',
        tip: 'Зовите вместе подозрительного и того, кому доверяете: тогда 👍 почти наверняка указывает на первого.' },
      hook: 'Кальянщик узнаёт, есть ли мафия в паре', ability: 'кальян',
      e: { hkScript: 'Просыпается <b>Кальянщик</b> и показывает двух гостей. Если среди них есть мафия — покажите 👍, если нет — 👎.', hkYes: 'За кальяном была мафия', hkNo: 'Компания чистая', hkGestYes: 'Жест: большой палец вверх 👍', hkGestNo: 'Жест: большой палец вниз 👎', hkEqYes: ' = есть мафия', hkEqNo: ' = чисто', hkSamePair: 'Эту пару Кальянщик звал прошлой ночью — смените хотя бы одного гостя.' },
      skin: ['Серебряный дым', 'Кальянная за Портовой улицей, дождь по высокому окну, серебряный дым колечками. Хозяин улыбается гостям и молчит — он уже знает, кто из них врёт.'],
      ui: { skOtherTitle: 'Другие облики · {n}' }
    },
    uk: {
      role: { name: 'Кальянник', mono: 'Кл', kind: 'Активна · ніч', short: 'Кличе двох на кальян і дізнається, чи є серед них мафія.',
        rules: ['Уночі показує ведучому двох гравців — своїх гостей.', 'Ведучий відповідає жестом: 👍 — серед гостей є мафія, 👎 — компанія чиста. Хто саме і скільки їх, Кальянник не дізнається.', 'Себе не кличе. Ту саму пару не можна кликати дві ночі поспіль — хоча б один гість має змінитися.', 'Гостя, якого замкнув Тюремник, за кальяном не було: він не рахується.', 'Мафія — ті, хто чорний для Шерифа: гість, перефарбований Баламутом, видно з новим кольором, Маніяк і Перевертень — чисті.', 'Для перевірок — червоний.'],
        lore: 'У його кальянній за Портовою вулицею дим густий, а язики довгі. Після третьої чаші люди кажуть те, чого не сказали б і на сповіді. Він лише слухає й підкладає вугілля.',
        tip: 'Кличте разом підозрілого й того, кому довіряєте: тоді 👍 майже напевно вказує на першого.' },
      hook: 'Кальянник дізнається, чи є мафія в парі', ability: 'кальян',
      e: { hkScript: 'Прокидається <b>Кальянник</b> і показує двох гостей. Якщо серед них є мафія — покажіть 👍, якщо ні — 👎.', hkYes: 'За кальяном була мафія', hkNo: 'Компанія чиста', hkGestYes: 'Жест: великий палець угору 👍', hkGestNo: 'Жест: великий палець униз 👎', hkEqYes: ' = є мафія', hkEqNo: ' = чисто', hkSamePair: 'Цю пару Кальянник кликав минулої ночі — змініть хоча б одного гостя.' },
      skin: ['Срібний дим', 'Кальянна за Портовою вулицею, дощ по високому вікну, срібний дим кільцями. Господар усміхається гостям і мовчить — він уже знає, хто з них бреше.'],
      ui: { skOtherTitle: 'Інші образи · {n}' }
    },
    en: {
      role: { name: 'Hookah Master', mono: 'Hk', kind: 'Active · night', short: 'Invites two guests for a hookah and learns whether the mafia is among them.',
        rules: ['At night points the host to two players: his guests.', 'The host answers with a gesture: 👍 means the mafia is among the guests, 👎 means the company is clean. Who exactly, and how many, the Hookah Master does not learn.', 'Cannot invite himself. The same pair cannot be invited two nights in a row: at least one guest must change.', 'A guest locked up by the Jailer never came to the hookah: he does not count.', 'The mafia means black for the Sheriff: a guest repainted by the Trickster shows his new color; the Maniac and the Werewolf are clean.', 'Counts as red for checks.'],
        lore: 'In his hookah lounge behind Harbor Street the smoke is thick and tongues are loose. After the third bowl people say what they wouldn’t say at confession. He only listens and adds coals.',
        tip: 'Invite a suspect together with someone you trust: then a 👍 almost surely points at the first one.' },
      hook: 'the Hookah Master learns whether a pair hides the mafia', ability: 'hookah',
      e: { hkScript: 'The <b>Hookah Master</b> wakes up and points to two guests. If the mafia is among them, show 👍; if not, 👎.', hkYes: 'The mafia was at the hookah', hkNo: 'The company is clean', hkGestYes: 'Gesture: thumb up 👍', hkGestNo: 'Gesture: thumb down 👎', hkEqYes: ' = mafia there', hkEqNo: ' = clean', hkSamePair: 'The Hookah Master invited this pair last night: change at least one guest.' },
      skin: ['Silver Smoke', 'A hookah lounge behind Harbor Street, rain on a tall window, rings of silver smoke. The host smiles at his guests and says nothing: he already knows which of them is lying.'],
      ui: { skOtherTitle: 'Other looks · {n}' }
    },
    pl: {
      role: { name: 'Mistrz sziszy', mono: 'Ms', kind: 'Aktywna · noc', short: 'Zaprasza dwóch gości na sziszę i dowiaduje się, czy jest wśród nich mafia.',
        rules: ['W nocy wskazuje prowadzącemu dwóch graczy — swoich gości.', 'Prowadzący odpowiada gestem: 👍 — wśród gości jest mafia, 👎 — towarzystwo jest czyste. Kto dokładnie i ilu ich jest, Mistrz sziszy się nie dowiaduje.', 'Nie zaprasza siebie. Tej samej pary nie można zaprosić dwie noce z rzędu — co najmniej jeden gość musi się zmienić.', 'Gościa zamkniętego przez Strażnika nie było przy sziszy: nie liczy się.', 'Mafia to ci, którzy są czarni dla Szeryfa: gość przemalowany przez Mąciciela ma nowy kolor, Maniak i Wilkołak są czyści.', 'Dla sprawdzeń — czerwony.'],
        lore: 'W jego palarni za ulicą Portową dym jest gęsty, a języki rozwiązane. Po trzeciej misce ludzie mówią to, czego nie powiedzieliby nawet na spowiedzi. On tylko słucha i dokłada węgielków.',
        tip: 'Zaproś razem podejrzanego i kogoś, komu ufasz: wtedy 👍 prawie na pewno wskazuje na pierwszego.' },
      hook: 'Mistrz sziszy sprawdza, czy w parze jest mafia', ability: 'szisza',
      e: { hkScript: 'Budzi się <b>Mistrz sziszy</b> i wskazuje dwóch gości. Jeśli jest wśród nich mafia — pokaż 👍, jeśli nie — 👎.', hkYes: 'Przy sziszy była mafia', hkNo: 'Towarzystwo jest czyste', hkGestYes: 'Gest: kciuk w górę 👍', hkGestNo: 'Gest: kciuk w dół 👎', hkEqYes: ' = jest mafia', hkEqNo: ' = czysto', hkSamePair: 'Tę parę Mistrz sziszy zaprosił ostatniej nocy — zmień co najmniej jednego gościa.' },
      skin: ['Srebrny Dym', 'Palarnia za ulicą Portową, deszcz na wysokim oknie, kółka srebrnego dymu. Gospodarz uśmiecha się do gości i milczy — już wie, który z nich kłamie.'],
      ui: { skOtherTitle: 'Inne wizerunki · {n}' }
    },
    hy: {
      role: { name: 'Ղալյանչի', mono: 'Ղլ', kind: 'Ակտիվ · գիշեր', short: 'Երկու հյուրի կանչում է ղալյանի և իմանում, արդյոք նրանց մեջ մաֆիա կա։',
        rules: ['Գիշերը վարողին ցույց է տալիս երկու խաղացողի՝ իր հյուրերին։', 'Վարողը պատասխանում է ժեստով. 👍՝ հյուրերի մեջ մաֆիա կա, 👎՝ ընկերությունը մաքուր է։ Թե կոնկրետ ով և քանիսը, Ղալյանչին չի իմանում։', 'Իրեն չի կանչում։ Նույն զույգին չի կարելի կանչել երկու գիշեր անընդմեջ՝ գոնե մեկ հյուրը պետք է փոխվի։', 'Բանտապահի փակած հյուրը ղալյանի մոտ չի եղել՝ նա չի հաշվվում։', 'Մաֆիան նրանք են, ովքեր սև են Շերիֆի համար. Խառնակչի ներկած հյուրը երևում է նոր գույնով, Մոլագարն ու Գայլամարդը մաքուր են։', 'Ստուգումների համար՝ կարմիր։'],
        lore: 'Նավահանգստային փողոցի հետևում գտնվող նրա ղալյանատանը ծուխը թանձր է, իսկ լեզուները՝ երկար։ Երրորդ թասից հետո մարդիկ ասում են այն, ինչ խոստովանանքի ժամանակ էլ չէին ասի։ Նա միայն լսում է և ածուխ ավելացնում։',
        tip: 'Միասին կանչեք կասկածելիին և նրան, ում վստահում եք. այդ դեպքում 👍-ը գրեթե հաստատ ցույց է տալիս առաջինին։' },
      hook: 'Ղալյանչին իմանում է, արդյոք զույգում մաֆիա կա', ability: 'ղալյան',
      e: { hkScript: 'Արթնանում է <b>Ղալյանչին</b> և ցույց տալիս երկու հյուրի։ Եթե նրանց մեջ մաֆիա կա՝ ցույց տվեք 👍, եթե ոչ՝ 👎։', hkYes: 'Ղալյանի մոտ մաֆիա կար', hkNo: 'Ընկերությունը մաքուր է', hkGestYes: 'Ժեստ՝ բութ մատը վերև 👍', hkGestNo: 'Ժեստ՝ բութ մատը ներքև 👎', hkEqYes: ' = մաֆիա կա', hkEqNo: ' = մաքուր', hkSamePair: 'Այս զույգին Ղալյանչին կանչել է անցած գիշեր՝ փոխեք գոնե մեկ հյուրին։' },
      skin: ['Արծաթե ծուխ', 'Ղալյանատուն Նավահանգստային փողոցի հետևում, անձրև բարձր պատուհանին, արծաթե ծխի օղակներ։ Տերը ժպտում է հյուրերին և լռում. նա արդեն գիտի, թե նրանցից ով է ստում։'],
      ui: { skOtherTitle: 'Այլ կերպարներ · {n}' }
    }
  };
  Object.keys(R).forEach(code => {
    const p = I18N[code], d = R[code]; if (!p) return;
    p.roles.hookah = d.role; p.hooks.hookah = d.hook; p.abilities.hookah = d.ability;
    Object.assign(p.e, d.e); Object.assign(p.ui, d.ui);
    p.skins = p.skins || {}; p.skins.silver_smoke = { name: d.skin[0], lore: d.skin[1] };
  });
})();
