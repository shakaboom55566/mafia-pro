/* ============================================================
   v57 SKINS: the Epic series for every free card — names and stories (ru, uk, en, pl, hy).
   Order of each row: [name, story]. The catalog itself is in src/12-skins.js.
   ============================================================ */
(function () {
  const T = {
    lilac_doctor: {
      ru: ['Доктор Сирень', 'Ночная смена в больнице на холме. Она приходит вовремя — и в Кастельмаре впервые за неделю никто не умер.'],
      uk: ['Лікарка Бузок', 'Нічна зміна в лікарні на пагорбі. Вона приходить вчасно — і в Кастельмарі вперше за тиждень ніхто не помер.'],
      en: ['Doctor Lilac', 'Night shift at the hospital on the hill. She arrives in time — and for the first time in a week nobody in Castelmar dies.'],
      pl: ['Doktor Lila', 'Nocna zmiana w szpitalu na wzgórzu. Zdąży na czas — i pierwszy raz od tygodnia nikt w Castelmarze nie umiera.'],
      hy: ['Բժշկուհի Յասաման', 'Գիշերային հերթափոխ բլրի հիվանդանոցում։ Նա հասնում է ժամանակին, և մեկ շաբաթում առաջին անգամ Կաստելմարում ոչ ոք չի մահանում։']
    },
    orchid_surgeon: {
      ru: ['Хирург Орхидея', 'Орхидея в волосах — её подпись. В задней комнате «Чёрного ключа» она зашивает тех, о ком молчат газеты.'],
      uk: ['Хірургиня Орхідея', 'Орхідея у волоссі — її підпис. У задній кімнаті «Чорного ключа» вона зашиває тих, про кого мовчать газети.'],
      en: ['Orchid Surgeon', 'The orchid in her hair is her signature. In the back room of the Black Key she stitches up the people the papers never mention.'],
      pl: ['Chirurg Orchidea', 'Orchidea we włosach to jej podpis. Na zapleczu Czarnego Klucza zszywa tych, o których milczą gazety.'],
      hy: ['Վիրաբույժ Խոլորձ', 'Մազերի խոլորձը նրա ստորագրությունն է։ «Սև բանալու» հետնասենյակում նա կարում է նրանց, ում մասին թերթերը լռում են։']
    },
    violet_armorer: {
      ru: ['Фиалковый оружейник', 'Лучший ствол Кастельмара он отделал золотом и аметистом — и отдал семье, не спросив, в кого он выстрелит.'],
      uk: ['Фіалковий зброяр', 'Найкращий ствол Кастельмара він оздобив золотом і аметистом — і віддав родині, не спитавши, в кого той вистрілить.'],
      en: ['Violet Armorer', 'He trimmed the finest gun in Castelmar with gold and amethyst — and handed it to the family without asking who it would be for.'],
      pl: ['Fiołkowy Rusznikarz', 'Najlepszą broń Castelmaru ozdobił złotem i ametystem — i oddał rodzinie, nie pytając, w kogo wystrzeli.'],
      hy: ['Մանուշակագույն զինագործ', 'Կաստելմարի լավագույն ատրճանակը նա զարդարեց ոսկով ու ամեթիստով և տվեց ընտանիքին՝ չհարցնելով, թե ում վրա այն կկրակի։']
    },
    violet_flare: {
      ru: ['Фиолетовая вспышка', 'Лётчица, которой нечего терять. Когда переговоры заходят в тупик, над портом вспыхивает её сигнальный огонь.'],
      uk: ['Фіолетовий спалах', 'Льотчиця, якій нічого втрачати. Коли перемовини заходять у глухий кут, над портом спалахує її сигнальний вогонь.'],
      en: ['Violet Flare', 'A pilot with nothing to lose. When the talks stall, her signal flare lights up over the port.'],
      pl: ['Fioletowa Raca', 'Pilotka, która nie ma nic do stracenia. Gdy rozmowy utkną, nad portem rozbłyska jej raca.'],
      hy: ['Մանուշակագույն բռնկում', 'Օդաչուհի, որը կորցնելու ոչինչ չունի։ Երբ բանակցությունները փակուղի են մտնում, նավահանգստի վրա բռնկվում է նրա ազդանշանային կրակը։']
    },
    lilac_whisper: {
      ru: ['Сиреневый шёпот', 'Один шёпот в нужное ухо — и к утру весь клуб уверен, что честный лавочник работает на Корвино.'],
      uk: ['Бузковий шепіт', 'Один шепіт у потрібне вухо — і до ранку весь клуб певен, що чесний крамар працює на Корвіно.'],
      en: ['Lilac Whisper', 'One whisper into the right ear, and by morning the whole club is sure the honest shopkeeper works for the Corvinos.'],
      pl: ['Liliowy Szept', 'Jeden szept do właściwego ucha i rano cały klub jest pewien, że uczciwy sklepikarz pracuje dla Corvinów.'],
      hy: ['Յասամանե շշուկ', 'Մեկ շշուկ ճիշտ ականջին, և առավոտյան ամբողջ ակումբը համոզված է, որ ազնիվ խանութպանը Կորվինոների մարդն է։']
    },
    velvet_gloves: {
      ru: ['Бархатные перчатки', 'Лица его никто не помнит. Только бархатные перчатки — и то, что после них доктор уже не нужен.'],
      uk: ['Оксамитові рукавички', 'Його обличчя ніхто не пам’ятає. Лише оксамитові рукавички — і те, що після них лікар уже не потрібен.'],
      en: ['Velvet Gloves', 'Nobody remembers his face. Only the velvet gloves — and that after them no doctor is needed.'],
      pl: ['Aksamitne Rękawiczki', 'Nikt nie pamięta jego twarzy. Tylko aksamitne rękawiczki — i to, że po nich lekarz nie jest już potrzebny.'],
      hy: ['Թավշյա ձեռնոցներ', 'Նրա դեմքը ոչ ոք չի հիշում։ Միայն թավշյա ձեռնոցները, և այն, որ դրանցից հետո բժիշկ այլևս պետք չէ։']
    },
    iris_shadow: {
      ru: ['Тень Ирис', 'Официантка в «Лагуне», медсестра на холме, фотограф на свадьбе мэра — у Ирис десять лиц, и все знакомые.'],
      uk: ['Тінь Ірис', 'Офіціантка в «Лагуні», медсестра на пагорбі, фотографка на весіллі мера — в Ірис десять облич, і всі знайомі.'],
      en: ['Iris Shadow', 'A waitress at the Laguna, a nurse on the hill, the photographer at the mayor’s wedding — Iris has ten faces, and all of them look familiar.'],
      pl: ['Cień Iris', 'Kelnerka w Lagunie, pielęgniarka na wzgórzu, fotografka na weselu burmistrza — Iris ma dziesięć twarzy i każda wydaje się znajoma.'],
      hy: ['Իրիսի ստվեր', 'Մատուցողուհի «Լագունայում», բուժքույր բլրի վրա, լուսանկարիչ քաղաքապետի հարսանիքում․ Իրիսն ունի տասը դեմք, և բոլորը ծանոթ են։']
    },
    lavender_wolf: {
      ru: ['Лавандовая волчица', 'Днём сидит за одним столом с честными людьми, ночью — с семьёй. Волк у её ног знает все имена, но молчит.'],
      uk: ['Лавандова вовчиця', 'Удень сидить за одним столом із чесними людьми, вночі — з родиною. Вовк біля її ніг знає всі імена, але мовчить.'],
      en: ['Lavender Wolf', 'By day she sits at one table with honest people, by night with the family. The wolf at her feet knows every name and keeps quiet.'],
      pl: ['Lawendowa Wilczyca', 'Za dnia siedzi przy jednym stole z uczciwymi ludźmi, nocą — z rodziną. Wilk u jej stóp zna wszystkie imiona, ale milczy.'],
      hy: ['Լավանդայի գայլուհի', 'Ցերեկը նա նստում է ազնիվ մարդկանց սեղանի շուրջ, գիշերը՝ ընտանիքի։ Նրա ոտքերի մոտի գայլը գիտի բոլոր անունները, բայց լռում է։']
    },
    violet_soldier: {
      ru: ['Фиолетовый солдат', 'Имени его не знает никто, но у двери Дона он стоит каждую ночь — и, когда старших не осталось, спускает курок.'],
      uk: ['Фіолетовий солдат', 'Його імені не знає ніхто, але біля дверей Дона він стоїть щоночі — і, коли старших не лишилося, натискає на гачок.'],
      en: ['Violet Soldier', 'Nobody knows his name, but he stands at the Don’s door every night — and when nobody is left above him, he pulls the trigger.'],
      pl: ['Fioletowy Żołnierz', 'Nikt nie zna jego imienia, ale co noc stoi pod drzwiami Dona — a gdy nie ma już starszych, pociąga za spust.'],
      hy: ['Մանուշակագույն զինվոր', 'Նրա անունը ոչ ոք չգիտի, բայց ամեն գիշեր նա կանգնած է Դոնի դռան մոտ, և երբ ավագներ չեն մնում, սեղմում է ձգանը։']
    },
    lights_out: {
      ru: ['Гаситель', 'Фонари на Соляной набережной гаснут один за другим. Ему не нужны ни семья, ни деньги — он просто хочет погасить последний.'],
      uk: ['Гаситель', 'Ліхтарі на Соляній набережній гаснуть один за одним. Йому не потрібні ні родина, ні гроші — він просто хоче погасити останній.'],
      en: ['Lights Out', 'The lamps on Salt Quay go dark one by one. He wants no family and no money — just to put out the last light himself.'],
      pl: ['Gaszący Światło', 'Latarnie na Solnym Nabrzeżu gasną jedna po drugiej. Nie chce rodziny ani pieniędzy — chce tylko zgasić ostatnią.'],
      hy: ['Լույսերը մարողը', 'Աղի ափի լապտերները մեկը մյուսի հետևից հանգչում են։ Նրան պետք չեն ո՛չ ընտանիք, ո՛չ փող. նա պարզապես ուզում է հանգցնել վերջինը։']
    },
    mauve_jester: {
      ru: ['Лиловая шутиха', 'Звезда площади Трёх фонтанов. Ей всё равно, кто правит городом, — лишь бы толпа кричала её имя.'],
      uk: ['Лілова блазниця', 'Зірка площі Трьох фонтанів. Їй байдуже, хто править містом, — аби натовп вигукував її ім’я.'],
      en: ['Mauve Jester', 'The star of Three Fountains Square. She doesn’t care who rules the town, as long as the crowd shouts her name.'],
      pl: ['Liliowa Błaznica', 'Gwiazda placu Trzech Fontann. Nieważne, kto rządzi miastem — byle tłum krzyczał jej imię.'],
      hy: ['Մանուշակագույն ծաղրածու', 'Երեք շատրվանների հրապարակի աստղը։ Նրան չի հետաքրքրում, թե ով է կառավարում քաղաքը, միայն թե ամբոխը գոռա իր անունը։']
    },
    velvet_cat: {
      ru: ['Бархатная кошка', 'В Кастельмаре нет замка, который она не откроет. А чужие таланты она берёт на одну ночь — и к утру возвращает.'],
      uk: ['Оксамитова кішка', 'У Кастельмарі немає замка, якого вона не відчинить. А чужі таланти бере на одну ніч — і до ранку повертає.'],
      en: ['Velvet Cat', 'There is no lock in Castelmar she can’t open. Other people’s talents she borrows for one night and returns by morning.'],
      pl: ['Aksamitna Kotka', 'W Castelmarze nie ma zamka, którego by nie otworzyła. Cudze talenty pożycza na jedną noc i rano oddaje.'],
      hy: ['Թավշյա կատու', 'Կաստելմարում չկա կողպեք, որը նա չբացի։ Ուրիշների տաղանդները նա վերցնում է մեկ գիշերով և առավոտյան վերադարձնում։']
    },
    lavender_vow: {
      ru: ['Лавандовый обет', 'Обет молчания он хранит тридцать лет. Всё, что летит в него ночью, он молча отводит в сторону.'],
      uk: ['Лавандова обітниця', 'Обітницю мовчання він тримає тридцять років. Усе, що летить у нього вночі, він мовчки відводить убік.'],
      en: ['Lavender Vow', 'He has kept his vow of silence for thirty years. Whatever flies at him at night, he quietly turns aside.'],
      pl: ['Lawendowe Ślubowanie', 'Ślub milczenia trzyma od trzydziestu lat. Wszystko, co leci w niego nocą, w milczeniu odbija w bok.'],
      hy: ['Լավանդայի ուխտ', 'Լռության ուխտը նա պահում է երեսուն տարի։ Այն ամենը, ինչ գիշերը թռչում է նրա վրա, նա լուռ մի կողմ է շեղում։']
    },
    violet_badge: {
      ru: ['Фиолетовый значок', 'Последний честный значок в городе. Аметист в звезде — подарок вдовы, чьё дело он всё-таки раскрыл.'],
      uk: ['Фіолетовий жетон', 'Останній чесний жетон у місті. Аметист у зірці — подарунок вдови, чию справу він таки розкрив.'],
      en: ['Violet Badge', 'The last honest badge in town. The amethyst in the star was a gift from a widow whose case he finally solved.'],
      pl: ['Fioletowa Odznaka', 'Ostatnia uczciwa odznaka w mieście. Ametyst w gwieździe to prezent od wdowy, której sprawę w końcu rozwiązał.'],
      hy: ['Մանուշակագույն կրծքանշան', 'Քաղաքի վերջին ազնիվ կրծքանշանը։ Աստղի ամեթիստը մի այրու նվերն է, որի գործը նա, այնուամենայնիվ, բացահայտեց։']
    },
    violet_ink: {
      ru: ['Фиолетовые чернила', 'Газету давно закрыли, а она всё ещё пишет. Имена ей не нужны — она видит связи.'],
      uk: ['Фіолетове чорнило', 'Газету давно закрили, а вона все ще пише. Імена їй не потрібні — вона бачить зв’язки.'],
      en: ['Violet Ink', 'The paper closed long ago, and she is still writing. She doesn’t need names — she sees connections.'],
      pl: ['Fioletowy Atrament', 'Gazetę dawno zamknięto, a ona wciąż pisze. Nie potrzebuje nazwisk — widzi powiązania.'],
      hy: ['Մանուշակագույն թանաք', 'Թերթը վաղուց փակվել է, իսկ նա դեռ գրում է։ Նրան անուններ պետք չեն. նա տեսնում է կապերը։']
    },
    orchid_mayor: {
      ru: ['Мэр Орхидея', 'Тридцать лет в ратуше — и ни одного конверта. Её слово на площади весит больше, чем чьё-либо.'],
      uk: ['Мерка Орхідея', 'Тридцять років у ратуші — і жодного конверта. Її слово на площі важить більше, ніж будь-чиє.'],
      en: ['Orchid Mayor', 'Thirty years at City Hall and not one envelope. Her word on the square weighs more than anyone’s.'],
      pl: ['Burmistrzyni Orchidea', 'Trzydzieści lat w ratuszu i ani jednej koperty. Jej słowo na placu waży więcej niż czyjekolwiek.'],
      hy: ['Քաղաքապետ Խոլորձ', 'Երեսուն տարի քաղաքապետարանում և ոչ մի ծրար։ Նրա խոսքը հրապարակում ավելի ծանր է, քան որևէ մեկինը։']
    },
    plum_brandy: {
      ru: ['Сливовый бренди', '«Чёрный ключ» закрывается в четыре утра. Кто пил с ним сливовый бренди, наутро поднимает руку — но город его не слышит.'],
      uk: ['Сливовий бренді', '«Чорний ключ» зачиняється о четвертій ранку. Хто пив із ним сливовий бренді, вранці піднімає руку — але місто його не чує.'],
      en: ['Plum Brandy', 'The Black Key closes at four in the morning. Whoever drank plum brandy with him raises a hand the next day, but the town doesn’t hear it.'],
      pl: ['Śliwowica', 'Czarny Klucz zamykają o czwartej nad ranem. Kto pił z nim śliwowicę, rano podnosi rękę — ale miasto go nie słyszy.'],
      hy: ['Սալորի օղի', '«Սև բանալին» փակվում է առավոտյան ժամը չորսին։ Ով նրա հետ սալորի օղի է խմել, առավոտյան ձեռք է բարձրացնում, բայց քաղաքը նրան չի լսում։']
    },
    lavender_heart: {
      ru: ['Лавандовое сердце', 'Она верит в людей даже в этом городе. Её фонарик каждую ночь достаётся тому, кому он нужнее.'],
      uk: ['Лавандове серце', 'Вона вірить у людей навіть у цьому місті. Її ліхтарик щоночі дістається тому, кому він потрібніший.'],
      en: ['Lavender Heart', 'She believes in people even in this town. Every night her little lantern goes to whoever needs it most.'],
      pl: ['Lawendowe Serce', 'Wierzy w ludzi nawet w tym mieście. Co noc jej latarenka trafia do tego, kto potrzebuje jej najbardziej.'],
      hy: ['Լավանդայի սիրտ', 'Նա հավատում է մարդկանց նույնիսկ այս քաղաքում։ Ամեն գիշեր նրա լապտերիկը բաժին է հասնում նրան, ում այն ավելի է պետք։']
    },
    iron_violet: {
      ru: ['Железная фиалка', 'Сталевар с «Кастельмар Стил», которого город привык не замечать. Но чем дольше идёт игра, тем труднее сдвинуть его с места.'],
      uk: ['Залізна фіалка', 'Сталевар із «Кастельмар Стіл», якого місто звикло не помічати. Та що довше триває гра, то важче зрушити його з місця.'],
      en: ['Iron Violet', 'A Castelmar Steel worker the town is used to overlooking. But the longer the game runs, the harder he is to move.'],
      pl: ['Żelazny Fiołek', 'Hutnik z Castelmar Steel, którego miasto przywykło nie zauważać. Ale im dłużej trwa gra, tym trudniej go ruszyć.'],
      hy: ['Երկաթե մանուշակ', '«Կաստելմար Սթիլի» պողպատագործ, որին քաղաքը սովոր է չնկատել։ Բայց որքան երկար է տևում խաղը, այնքան դժվար է նրան տեղից շարժել։']
    },
    night_pact: {
      ru: ['Ночной договор', 'Её договор подписан задолго до того, как город узнал её имя. Уходя, она никогда не уходит одна.'],
      uk: ['Нічна угода', 'Її угоду підписано задовго до того, як місто дізналося її ім’я. Ідучи, вона ніколи не йде сама.'],
      en: ['Night Pact', 'Her contract was signed long before the town learned her name. When she leaves, she never leaves alone.'],
      pl: ['Nocny Pakt', 'Jej pakt podpisano na długo, zanim miasto poznało jej imię. Odchodząc, nigdy nie odchodzi sama.'],
      hy: ['Գիշերային դաշինք', 'Նրա պայմանագիրը ստորագրվել է շատ ավելի վաղ, քան քաղաքն իմացավ նրա անունը։ Հեռանալիս նա երբեք մենակ չի հեռանում։']
    },
    dream_merchant: {
      ru: ['Торговец снами', 'Его лавка на Часовой улице торгует снами. Изгнанный из города, он уносит с собой чужой дар — в банке под крышкой.'],
      uk: ['Торговець снами', 'Його крамниця на Годинниковій вулиці торгує снами. Вигнаний з міста, він забирає із собою чужий дар — у банці під кришкою.'],
      en: ['Dream Merchant', 'His shop on Clock Street sells dreams. Driven out of town, he takes someone else’s gift with him — in a jar with the lid on.'],
      pl: ['Handlarz Snów', 'Jego sklep przy ulicy Zegarowej handluje snami. Wygnany z miasta, zabiera ze sobą cudzy dar — w słoiku pod pokrywką.'],
      hy: ['Երազների վաճառական', 'Ժամացույցի փողոցի նրա խանութը երազներ է վաճառում։ Քաղաքից վտարվելիս նա իր հետ տանում է ուրիշի շնորհը՝ փակ կափարիչով բանկայի մեջ։']
    },
    the_shelter: {
      ru: ['Убежище', 'Старая синагога на Канатной улице — единственное место, куда не входит семья. Под его крышей пули проходят мимо.'],
      uk: ['Прихисток', 'Стара синагога на Канатній вулиці — єдине місце, куди не заходить родина. Під його дахом кулі минають.'],
      en: ['The Shelter', 'The old synagogue on Rope Street is the one place the family never enters. Under his roof, bullets pass by.'],
      pl: ['Schronienie', 'Stara synagoga przy ulicy Linowej to jedyne miejsce, do którego rodzina nie wchodzi. Pod jego dachem kule chybiają.'],
      hy: ['Ապաստան', 'Պարանի փողոցի հին սինագոգը միակ տեղն է, ուր ընտանիքը չի մտնում։ Նրա հարկի տակ գնդակներն անցնում են կողքով։']
    },
    tick_tock: {
      ru: ['Тик-Так', 'Тик-так, тик-так… Он всегда приходит вовремя. А если его выставят за дверь — уходит громко и не один.'],
      uk: ['Тік-Так', 'Тік-так, тік-так… Він завжди приходить вчасно. А якщо його виставлять за двері — йде гучно і не сам.'],
      en: ['Tick-Tock', 'Tick-tock, tick-tock… He is always on time. And if they show him the door, he leaves loudly — and not alone.'],
      pl: ['Tik-Tak', 'Tik-tak, tik-tak… Zawsze przychodzi na czas. A jeśli wystawią go za drzwi — wychodzi głośno i nie sam.'],
      hy: ['Տիկ-Տակ', 'Տիկ-տակ, տիկ-տակ… Նա միշտ գալիս է ժամանակին։ Իսկ եթե նրան դուրս հանեն, կհեռանա աղմկոտ և ոչ մենակ։']
    },
    violet_shield: {
      ru: ['Фиолетовый щит', 'Бывший сержант портовой полиции, уволенный за честность. Пуля, летящая в того, кого он бережёт, находит его.'],
      uk: ['Фіолетовий щит', 'Колишній сержант портової поліції, звільнений за чесність. Куля, що летить у того, кого він береже, знаходить його.'],
      en: ['Violet Shield', 'A former port police sergeant, fired for honesty. A bullet meant for the one he guards finds him instead.'],
      pl: ['Fioletowa Tarcza', 'Były sierżant policji portowej, zwolniony za uczciwość. Kula lecąca w tego, kogo strzeże, trafia w niego.'],
      hy: ['Մանուշակագույն վահան', 'Նավահանգստի ոստիկանության նախկին սերժանտ, ազատված ազնվության համար։ Գնդակը, որ թռչում է նրա պաշտպանյալի վրա, գտնում է իրեն։']
    },
    violet_verdict: {
      ru: ['Фиолетовый вердикт', 'Единственная судья Кастельмара, не взявшая ни одного конверта. Один раз за игру её молоток останавливает толпу.'],
      uk: ['Фіолетовий вирок', 'Єдина суддя Кастельмара, що не взяла жодного конверта. Раз за гру її молоток зупиняє натовп.'],
      en: ['Violet Verdict', 'The only judge in Castelmar who never took an envelope. Once per game her gavel stops the crowd.'],
      pl: ['Fioletowy Wyrok', 'Jedyna sędzia w Castelmarze, która nie wzięła żadnej koperty. Raz na grę jej młotek zatrzymuje tłum.'],
      hy: ['Մանուշակագույն դատավճիռ', 'Կաստելմարի միակ դատավորը, որ ոչ մի ծրար չի վերցրել։ Խաղում մեկ անգամ նրա մուրճը կանգնեցնում է ամբոխին։']
    },
    lavender_baker: {
      ru: ['Лавандовая пекарша', 'Каждое утро в пять — свежий хлеб для всего квартала. Ни значка, ни пистолета: только минута, чтобы сказать, и один голос.'],
      uk: ['Лавандова пекарка', 'Щоранку о п’ятій — свіжий хліб для всього кварталу. Ні жетона, ні пістолета: лише хвилина, щоб сказати, і один голос.'],
      en: ['Lavender Baker', 'Fresh bread for the whole block at five every morning. No badge, no gun — just a minute to speak and one vote.'],
      pl: ['Lawendowa Piekarka', 'Codziennie o piątej świeży chleb dla całej ulicy. Bez odznaki i bez broni — tylko minuta na słowo i jeden głos.'],
      hy: ['Լավանդայի հացթուխ', 'Ամեն առավոտ ժամը հինգին՝ թարմ հաց ամբողջ թաղամասի համար։ Ո՛չ կրծքանշան, ո՛չ զենք. միայն մեկ րոպե խոսելու և մեկ ձայն։']
    },
    steady_hands: {
      ru: ['Твёрдая рука', 'С войны он вернулся с одной привычкой: сначала смотреть под ноги. В Кастельмаре под ногами всегда что-то тикает.'],
      uk: ['Тверда рука', 'З війни він повернувся з однією звичкою: спершу дивитися під ноги. У Кастельмарі під ногами завжди щось цокає.'],
      en: ['Steady Hands', 'He came back from the war with one habit: look under your feet first. In Castelmar something under your feet is always ticking.'],
      pl: ['Pewna Ręka', 'Z wojny wrócił z jednym nawykiem: najpierw patrz pod nogi. W Castelmarze pod nogami zawsze coś tyka.'],
      hy: ['Հաստատուն ձեռքեր', 'Պատերազմից նա վերադարձավ մեկ սովորությամբ՝ նախ նայել ոտքերի տակ։ Կաստելմարում ոտքերի տակ միշտ ինչ-որ բան է տկտկում։']
    },
    final_stamp: {
      ru: ['Последняя печать', 'Судьи уже уехали за город, а у него на столе всё ещё лежит печать. Оттиск у неё один: «Исполнено».'],
      uk: ['Остання печатка', 'Судді вже поїхали за місто, а на його столі все ще лежить печатка. Відбиток у неї один: «Виконано».'],
      en: ['Final Stamp', 'The judges have left for the country, but his stamp is still on the desk. It leaves only one mark: “Executed”.'],
      pl: ['Ostatnia Pieczęć', 'Sędziowie wyjechali już za miasto, a na jego biurku wciąż leży pieczęć. Odciska tylko jedno: „Wykonano”.'],
      hy: ['Վերջին կնիք', 'Դատավորներն արդեն մեկնել են քաղաքից դուրս, իսկ նրա սեղանին դեռ կնիքն է։ Նրա դրոշմը մեկն է՝ «Կատարված է»։']
    },
    violet_ledger: {
      ru: ['Фиолетовый гроссбух', 'Папки, квитанции, подписи. Купленные голоса она находит раньше, чем их поднимут.'],
      uk: ['Фіолетовий гросбух', 'Теки, квитанції, підписи. Куплені голоси вона знаходить раніше, ніж їх піднімуть.'],
      en: ['Violet Ledger', 'Folders, receipts, signatures. She finds the bought votes before anyone raises them.'],
      pl: ['Fioletowa Księga', 'Teczki, pokwitowania, podpisy. Kupione głosy znajduje, zanim ktokolwiek je podniesie.'],
      hy: ['Մանուշակագույն մատյան', 'Թղթապանակներ, անդորրագրեր, ստորագրություններ։ Գնված ձայները նա գտնում է նախքան դրանք կբարձրացնեն։']
    },
    purple_knuckles: {
      ru: ['Фиолетовый кастет', 'Он не спорит на площади. Он приходит вечером — и утром человек почему-то решает промолчать.'],
      uk: ['Фіолетовий кастет', 'Він не сперечається на площі. Він приходить увечері — і вранці людина чомусь вирішує змовчати.'],
      en: ['Purple Knuckles', 'He doesn’t argue on the square. He comes in the evening, and in the morning the man somehow decides to keep quiet.'],
      pl: ['Fioletowy Kastet', 'Nie kłóci się na placu. Przychodzi wieczorem — a rano człowiek jakoś postanawia milczeć.'],
      hy: ['Մանուշակագույն կաստետ', 'Նա հրապարակում չի վիճում։ Նա գալիս է երեկոյան, և առավոտյան մարդը չգիտես ինչու որոշում է լռել։']
    },
    silent_petal: {
      ru: ['Тихий лепесток', 'Её никто не видел на крышах Кастельмара — только слышали, как пуля звенит о черепицу там, где она стояла секунду назад.'],
      uk: ['Тиха пелюстка', 'Її ніхто не бачив на дахах Кастельмара — лише чули, як куля дзвенить об черепицю там, де вона стояла секунду тому.'],
      en: ['Silent Petal', 'Nobody has seen her on the roofs of Castelmar — people only hear a bullet ring off the tiles where she stood a second ago.'],
      pl: ['Cichy Płatek', 'Nikt nie widział jej na dachach Castelmaru — słychać tylko, jak kula dzwoni o dachówkę tam, gdzie sekundę temu stała.'],
      hy: ['Լուռ թերթիկ', 'Նրան ոչ ոք չի տեսել Կաստելմարի տանիքներին. միայն լսում են, թե ինչպես է գնդակը զնգում կղմինդրին այնտեղ, որտեղ նա մի վայրկյան առաջ կանգնած էր։']
    },
    velvet_envelope: {
      ru: ['Бархатный конверт', 'Она никогда не носит оружия. Конверт с бархатной печатью во внутреннем кармане бьёт сильнее.'],
      uk: ['Оксамитовий конверт', 'Вона ніколи не носить зброї. Конверт з оксамитовою печаткою у внутрішній кишені б’є сильніше.'],
      en: ['Velvet Envelope', 'She never carries a gun. The envelope with the velvet seal in her inside pocket hits harder.'],
      pl: ['Aksamitna Koperta', 'Nigdy nie nosi broni. Koperta z aksamitną pieczęcią w wewnętrznej kieszeni uderza mocniej.'],
      hy: ['Թավշյա ծրար', 'Նա երբեք զենք չի կրում։ Ներքին գրպանի թավշյա կնիքով ծրարն ավելի ուժեղ է հարվածում։']
    }
  };
  const UI = {
    ru: { skHowSoon: 'Как получить этот скин, расскажем скоро.', skSeasonTitle: 'Награда сезона', skSeriesTitle: 'Epic-серия · {n}', skMine: 'Мои', skNone: 'Здесь пока пусто.' , skRarAll: 'Все редкости', skRarNone: 'Скинов редкости «{r}» пока нет.', skRar: { common: 'Обыкновенные', rare: 'Редкие', uncommon: 'Уникальные', epic: 'Эпические', legendary: 'Легендарные', sr: 'Супер редкие', ssr: 'Супер Супер редкие', ur: 'Уникально редкие', mythic: 'Мифические' } },
    uk: { skHowSoon: 'Як отримати цей скін, розповімо незабаром.', skSeasonTitle: 'Нагорода сезону', skSeriesTitle: 'Epic-серія · {n}', skMine: 'Мої', skNone: 'Тут поки порожньо.' , skRarAll: 'Усі рідкості', skRarNone: 'Скінів рідкості «{r}» поки немає.', skRar: { common: 'Звичайні', rare: 'Рідкісні', uncommon: 'Унікальні', epic: 'Епічні', legendary: 'Легендарні', sr: 'Супер рідкісні', ssr: 'Супер супер рідкісні', ur: 'Унікально рідкісні', mythic: 'Міфічні' } },
    en: { skHowSoon: 'How to get this skin — coming soon.', skSeasonTitle: 'Season reward', skSeriesTitle: 'Epic series · {n}', skMine: 'Mine', skNone: 'Nothing here yet.' , skRarAll: 'All rarities', skRarNone: 'No {r} skins yet.', skRar: { common: 'Common', rare: 'Rare', uncommon: 'Unique', epic: 'Epic', legendary: 'Legendary', sr: 'Super Rare', ssr: 'Super Super Rare', ur: 'Unique Rare', mythic: 'Mythical' } },
    pl: { skHowSoon: 'Jak zdobyć tę skórkę — powiemy wkrótce.', skSeasonTitle: 'Nagroda sezonu', skSeriesTitle: 'Seria Epic · {n}', skMine: 'Moje', skNone: 'Na razie pusto.' , skRarAll: 'Wszystkie rzadkości', skRarNone: 'Na razie brak skórek: {r}.', skRar: { common: 'Zwykłe', rare: 'Rzadkie', uncommon: 'Unikalne', epic: 'Epickie', legendary: 'Legendarne', sr: 'Super rzadkie', ssr: 'Super super rzadkie', ur: 'Unikalnie rzadkie', mythic: 'Mityczne' } },
    hy: { skHowSoon: 'Ինչպես ստանալ այս սքինը՝ շուտով կպատմենք։', skSeasonTitle: 'Սեզոնի պարգև', skSeriesTitle: 'Epic շարք · {n}', skMine: 'Իմը', skNone: 'Այստեղ դեռ դատարկ է։' , skRarAll: 'Բոլոր հազվադեպությունները', skRarNone: '«{r}» սքիններ դեռ չկան։', skRar: { common: 'Սովորական', rare: 'Հազվագյուտ', uncommon: 'Եզակի', epic: 'Էպիկական', legendary: 'Լեգենդար', sr: 'Սուպեր հազվագյուտ', ssr: 'Սուպեր սուպեր հազվագյուտ', ur: 'Եզակի հազվագյուտ', mythic: 'Առասպելական' } }
  };
  ['ru', 'uk', 'en', 'pl', 'hy'].forEach(code => {
    const p = I18N[code]; if (!p) return; p.skins = p.skins || {}; Object.assign(p.ui, UI[code]);
    Object.keys(T).forEach(id => { const row = T[id][code] || T[id].en; p.skins[id] = { name: row[0], lore: row[1] }; });
  });
})();
